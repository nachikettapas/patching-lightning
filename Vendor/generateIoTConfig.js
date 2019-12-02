const utils = require('../Utils/Utils')
const commandLineArgs = require('command-line-args')
const createConfig = require('../Deployment/createConfig')
const bitcoinCore = require('bitcoin-core')
const homedir = require('os').homedir()
const configFilePath = 'Vendor_config.json'

/**
 * Script that generates Bitcoin wallet from hsm_secret file that lightning-c provides in .lightning/hsm_secret
 * This script is used for vendor to generate wallets for IoT devices
 */
async function generateIoTConfig () {
  const optionDef = [
    {name: 'hsmSecretPath', type: String}
  ]
  const options = commandLineArgs(optionDef)
  const fs = require('fs')
  const bitcoin = require('bitcoinjs-lib')
  let hsmSecretPath = options.hsmSecretPath
  let hsmSecret = fs.readFileSync(hsmSecretPath, 'hex')
  console.log('hsmSecret = ', hsmSecret)
  const spawn = require('child_process').spawn
  const pythonProcess = spawn('python3', [homedir+'/patching-lightning/Utils/AddressGeneration/keyDerivation.py', hsmSecret])
  pythonProcess.stdout.on('data', async (data) => {
    let privateKey = data.toString()
    if(privateKey.length === 63)
      privateKey = '0' + privateKey
    console.log('private key = ', privateKey)
    const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'))
    let publicKey = keyPair.publicKey
    console.log('publicKey = ', publicKey.toString('hex'))
    let bitcoinNetwork = utils.getJsonAttribute(homedir+'/patching-lightning/Deployment/Deployment_config.json', 'bitcoinNetwork')
    let rpcUserName = utils.getJsonAttribute(homedir+'/patching-lightning/Deployment/Deployment_config.json', 'rpcUserName')
    let rpcPassword = utils.getJsonAttribute(homedir+'/patching-lightning/Deployment/Deployment_config.json', 'rpcPassword')
    let host = utils.getJsonAttribute(homedir+'/patching-lightning/Deployment/Deployment_config.json', 'host')
    const bitcoinClient = new bitcoinCore({
      network: bitcoinNetwork,
      username: rpcUserName,
      password: rpcPassword,
      host: host
    })
    const testnet = bitcoin.networks.testnet
    const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: testnet })
    const address = bitcoin.payments.p2sh({ redeem: p2wpkh, network: testnet }).address
    console.log('address = ', address)
    let txid = await bitcoinClient.sendToAddress(address, '0.01')
    if (!txid) {
      console.log('can not fund iot pubKey = ', publicKey)
      return
    }
    console.log('txid = ', txid)
    let iotPublicKeys = utils.getJsonAttribute(homedir+'/patching-lightning/Vendor/Vendor_config.json', 'iotPublicKeys')
    if (iotPublicKeys.indexOf(publicKey.toString('hex')) === -1) {
      iotPublicKeys.push(publicKey.toString('hex'))
      utils.setJsonAttribute(homedir+"/patching-lightning/Vendor/"+configFilePath, 'iotPublicKeys', iotPublicKeys, 'iotPublicKeys')
    }

    createConfig.createIoTConfig(getOwnLanIp(), utils.getJsonAttribute(homedir+"/patching-lightning/Vendor/" + configFilePath, 'vendorPort'),
      utils.getJsonAttribute(homedir+"/patching-lightning/Vendor/" + configFilePath, 'publicKey'), txid, privateKey, publicKey.toString('hex'), homedir+'/patching-lightning/Vendor/IoT_config.json')

  })
}

function getOwnLanIp () {
  let os = require('os')
  let ifaces = os.networkInterfaces()
  for (let ifname in ifaces) {
    if (ifaces.hasOwnProperty(ifname)) {
      let alias = 0
      for (let ifaceKey in ifaces[ifname]) {
        let iface = ifaces[ifname][ifaceKey]
        if ('IPv4' !== iface.family || iface.internal !== false) {
          // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
          continue
        }

        if (alias >= 1) {
          // this single interface has multiple ipv4 addresses
          console.log(ifname + ':' + alias, iface.address)
        } else {
          // this interface has only one ipv4 adress
          return iface.address
        }
        ++alias
      }

    }
  }

}

generateIoTConfig()