const WebTorrent = require('webtorrent')
const utils = require('../Utils/Utils')
const IoTLightningClient = require('../Utils/LightningClient')
const createDebug = require('debug')
createDebug.formatters.h = (v) => {
  return typeof v === 'undefined' ? 'undefined' : v.toString('hex')
}
const debug = createDebug('iot')
const request = require('request')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const now = require('performance-now')
const homedir = require('os').homedir()
const bitcoin = require('bitcoinjs-lib')
const colors = require('colors')

const MESSAGE_PREFIX = 9
const PRICE_PER_PIECE = 1

function IoT (configFilePath) {
  let self = this
  this.configFilePath = configFilePath
  this.webtorrentClient = new WebTorrent()
  this.lightningClient = new IoTLightningClient(homedir + '/.lightning')
  this.vendorIp = utils.getJsonAttribute(configFilePath, 'vendorIp')
  this.vendorPort = utils.getJsonAttribute(configFilePath, 'vendorPort')
  this.socketIOClient = require('socket.io-client')('http://' + this.vendorIp + ':' + this.vendorPort)
  this.socketIOClient.on('connect', () => {
    debug('Connected to socket in ' + this.vendorIp + ':' + this.vendorPort)
    console.log(colors.green('IoT: listening to new patch update event'))
  })
  this.socketIOClient.on('disconnect', () => { debug('Disconnected from socket in ' + this.vendorIp) })
  // IoT is listening to a different event then the distributor in order to ensure it downloads the patch from the distributor
  // and not from the vendor
  this.socketIOClient.on('newPatchUpdateAvailableIoT', (data) => {
    debug('downloadAvailable: data =', data)
    let _data = data.data
    let message = JSON.stringify(_data)
    const keyPair = bitcoin.ECPair.fromPublicKey(Buffer.from(utils.getJsonAttribute(self.configFilePath, 'vendorPublicKey'), 'hex'))
    let msgHash = crypto.createHash('sha256').update(message).digest()

    if (!keyPair.verify(msgHash, data.signature)) {
      debug('downloadAvailable event not sent from vendor')
      return
    }
    console.log(colors.green('IoT: new update available!'))
    self.expectedFileHashSHA256 = _data.fileHashSHA256
    self.torrentInfoHash = _data.torrentInfoHash
    self.downloadPatchUpdate(_data.torrentInfoHash)
  })

  this.piecesRecords = {}
  this.doneDownloading = false
  this.torrent = null
  debug('Waiting to connect to vendor at ', this.vendorIp + ':' + this.vendorPort)
}

/**
 * IoT downloads the patch update by the infoHash given by the vendor. For PoC purposes, the IoT first deletes the update file if exists
 * @param  {string} infoHash - hash of the torrent file, used as an identifier in the webTorrent network
 */
IoT.prototype.downloadPatchUpdate = function (infoHash) {
  this.deleteUpdateFileIfExists()
  debug('My peerId = ', this.webtorrentClient.peerId)
  this.timeBeforeDownload = now()
  let self = this
  if (self.torrent && self.torrent.infoHash === infoHash) {
    debug('torrent already exists, deleting previous one')
    self.webtorrentClient.remove(infoHash, (err) => {
      if (!err) {
        debug('previous torrent has been deleted')
        self._addTorrent(infoHash)
      } else {
        console.log(colors.red(err))
      }
    })
    return
  }
  self._addTorrent(infoHash)

}

IoT.prototype._addTorrent = function (infoHash) {
  let self = this
  let torrent = this.webtorrentClient.add(infoHash, {path: path.join(__dirname, 'downloads/')})
  self.torrent = torrent
  torrent.once('download', (bytes) => {
    debug('downloading patch update, hash = ', infoHash)
  })
  torrent.on('done', () => {
    debug('Done downloading patch update, hash = ', infoHash)
    self.doneDownloading = true
  })
  torrent.on('wire', (wire) => self.onWire(wire)/* (wire) => self.onWire(wire, torrent) */)
}

IoT.prototype.onWire = function (wire) {
  debug('new wire, peerId = ', wire.peerId)
  let self = this
  wire.on('unknownmessage', (buffer) => this.decodeAndPay(wire, buffer))

  wire.on('piece', (index, offset, length) => {
    debug('downloaded piece %s from peerId %s ', index, wire.peerId)
    self.piecesRecords[index] = {distributorPeerId: wire.peerId, recievedTime: Date.now()}
  })
}

/**
 * Triggered when IoT receives message from a distributor holding lightning payment request for the piece the IoT just received.
 * IoT is decoding the message and paying the distributor for the current piece
 * @param  {object} wire - object constructed by webTorrent, holds the duplex connection between two peers
 * @param  {object} data - object that holds the data per piece sent from distributor to the IoT device
 */
IoT.prototype.decodeAndPay = async function (wire, data) {
  data = JSON.parse(data.slice(MESSAGE_PREFIX).toString())
  let pieceIndex = data.pieceIndex
  let pricePerPiece = data.pricePerPiece
  let bolt11 = data.bolt11
  let distributorPeerId = wire.peerId
  let distributorNodeId = data.distributorNodeId
  debug('got payment request for piece = %s from peerId = %s', pieceIndex, distributorPeerId)
  if (!this.piecesRecords[pieceIndex]) {
    debug('distributor asking for payment for piece that does not exist')
    return
  }
  if (this.piecesRecords[pieceIndex].distributorPeerId !== distributorPeerId) {
    debug('distributor asking for payment for piece he did not delivered')
    return
  }
  this.piecesRecords[pieceIndex].distributorNodeId = distributorNodeId
  this.piecesRecords[pieceIndex].paid = false
  try {
    let decodedInvoice = await this.lightningClient.decodeInvoice(bolt11)
    debug('Decoded invoice for piece index = %s from peerId = %s is %o', pieceIndex, distributorPeerId, decodedInvoice)
    if (decodedInvoice['payee'] !== distributorNodeId) {
      debug('Invoice payee is not the distributor')
      return
    }
    if (decodedInvoice['msatoshi'] > PRICE_PER_PIECE) {
      debug('Price per piece is higher than expected amount')
      return
    }
    let paymentReceipt
    console.log(colors.yellow(`IoT: paying for piece ${pieceIndex}, for node ${distributorNodeId.substring(0, 8)}`))
    paymentReceipt = await this.lightningClient.pay(bolt11)
    debug('payment receipt for piece = %s from peerId = %s is %o', pieceIndex, distributorPeerId, paymentReceipt)
    if (paymentReceipt !== 205) {
      this.piecesRecords[pieceIndex].paid = true
      this.piecesRecords[pieceIndex].pricePerPiece = pricePerPiece
      if (this.doneDownloading && this.areAllPiecesPaid()) {
        debug('done downloading patch update')
        this.announceSelfUpdate()
      }
    }else{
      console.log(colors.red('Error 205 for piece index = %s from peerId = %s', pieceIndex, distributorPeerId))
    }
  } catch (err) {
    console.log(colors.red(err))
  }
}

/**
 * Returns true iff all pieces that has been received are paid
 */
IoT.prototype.areAllPiecesPaid = function () {
  debug('pieces records = %o', this.piecesRecords)
  for (let piece in this.piecesRecords) {
    if (this.piecesRecords.hasOwnProperty(piece)) {
      if (!this.piecesRecords[piece].paid) {
        debug('piece %o from %s has not been paid', piece, this.piecesRecords[piece].distributorPeerId)
        return false
      }
    }
  }
  return true
}

/**
 * IoT announce the vendor when it finishes to download the whole patch update
 */
IoT.prototype.announceSelfUpdate = function () {
  let timeAfterDownload = now()
  let totalTimeToDownloadMs = timeAfterDownload - this.timeBeforeDownload
  debug('Patch update download took %s seconds', Math.floor(totalTimeToDownloadMs / 1000))
  debug('Pieces info = ', this.piecesRecords)
  let piecesRecords = Object.keys(this.piecesRecords).sort().map(index => this.piecesRecords[index])
  let totalPaid = piecesRecords.map(piece => piece.pricePerPiece).reduce(function (accumulator, currentPiecePrice) {
    return accumulator + currentPiecePrice
  })
  console.log(colors.green('IoT: finished downloading patch in ' + parseFloat(totalTimeToDownloadMs / 1000).toFixed(2) + ' seconds! Paid ' + totalPaid + ' satoshi'))

  let filePath = path.join(__dirname, 'downloads/', 'updateFile')
  let file = fs.readFileSync(filePath)
  let fileHashSHA256 = crypto.createHash('sha256').update(file).digest('hex')
  if (this.expectedFileHashSHA256 && this.expectedFileHashSHA256 !== fileHashSHA256) {
    debug('file received from distributor is different from the expected file')
    return
  }
  let self = this

  const sk = Buffer.from(utils.getJsonAttribute(this.configFilePath, 'sk'), 'hex')
  const ecPair = bitcoin.ECPair.fromPrivateKey(sk)
  const postData = {
    data: {
      expectedFileHashSHA256: this.expectedFileHashSHA256,
      torrentInfoHash: this.torrentInfoHash,
      iotPublicKey: ecPair.publicKey.toString('hex'),
      totalTimeToDownloadMs: totalTimeToDownloadMs,
      piecesRecords: piecesRecords,
      timeStamp: new Date().getTime(),
      totalPaid: totalPaid
    }
  }
  let message = postData.data
  let hash = crypto.createHash('sha256').update(JSON.stringify(message)).digest('hex')
  let signature = ecPair.sign(Buffer.from(hash, 'hex'))
  postData.signature = signature
  let options = {
    uri: 'http://' + self.vendorIp + ':' + self.vendorPort + '/iotUpdated',
    method: 'POST',
    json: postData
  }
  request(options, (error, response, body) => {
    if (error) {
      debug(error)
    }
  })
}

IoT.prototype.deleteUpdateFileIfExists = function () {
  let self = this
  let filePath = path.join(__dirname, 'downloads/', 'updateFile')
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath)
    } catch (err) {
      debug(err)
    }
  }
}

module.exports = IoT
