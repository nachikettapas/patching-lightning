const fs = require('fs')
const createDebug = require('debug')
createDebug.formatters.h = (v) => {
  return typeof v === 'undefined' ? 'undefined' : v.toString('hex')
}
const debug = createDebug('iotpc:utils')

function Utils () {

}

Utils.createDebug = createDebug

Utils.toBuffer = function (v) {
  if (Buffer.isBuffer(v)) {
    return v
  }
  if (typeof v === 'object' && v.type === 'Buffer') {
    return Buffer.from(v)
  }
  let _isHex = isHex(v)
  if (!_isHex) {
    v = Utils.trim0x(v)
    _isHex = isHex(v)
  }
  return _isHex ? Buffer.from(v, 'hex') : v
}

Utils.getJsonAttribute = function (config_file_path, attribute_name) {
  let json = JSON.parse(fs.readFileSync(config_file_path, 'utf8'))
  return json[attribute_name]
}

Utils.setJsonAttribute = function (config_file_path, attribute_name, attribute_value, log_value) {
  let json_to_edit = JSON.parse(fs.readFileSync(config_file_path, 'utf8'))
  json_to_edit[attribute_name] = attribute_value
  if (json_to_edit) {
    fs.writeFileSync(config_file_path, JSON.stringify(json_to_edit, null, '\t'), 'utf8')
    debug('Utils::setJsonAttribute:: ' + log_value + ' was written successfully')
  } else {
    debug('Utils::setJsonAttribute:: could not read configuration file properly ')
  }
}

Utils.createConfigFile = function (config_file_path, json_to_write) {
  fs.writeFile(config_file_path, JSON.stringify(json_to_write, null, '\t'), 'utf8', function (err, res) {
    if (!err) {
      debug('Utils::createConfigFile:: written successfully')
    } else {
      debug(err)
    }
  })
}


module.exports = Utils
