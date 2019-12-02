const WebTorrent = require('webtorrent')
const utils = require('../Utils/Utils')
const homedir = require('os').homedir()
const DistributorLightningClient = require('../Utils/LightningClient')
const createDebug = require('debug')
createDebug.formatters.h = (v) => {
  return typeof v === 'undefined' ? 'undefined' : v.toString('hex')
}
const debug = createDebug('distributor')
const path = require('path')
const PAYMENT_REQ = 30
const PRICE_PER_PIECE = 1
const fs = require('fs')
const crypto = require('crypto')
const bitcoin = require('bitcoinjs-lib')
const colors = require('colors')

function Distributor (configFilePath) {
  let self = this
  this.configFilePath = configFilePath
  this.webtorrentClient = new WebTorrent()
  this.lightningClient = new DistributorLightningClient(homedir + '/.lightning')
  this.vendorIp = utils.getJsonAttribute(configFilePath, 'vendorIp')
  this.vendorPort = utils.getJsonAttribute(configFilePath, 'vendorPort')
  this.socketIOClient = require('socket.io-client')('http://' + this.vendorIp + ':' + this.vendorPort)
  this.socketIOClient.on('connect', () => {
    debug('Connected to socket in ' + this.vendorIp + ':' + this.vendorPort)
    console.log(colors.green('Distributor: listening to new patch update event'))
  })
  this.socketIOClient.on('disconnect', () => {debug('Disconnected from socket in ' + this.vendorIp)})
  this.socketIOClient.on('newPatchUpdateAvailableDistributors', (data) => {
    console.log(colors.green('Distributor: new update available!'))
    self.downloadAndSeedUpdate(data)
  })
  this.torrent = null
  this.nodeId = null
  debug('Waiting to connect to vendor at ', this.vendorIp + ':' + this.vendorPort)
}

Distributor.prototype.downloadAndSeedUpdate = function (data) {
  let self = this
  let message = data.data
  debug('My peerId = ', this.webtorrentClient.peerId)

  const keyPair = bitcoin.ECPair.fromPublicKey(Buffer.from(utils.getJsonAttribute(self.configFilePath, 'vendorPublicKey'), 'hex'))
  let msgHash = crypto.createHash('sha256').update(JSON.stringify(message)).digest('hex')

  if (!keyPair.verify(Buffer.from(msgHash, 'hex'), data.signature)) {
    debug('newPatchUpdateAvailable event not sent from vendor')
    return
  }
  self.deleteUpdateFileIfExists()
  if (self.torrent && self.torrent.infoHash === message.torrentInfoHash) {
    debug('torrent already exists')
    return
  }

  this.webtorrentClient.add(message.torrentInfoHash, {path: path.join(__dirname, 'downloads/')},
    function (torrent) {
      self.torrent = torrent
      self.torrent.on('wire', (wire) => self.requestPayPerPiece(wire))
      self.torrent.once('download', (bytes) => {
        debug('Seeding new update, torrentInfoHash = %s, fileHashSHA256 = %s ', message.torrentInfoHash, message.fileHashSHA256)
      })
    })
}

/**
 * Distributor listens to the event fired right after a piece has been sent, create a payment request for this piece, send it to the IoT,
 * and wait for the IoT payment.
 * The distributor first sends a piece to an IoT identified by webTorrent's peerId identifier. The distributor then blocks this IoT until it pays for
 * this piece. Identification by peerId is only for PoC purposes, better identification way is required.
 * @param  {object} wire - object constructed by webTorrent, holds the duplex connection between two peers
 */
Distributor.prototype.requestPayPerPiece = function (wire) {
  let self = this
  if (self.torrent.chokedPeers.has(wire.peerId)) {
    wire.choke()
    debug('peerId = %s ', wire.peerId, 'is choked, waiting for payment on the previous piece')
    return
  }
  // upload event is fired after a piece has been sent to IoT
  wire.on('upload', async function (length, index) {
    await onPieceSent(index)
  })
  wire.on('close', () => {console.log('my close, peerId = %s', wire.peerId)})

  async function onPieceSent (index) {

    try {
      debug('Sent piece index = %s to peerId = %s', index, wire.peerId)
      debug('peerId = %s is choked, waiting for pay for piece index = %s', wire.peerId, index)
      console.log(colors.yellow(`Distributor: sends piece #${index} & invoice`))
      wire.choke()
      self.torrent.chokedPeers.add(wire.peerId)
      if (!self.nodeId) {
        self.nodeId = await self.lightningClient.getNodeId()
      }
      let hubNodeId = utils.getJsonAttribute(self.configFilePath, 'lightningHubNodeId')
      debug('Before payment request for index %s for peer %s', index, wire.peerId)
      let result = await self.lightningClient.requestPayment(self.nodeId, hubNodeId, PRICE_PER_PIECE, index, wire.peerId)
      debug('payment request for index %s for peer %s, is %o =', index, wire.peerId, result)
      let bolt11 = result.bolt11
      let label = result.label
      let data = {
        distributorNodeId: self.nodeId,
        pieceIndex: index,
        pricePerPiece: PRICE_PER_PIECE,
        bolt11: bolt11
      }
      debug('data for peerId = %s, for piece index = %s, data = %o', wire.peerId, index, data)
      let buffer = Buffer.from(JSON.stringify(data))
      debug('buffer for peerId = %s, for piece index = %s, buffer = %o', wire.peerId, index, buffer)
      wire._message(PAYMENT_REQ, [0, 0], buffer)
      debug('wait for payment from peerID = %s, for piece index = %s', wire.peerId, index)
      let interval = setInterval(async () => {
        let invoiceStatus = await self.lightningClient.invoiceStatus(label)
        debug('invoiceStatus status = %o', invoiceStatus)
        if (invoiceStatus.invoices[0].status === 'paid') {
          debug('statusComplete status = %s', invoiceStatus.invoices[0].status)
          debug('pay per piece index = %s accepted, unchoking peerId = %s', index, wire.peerId)
          wire.unchoke()
          self.torrent.chokedPeers.delete(wire.peerId)
          debug('peerId = %s ', wire.peerId, 'is unchoked')
          clearInterval(interval)
        }
      }, 2000)

    } catch (err) {
      debug('err = %o', err)

    }

  }

}

Distributor.prototype.deleteUpdateFileIfExists = function () {
  let filePath = path.join(__dirname, 'downloads/', 'updateFile')
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath)
    } catch (err) {
      debug(err)
    }
  }

}

module.exports = Distributor
