const utils = require('./Utils')
const commandLineArgs = require('command-line-args')
const homedir = require('os').homedir()
/**
 * Script that generates Bitcoin wallet from hsm_secret file that lightning-c provides in .lightning/hsm_secret
 */
function generateAddress () {
  const optionDef = [
    {name: 'hsmSecretPath', type: String},
    {name: 'configFilePath', type: String}
  ]
  const options = commandLineArgs(optionDef)
  const fs = require('fs')
  const bitcoin = require('bitcoinjs-lib')
  let hsmSecretPath = options.hsmSecretPath
  let hsmSecret = fs.readFileSync(hsmSecretPath, 'hex')
  console.log('hsmSecret = ', hsmSecret)
  const spawn = require('child_process').spawn
  const pythonProcess = spawn('python3', [homedir+'/patching-lightning/Utils/AddressGeneration/keyDerivation.py', hsmSecret])
  pythonProcess.stdout.on('data', (data) => {
    let privateKey = data.toString()
    if(privateKey.length === 63)
      privateKey = '0' + privateKey
    console.log('privateKey = ', privateKey)
    const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'))
    let publicKey = keyPair.publicKey.toString('hex')
    console.log('publicKey = ', publicKey)
    utils.setJsonAttribute(options.configFilePath, 'publicKey', publicKey, 'publicKey')
    utils.setJsonAttribute(options.configFilePath, 'sk', privateKey, 'sk')

  })
}

generateAddress()