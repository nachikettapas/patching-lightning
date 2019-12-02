
const fs = require('fs')
const path = require('path')
let configFilePath = path.join(__dirname, 'Distributor_config.json')
if (!fs.existsSync(configFilePath)) {
  configFilePath = path.join(__dirname, 'Distributor_config_default.json')
}
const Distributor = require(path.join(__dirname, 'Distributor.js'))
const distributor = new Distributor(configFilePath)
