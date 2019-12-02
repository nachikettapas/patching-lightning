
const fs = require('fs')
const path = require('path')
let configFilePath = path.join(__dirname, 'IoT_config.json')
if (!fs.existsSync(configFilePath)) {
  configFilePath = path.join(__dirname, 'IoT_config_default.json')
}
const IoT = require(path.join(__dirname, 'IoT.js'))
const iot = new IoT(configFilePath)
