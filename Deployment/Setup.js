const configFilePath = './Deployment_config.json'
const LightningClient = require('../Utils/LightningClient')
const utils = require('../Utils/Utils')
const bitcoinClient = require('bitcoin-core')
const commandLineArgs = require('command-line-args')
const homedir = require('os').homedir()
const clientLightning = new LightningClient(homedir + '/.lightning')
const bitcoinNetwork = utils.getJsonAttribute(configFilePath, 'bitcoinNetwork')
const rpcUserName = utils.getJsonAttribute(configFilePath, 'rpcUserName')
const rpcPassword = utils.getJsonAttribute(configFilePath, 'rpcPassword')
const lightningHost = utils.getJsonAttribute(configFilePath, 'host')
const lightningHubNodeID = utils.getJsonAttribute(configFilePath, 'lightningHubNodeID')
const lightningPort = utils.getJsonAttribute(configFilePath, 'lightningPort')
const clientBitcoin = new bitcoinClient({ network: bitcoinNetwork, username: rpcUserName, password: rpcPassword, host: lightningHost });

/**
 * used in order to fund an address
 */
async function setup () {

  let lightningSync = false
  let lightningAddr = ''
  let tx = ''
  let txData = ''
  const amountForChannel = '0.001'
  const lightningNodeID = await clientLightning.getNodeId()

  const optionDef = [
    {name: 'type', type: String},
    {name: 'invoice', type: String}
  ]
  const options = commandLineArgs(optionDef)
  let clientType = options.type
  let invoiceToHub = options.invoice
  if (!invoiceToHub) {invoiceToHub = ''}

  if (clientType === 'iot') {
    tx = utils.getJsonAttribute(homedir + "/patching-lightning/IoT/IoT_config.json", 'txid')
  }
  console.log("txid from config file: ", tx)
  let interval = setInterval(async function () {
    const bitcoinLastBlock = await clientBitcoin.command('getblockcount')
    const lightningLastBlock = await clientLightning.getLastBlock()
    console.log('Bitcoin last block: ' + bitcoinLastBlock + ' Lightning last block: ' + lightningLastBlock)
    if (bitcoinLastBlock === lightningLastBlock) {
      lightningSync = true
      console.log('Lightning sync succeeded')

      if (lightningSync === true) {
        lightningAddr = await clientLightning.getListAddrs()
        lightningAddr = lightningAddr.addresses[0].p2sh
        console.log('Lightning address is: ', lightningAddr)
      }

      if (clientType === 'distributor') {
        if (lightningSync === true && lightningAddr !== '') {
          tx = await clientBitcoin.sendToAddress(lightningAddr, amountForChannel)
        }
      }
      console.log('Bitcoin transaction to lightning address, txid: ', tx)
      clearInterval(interval)
      let bitcoinConfirm = false
      let lightningTxConfirm = ''
      if (tx !== '') {
        let waitTx = setInterval(async function () {
          txData = await clientBitcoin.command('gettransaction', tx)
          if (txData.confirmations > 0){
            console.log('Transaction from bitcoin to lightning address succeeded')
            clearInterval(waitTx)
            bitcoinConfirm = true
            try {
              if (bitcoinConfirm === true) {
                lightningTxConfirm = await clientLightning.connectToChannel(lightningHubNodeID,lightningHost,lightningPort,10000)
                console.log('Lightning connection to channel output:', lightningTxConfirm)
              }
            }catch (err){
              console.log(err)
            }
            try {
              if (lightningTxConfirm !== '') {
                let waitToChannel = setInterval(async function () {
                  let channelStatus = await clientLightning.hasChannel(lightningNodeID, lightningHubNodeID)
                  if (channelStatus) {
                    console.log('Channel is public')
                    if (clientType === 'distributor' && invoiceToHub !== '') {
                      console.log('Invoce:',  invoiceToHub)
                      let payResult = await clientLightning.pay(invoiceToHub)
                      console.log(payResult)
                    }
                    clearInterval(waitToChannel)
                  }
                  else {
                    console.log('Channel is not public, Wait 5 minutes - ', new Date())
                  }
                }, 300000)
              }

            }catch (err){
              console.log(err)
            }

          }
          else {
            console.log('Wait 5 minute for a transaction to be confirmed - ', new Date())
          }
        }, 300000)
      }


    } else {
      console.log('Lightning sync in progress...')
    }
  }, 30000)
}

setup()