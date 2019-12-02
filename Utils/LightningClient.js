'use strict'
const LightningcClient = require('lightning-client')
const debug = require('debug')('LightningClient')
const crypto = require('crypto')

function LightningClient (path) {
  this.clientLightning = new LightningcClient(path, true)
}

/**
 * Connect to lightning payment channel
 * @param  {string} nodeId - Lightning network identifier
 * @param  {string} ip
 * @param  {string} port
 * @param  {string} amount - amount in satoshi for the lightning funding transaction
 */
LightningClient.prototype.connectToChannel = async function (nodeId, ip, port, amount) {
  let result = ''
  try {
    await this.clientLightning.connect(nodeId, ip, port)
    result = await this.confirmationsConnection(nodeId, amount)
    debug(result)
  } catch (err) {
    debug('err = %o', err)
  }
  return result
}

LightningClient.prototype.confirmationsConnection = async function (nodeId, amountInSatoshis) {
  let res = ''
  try {
    res = await this.clientLightning.fundchannel(nodeId, amountInSatoshis)
    debug(res)
  } catch (err) {
    debug('err = %o', err)
  }
  return res
}

/**
 * Close connection to channel
 * @param  {string} nodeId - Lightning network identifier
 */
LightningClient.prototype.closeChannel = async function (nodeId) {
  try {
    const res = await this.clientLightning.close(nodeId)
    debug(res)
  } catch (err) {
    debug('err = %o', err)
  }
}

LightningClient.prototype.hasChannel = async function (nodeID, hubNodeId) {
  let res = false
  try {
    const listaddrs = await this.clientLightning.listpeers()
    if (listaddrs.peers.length > 0) {
      for (let peer of listaddrs.peers) {
        let peerID = peer.id
        // check if channel with hub is opened
        if (peerID === hubNodeId) {
          let peerStatus = peer.channels[peer.channels.length - 1].state
          let peerStatusDescription = peer.channels[peer.channels.length - 1].status[peer.channels[peer.channels.length - 1].status.length - 1]
          if (peerStatus === 'CHANNELD_NORMAL') {
            debug(peerStatusDescription)
            res = true
            break
          } else {
            debug(peerStatusDescription)
          }
        }
      }
      listaddrs.peers.forEach(function (peer) {
        let peerID = peer.id
        // check if channel with hub is opened
        if (peerID === hubNodeId) {
          let peerStatus = peer.channels[peer.channels.length - 1].state
          let peerStatusDescription = peer.channels[peer.channels.length - 1].status[peer.channels[peer.channels.length - 1].status.length - 1]
          if (peerStatus === 'CHANNELD_NORMAL') {
            debug(peerStatusDescription)
            res = true
          } else {
            debug(peerStatusDescription)
          }
        }
      })
    } else {
      debug('hasChannel: Peer list is empty')
    }
    if (res === true) {
      let channels = await this.clientLightning.listchannels()
      for (let i = 0; i < channels.channels.length && res; i++) {
        if (channels.channels[i].source === nodeID &&
          channels.channels[i].destination === hubNodeId &&
          channels.channels[i].public === false) {
          debug('hasChannel: Channel is not public')
          res = false
        }
      }
    }
  } catch (err) {
    debug('err = %o', err)
  }
  debug('hasChannel result:', res)
  return res
}

/**
 * Create an invoice for {msatoshi} with {label} and {description} with optional {expiry} seconds (default 1 hour)
 * @param  {string} nodeId - Lightning network identifier
 * @param  {string} hubNodeId - Lightning node to open channel with, serves as some kind of middleman
 * @param  {string} amount - amount in satoshi for the lightning funding transaction
 */
LightningClient.prototype.requestPayment = async function (nodeID, hubNodeId, amount, pieceIndex, wirePeerId) {

  let result = ''
  try {
    const channelStatus = await this.hasChannel(nodeID, hubNodeId)
    if (channelStatus) {

      let uniqueLabel = crypto.randomBytes(64).toString('hex')
      debug('requestPayment - piece index = %s, wire peer id = %s, unique label = %s', pieceIndex, wirePeerId, uniqueLabel)
      const res = await this.clientLightning.invoice(amount, uniqueLabel, 'transaction')
      debug('requestPayment - Invoice result - %s, piece index = %s, wire peer id = %s', res, pieceIndex, wirePeerId)
      result = {bolt11: res.bolt11, label: uniqueLabel}
    } else {
      debug('requestPayment - Channel not connected')
      result = {bolt11: '', label: ''}
    }
  } catch (err) {
    debug('err = %o', err)
  }
  return result
}

/**
 * Pay a payment request by invoice
 */
LightningClient.prototype.pay = async function (invoice) {
  let res
  try {
    res = await this.clientLightning.pay(invoice)
  } catch (err) {
    debug('err = %o', err)
    if (err.error.code === 205) {
      debug('Could not find a route')
      res = 205
    }
  }
  return res
}

/**
 * Wait for payment event identified by a unique label
 */
LightningClient.prototype.waitInvoice = async function (label) {
  let result = ''
  try {
    const res = await this.clientLightning.waitinvoice(label)
    result = res
  } catch (err) {
    debug('err = %o', err)
  }
  return result
}

/**
 * Decode invoice
 */
LightningClient.prototype.decodeInvoice = async function (invoice) {
  let result = ''
  try {
    const res = await this.clientLightning.decodepay(invoice)
    debug('decode - ', res)
    result = res
  } catch (err) {
    debug('err = %o', err)
  }
  return result
}

LightningClient.prototype.getLastBlock = async function () {
  let result = ''
  try {
    const res = await this.clientLightning.getinfo()
    debug('Lightning last block: ' + res.blockheight)
    result = res.blockheight
  } catch (err) {
    debug('err = %o', err)
  }
  return result
}

LightningClient.prototype.getNodeId = async function () {
  let result = ''
  try {
    const res = await this.clientLightning.getinfo()
    debug('Lightning node ID: ' + res.id)
    result = res.id
  } catch (err) {
    debug('err = %o', err)
  }
  return result
}

LightningClient.prototype.getNodeId = async function () {
  let result = ''
  try {
    const res = await this.clientLightning.getinfo()
    debug('Lightning node ID: ' + res.id)
    result = res.id
  } catch (err) {
    throw new Error(err)
  }
  return result
}

LightningClient.prototype.newAddr = async function () {
  let result = ''
  try {
    const res = await this.clientLightning.newaddr('p2sh-segwit')
    debug('Created new address: ' + res.address)
    result = res.address
  } catch (err) {
    debug('err = %o', err)
  }
  return result
}

LightningClient.prototype.getListAddrs = async function () {
  let result = ''
  try {
    const res = await this.clientLightning.devListaddrs()
    debug('List of lightning addresses: ' + res)
    result = res
  } catch (err) {
    debug('err = %o', err)
  }
  return result
}

LightningClient.prototype.invoiceStatus = async function (label) {
  let result = ''
  try {
    const res = await this.clientLightning.listinvoices(label)
    debug('Invoice Status: %o' + res)
    result = res
  } catch (err) {
    debug('err = %o', err)
  }
  return result
}

module.exports = LightningClient
