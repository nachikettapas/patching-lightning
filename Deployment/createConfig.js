module.exports = createConfig
const createDebug = require('debug')
const homedir = require('os').homedir()

createDebug.formatters.h = (v) => {
  return typeof v === 'undefined' ? 'undefined' : v.toString('hex')
}
const debug = createDebug('iotpc:createConfig')
const fs = require('fs')

function createConfig () {}

createConfig.createConfig = function () {
  if (!process.argv[2].includes('--hsmSecretPath')) {
    const commandLineArgs = require('command-line-args')
    const optionDef = [
      {name: 'type', type: String},
      {name: 'vendorPort', type: String},
      {name: 'lightningHubNodeId', type: String},
      {name: 'vendorPubKey', type: String},
      {name: 'vendorIp', type: String}
    ]
    const options = commandLineArgs(optionDef)

    switch (options.type) {
      case 'Vendor':
        createConfig.createVendorConfig(options.vendorPort)
        break
      case 'Distributor':
        createConfig.createDistributorConfig(options.lightningHubNodeId, options.vendorIp, options.vendorPort, options.vendorPubKey)
        break
      case 'IoT':
        createConfig.createIoTConfig(options.vendorIp, options.vendorPort, options.vendorPubKey, options.sk, options.publicKey)
        break
    }
  }
}

createConfig.createVendorConfig = function (vendorPort) {
  let vendorConfig = {
    vendorPort: vendorPort,
    iotPublicKeys: []
  }
  createConfig.writeConfigFile(vendorConfig, homedir + '/patching-lightning/Vendor/Vendor_config.json')
}

createConfig.createDistributorConfig = function (lightningHubNodeId, vendorIp, vendorPort, vendorPubKey) {
  let distConfig = {
    lightningHubNodeId: lightningHubNodeId,
    vendorIp: vendorIp,
    vendorPort: vendorPort,
    vendorPublicKey: vendorPubKey,
  }
  createConfig.writeConfigFile(distConfig, homedir + '/patching-lightning/Distributor/Distributor_config.json')
}

createConfig.createIoTConfig = function (vendorIp, vendorPort, vendorPubKey, txid, sk, publicKey, configFilePath) {
  let iotConfig = {
    vendorIp: vendorIp,
    vendorPort: vendorPort,
    vendorPublicKey: vendorPubKey,
    txid: txid,
    sk: sk,
    publicKey: publicKey
  }
  createConfig.writeConfigFile(iotConfig, configFilePath)
}

createConfig.writeConfigFile = function (fileToWrite, config_file_path) {
  fs.writeFile(config_file_path, JSON.stringify(fileToWrite, null, '\t'), 'utf8', function (err, res) {
    if (!err) {
      debug('Config file was written successfully')
    } else {
      debug(err)
    }
  })
}

createConfig.createConfig()