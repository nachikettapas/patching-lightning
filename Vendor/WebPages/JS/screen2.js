/**
 * Created by User on 19/07/2018.
 */

/* to be done- deep clone of json objects */

// var currentJson=Object.assign({}, json);
var currentJson = jQuery.extend(true, {}, mapMarkersJson)
var socket
var avgTimeToDownload
var totalPaid
/* session storage
*
* "numOfDevices"= represent the total IOT devices on te board
*
* "numOfUpdatedDevices"= represent the total num of devices that was updated
*
* */

(function ($) {
  $(document).ready(function () {
  
	$('#start_state_div').css("display","block");
	$('#IOT_state_div').css("display","none");
	$('#distributions_state_div').css("display","none");
	avgTimeToDownload = 0
  totalPaid = 0
	var numOfDevices = 0
    socket = io()
    socket.on('connect', () => {
      console.log('connected')
    })
    socket.on('iotUpdated', function (iotPublicKey) {
      console.log('IoT public key = %s ', iotPublicKey, 'updated successfully')
      newUpdate(iotPublicKey)
    })
    $.get('/iotsPublicKeys', (iotsPublicKeys) => {
      console.log('iotsPublicKeys =', iotsPublicKeys)
      numOfDevices = iotsPublicKeys.length
      console.log('numOfDevices =', numOfDevices)
      let keysSubset = Object.keys(currentJson).slice(0, numOfDevices)
      console.log('keysSubset =', keysSubset)
      currentJson = keysSubset.reduce(function (o, k) {
        o[k] = currentJson[k]
        return o
      }, {})
      console.log('currentJson =', currentJson)
      Object.keys(currentJson).forEach((key, index) => {
        currentJson[key].publicKey = iotsPublicKeys[index]
      })
      console.log('currentJson post publicKey assignment =', currentJson)
      numOfDevices = iotsPublicKeys.length
      if (sessionStorage.getItem('currentJson') != null) {
        currentJson = JSON.parse(sessionStorage.getItem('currentJson'))
      }
      console.log('numOfDevices = ', numOfDevices)
      if (sessionStorage.length === 0) { // first time on the page
        sessionStorage.setItem('numOfDevices', numOfDevices)
        sessionStorage.setItem('numOfUpdatedDevices', 0) // to be changed
        // we want to reload the *localJson* map, according to num of IOT devices that was returned from the server.
      } else {
        // we want to reload the *currentJson* map, according to "numOfDevices" session var.
        sessionStorage.clear() // clear for now for each run.
        sessionStorage.setItem('numOfDevices', numOfDevices)
        sessionStorage.setItem('numOfUpdatedDevices', 0) // to be changed
      }

      numOfDevices = JSON.parse(sessionStorage.getItem('numOfDevices'))
      var numOfUpdatedDevices = JSON.parse(sessionStorage.getItem('numOfUpdatedDevices'))
      updateProgessBarAndHeader(numOfDevices, 0)
	  addRowDistributor(numOfUpdatedDevices,"Key","Paid","Time");

      createKBmap('IDofCreatedMap', 'images/dotted_Map.png') // creates map
      IDofCreatedMap.importJSON(currentJson) // import json data into map
      IDofCreatedMap.showAllMapMarkers()
	  
	          //TO DO- update icons txt

    })
  })
})(jQuery)

function newUpdate (updateData) {
  $('#start_state_div').css("display","none");
  $('#IOT_state_div').css("display","block");
  $('#distributions_state_div').css("display","none");
  
  updateMapMarkerInCurrJson(updateData.iotPublicKey)
  removeCurrMap(sessionStorage.getItem('numOfDevices')) // delete current markers from map
  sessionStorage.setItem('currentJson', JSON.stringify(currentJson))
  IDofCreatedMap.importJSON(currentJson) // import json data into map
  IDofCreatedMap.showAllMapMarkers() // show all markers stored in map object
  var numOfDevices = JSON.parse(sessionStorage.getItem('numOfDevices'))
  var numOfUpdatedDevices = JSON.parse(sessionStorage.getItem('numOfUpdatedDevices')) + 1
  sessionStorage.setItem('numOfUpdatedDevices', numOfUpdatedDevices)
  updateProgessBarAndHeader(numOfDevices, numOfUpdatedDevices)
  var timeToDownloadSec = parseFloat(updateData.totalTimeToDownloadMs / 1000).toFixed(2)
  addRowDistributor(numOfUpdatedDevices, updateData.iotPublicKey, updateData.totalPaid, timeToDownloadSec);
  updateAvgDownloadTime(timeToDownloadSec, numOfUpdatedDevices)
  updateTotalSatoshiPaid(updateData.totalPaid)
}

function initJsonVar (data, numOfDevices) {
  var test = {}
  for (var i = 0; i < numOfDevices; i++) {
    Object.values(currentJson)[i].address = data[i]
    var index = i + 1
    var objName = 'mapMarker' + index.toString()
    test[objName] = currentJson[objName]
  }
  currentJson = jQuery.extend(true, {}, test)
}

function updateMapMarkerInCurrJson (iotPublicKey) {
  for (var i = 0; i < sessionStorage.getItem('numOfDevices'); i++) {
    console.log('Object.values(currentJson)[' + i + '] =', Object.values(currentJson)[i])
    if (Object.values(currentJson)[i].publicKey === iotPublicKey) {
      let obj = Object.values(currentJson)[i]
      obj.icon = 'images/Active_icon.png'
      obj.markerUrl = `/iot/${iotPublicKey}`
    }
  }
}

function removeCurrMap (numOfMarkers) {
  for (i = 1; i <= numOfMarkers; i++) {
    var mapMarkerName = 'mapMarker' + (i)
    IDofCreatedMap.removeMarker(mapMarkerName)
  }
}

function updateProgessBarAndHeader (numOfDevices, numOfUpdatedDevices) {
  var percentage = calculatePercentage(numOfUpdatedDevices, numOfDevices)
  //$('.progress-bar').css('width', percentage + '%').attr('aria-valuenow', percentage)
  document.getElementById('updateStatusLabelAmount').innerHTML = numOfUpdatedDevices + '/' + numOfDevices
}

function calculatePercentage (numOfUpdatedDevices, numOfDevices) {
  return (numOfUpdatedDevices / numOfDevices) * 100
}

function addRowDistributor(numOfUpdatedDevices,IotPublicKey, paid, time){
    row='<td class="text-center icons-txt">'+
            '<label  id="IotPublicKey"'+numOfUpdatedDevices+'>'+IotPublicKey+'</label>'+
        '</td>'+
        '<td class="text-center icons-txt">'+
            '<label  id="paid"'+numOfUpdatedDevices+'>'+paid+'</label>'+
        '</td>'+
        '<td class="text-center icons-txt">'+
            '<label  id="time"'+numOfUpdatedDevices+'>'+time+'</label>'+
        '</td>'
    $('#row'+(numOfUpdatedDevices-1)).html(row);
    $('#table1').append('<tr id="row'+(numOfUpdatedDevices)+'"></tr>');

}

function removeRowDistributor(numOfUpdatedDevices) {
    if(numOfUpdatedDevices>1){
        $("#row"+(numOfUpdatedDevices-1)).html('');
        numOfUpdatedDevices--;
    }
}

function updateAvgDownloadTime(timeToDownloadSec, numOfUpdatedDevices){
  timeToDownloadSec = parseFloat(timeToDownloadSec)
  numOfUpdatedDevices = parseFloat(numOfUpdatedDevices)
  avgTimeToDownload = parseFloat(avgTimeToDownload)
  avgTimeToDownload = (numOfUpdatedDevices - 1)*(avgTimeToDownload) + timeToDownloadSec
  avgTimeToDownload = parseFloat(avgTimeToDownload / numOfUpdatedDevices).toFixed(2)
  document.getElementById('time_icon_txt').innerHTML = avgTimeToDownload
}

function updateTotalSatoshiPaid(paidPerIoT){
  var floatPaidPerIoT = parseFloat(paidPerIoT)
  console.log('paid for iot = ', paidPerIoT)
  totalPaid += floatPaidPerIoT
  console.log('total paid (sat) = ', totalPaid)
  console.log('total paid dollar = ', totalPaid * 0.00000003)
  document.getElementById('b_icon_txt').innerHTML = totalPaid + ' msatoshi'
  document.getElementById('d_icon_txt').innerHTML = (totalPaid * 0.00000003).toFixed(7)

}

