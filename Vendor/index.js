
const fs = require('fs')
const path = require('path')
let configFilePath = path.join(__dirname, 'Vendor_config.json')
if (!fs.existsSync(configFilePath)) {
  configFilePath = path.join(__dirname, 'Vendor_config_default.json')
}
const Vendor = require(path.join(__dirname, 'Vendor.js'))
const vendor = new Vendor(configFilePath)
