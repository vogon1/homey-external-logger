require('jsdom/lib/old-api').env({  
  html: "<html><body></body></html>",
  scripts: [ 'https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js' ],
  done: function (err, window) {

  setup = {
    protocol: 'http', // Change to https if using athom cloud
    ip: 'your_ip', // Put your ip here or athom cloud uri,
    bearer_token: 'your_token', // Put your bearer token here
    cookie: 'bearer_token=your_token', // Put your bearer token here also
    useragent: 'Mozilla/5.0.(Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115.Safari/537.36'
  }

  var $ = window.jQuery;

  var devices = []
  var apps = []
  var setting = {}
  
  $.ajaxSetup({headers: {Authorization: 'Bearer ' + setup.bearer_token}})

  String.prototype.capitalizeFirstLetter = function() {
      return this.charAt(0).toUpperCase() + this.slice(1);
  }

  function addLogEntry (event, data, category, optionalStyle) {
    if (!data) data = ''
    log = new Date().toISOString() + ' ' + event.capitalizeFirstLetter() + ' ' + (!data ? '' : JSON.stringify(data));
    console.log(log)
  }

  function getDeviceNameById (searchId) {
    var result = null
    devices.forEach(function (device, index) {
      if (device.id === searchId) {
        result = device.name
      }
    })
    return result
  }

  function listenManagerDevices (io) {
    var socket = io.connect(setup.protocol + '://' + setup.ip + '/realtime/manager/devices/', {query: 'token=' + setup.bearer_token, transports: ['websocket', 'polling']})
    var _onevent = socket.onevent
    socket.on('disconnect', function() {
      console.log('Got disconnect!')
    })
    socket.onevent = function (packet) { //Override incoming socket events
      var args = packet.data || []
      // console.log('***', 'realtime/manager/devices/', packet.data[0], packet.data[1].device_id, packet.data[1].message, packet)
      addLogEntry(getDeviceNameById(packet.data[1].device_id), packet.data[0], 'deviceManager', 'danger')
    }
  }

  function listenDevices (io) {
    // get all devices and handels all events on /realtime/device/device_id/
    $.getJSON(setup.protocol + '://' + setup.ip + '/api/manager/devices/device/', function(data) {
      addLogEntry('Start device listener', 'Will listen to realtime events of ' + Object.keys(data.result).length + ' devices', 'devices')
      $.each(data.result, function (index, resultDevice) {
        var device = {
          id: resultDevice.id,
          name: resultDevice.name
        }
        devices.push(device)
        var deviceSocket = io.connect(setup.protocol + '://' + setup.ip + '/realtime/device/' + device.id + '/',
              { extraHeaders: { 
                    Cookie: setup.cookie,
                    "User-Agent": setup.useragent
                  },
                transports: ['websocket', 'polling'] 
              })
        // console.log(setup.protocol + '://' + setup.ip + '/realtime/device/' + device.id + '/')
        var _onevent = deviceSocket.onevent
        deviceSocket.onevent = function (packet) { //Override incoming socket events
          // console.log(packet)
          var args = packet.data || []
          addLogEntry(device.name, args, 'devices')
          _onevent.call(deviceSocket, packet)
        }
      })
    })
  }

  function listenApps (io) {
    // get all apps and handels all events on /realtime/app/app_id/
    $.getJSON(setup.protocol + '://' + setup.ip + '/api/manager/apps/app', function(data) {
      // addLogEntry('Start app listener', 'Will listen to realtime events of ' + Object.keys(data.result).length + ' apps', 'apps')
      $.each(data.result, function (index, resultApp) {
        var app = {
          id: resultApp.id,
          name: resultApp.name.en
        }
        apps.push(app)
        var appSocket = io.connect(setup.protocol + '://' + setup.ip + '/realtime/app/' + app.id + '/',
              { extraHeaders: { 
                    Cookie: setup.cookie,
                    "User-Agent": setup.useragent
                  },
                transports: ['websocket', 'polling'] 
              })
        var _onevent = appSocket.onevent
        appSocket.onevent = function (packet) { //Override incoming socket events
          var args = packet.data || []
          // console.log('*** realtime/app', 'onevent', args, packet, app)
          addLogEntry(app.name, args, 'apps')
          _onevent.call(appSocket, packet)
        }
      })
    })
  }

  function listenOn (namespace, category, io) {
        var socket = io.connect(setup.protocol + '://' + setup.ip + namespace,
              { extraHeaders: { 
                    Cookie: setup.cookie,
                    "User-Agent": setup.useragent
                  },
                transports: ['websocket', 'polling'] 
              })
    socket.onevent = function (packet) { //Override incoming socket events
      var args = packet.data || []
      // console.log('***', namespace, packet.data[0], packet.data[1], packet)
      addLogEntry(category + ': ' + packet.data[0], packet.data[1], category)
    }
  }

  function listenToAll (io) {
    listenOn('/realtime/manager/apps/', 'appsManager', io)
    listenApps(io)
    listenDevices(io)
    listenManagerDevices(io)
    listenOn('/realtime/manager/flow/', 'flow', io)
    listenOn('/realtime/manager/geolocation/', 'geolocation', io)
    listenOn('/realtime/manager/insights/', 'insights', io)
    listenOn('/realtime/manager/ledring/', 'ledring', io)
    listenOn('/realtime/manager/speech-output/', 'speechOutput', io)
    listenOn('/realtime/manager/speech-input/', 'speechInput', io)
    listenOn('/realtime/manager/zwave/', 'zwave', io)
    listenOn('/realtime/manager/notifications/', 'notifications', io)
    listenOn('/realtime/manager/presence/', 'presence', io)
  }

   io=require("socket.io-client")
   listenToAll(io)
  }
})
