const WebTorrent = require('webtorrent')
const http = require('http')
const createDebug = require('debug')
createDebug.formatters.h = (v) => {
  return typeof v === 'undefined' ? 'undefined' : v.toString('hex')
}
const debug = createDebug('vendor')
const utils = require('../Utils/Utils')
const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const fileUpload = require('express-fileupload')
const crypto = require('crypto')
const fs = require('fs')
const bitcoin = require('bitcoinjs-lib')
const Loki = require('lokijs')
const db = new Loki('loki.json')
const colors = require('colors')

const DIST_DOWNLOAD_INTERVAL = 10 * 1000

function Vendor (configFilePath) {
  let self = this
  this.configFilePath = configFilePath
  this.lastTorrentInfoHash = null
  this.lastFileHashSHA256 = null
  this.webtorrentClient = new WebTorrent()
  this.restApp = express()
  this.server = http.createServer(this.restApp)
  this.socketIOServer = require('socket.io')(this.server)
  const vendorPort = utils.getJsonAttribute(configFilePath, 'vendorPort')

  /* initialize IoTs DB */
  const iots = db.addCollection('iots')
  let iotsPublicKeys = utils.getJsonAttribute(configFilePath, 'iotPublicKeys')
  iotsPublicKeys.forEach(iotPublicKey => {
    iots.insert({
      publicKey: iotPublicKey,
      updated: false
    })
  })

  this.server.listen(vendorPort, '0.0.0.0', function () {
    debug((new Date()) + ' Server is listening on port ' + vendorPort)
    console.log(colors.green('Vendor server started'))
  })

  this.restApp.locals.moment = require('moment')
  this.restApp.set('views', './WebPages')
  this.restApp.set('view engine', 'ejs')
  this.restApp.use(express.static('./WebPages'))
  this.restApp.use(bodyParser.json())
  this.restApp.use(fileUpload())
  this.restApp.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/WebPages/screen1.html'))
  })
  this.restApp.get('/lastupdate', function (req, res) {
    res.send({lastTorrentInfoHash: self.lastTorrentInfoHash, lastFileHashSHA256: self.lastFileHashSHA256})
  })
  this.restApp.get('/map', function (req, res) {
    res.sendFile(path.join(__dirname, '/WebPages/screen2.html'))
  })
  this.restApp.get('/iotsPublicKeys', function (req, res) {
    let iotsPublicKeys = iots.find().map(iot => iot.publicKey)
    //debug('iotsPublicKeys = ', iotsPublicKeys)
    res.send(iotsPublicKeys)
  })
  this.restApp.get('/iot/:publicKey', function (req, res) {
    const iotPublicKey = req.params.publicKey
    debug('/iot/' + iotPublicKey)
    let iot = iots.find({publicKey: iotPublicKey})
    debug('iot =', iot)
    if (!iot || !iot.length) {
      return res.sendStatus(404)
    }
    iot = iot[0]
    res.render('screen-iot', {
      totalPaid: iot.totalPaid,
      data: iot.piecesRecords,
      publicKey: iotPublicKey,
      totalTimeToDownloadMs: iot.totalTimeToDownloadMs
    })
  })
  this.restApp.get('/summary', function (req, res) {
    debug('/summary')
    let updatedIots = iots.find({updated: true})
    debug('updatedIots =', updatedIots)
    if (!updatedIots || !updatedIots.length) {
      return res.sendStatus(404)
    }
    let maxTimeUpdatedMs = updatedIots.map(iot => iot.totalTimeToDownloadMs).reduce((accumulator, currentIoTTimeToDownloadMs) => {
      return currentIoTTimeToDownloadMs > accumulator ? currentIoTTimeToDownloadMs : accumulator
    })
    let totalTime = Date.now() - startSeedTime
    let totalPaid = updatedIots.map(iot => iot.totalPaid).reduce((accumulator, currentIoTTotalPaid) => {
      return accumulator + currentIoTTotalPaid
    })
    let result = {
      updatedIots,
      totalPaid,
      totalTime,
      maxTimeUpdatedMs
    }
    debug('/summary result =', result)
    res.send(result)
  })
  this.restApp.post('/uploadFile', function (req, res) {
    if (!req.files) {
      return res.status(400).send('No files were uploaded.')
    }
    let sampleFile = req.files.myFile
    sampleFile.mv('updateFile', function (err) {
      if (err) {
        return res.status(500).send(err)
      } else {
        self.onFileUploaded('updateFile')
        res.redirect('/map')
      }
    })
  })
  this.restApp.post('/iotUpdated', function (req, res) {
    const iotInfo = req.body.data
    let iotPublicKey = iotInfo.iotPublicKey
    let message = JSON.stringify(iotInfo)
    let signature = req.body.signature
    signature = Buffer.from(signature.data)
    if (utils.getJsonAttribute(self.configFilePath, 'iotPublicKeys').indexOf(iotPublicKey) === -1) {
      debug('Unknown IoT publicKey = %s', iotPublicKey)
      res.sendStatus(400)
      return
    }
    const keyPair = bitcoin.ECPair.fromPublicKey(Buffer.from(iotPublicKey, 'hex'))
    let msgHash = crypto.createHash('sha256').update(message).digest()

    if (!keyPair.verify(msgHash, signature)) {
      debug('Received invalid signature of given public key on message')
      res.sendStatus(400)
      return
    }

    iotInfo.updated = true
    iots.findAndUpdate({publicKey: iotPublicKey}, iot => Object.assign(iot, iotInfo))
    self.socketIOServer.emit('iotUpdated', iotInfo)
    console.log(colors.green('Vendor: IoT ' + iotPublicKey + ' updated!'))
    res.sendStatus(200)
  })

  this.socketIOServer.on('connection', function (socket) {
    let clientIp
    let isValidIp = true
    clientIp = socket.handshake.address.split(':')[3]
    if (!clientIp) {
      clientIp = socket.handshake.address.split('.')
      if (clientIp && clientIp.length === 4) {
        for (let i = 0; i < clientIp.length; i++) {
          let block = clientIp[i]
          if (block < 0 || block > 256) {
            isValidIp = false
          }
        }
        if (isValidIp) { clientIp = socket.handshake.address }
      }
    }
    debug('Client ' + clientIp + ' connected')
    socket.on('disconnect', function () {
      debug('Client ' + clientIp + ' disconnected')
    })
  })
}

/**
 * Vendor uploading the patch update for the distributors to download, through the webTorrent network.
 * Vendor emits the event newPatchUpdateAvailableDistributors intended for the distributors to realize that there is a new update available to deliver.
 * After DIST_DOWNLOAD_INTERVAL ms, the vendor stop the patch update upload, and emits the event newPatchUpdateAvailableIoT intended for the IoT to
 * use webTorrent in order to find distributors to download the patch update from.
 * The purpose of the two different events is to avoid situation when IoT device downloads directly from the vendor. In real world this scenario is not
 * likely to occur due to assumed uniform propagation of distributors across the web.
 * @param  {string} File name
 */
Vendor.prototype.onFileUploaded = function (fileName) {
  let self = this

  this.webtorrentClient.seed(fileName, function (torrent) {
    let file = fs.readFileSync(fileName)
    let fileHashSHA256 = crypto.createHash('sha256').update(file).digest('hex')
    self.lastTorrentInfoHash = torrent.infoHash
    self.lastFileHashSHA256 = fileHashSHA256
    debug('Start seeding patch update, torrentInfoHash = %s , fileHashSHA256 = %s', self.lastTorrentInfoHash, self.lastFileHashSHA256)
    debug('My peerId = ', self.webtorrentClient.peerId)
    let data = {
      data: {
        torrentInfoHash: self.lastTorrentInfoHash,
        fileHashSHA256: fileHashSHA256
      }
    }
    const sk = Buffer.from(utils.getJsonAttribute(self.configFilePath, 'sk'), 'hex')
    const ecPair = bitcoin.ECPair.fromPrivateKey(sk)
    let message = JSON.stringify(data.data)
    let hash = crypto.createHash('sha256').update(message).digest('hex')
    let signature = ecPair.sign(Buffer.from(hash, 'hex'))
    data.signature = signature
    self.socketIOServer.emit('newPatchUpdateAvailableDistributors', data)
    console.log(colors.green('Vendor: start seeding file, ' + torrent.pieces.length + ' pieces'))
    setTimeout(() => {
      self.webtorrentClient.destroy((err) => {
        if (!err) {
          console.log(colors.red('Vendor: stopped seeding file'))
          self.socketIOServer.emit('newPatchUpdateAvailableIoT', data)
        } else {
          debug(err)
        }
      })
    }, DIST_DOWNLOAD_INTERVAL)
  })
}

module.exports = Vendor
