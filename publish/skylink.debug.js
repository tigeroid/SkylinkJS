/*! skylinkjs - v0.5.7 - 2015-02-13 */

var globals = {
  apiKey: null,

  region: 'us2',
  
  defaultRoom: null,

  roomServer: '//api.temasys.com.sg',

  enforceSSL: false,
  
  socketTimeout: 0,
  
  TURNServer: true,
  
  STUNServer: true,
  
  ICETrickle: true,
  
  TURNTransport: 'any',
  
  dataChannel: true,
  
  audioFallback: false,
  
  credentials: null
};

var fn = {
  isEmpty: function (data) {
    var isUnDefined = typeof data === 'undefined' || data === null;
    
    if (typeof data === 'object' && !isUnDefined) {
      if (data.constructor === Array) {
        return data.length === 0;
      
      } else {
        return Object.keys(data).length === 0;
      }
    }
    return isUnDefined;
  },
  
  isSafe: function (unsafeFn) {
    try {
      return unsafeFn();
    } catch (error){
      log.warn('Function', error);
      return false;
    }
  },
  
  runSync: function () {
    var args = Array.prototype.slice.call(arguments);
    var i;
    
    var run = function (fn) {
      setTimeout(fn, 1);
      
      args.splice(0, 1);
  
      if (args.length === 0) {
        return;
      }
      run(args[0]);
    };
    
    run(args[0]);
  },
  
  clone: function (obj) {
    if (this.isEmpty(obj) || typeof obj !== 'object') {
      return obj;
    }
    var copy = obj.constructor();
    
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) {
        copy[attr] = obj[attr];
      }
    }
    return copy;
  },
  
  constant: function (main, property, value) {
    var obj = {};
    obj[property] = {
      value: value,
      enumerable: true
    };
    Object.defineProperties(main, obj);
  },
  
  generateUID: function() {
    return (new Date()).getTime().toString();
  },
  
  //Loop through the params, see if callee has any handler for any param's events.
  //If has handler --> apply with args.
  applyHandler: function (callee, params, args) {
    var item = callee;
    var i;
    
    for (i = 0; i < params.length; i += 1) {
      if (!fn.isEmpty(item[params[i]])) {
        item = item[params[i]];
      }
    }

    if (typeof item === 'function') {
      item.apply(this, args);
    }
  },
  
  forEach: function (main, deferItem, deferFin) {
    if (typeof main === 'object' && !fn.isEmpty(main)) {
      // Array objects
      if (main.constructor === Array) {
        var i;
        
        for (i = 0; i < main.length; i += 1) {
          deferItem(main[i], i);
        }
      
      // JSON objects
      } else {
        var key;
        
        for (key in main) {
          if (main.hasOwnProperty(key)) {
            deferItem(main[key], key);
          }
        }
      }
      // Finished loop
      if (typeof deferFin === 'function') {
        deferFin();
      }
    }
  }
  
};
var log = {};

// Parse if debug is not defined
if (typeof window.console.debug !== 'function') {
  window.console.newDebug = window.console.log;

} else {
  window.console.newDebug = window.console.debug;
}

// Parse if trace is not defined
if (typeof window.console.trace !== 'function') {
  window.console.newTrace = window.console.log;

} else {
  window.console.newTrace = window.console.trace;
}

/**
 * The log key
 * @attribute LogKey
 * @type String
 * @readOnly
 * @for Debugger
 * @since 0.5.4
 */
var LogKey = 'Skylink - ';

var Debugger = {
  /**
   * The current log level of Skylink.
   * @property level
   * @type Integer
   * @for Debugger
   * @since 0.5.4
   */
  level: 2,
  
  trace: false,
  
  /**
   * The flag that indicates if Skylink should store the debug logs.
   * @property store
   * @type Boolean
   * @for Debugger
   * @since 0.5.4
   */
  store: false, 
  
  logs: [],
  
  console: {
    log: window.console.log.bind(window.console, LogKey + '<<%s>> %s'),
    
    error: window.console.error.bind(window.console, LogKey + '<<%s>> %s'),
    
    info: window.console.info.bind(window.console, 
      (window.webrtcDetectedBrowser === 'safari' ? 'INFO: ' : '') + LogKey + '<<%s>> %s'),
    
    warn: window.console.warn.bind(window.console, LogKey + '<<%s>> %s'),

    debug: window.console.newDebug.bind(window.console, 
      (typeof window.console.debug !== 'function' ? 'DEBUG: ' : '') + LogKey + '<<%s>> %s')
  },
  
  traceTemplate: {
    log: '==LOG== ' + LogKey + '%s',
    error: '==ERROR== ' + LogKey + '%s',
    info: '==INFO== ' + LogKey + '%s',
    warn: '==WARN== ' + LogKey + '%s',
    debug: '==DEBUG== ' + LogKey + '%s'
  },

  applyConsole: function (type) {
    var args = Array.prototype.slice.call(arguments);
    args.shift();

    if (this.store) {
      logs.push(type, args, (new Date()));   
    }
    
    if (this.trace) {
      return window.console.newTrace.bind(window.console, this.traceTemplate[type]);
    }
    return this.console[type];
  },

  setLevel: function (inputLevel) {
    // Debug level
    if (inputLevel > 3) {
      log.debug = this.applyConsole('debug');
    
    } else {
      log.debug = function () { };
    }
    
    // Log level
    if (inputLevel > 2) {
      log.log = this.applyConsole('log');
    
    } else {
      log.log = function () { };
    }
    
    // Info level
    if (inputLevel > 1) {
      log.info = this.applyConsole('info');
    
    } else {
      log.info = function () { };
    }
    
    // Warn level
    if (inputLevel > 0) {
      log.warn = this.applyConsole('warn');
  
    } else {
      log.warn = function () { };
    }
    
    // Error level
    if (inputLevel > -1) {
      log.error = this.applyConsole('error');
      
    } else {
      log.error = function () { };
    }

    this.level = inputLevel;
  },
  
  configure: function (options) {
    options = options || {};

    // Set if should store logs
    Debugger.store = !!options.store;

    // Set if should trace
    Debugger.trace = !!options.trace;

    // Set log level
    Debugger.setLevel( typeof options.level === 'number' ? options.level : 2 );    
  }
};

Debugger.setLevel(4);

var Skylink = {};

var rooms = [];

var Config = function (options) {
  globals.apiKey = options.apiKey;
  
};

Skylink.init = function (apiKey, name, listener) {
  rooms[name] = new Room(name, listener);
  
  return rooms[name];
};
Skylink.DATA_CHANNEL_STATE = {
  CONNECTING: 'connecting',
  OPEN: 'open',
  CLOSING: 'closing',
  CLOSED: 'closed',
  ERROR: 'error'
};

Skylink.DATA_TRANSFER_DATA_TYPE = {
  BINARY_STRING: 'binaryString',
  ARRAY_BUFFER: 'arrayBuffer',
  BLOB: 'blob'
};

Skylink.DATA_TRANSFER_TYPE = {
  UPLOAD: 'upload',
  DOWNLOAD: 'download'
};

Skylink.DATA_TRANSFER_STATE = {
  UPLOAD_REQUEST: 'request',
  UPLOAD_STARTED: 'uploadStarted',
  DOWNLOAD_STARTED: 'downloadStarted',
  REJECTED: 'rejected',
  CANCEL: 'cancel',
  ERROR: 'error',
  UPLOADING: 'uploading',
  DOWNLOADING: 'downloading',
  UPLOAD_COMPLETED: 'uploadCompleted',
  DOWNLOAD_COMPLETED: 'downloadCompleted'
};

Skylink.CANDIDATE_GENERATION_STATE = {
  NEW: 'new',
  GATHERING: 'gathering',
  COMPLETED: 'completed'
};

Skylink.ICE_CONNECTION_STATE = {
  STARTING: 'starting',
  CHECKING: 'checking',
  CONNECTED: 'connected',
  COMPLETED: 'completed',
  CLOSED: 'closed',
  FAILED: 'failed',
  DISCONNECTED: 'disconnected'
};

Skylink.TURN_TRANSPORT = {
  UDP: 'udp',
  TCP: 'tcp',
  ANY: 'any',
  NONE: 'none'
};

Skylink.PEER_CONNECTION_STATE = {
  STABLE: 'stable',
  HAVE_LOCAL_OFFER: 'have-local-offer',
  HAVE_REMOTE_OFFER: 'have-remote-offer',
  HAVE_LOCAL_PRANSWER: 'have-local-pranswer',
  HAVE_REMOTE_PRANSWER: 'have-remote-pranswer',
  CLOSED: 'closed'
};

Skylink.HANDSHAKE_PROGRESS = {
  ENTER: 'enter',
  WELCOME: 'welcome',
  OFFER: 'offer',
  ANSWER: 'answer',
  ERROR: 'error'
};

Skylink.SYSTEM_ACTION = {
  WARNING: 'warning',
  REJECT: 'reject'
};

Skylink.SYSTEM_ACTION_REASON = {
  FAST_MESSAGE: 'fastmsg',
  ROOM_LOCKED: 'locked',
  ROOM_FULL: 'roomfull',
  DUPLICATED_LOGIN: 'duplicatedLogin',
  SERVER_ERROR: 'serverError',
  VERIFICATION: 'verification',
  EXPIRED: 'expired',
  ROOM_CLOSED: 'roomclose',
  ROOM_CLOSING: 'toclose',
  OVER_SEAT_LIMIT: 'seatquota'
};

Skylink.READY_STATE_CHANGE = {
  INIT: 0,
  LOADING: 1,
  COMPLETED: 2,
  ERROR: -1
};

Skylink.READY_STATE_CHANGE_ERROR = {
  API_INVALID: 4001,
  API_DOMAIN_NOT_MATCH: 4002,
  API_CORS_DOMAIN_NOT_MATCH: 4003,
  API_CREDENTIALS_INVALID: 4004,
  API_CREDENTIALS_NOT_MATCH: 4005,
  API_INVALID_PARENT_KEY: 4006,
  API_NOT_ENOUGH_CREDIT: 4007,
  API_NOT_ENOUGH_PREPAID_CREDIT: 4008,
  API_FAILED_FINDING_PREPAID_CREDIT: 4009,
  API_NO_MEETING_RECORD_FOUND: 4010,
  ROOM_LOCKED: 5001,
  NO_SOCKET_IO: 1,
  NO_XMLHTTPREQUEST_SUPPORT: 2,
  NO_WEBRTC_SUPPORT: 3,
  NO_PATH: 4,
  INVALID_XMLHTTPREQUEST_STATUS: 5,
  SCRIPT_ERROR: 6
};

Skylink.REGIONAL_SERVER = {
  APAC1: 'sg',
  US1: 'us2'
};

Skylink.LOG_LEVEL = {
  DEBUG: 4,
  LOG: 3,
  INFO: 2,
  WARN: 1,
  ERROR: 0
};

Skylink.SOCKET_ERROR = {
  CONNECTION_FAILED: 0,
  RECONNECTION_FAILED: -1,
  CONNECTION_ABORTED: -2,
  RECONNECTION_ABORTED: -3,
  RECONNECTION_ATTEMPT: -4
};

Skylink.SOCKET_FALLBACK = {
  NON_FALLBACK: 'nonfallback',
  FALLBACK_PORT: 'fallbackPortNonSSL',
  FALLBACK_SSL_PORT: 'fallbackPortSSL',
  LONG_POLLING: 'fallbackLongPollingNonSSL',
  LONG_POLLING_SSL: 'fallbackLongPollingSSL'
};

Skylink.VIDEO_RESOLUTION = {
  QQVGA: { width: 160, height: 120, aspectRatio: '4:3' },
  HQVGA: { width: 240, height: 160, aspectRatio: '3:2' },
  QVGA: { width: 320, height: 180, aspectRatio: '4:3' },
  WQVGA: { width: 384, height: 240, aspectRatio: '16:10' },
  HVGA: { width: 480, height: 320, aspectRatio: '3:2' },
  VGA: { width: 640, height: 360, aspectRatio: '4:3' },
  WVGA: { width: 768, height: 480, aspectRatio: '16:10' },
  FWVGA: { width: 854, height: 480, aspectRatio: '16:9' },
  SVGA: { width: 800, height: 600, aspectRatio: '4:3' },
  DVGA: { width: 960, height: 640, aspectRatio: '3:2' },
  WSVGA: { width: 1024, height: 576, aspectRatio: '16:9' },
  HD: { width: 1280, height: 720, aspectRatio: '16:9' },
  HDPLUS: { width: 1600, height: 900, aspectRatio: '16:9' },
  FHD: { width: 1920, height: 1080, aspectRatio: '16:9' },
  QHD: { width: 2560, height: 1440, aspectRatio: '16:9' },
  WQXGAPLUS: { width: 3200, height: 1800, aspectRatio: '16:9' },
  UHD: { width: 3840, height: 2160, aspectRatio: '16:9' },
  UHDPLUS: { width: 5120, height: 2880, aspectRatio: '16:9' },
  FUHD: { width: 7680, height: 4320, aspectRatio: '16:9' },
  QUHD: { width: 15360, height: 8640, aspectRatio: '16:9' }
};
function DataChannel(channel, listener) {
  'use strict';

  // Reference of instance
  var com = this;

  /**
   * The datachannel label.
   * @attribute id
   * @type String
   * @private
   * @for DataChannel
   * @since 0.6.0
   */
  com.id = channel.label || Date.UTC();
  
  /**
   * The type of datachannel
   * @attribute type
   * @type String
   * @private
   * @for DataChannel
   * @since 0.6.0
   */
  com.type = 'message';

  /**
   * The DataChannel object.
   * @attribute RTCDataChannel
   * @type Object
   * @private
   * @for DataChannel
   * @since 0.6.0
   */
  com.RTCDataChannel = null;


  /**
   * Function to subscribe to when datachannel has opened.
   * @method onopen
   * @eventhandler true
   * @for DataChannel
   * @since 0.6.0
   */
  com.onopen = function () {};
  
  /**
   * Function to subscribe to when datachannel has closed.
   * @method onclose
   * @eventhandler true
   * @for DataChannel
   * @since 0.6.0
   */
  com.onclose = function () {};
  
  /**
   * Function to subscribe to when datachannel has an error.
   * @method onerror
   * @eventhandler true
   * @for DataChannel
   * @since 0.6.0
   */
  com.onerror = function () {};
  
  /**
   * The handler that manages all triggers or relaying events.
   * @method handler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for DataChannel
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    DataChannelHandler(com, event, data, listener);
  };

  /**
   * Binds events to RTCDataChannel object.
   * @method bind
   * @param {Object} bindChannel The RTCDataChannel object to bind events to.
   * @private
   * @for DataChannel
   * @since 0.6.0
   */
  com.bind = function (bindChannel) {
    /*// Prevent re-trigger
    var onOpenFn = function () {
      com.handler('datachannel:connect', {});
  
      if (typeof com.onopen === 'function') {
        com.onopen();
      }
    };
    
    if (bindChannel.readyState !== 'open') {

      bindChannel.onopen = onOpenFn;
    
    } else {
      onOpenFn();
    }*/

    bindChannel.onopen = function(){
      com.handler('datachannel:connect', {});
    };
    
    bindChannel.onerror = function (error) {
      com.handler('datachannel:error', {
        error: error
      });

      if (typeof com.onerror === 'function') {
        com.onerror(error);
      }
    };

    // NOTE: Older firefox might close the DataChannel earlier 
    bindChannel.onclose = function () {
      com.handler('datachannel:disconnect', {});
      
      if (typeof com.onclose === 'function') {
        com.onclose();
      }
    };

    bindChannel.onmessage = function (event) {

      com.handler('datachannel:message', {
        data: event.data
      });

    };
    
    com.RTCDataChannel = bindChannel;

    console.log(com.RTCDataChannel.onmessage);

    fn.runSync(function () {
      com.handler('datachannel:start', {});
    });
  };

  /**
   * Sends data over the datachannel.
   * @method send
   * @param {JSON|String} data The data to send.
   * @private
   * @for DataChannel
   * @since 0.6.0
   */
  com.send = function (data) {
    var sendingData = data;
  
    if (typeof data === 'object') {
      sendingData = JSON.stringify(data);
    }
  
    fn.isSafe(function () {
      com.RTCDataChannel.send(sendingData);
    });
  };

  if (fn.isEmpty(channel)) {
    throw new Error('Provided parameter channel is invalid.');
  }

  // Bind datachannel object
  com.bind(channel);
}
var DataChannelEventResponseHandler = {
    /**
     * Event fired when the datachannel object is ready to use.
     * @event datachannel:start
     * @for DataChannel
     * @since 0.6.0
     */
    start: function (com, data, listener) {},
    
    /**
     * Event fired when the datachannel has opened.
     * @event datachannel:connect
     * @for DataChannel
     * @since 0.6.0
     */
    connect: function (com, data, listener) {},
    
    /**
     * Event fired when the datachannel has an exception occurred.
     * @event datachannel:error
     * @param {Object} error The RTCDataChannel error.
     * @for DataChannel
     * @since 0.6.0
     */
    error: function (com, data, listener) {},
    
    /**
     * Event fired when the datachannel receives data.
     * @event datachannel:message
     * @param {JSON|String} data The data received.
     * @for DataChannel
     * @since 0.6.0
     */
    message: function (com, data, listener) {
      console.log('->messagehandler');
    },

    /**
     * Event fired when the datachannel has closed.
     * @event datachannel:disconnect
     * @for DataChannel
     * @since 0.6.0
     */
    disconnect: function (com, data, listener) {}
};

/**
 * Handles the datachannel class events.
 * @attribute DataChannelHandler
 * @type JSON
 * @private
 * @for DataChannel
 * @since 0.6.0
 */
var DataChannelHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  data.id = com.id;

  fn.applyHandler(DataChannelEventResponseHandler, params, [com, data, listener]);

  listener(event, data);
};
var DataProcess = {
  
  chunkSize: 49152,
  
  mozChunkSize: 16384,
  
  chunk: function (blob, blobByteSize) {
    var chunksArray = [],
    startCount = 0,
    endCount = 0;
    
    if (blobByteSize > this.chunkSize) {
      // File Size greater than Chunk size
      while ((blobByteSize - 1) > endCount) {
        endCount = startCount + this.chunkSize;
        chunksArray.push(blob.slice(startCount, endCount));
        startCount += this.chunkSize;
      }
      if ((blobByteSize - (startCount + 1)) > 0) {
        chunksArray.push(blob.slice(startCount, blobByteSize - 1));
      }
    } else {
      // File Size below Chunk size
      chunksArray.push(blob);
    }
    
    return chunksArray;
  },

  unchunk: function (dataURL) {
    var byteString = atob(dataURL.replace(/\s\r\n/g, ''));
    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    
    for (var j = 0; j < byteString.length; j++) {
      ia[j] = byteString.charCodeAt(j);
    }
    
    // write the ArrayBuffer to a blob, and you're done
    return new Blob([ab]);
  }
};
function DataTransfer(channel, peerId, listener) {
  'use strict';

  var com = this;
  
  com.peerId = peerId;

  com.channel = channel;

  com._DC_PROTOCOL_TYPE = {
    WRQ: 'WRQ',
    ACK: 'ACK',
    ERROR: 'ERROR',
    CANCEL: 'CANCEL',
    MESSAGE: 'MESSAGE'
  };

  com.DATA_TRANSFER_TYPE = {
    UPLOAD: 'upload',
    DOWNLOAD: 'download'
  };

  com.DATA_TRANSFER_STATE = {
    UPLOAD_REQUEST: 'request',
    UPLOAD_STARTED: 'uploadStarted',
    DOWNLOAD_STARTED: 'downloadStarted',
    REJECTED: 'rejected',
    CANCEL: 'cancel',
    ERROR: 'error',
    UPLOADING: 'uploading',
    DOWNLOADING: 'downloading',
    UPLOAD_COMPLETED: 'uploadCompleted',
    DOWNLOAD_COMPLETED: 'downloadCompleted'
  };

  com.DATA_TRANSFER_DATA_TYPE = {
    BINARY_STRING: 'binaryString',
    ARRAY_BUFFER: 'arrayBuffer',
    BLOB: 'blob'
  };

  com._uploadDataTransfers = [];

  com._uploadDataSessions = [];

  com._downloadDataTransfers = [];

  com._downloadDataSessions = [];

  com._dataTransfersTimeout = [];
  
  com.bind = function (bindChannel) {
    bindChannel.RTCDataChannel.onmessage = function (event) {
      com.onMessage(bindChannel, event.data);
    };
  }; 

  com.onMessage = function(bindChannel, data){
    com._dataChannelProtocolHandler(data);
  };

  com.bind(com.channel);

  com._dataChannelProtocolHandler = function(dataString) {
    // PROTOCOL ESTABLISHMENT
    if (typeof dataString === 'string') {
      var data = {};
      try {
        data = JSON.parse(dataString);
      } catch (error) {
        com._DATAProtocolHandler(dataString,
          com.DATA_TRANSFER_DATA_TYPE.BINARY_STRING);
        return;
      }
      switch (data.type) {
      case com._DC_PROTOCOL_TYPE.WRQ:
        com.WRQProtocolHandler(data);
        break;
      case com._DC_PROTOCOL_TYPE.ACK:
        com.ACKProtocolHandler(data);
        break;
      case com._DC_PROTOCOL_TYPE.ERROR:
        com.ERRORProtocolHandler(data);
        break;
      case com._DC_PROTOCOL_TYPE.CANCEL:
        com.CANCELProtocolHandler(data);
        break;
      case com._DC_PROTOCOL_TYPE.MESSAGE: // Not considered a protocol actually?
        com.MESSAGEProtocolHandler(data);
        break;
      default:
        console.error('Unsupported type: '+data.type);
      }
    }
  };

  com._setDataChannelTimeout = function(timeout, isSender) {
    if (!com._dataTransfersTimeout[com.peerId]) {
      com._dataTransfersTimeout[com.peerId] = [];
    }
    var type = (isSender) ? com.DATA_TRANSFER_TYPE.UPLOAD :
      com.DATA_TRANSFER_TYPE.DOWNLOAD;
    com._dataTransfersTimeout[com.peerId][type] = setTimeout(function() {
      var name;
      if (com._dataTransfersTimeout[com.peerId][type]) {
        if (isSender) {
          name = com._uploadDataSessions[com.peerId].name;
          delete com._uploadDataTransfers[com.peerId];
          delete com._uploadDataSessions[com.peerId];
        } else {
          name = com._downloadDataSessions[com.peerId].name;
          delete com._downloadDataTransfers[com.peerId];
          delete com._downloadDataSessions[com.peerId];
        }

        com.channel.send({
          type: com._DC_PROTOCOL_TYPE.ERROR,
          //sender: self._user.sid,
          name: name,
          content: 'Connection Timeout. Longer than ' + timeout +
            ' seconds. Connection is abolished.',
          isUploadError: isSender
        });
        
        com._clearDataChannelTimeout(isSender);
      }
    }, 1000 * timeout);
  };

  com._clearDataChannelTimeout = function(isSender) {
    if (com._dataTransfersTimeout[com.peerId]) {
      var type = (isSender) ? com.DATA_TRANSFER_TYPE.UPLOAD :
        com.DATA_TRANSFER_TYPE.DOWNLOAD;
      clearTimeout(com._dataTransfersTimeout[com.peerId][type]);
      delete com._dataTransfersTimeout[com.peerId][type];
    }
  };

  com.WRQProtocolHandler = function(data){
    var transferId = com.peerId + com.DATA_TRANSFER_TYPE.DOWNLOAD +
      (((new Date()).toISOString().replace(/-/g, '').replace(/:/g, ''))).replace('.', '');
    var name = data.name;
    var binarySize = data.size;
    var expectedSize = data.chunkSize;
    var timeout = data.timeout;
    com._downloadDataSessions[com.peerId] = {
      transferId: transferId,
      name: name,
      size: binarySize,
      ackN: 0,
      receivedSize: 0,
      chunkSize: expectedSize,
      timeout: timeout
    };
    console.log('wrq here');
    listener('datatransfer:uploadrequest',{
      peerId: com.peerId,
      transferId: transferId,
      name: name,
      size: binarySize,
      expectedSize: expectedSize,
      timeout: timeout,
      dataTransfer: com
    });
  };

  com.ACKProtocolHandler = function(data){
    var ackN = data.ackN;
    com.peerId = (com.peerId === 'MCU') ? data.sender : com.peerId;

    var chunksLength = com._uploadDataTransfers[com.peerId].length;
    var uploadedDetails = com._uploadDataSessions[com.peerId];
    var transferId = uploadedDetails.transferId;
    var timeout = uploadedDetails.timeout;

    com._clearDataChannelTimeout(true);

    if (ackN > -1) {
      // Still uploading
      if (ackN < chunksLength) {
        var fileReader = new FileReader();
        fileReader.onload = function() {
          // Load Blob as dataurl base64 string
          var base64BinaryString = fileReader.result.split(',')[1];
          com.channel.send(base64BinaryString);
          com._setDataChannelTimeout(timeout, true);

          listener('datatransfer:uploading',{
            peerId: com.peerId,
            transferId: transferId,
            percentage: (((ackN + 1) / chunksLength) * 100).toFixed()
          });
        };
        fileReader.readAsDataURL(com._uploadDataTransfers[com.peerId][ackN]);
      } else if (ackN === chunksLength) {
        
        listener('datatransfer:uploadcompleted',{
          peerId: com.peerId,
          transferId: transferId,
          name: uploadedDetails.name
        });
        delete com._uploadDataTransfers[com.peerId];
        delete com._uploadDataSessions[com.peerId];
      }
    } else {
      listener('datatransfer:rejected',{
        peerId: com.peerId,
        transferId: transferId,
        name: com._uploadDataSessions[com.peerId].name,
        size: com._uploadDataSessions[com.peerId].size
      });
      delete com._uploadDataTransfers[com.peerId];
      delete com._uploadDataSessions[com.peerId];
    }
  };

  com.MESSAGEProtocolHandler = function(data){
    listener('datatransfer:message',{
      peerId: com.peerId,
      data: data
    });
  };

  com.ERRORProtocolHandler = function(data){
    var isUploader = data.isUploadError;
    console.log(com.peerId);
    console.log(com._uploadDataSessions);
    var transferId = (isUploader) ? com._uploadDataSessions[com.peerId].transferId :
      com._downloadDataSessions[com.peerId].transferId;
    listener('datatransfer:error',{
      peerId: com.peerId,
      data: data,
      transferType: ((isUploader) ? com.DATA_TRANSFER_TYPE.UPLOAD :
        com.DATA_TRANSFER_TYPE.DOWNLOAD)
    });
  };

  com._CANCELProtocolHandler = function(data) {
    var isUpload = !!com._uploadDataSessions[com.peerId];
    var isDownload = !!com._downloadDataSessions[com.peerId];

    var transferId = (isUpload) ? com._uploadDataSessions[com.peerId].transferId :
      com._downloadDataSessions[com.peerId].transferId;

    com._clearDataChannelTimeout(isUploader);

    listener('datatransfer:cancel',{
      peerId: com.peerId,
      transferId: transferId,
      name: data.name,
      content: data.content,
      senderPeerId: data.sender,
      transferType: ((isUpload) ? com.DATA_TRANSFER_TYPE.UPLOAD :
        com.DATA_TRANSFER_TYPE.DOWNLOAD)
    });

    try {
      if (isUpload) {
        delete com._uploadDataSessions[com.peerId];
        delete com._uploadDataTransfers[com.peerId];
      } else {
        delete com._downloadDataSessions[peerId];
        delete com._downloadDataTransfers[peerId];
      }

      listener('datatransfer:cancel',{
        peerId: com.peerId,
        transferId: transferId,
        name: data.name,
        content: data.content,
        senderPeerId: data.sender,
        transferType: ((isUpload) ? com.DATA_TRANSFER_TYPE.UPLOAD :
          com.DATA_TRANSFER_TYPE.DOWNLOAD)
      });

    } catch (error) {
      listener('datatransfer:error',{
        message: 'Failed cancelling data request from peer',
        transferType: ((isUpload) ? com.DATA_TRANSFER_TYPE.UPLOAD :
          com.DATA_TRANSFER_TYPE.DOWNLOAD)
      });
    }
  };

  com._DATAProtocolHandler = function(dataString, dataType) {
    var chunk, error = '';
    var transferStatus = com._downloadDataSessions[com.peerId];

    var transferId = transferStatus.transferId;

    com._clearDataChannelTimeout(false);

    if (dataType === com.DATA_TRANSFER_DATA_TYPE.BINARY_STRING) {
      chunk = DataProcess.unchunk(dataString);
    } else if (dataType === com.DATA_TRANSFER_DATA_TYPE.ARRAY_BUFFER) {
      chunk = new Blob(dataString);
    } else if (dataType === com.DATA_TRANSFER_DATA_TYPE.BLOB) {
      chunk = dataString;
    } else {
      error = 'Unhandled data exception: ' + dataType;

      listener('datatransfer:error',{
        peerId: com.peerId,
        transferId: transferId,
        message: error,
        transferType: com.DATA_TRANSFER_TYPE.DOWNLOAD
      });

      return;
    }
    var receivedSize = (chunk.size * (4 / 3));

    if (transferStatus.chunkSize >= receivedSize) {
      com._downloadDataTransfers[com.peerId].push(chunk);
      transferStatus.ackN += 1;
      transferStatus.receivedSize += receivedSize;
      var totalReceivedSize = transferStatus.receivedSize;
      var percentage = ((totalReceivedSize / transferStatus.size) * 100).toFixed();

      com.channel.send({
        type: com._DC_PROTOCOL_TYPE.ACK,
        sender: null,
        ackN: transferStatus.ackN
      });

      if (transferStatus.chunkSize === receivedSize) {

        listener('datatransfer:downloading',{
          peerId: com.peerId,
          transferId: transferId,
          percentage: percentage
        }); 

        com._setDataChannelTimeout(transferStatus.timeout, false);
        com._downloadDataTransfers[com.peerId].info = transferStatus;
      } else {
        var blob = new Blob(com._downloadDataTransfers[com.peerId]);

        listener('datatransfer:downloadcompleted',{
          peerId: com.peerId,
          transferId: transferId,
          data: blob
        });

        delete com._downloadDataTransfers[com.peerId];
        delete com._downloadDataSessions[com.peerId];
      }
    } else {
      error = 'Packet not match - [Received]' + receivedSize +
        ' / [Expected]' + transferStatus.chunkSize;
      listener('datatransfer:error',{
        peerId: com.peerId,
        transferId: transferId,
        message: error,
        transferType: com.DATA_TRANSFER_TYPE.DOWNLOAD
      });
    }
  };

  com.sendBlobData = function(data, dataInfo) {
    dataInfo.timeout = dataInfo.timeout || 60;
    dataInfo.transferId = com.DATA_TRANSFER_TYPE.UPLOAD +
      (((new Date()).toISOString().replace(/-/g, '').replace(/:/g, ''))).replace('.', '');
    console.log('Sending blob data');
    com.sendBlobDataToPeer(data, dataInfo, true);

    listener('datatransfer:uploadstarted',{
      peerId: com.peerId,
      transferId: dataInfo.transferId,
      name: dataInfo.name,
      size: dataInfo.size,
      timeout: dataInfo.timeout || 60,
      data: data
    });

  };

  com.sendBlobDataToPeer = function(data, dataInfo, isPrivate) {

    var ongoingTransfer = null;
    var binarySize = parseInt((dataInfo.size * (4 / 3)).toFixed(), 10);
    var chunkSize = parseInt((DataProcess.chunkSize * (4 / 3)).toFixed(), 10);

    if (window.webrtcDetectedBrowser === 'firefox' &&
      window.webrtcDetectedVersion < 30) {
      chunkSize = DataProcess.mozChunkSize;
    }
    console.log('Chunk size of data: '+chunkSize);

    if (com._uploadDataSessions[com.peerId]) {
      ongoingTransfer = com.DATA_TRANSFER_TYPE.UPLOAD;
    } else if (com._downloadDataSessions[com.peerId]) {
      ongoingTransfer = com.DATA_TRANSFER_TYPE.DOWNLOAD;
    }

    if (ongoingTransfer) {
      console.error('User have ongoing ' + ongoingTransfer + ' ' +
        'transfer session with peer. Unable to send data '+ dataInfo);
      listener('datatransfer:error',{
        peerId: peerId,
        transferId: dataInfo.transferId,
        name: dataInfo.name,
        message: dataInfo.content,
        transferType: ongoingTransfer
      });
      return;
    }
    com._uploadDataTransfers[com.peerId] = DataProcess.chunk(data, dataInfo.size);
    com._uploadDataSessions[com.peerId] = {
      name: dataInfo.name,
      size: binarySize,
      transferId: dataInfo.transferId,
      timeout: dataInfo.timeout
    };
    console.log(com.channel);
    com.channel.send({
      type: com._DC_PROTOCOL_TYPE.WRQ,
      //sender: this._user.sid,
      agent: window.webrtcDetectedBrowser,
      name: dataInfo.name,
      size: binarySize,
      chunkSize: chunkSize,
      timeout: dataInfo.timeout,
      target: com.peerId,
      isPrivate: !!isPrivate
    });
    com._setDataChannelTimeout(dataInfo.timeout, true);
  };

  com.respondBlobRequest = function (accept) {
    if (accept) {
      console.log('User accepted peer request');
      com._downloadDataTransfers[com.peerId] = [];
      var data = com._downloadDataSessions[com.peerId];
      com.channel.send({
        type: com._DC_PROTOCOL_TYPE.ACK,
        //sender: this._user.sid,
        ackN: 0,
        agent: window.webrtcDetectedBrowser
      });

      listener('datatransfer:downloadstarted',{
        peerId: com.peerId,
        name: data.name,
        size: data.size,
        transferId: data.transferId
      });

    } else {
      console.log('User rejected peer request');
      com.channel.send({
        type: this._DC_PROTOCOL_TYPE.ACK,
        //sender: this._user.sid,
        ackN: -1
      });
      delete com._downloadDataSessions[com.peerId];
    }
  };

  com.cancelBlobTransfer = function (transferType) {
    var data;

    // cancel upload
    if (transferType === com.DATA_TRANSFER_TYPE.UPLOAD && !transferType) {
      data = com._uploadDataSessions[com.peerId];

      if (data) {
        delete com._uploadDataSessions[com.peerId];
        delete com._uploadDataTransfers[com.peerId];

        com.channel.send({
          type: com._DC_PROTOCOL_TYPE.CANCEL,
          //sender: this._user.sid,
          name: data.name,
          content: 'Peer cancelled upload transfer'
        });
      } else {
        listener('datatransfer:error',{
          peerId: com.peerId,
          transferId: dataInfo.transferId,
          name: dataInfo.name,
          message: 'Unable to cancel upload transfer. There is ' +
            'not ongoing upload sessions with the peer',
          transferType: com.DATA_TRANSFER_TYPE.UPLOAD
        });

        if (!!transferType) {
          return;
        }
      }
    }
    if (transferType === com.DATA_TRANSFER_TYPE.DOWNLOAD) {
      data = com._downloadDataSessions[peerId];

      if (data) {
        delete com._downloadDataSessions[com.peerId];
        delete com._downloadDataTransfers[com.peerId];

        com.channel.send({
          type: com._DC_PROTOCOL_TYPE.CANCEL,
          //sender: this._user.sid,
          name: data.name,
          content: 'Peer cancelled download transfer'
        });
      } else {
        listener('datatransfer:error',{
          peerId: com.peerId,
          transferId: dataInfo.transferId,
          name: dataInfo.name,
          message: 'Unable to cancel download transfer. There is ' +
            'not ongoing download sessions with the peer',
          transferType: com.DATA_TRANSFER_TYPE.DOWNLOAD
        });
      }
    }
  };
}


DataTransferEventResponseHandler = {
	start: function(com, data, listener){
		var dt = new DataTransfer(data.dataChannel, com.id, listener);
		com.datatransfers[data.dataChannel.id] = dt;
	}
};

var DataTransferHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  data.id = com.id;

  fn.applyHandler(DataTransferEventResponseHandler, params, [com, data, listener]);

  listener(event, data);
};
var _Event = {
  listeners: {
    on: {},
    once: {}
  },
  
  timestamp: {
    now: Date.now() || function() { return + new Date(); }
  },
  
  on: function (event, listener) {
    this.listeners.on[event] = this.listeners.on[event] || [];
    this.listeners.on[event].push(listener);
  },
  
  once: function (event, listener) {
    this.listeners.once[event] = this.listeners.once[event] || [];
    this.listeners.once[event].push(listener);
  },
  
  off: function (event, listener) {
    if (fn.isEmpty(event)) {
      // Remove all listeners
      this.listeners.on = {};
      this.listeners.once = {};
      return;
    }
    
    if (typeof listener === 'function') {
      // Get all the listeners from event
      // Remove individual listeners
      // If signature is the same as provided callback, remove.
      this.remove( this.listeners.on[event] || {}, listener );
      this.remove( this.listeners.once[event] || {}, listener );

    } else {
      // Remove listeners attached to event
      this.listeners.on[event] = [];
      this.listeners.once[event] = [];
    }
  },
  
  respond: function (event) {
    var args = Array.prototype.slice.call(arguments);
    args.shift();

    var on = this.listeners.on[event] || {};
    var once = this.listeners.once[event] || {};
    
    this.trigger(on, args);
    this.trigger(once, args);
    
    this.listeners.once[event] = [];
  },

  trigger: function (listeners, args) {
    var i;

    for (i = 0; i < listeners.length; i += 1) {
      try {
        listeners[i].apply(this, args);
        
      } catch(error) {
        throw error;
      }
    }
  },
  
  remove: function(listeners, listener) {
    var i = 0;
    
    for (i = 0; i < listeners.length; i += 1) {
      if (listeners[i] === listener) {
        listeners.splice(i, 1);
        break;
      }
    }
  },
  
  throttle: function(defer, wait){
    return function () {
      if (fn.isEmpty(this.timeStamp.func)){
        //First time run, need to force timestamp to skip condition
        this.timeStamp.func = this.timestamp.now - wait;
      }
      
      var now = Date.now();
      
      if (now - this.timestamp.func < wait) {
        return;
      }
      
      func.apply(this, arguments);
      this.timeStamp.func = now;
    };
  }
};

Skylink.Event = _Event;
var EventList = [
  /**
   * Event fired when the socket connection to the signaling
   * server is open.
   * @event channelOpen
   * @for Skylink
   * @since 0.1.0
   */
  'channelOpen',

  /**
   * Event fired when the socket connection to the signaling
   * server has closed.
   * @event channelClose
   * @for Skylink
   * @since 0.1.0
   */
  'channelClose',

  /**
   * Event fired when the socket connection received a message
   * from the signaling server.
   * @event channelMessage
   * @param {JSON} message
   * @for Skylink
   * @since 0.1.0
   */
  'channelMessage',

  /**
   * Event fired when the socket connection has occurred an error.
   * @event channelError
   * @param {Object|String} error Error message or object thrown.
   * @for Skylink
   * @since 0.1.0
   */
  'channelError',

  /**
   * Event fired when the socket re-tries to connection with fallback ports.
   * @event channelRetry
   * @param {String} fallbackType The type of fallback [Rel: Skylink.SOCKET_FALLBACK]
   * @param {Integer} currentAttempt The current attempt of the fallback re-try attempt.
   * @for Skylink
   * @since 0.5.6
   */
  'channelRetry',

  /**
   * Event fired when the socket connection failed connecting.
   * - The difference between this and <b>channelError</b> is that
   *   channelError triggers during the connection. This throws
   *   when connection failed to be established.
   * @event socketError
   * @param {String} errorCode The error code.
   *   [Rel: Skylink.SOCKET_ERROR]
   * @param {Integer|String|Object} error The reconnection attempt or error object.
   * @param {String} fallbackType The type of fallback [Rel: Skylink.SOCKET_FALLBACK]
   * @for Skylink
   * @since 0.5.5
   */
  'socketError',

  /**
   * Event fired whether the room is ready for use.
   * @event readyStateChange
   * @param {String} readyState [Rel: Skylink.READY_STATE_CHANGE]
   * @param {JSON} error Error object thrown.
   * @param {Integer} error.status Http status when retrieving information.
   *   May be empty for other errors.
   * @param {String} error.content Error message.
   * @param {Integer} error.errorCode Error code.
   *   [Rel: Skylink.READY_STATE_CHANGE_ERROR]
   * @for Skylink
   * @since 0.4.0
   */
  'readyStateChange',

  /**
   * Event fired when a peer's handshake progress has changed.
   * @event handshakeProgress
   * @param {String} step The handshake progress step.
   *   [Rel: Skylink.HANDSHAKE_PROGRESS]
   * @param {String} peerId PeerId of the peer's handshake progress.
   * @param {Object|String} error Error message or object thrown.
   * @for Skylink
   * @since 0.3.0
   */
  'handshakeProgress',

  /**
   * Event fired when an ICE gathering state has changed.
   * @event candidateGenerationState
   * @param {String} state The ice candidate generation state.
   *   [Rel: Skylink.CANDIDATE_GENERATION_STATE]
   * @param {String} peerId PeerId of the peer that had an ice candidate
   *    generation state change.
   * @for Skylink
   * @since 0.1.0
   */
  'candidateGenerationState',

  /**
   * Event fired when a peer Connection state has changed.
   * @event peerConnectionState
   * @param {String} state The peer connection state.
   *   [Rel: Skylink.PEER_CONNECTION_STATE]
   * @param {String} peerId PeerId of the peer that had a peer connection state
   *    change.
   * @for Skylink
   * @since 0.1.0
   */
  'peerConnectionState',

  /**
   * Event fired when a peer connection health has changed.
   * @event peerConnectionHealth
   * @param {String} health The peer connection health.
   *   [Rel: Skylink.PEER_CONNECTION_HEALTH]
   * @param {String} peerId PeerId of the peer that had a peer connection health
   *    change.
   * @since 0.5.5
   */
  'peerConnectionHealth',

  /**
   * Event fired when an ICE connection state has changed.
   * @iceConnectionState
   * @param {String} state The ice connection state.
   *   [Rel: Skylink.ICE_CONNECTION_STATE]
   * @param {String} peerId PeerId of the peer that had an ice connection state change.
   * @for Skylink
   * @since 0.1.0
   */
  'iceConnectionState',

  /**
   * Event fired when webcam or microphone media access fails.
   * @event mediaAccessError
   * @param {Object|String} error Error object thrown.
   * @for Skylink
   * @since 0.1.0
   */
  'mediaAccessError',

  /**
   * Event fired when webcam or microphone media acces passes.
   * @event mediaAccessSuccess
   * @param {Object} stream MediaStream object.
   * @for Skylink
   * @since 0.1.0
   */
  'mediaAccessSuccess',

  /**
   * Event fired when it's required to have audio or video access.
   * @event mediaAccessRequired
   * @for Skylink
   * @since 0.5.5
   */
  'mediaAccessRequired',

  /**
   * Event fired when media access to MediaStream has stopped.
   * @event mediaAccessStopped
   * @for Skylink
   * @since 0.5.6
   */
  'mediaAccessStopped',

  /**
   * Event fired when a peer joins the room.
   * @event peerJoined
   * @param {String} peerId PeerId of the peer that joined the room.
   * @param {JSON} peerInfo Peer's information.
   * @param {JSON} peerInfo.settings Peer's stream settings.
   * @param {Boolean|JSON} [peerInfo.settings.audio=false] Peer's audio stream
   *   settings.
   * @param {Boolean} [peerInfo.settings.audio.stereo=false] If peer has stereo
   *   enabled or not.
   * @param {Boolean|JSON} [peerInfo.settings.video=false] Peer's video stream
   *   settings.
   * @param {JSON} [peerInfo.settings.video.resolution]
   *   Peer's video stream resolution [Rel: Skylink.VIDEO_RESOLUTION]
   * @param {Integer} [peerInfo.settings.video.resolution.width]
   *   Peer's video stream resolution width.
   * @param {Integer} [peerInfo.settings.video.resolution.height]
   *   Peer's video stream resolution height.
   * @param {Integer} [peerInfo.settings.video.frameRate]
   *   Peer's video stream resolution minimum frame rate.
   * @param {JSON} peerInfo.mediaStatus Peer stream status.
   * @param {Boolean} [peerInfo.mediaStatus.audioMuted=true] If peer's audio
   *   stream is muted.
   * @param {Boolean} [peerInfo.mediaStatus.videoMuted=true] If peer's video
   *   stream is muted.
   * @param {JSON|String} peerInfo.userData Peer's custom user data.
   * @param {JSON} peerInfo.agent Peer's browser agent.
   * @param {String} peerInfo.agent.name Peer's browser agent name.
   * @param {Integer} peerInfo.agent.version Peer's browser agent version.
   * @param {Boolean} isSelf Is the peer self.
   * @for Skylink
   * @since 0.5.2
   */
  'peerJoined',

  /**
   * Event fired when a peer's connection is restarted.
   * @event peerRestart
   * @param {String} peerId PeerId of the peer that is being restarted.
   * @param {JSON} peerInfo Peer's information.
   * @param {JSON} peerInfo.settings Peer's stream settings.
   * @param {Boolean|JSON} peerInfo.settings.audio Peer's audio stream
   *   settings.
   * @param {Boolean} peerInfo.settings.audio.stereo If peer has stereo
   *   enabled or not.
   * @param {Boolean|JSON} peerInfo.settings.video Peer's video stream
   *   settings.
   * @param {JSON} peerInfo.settings.video.resolution
   *   Peer's video stream resolution [Rel: Skylink.VIDEO_RESOLUTION]
   * @param {Integer} peerInfo.settings.video.resolution.width
   *   Peer's video stream resolution width.
   * @param {Integer} peerInfo.settings.video.resolution.height
   *   Peer's video stream resolution height.
   * @param {Integer} peerInfo.settings.video.frameRate
   *   Peer's video stream resolution minimum frame rate.
   * @param {JSON} peerInfo.mediaStatus Peer stream status.
   * @param {Boolean} peerInfo.mediaStatus.audioMuted If peer's audio
   *   stream is muted.
   * @param {Boolean} peerInfo.mediaStatus.videoMuted If peer's video
   *   stream is muted.
   * @param {JSON|String} peerInfo.userData Peer's custom user data.
   * @param {JSON} peerInfo.agent Peer's browser agent.
   * @param {String} peerInfo.agent.name Peer's browser agent name.
   * @param {Integer} peerInfo.agent.version Peer's browser agent version.
   * @param {Boolean} isSelfInitiateRestart Is it us who initiated the restart.
   * @since 0.5.5
   */
  'peerRestart',

  /**
   * Event fired when a peer information is updated.
   * @event peerUpdated
   * @param {String} peerId PeerId of the peer that had information updaed.
   * @param {JSON} peerInfo Peer's information.
   * @param {JSON} peerInfo.settings Peer's stream settings.
   * @param {Boolean|JSON} [peerInfo.settings.audio=false] Peer's audio stream
   *   settings.
   * @param {Boolean} [peerInfo.settings.audio.stereo=false] If peer has stereo
   *   enabled or not.
   * @param {Boolean|JSON} [peerInfo.settings.video=false] Peer's video stream
   *   settings.
   * @param {JSON} [peerInfo.settings.video.resolution]
   *   Peer's video stream resolution [Rel: Skylink.VIDEO_RESOLUTION]
   * @param {Integer} [peerInfo.settings.video.resolution.width]
   *   Peer's video stream resolution width.
   * @param {Integer} [peerInfo.settings.video.resolution.height]
   *   Peer's video stream resolution height.
   * @param {Integer} [peerInfo.settings.video.frameRate]
   *   Peer's video stream resolution minimum frame rate.
   * @param {JSON} peerInfo.mediaStatus Peer stream status.
   * @param {Boolean} [peerInfo.mediaStatus.audioMuted=true] If peer's audio
   *   stream is muted.
   * @param {Boolean} [peerInfo.mediaStatus.videoMuted=true] If peer's video
   *   stream is muted.
   * @param {JSON|String} peerInfo.userData Peer's custom user data.
   * @param {JSON} peerInfo.agent Peer's browser agent.
   * @param {String} peerInfo.agent.name Peer's browser agent name.
   * @param {Integer} peerInfo.agent.version Peer's browser agent version.
   * @param {Boolean} isSelf Is the peer self.
   * @for Skylink
   * @since 0.5.2
   */
  'peerUpdated',

  /**
   * Event fired when a peer leaves the room
   * @event peerLeft
   * @param {String} peerId PeerId of the peer that left.
   * @param {JSON} peerInfo Peer's information.
   * @param {JSON} peerInfo.settings Peer's stream settings.
   * @param {Boolean|JSON} [peerInfo.settings.audio=false] Peer's audio stream
   *   settings.
   * @param {Boolean} [peerInfo.settings.audio.stereo=false] If peer has stereo
   *   enabled or not.
   * @param {Boolean|JSON} [peerInfo.settings.video=false] Peer's video stream
   *   settings.
   * @param {JSON} [peerInfo.settings.video.resolution]
   *   Peer's video stream resolution [Rel: Skylink.VIDEO_RESOLUTION]
   * @param {Integer} [peerInfo.settings.video.resolution.width]
   *   Peer's video stream resolution width.
   * @param {Integer} [peerInfo.settings.video.resolution.height]
   *   Peer's video stream resolution height.
   * @param {Integer} [peerInfo.settings.video.frameRate]
   *   Peer's video stream resolution minimum frame rate.
   * @param {JSON} peerInfo.mediaStatus Peer stream status.
   * @param {Boolean} [peerInfo.mediaStatus.audioMuted=true] If peer's audio
   *   stream is muted.
   * @param {Boolean} [peerInfo.mediaStatus.videoMuted=true] If peer's video
   *   stream is muted.
   * @param {JSON|String} peerInfo.userData Peer's custom user data.
   * @param {JSON} peerInfo.agent Peer's browser agent.
   * @param {String} peerInfo.agent.name Peer's browser agent name.
   * @param {Integer} peerInfo.agent.version Peer's browser agent version.
   * @param {Boolean} isSelf Is the peer self.
   * @for Skylink
   * @since 0.5.2
   */
  'peerLeft',

  /**
   * Event fired when a peer joins the room
   * @event presenceChanged
   * @param {JSON} users The list of users
   * @private
   * @unsupported true
   * @for Skylink
   * @since 0.1.0
   */
  'presenceChanged',

  /**
   * Event fired when a remote stream has become available.
   * - This occurs after the user joins the room.
   * - This is changed from <b>addPeerStream</b> event.
   * - Note that <b>addPeerStream</b> is removed from the specs.
   * - There has been a documentation error whereby the stream it is
   *   supposed to be (stream, peerId, isSelf), but instead is received
   *   as (peerId, stream, isSelf) in 0.5.0.
   * @event incomingStream
   * @param {String} peerId PeerId of the peer that is sending the stream.
   * @param {Object} stream MediaStream object.
   * @param {Boolean} isSelf Is the peer self.
   * @param {JSON} peerInfo Peer's information.
   * @for Skylink
   * @since 0.5.5
   */
  'incomingStream',

  /**
   * Event fired when a message being broadcasted is received.
   * - This is changed from <b>chatMessageReceived</b>,
   *   <b>privateMessage</b> and <b>publicMessage</b> event.
   * - Note that <b>chatMessageReceived</b>, <b>privateMessage</b>
   *   and <b>publicMessage</b> is removed from the specs.
   * @event incomingMessage
   * @param {JSON} message Message object that is received.
   * @param {JSON|String} message.content Data that is broadcasted.
   * @param {String} message.senderPeerId PeerId of the sender peer.
   * @param {String} message.targetPeerId PeerId that is specifically
   *   targeted to receive the message.
   * @param {Boolean} message.isPrivate Is data received a private message.
   * @param {Boolean} message.isDataChannel Is data received from a
   *   data channel.
   * @param {String} peerId PeerId of the sender peer.
   * @param {JSON} peerInfo Peer's information.
   * @param {JSON} peerInfo.settings Peer's stream settings.
   * @param {Boolean|JSON} [peerInfo.settings.audio=false] Peer's audio stream
   *   settings.
   * @param {Boolean} [peerInfo.settings.audio.stereo=false] If peer has stereo
   *   enabled or not.
   * @param {Boolean|JSON} [peerInfo.settings.video=false] Peer's video stream
   *   settings.
   * @param {JSON} [peerInfo.settings.video.resolution]
   *   Peer's video stream resolution [Rel: Skylink.VIDEO_RESOLUTION]
   * @param {Integer} [peerInfo.settings.video.resolution.width]
   *   Peer's video stream resolution width.
   * @param {Integer} [peerInfo.settings.video.resolution.height]
   *   Peer's video stream resolution height.
   * @param {Integer} [peerInfo.settings.video.frameRate]
   *   Peer's video stream resolution minimum frame rate.
   * @param {JSON} peerInfo.mediaStatus Peer stream status.
   * @param {Boolean} [peerInfo.mediaStatus.audioMuted=true] If peer's audio
   *   stream is muted.
   * @param {Boolean} [peerInfo.mediaStatus.videoMuted=true] If peer's video
   *   stream is muted.
   * @param {JSON|String} peerInfo.userData Peer's custom user data.
   * @param {JSON} peerInfo.agent Peer's browser agent.
   * @param {String} peerInfo.agent.name Peer's browser agent name.
   * @param {Integer} peerInfo.agent.version Peer's browser agent version.
   * @param {Boolean} isSelf Is the peer self.
   * @for Skylink
   * @since 0.5.2
   */
  'incomingMessage',

  /**
   * Event fired when connected to a room and the lock status has changed.
   * @event roomLock
   * @param {Boolean} isLocked Is the room locked.
   * @param {String} peerId PeerId of the peer that is locking/unlocking
   *   the room.
   * @param {JSON} peerInfo Peer's information.
   * @param {JSON} peerInfo.settings Peer's stream settings.
   * @param {Boolean|JSON} [peerInfo.settings.audio=false] Peer's audio stream
   *   settings.
   * @param {Boolean} [peerInfo.settings.audio.stereo=false] If peer has stereo
   *   enabled or not.
   * @param {Boolean|JSON} [peerInfo.settings.video=false] Peer's video stream
   *   settings.
   * @param {JSON} [peerInfo.settings.video.resolution]
   *   Peer's video stream resolution [Rel: Skylink.VIDEO_RESOLUTION]
   * @param {Integer} [peerInfo.settings.video.resolution.width]
   *   Peer's video stream resolution width.
   * @param {Integer} [peerInfo.settings.video.resolution.height]
   *   Peer's video stream resolution height.
   * @param {Integer} [peerInfo.settings.video.frameRate]
   *   Peer's video stream resolution minimum frame rate.
   * @param {JSON} peerInfo.mediaStatus Peer stream status.
   * @param {Boolean} [peerInfo.mediaStatus.audioMuted=true] If peer's audio
   *   stream is muted.
   * @param {Boolean} [peerInfo.mediaStatus.videoMuted=true] If peer's video
   *   stream is muted.
   * @param {JSON|String} peerInfo.userData Peer's custom user data.
   * @param {JSON} peerInfo.agent Peer's browser agent.
   * @param {String} peerInfo.agent.name Peer's browser agent name.
   * @param {Integer} peerInfo.agent.version Peer's browser agent version.
   * @param {Boolean} isSelf Is the peer self.
   * @for Skylink
   * @since 0.5.2
   */
  'roomLock',

  /**
   * Event fired when a peer's datachannel state has changed.
   * @event dataChannelState
   * @param {String} state The datachannel state.
   *   [Rel: Skylink.DATA_CHANNEL_STATE]
   * @param {String} peerId PeerId of peer that has a datachannel
   *   state change.
   * @for Skylink
   * @since 0.1.0
   */
  'dataChannelState',

  /**
   * Event fired when a data transfer state has changed.
   * - Note that <u>transferInfo.data</u> sends the blob data, and
   *   no longer a blob url.
   * @event dataTransferState
   * @param {String} state The data transfer state.
   *   [Rel: Skylink.DATA_TRANSFER_STATE]
   * @param {String} transferId TransferId of the data.
   * @param {String} peerId PeerId of the peer that has a data
   *   transfer state change.
   * @param {JSON} transferInfo Data transfer information.
   * @param {JSON} transferInfo.percentage The percetange of data being
   *   uploaded / downloaded.
   * @param {JSON} transferInfo.senderPeerId PeerId of the sender.
   * @param {JSON} transferInfo.data The blob data. See the
   *   [createObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL.createObjectURL)
   *   method on how you can convert the blob to a download link.
   * @param {JSON} transferInfo.name Data name.
   * @param {JSON} transferInfo.size Data size.
   * @param {JSON} error The error object.
   * @param {String} error.message Error message thrown.
   * @param {String} error.transferType Is error from uploading or downloading.
   *   [Rel: Skylink.DATA_TRANSFER_TYPE]
   * @for Skylink
   * @since 0.4.1
   */
  'dataTransferState',

  /**
   * Event fired when the signaling server warns the user.
   * @event systemAction
   * @param {String} action The action that is required for
   *   the user to follow. [Rel: Skylink.SYSTEM_ACTION]
   * @param {String} message The reason for the action.
   * @param {String} reason The reason why the action is given.
   *   [Rel: Skylink.SYSTEM_ACTION_REASON]
   * @for Skylink
   * @since 0.5.1
   */
  'systemAction'
];
var ICE = {
  
  newIceConnectionStates: {
    starting : 'starting',
    checking : 'checking',
    connected : 'connected',
    completed : 'connected',
    done : 'completed',
    disconnected : 'disconnected',
    failed : 'failed',
    closed : 'closed'
  },

  queueCandidate: function (peer, candidate) {
    peer.queueCandidate = peer.queueCandidate || [];
    peer.queueCandidate.push(candidate);
  },
  
  popCandidate: function (peer, defer) {
    peer.queueCandidate = peer.queueCandidate || [];

    var i;
    
    peer.queueCandidate.forEach(function (candidate) {
      var type = candidate.candidate.split(' ')[7];

      peer.addIceCandidate(candidate, function (success) {
        defer('candidate:success', {
          candidate: candidate,
          type: type
        }); 
      }, function (error) {
        defer('candidate:error', {
          candidate: candidate,
          type: type,
          error: error
        }); 
      });
    });
    

    for (i = 0; i < peer.queueCandidate.length; i += 1) {
      var candidate = peer.queueCandidate[i];
      defer(candidate);
    }
    peer.queueCandidate = [];
  },
  
  addCandidate: function (peer, candidate, defer) {
    if (fn.isEmpty(candidate.candidate)) {
      return defer('candidate:gathered', candidate);
    }
    
    if (fn.isEmpty(peer.remoteDescription)) {
      this.queueCandidate(peer, candidate, defer);
    
    } else {
      var type = candidate.candidate.split(' ')[7];

      peer.addIceCandidate(candidate, function (success) {
        defer('candidate:success', {
          candidate: candidate,
          type: type
        }); 
      }, function (error) {
        defer('candidate:error', {
          candidate: candidate,
          type: type,
          error: error
        }); 
      });
    }
  },

  parseIceConnectionState: function (peer) {
    var state = peer.iceConnectionState;
    
    var checkState = this.newIceConnectionStates[state];
    
    if (!peer.iceConnectionFiredStates || checkState === 'disconnected' || 
        checkState === 'failed' || checkState === 'closed') {
      peer.iceConnectionFiredStates = [];
    }
    
    var newState = this.newIceConnectionStates[state];
    
    if (peer.iceConnectionFiredStates.indexOf(newState) < 0) {
      peer.iceConnectionFiredStates.push(newState);
      
      if (newState === 'connected') {
        setTimeout(function () {
          peer.iceConnectionFiredStates.push('done');

          peer.newIceConnectionState = 'completed';
          peer.oniceconnectionnewstatechange(peer);
        }, 1000);
      }
      peer.newIceConnectionState = newState;
      peer.oniceconnectionnewstatechange(peer);
    }
  },
  
  parseICEServers: function (constraints) {
    return constraints;
  },
  
  parseSTUNServers: function (constraints) {
    return constraints;
  },

  parseTURNServers: function (constraints) {
    return constraints;
  }
};
function Peer(config, listener) {
  'use strict';

  // Reference of instance
  var com = this;

  /**
   * The peer id.
   * @attribute id
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.id = config.id || fn.generateUID();
  
  /**
   * The peer type.
   * @attribute type
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.type = config.id === 'main' ? 'user' : 'stream';
  
  /**
   * The local description type peer sends.
   * @attribute SDPType
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.SDPType = null;

  /**
   * The PeerConnection constraints - iceServers.
   * @attribute constraints
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.constraints = null;

  /**
   * The local description to be set.
   * @attribute localDescription
   * @type Object
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.localDescription = null;
  
  /**
   * The remote description to be set.
   * @attribute remoteDescription
   * @type Object
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.remoteDescription = null;
  
  /**
   * The datachannels connected to PeerConnection.
   * @attribute datachannels
   * @param {DataChannel} <channelId> The datachannel connected to peer.
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.datachannels = {};
  
  /**
   * The flag that indicates if trickle ICE is enable for this PeerConnection.
   * @attribute iceTrickle
   * @type Boolean
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.iceTrickle = true;
  
  /**
   * The timeout that would react if PeerConnection is unstable and refresh connection.
   * @attribute healthTimer
   * @type Function
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.healthTimer = null;
  
  /**
   * The stream send from this peer.
   * @attribute stream
   * @type Stream
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.stream = null;
  
  /**
   * Stores the streaming configuration.
   * @attribute streamingConfig
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.streamingConfig = config.streamingConfig || {
    bandwidth: {},
    audio: false,
    video: false,
    mediaStatus: { audioMuted: true, videoMuted: true }
  };

  /**
   * The PeerConnection session description constraints.
   * @attribute sdpConstraints
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.sdpConstraints = {
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true
    }
  };
  
  /**
   * The PeerConnection session description configuration.
   * @attribute sdpConfig
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.sdpConfig = null;

  /**
   * The PeerConnection configuration.
   * @attribute config
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.config = {
    optional: [{
      DtlsSrtpKeyAgreement: true
    }]
  };

  /**
   * The PeerConnection object.
   * @attribute RTCPeerConnection
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.RTCPeerConnection = null;
  
  /**
   * The peerconnection weight during handshake.
   * @attribute weight
   * @type Integer
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.weight = parseInt(fn.generateUID(), 10);
  
  /**
   * The handler that manages all triggers or relaying events.
   * @attribute handler
   * @type Function
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    if (event.indexOf('datatransfer')===0){
      DataTransferHandler(com, event, data, listener);
      return;
    }
    PeerHandler(com, event, data, listener);
  };


  com.datatransfers = {};

  /**
   * Function to subscribe to when peer's connection has been started.
   * @method onconnect
   * @for Peer
   * @since 0.6.0
   */
  com.onconnect = function () {};

  /**
   * Function to subscribe to when peer's ice connection state changes.
   * @method oniceconnectionstatechange
   * @for Peer
   * @since 0.6.0
   */

  com.oniceconnectionstatechange = function () {};
  
  /**
   * Function to subscribe to when peer's ice gathering state changes.
   * @method onicegatheringstatechange
   * @for Peer
   * @since 0.6.0
   */
  com.onicegatheringstatechange = function () {};
  
  /**
   * Function to subscribe to when peer's remote stream is received.
   * @method onaddstream
   * @for Peer
   * @since 0.6.0
   */
  com.onaddstream = function () {};
  
  /**
   * Function to subscribe to when peer's signaling state has changed.
   * @method onsignalingstatechange
   * @for Peer
   * @since 0.6.0
   */
  com.onsignalingstatechange = function () {};
  
  /**
   * Function to subscribe to when peer's connection has been restarted.
   * @method onreconnect
   * @for Peer
   * @since 0.6.0
   */
  com.onreconnect = function () {};
  
  /**
   * Function to subscribe to when peer's connection has been restarted.
   * @method onreconnect
   * @for Peer
   * @since 0.6.0
   */
  com.onreconnect = function () {};
  
  /**
   * Function to subscribe to when a peer connection been disconnected.
   * @method onremoveconnection
   * @for Peer
   * @since 0.6.0
   */
  com.ondisconnect = function () {};
  
  

  /**
   * Starts the peer connection.
   * @method connect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.connect = function (stream) {
    var peer = new window.RTCPeerConnection(com.constraints, com.config);
  
    // Send stream
    if ((!fn.isEmpty(stream)) ? stream instanceof Stream : false) {    
      
      // Set the data
      com.stereo = fn.isSafe(function () { return stream.audio.stereo; });
    
      // Check class type
      peer.addStream(stream.MediaStream);
      
      window.data = stream.MediaStream;

      com.handler('peer:stream', {
        sourceType: 'local',
        stream: stream
      });
    }

    com.bind(peer);
  };
  
  /**
   * Restarts the peer connection.
   * @method reconnect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.reconnect = function (stream) {
    var hasStream = !!stream;

    stream = stream || fn.isSafe(function () { 
      return com.RTCPeerConnection.getLocalStreams()[0]; });

    com.RTCPeerConnection.close();
    com.RTCPeerConnection = null;
    
    var peer = new window.RTCPeerConnection(com.constraints, com.config);

    // Send stream
    if ((!fn.isEmpty(stream)) ? stream instanceof Stream : false) {    
      
      // Set the data
      com.stereo = fn.isSafe(function () { return stream.audio.stereo; });
    
      // Check class type
      peer.addStream(stream.MediaStream);
      
      if (hasStream) {
        com.handler('peer:stream', {
          stream: stream
        });
      }
      
      com.handler('peer:reconnect', {});
    }
    com.bind(peer);
  };

  /**
   * Stops the peer connection.
   * @method disconnect
   * @private
   * @trigger peerJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.disconnect = function () {
    if (com.RTCPeerConnection.newSignalingState !== 'closed') {
      com.RTCPeerConnection.close();
    }
    
    com.handler('peer:disconnect', {});
  };

  /**
   * Binds events to RTCPeerConnection object.
   * @method bind
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.bind = function (bindPeer) {
    bindPeer.iceConnectionFiredStates = [];
    bindPeer.queueCandidate = [];
    bindPeer.newSignalingState = 'new';
    bindPeer.newIceConnectionState = 'new';
    bindPeer.datachannels = {};

    bindPeer.ondatachannel = function (event) {
      var eventChannel = event.channel || event;
      
      // Send the channel only when channel has started
      var channel = new DataChannel(eventChannel, function (event, data) {
        
        com.handler(event, data);
        
        if (event === 'datachannel:start') {
          com.handler('peer:datachannel', {
            channel: channel,
            sourceType: 'remote'
          });
        }
      });

      com.datachannels[channel.id] = channel;

      if (channel.id === 'main'){

        /*DataTransferHandler(com, 'datatransfer:start', {
          data: data,
          dataChannel: channel,
        }, listener);*/

        com.handler('datatransfer:start',{
          data: data,
          dataChannel: channel
        });

      }
    };

    bindPeer.onaddstream = function (event) {
      var eventStream = event.stream || event;
  
      // Send the stream only when stream has started
      var stream = new Stream(eventStream, config.streamingConfig, function (event, data) {
        
        com.handler(event, data);
  
        if (event === 'stream:start') {
          com.handler('peer:stream', {
            sourceType: 'remote',
            stream: stream
          });
        }
      });
    };

    bindPeer.onicecandidate = function (event) {
      var eventCandidate = event.candidate || event;
  
      if (fn.isEmpty(eventCandidate.candidate)) {
        com.handler('candidate:gathered', {
          candidate: eventCandidate
        });
        return;
      }
      
      com.handler('peer:icecandidate', {
        sourceType: 'local',
        candidate: eventCandidate
      }); 
    };

    bindPeer.oniceconnectionstatechange = function (event) {
      ICE.parseIceConnectionState(bindPeer);
    };

    bindPeer.oniceconnectionnewstatechange = function (event) {
      // Connection is successful
      if (com.RTCPeerConnection.newIceConnectionState === 'connected') {
        // Stop timer
        if (!fn.isEmpty(com.healthTimer)) {
          log.debug('Peer', com.id, 'Stopping health timer as connection is established.');

          clearInterval(com.healthTimer);
        }
      }
      
      com.handler('peer:iceconnectionstate', {
        state: com.RTCPeerConnection.newIceConnectionState
      });
    };

    bindPeer.onsignalingstatechange = function (event) {
      com.handler('peer:signalingstate', {
        state: com.RTCPeerConnection.newSignalingState
      });
    };

    bindPeer.onicegatheringstatechange = function () {
      com.handler('peer:icegatheringstate', {
        state: com.RTCPeerConnection.iceGatheringState
      }); 
    };
    
    com.RTCPeerConnection = bindPeer;

    fn.runSync(function () {
      com.handler('peer:connect', {
        weight: com.weight,
        SDPType: com.SDPType,
        streamingConfig: com.streamingConfig
      });
    });
  };

  com.sendMessage = function(message){
    if (com.datachannels.main){
      com.datachannels.main.send(message);
    }
  };

  com.transferData = function(data){
    /*for (var channel in com.datachannels){
      if (com.datachannels.hasOwnProperty(channel)){
        var dt = new DataTransfer(com.datachannels[channel], com.id, listener);
        dt.sendBlobData(data,{
          name: data.name,
          size: data.size
        });
        return;
      }
    }*/

    /*var dc = new DataChannel(com.RTCPeerConnection.createDataChannel('transfer'),listener);
    com.datachannels.transfer = dc;*/

    com.handler('datatransfer:start',{
      data: data,
      dataChannel: com.datachannels.main  
    });

    com.datatransfers.main.sendBlobData(data,{
      name: data.name,
      size: data.size
    });
    return;
  };

  /**
   * Creates an offer session description.
   * @method createOffer
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.createOffer = function () {
    // Create datachannel
    if (globals.dataChannel && com.type === 'user') {

      var eventChannel = com.RTCPeerConnection.createDataChannel('main');
      
      // Send the channel only when channel has started
      var channel = new DataChannel(eventChannel, function (event, data) {
        
        com.handler(event, data);
        
        com.handler('peer:datachannel', {
          sourceType: 'local',
          channel: channel
        });
      });

      com.datachannels.main = channel;
    }

    com.RTCPeerConnection.createOffer(function (offer) {
      offer.sdp = SDP.configure(offer.sdp, com.sdpConfig);

      com.localDescription = offer;

      com.handler('peer:offer:success', {
        offer: offer
      });

    }, function (error) {
      com.handler('peer:offer:error', {
        error: error
      });
    }, com.sdpConstraints);
  };

  /**
   * Creates an answer session description.
   * @method createAnswer
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.createAnswer = function () {
    com.RTCPeerConnection.createAnswer(function (answer) {
      answer.sdp = SDP.configure(answer.sdp, com.sdpConfig);
  
      com.localDescription = answer;
  
      com.handler('peer:answer:success', {
        answer: answer
      });
      
      com.setLocalDescription();

    }, function (error) {
      com.handler('peer:answer:error', {
        error: error
      });
      
    }, com.sdpConstraints);
  };

  /**
   * Sets local description.
   * @method setLocalDescription
   * @for Peer
   * @since 0.6.0
   */
  com.setLocalDescription = function () {
    var localDescription = com.localDescription;
  
    com.RTCPeerConnection.setLocalDescription(localDescription, function () {
      com.handler('peer:localdescription:success', {
        localDescription: localDescription.sdp,
        type: localDescription.type,
      });

      if (localDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-local-answer';
        
        com.handler('peer:signalingstate', {
          state: com.RTCPeerConnection.newSignalingState
        });
      
      } else {
        com.setRemoteDescription();
      }

    }, function (error) {
      com.handler('peer:localdescription:error', {
        localDescription: localDescription.sdp,
        type: localDescription.type,
        error: error
      });
    });
  };

  /**
   * Sets remote description.
   * @method setRemoteDescription
   * @for Peer
   * @since 0.6.0
   */
  com.setRemoteDescription = function () {
    var remoteDescription = com.remoteDescription;

    com.RTCPeerConnection.setRemoteDescription(remoteDescription, function () {
      com.handler('peer:remotedescription:success', {
        remoteDescription: remoteDescription.sdp,
        type: remoteDescription.type
      });
  
      if (remoteDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-remote-answer';
        
        com.handler('peer:signalingstate', {
          state: com.RTCPeerConnection.newSignalingState
        });
      
      } else {
        com.createAnswer();
      }
      
      // Add all ICE Candidate generated before remote description of answer and offer
      ICE.popCandidate(com.RTCPeerConnection, com.handler);

    }, function (error) {
      com.handler('peer:remotedescription:error', {
        remoteDescription: remoteDescription.sdp,
        type: remoteDescription.type,
        error: error
      });
    });
  };

  // Throw an error if adapterjs is not loaded
  if (!window.RTCPeerConnection) {
    throw new Error('Required dependency adapterjs not found');
  }
  
  // Parse bandwidth
  com.streamingConfig.bandwidth = StreamParser.parseBandwidthConfig(com.streamingConfig.bandwidth);

  // Parse constraints ICE servers
  com.constraints = ICE.parseICEServers(config.constraints);
  
  // Parse the sdp configuration
  com.sdpConfig = {
    stereo: fn.isSafe(function () { return config.streamingConfig.audio.stereo; }),
    bandwidth: com.bandwidth
  };
  
  // Start timer
  /*com.healthTimer = setTimeout(function () {
    if (!fn.isEmpty(com.healthTimer)) {
      log.debug('Peer', com.id, 'Restarting negotiation as timer has expired');
      
      clearInterval(com.healthTimer);
      
      com.reconnect();
    }
    
  }, com.iceTrickle ? 10000 : 50000);*/

  fn.runSync(function () {
    com.handler('peer:start', {
      weight: com.weight,
      SDPType: com.SDPType,
      streamingConfig: com.streamingConfig
    });
  });
}
var PeerEventReceivedHandler = {
  
  stream: {
    
    stop: function (com, data, listener) {
      // If stream is not the main, disconnect the peer connection.
      if (com.id !== 'main') {
        com.disconnect();
      }
    }
  }
  
};

/**
 * Handles all the events to respond to other parent classes.
 * @attribute PeerEventResponseHandler
 * @for Peer
 * @since 0.6.0
 */
var PeerEventResponseHandler = {
  
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect(com.id);
    }
  },
  
  reconnect: function (com, data, listener) {
    if (typeof com.onreconnect === 'function') {
      com.onreconnect();
    }
  },
  
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect();
    }
  },
  
  stream: function (com, data, listener) {
    data.stream.sourceType = data.sourceType;

    if (data.sourceType === 'remote') {
      com.stream = data.stream;
    }
    
    if (typeof com.onaddstream === 'function') {
      com.onaddstream(data.stream);
    }
  },

  /**
   * Handles the ice connection state trigger.
   * @property iceconnectionstate
   * @type Function
   * @private
   * @since 0.6.0
   */
  iceconnectionstate: function (com, data, listener) {
    if (typeof com.oniceconnectionstatechange === 'function') {
      com.oniceconnectionstatechange(data.state);
    }  
  },

  /**
   * Handles the ice gathering state trigger.
   * @property icegatheringstate
   * @type Function
   * @private
   * @since 0.6.0
   */
  icegatheringstate: function (com, data, listener) {
    if (typeof com.onicegatheringstatechange === 'function') {
      com.onicegatheringstatechange(data.state);
    }
  },

  /**
   * Handles the ice candidate trigger.
   * @property icecandidate
   * @type Function
   * @private
   * @since 0.6.0
   */
  icecandidate: function (com, data, listener) {},

  /**
   * Handles the signaling state trigger.
   * @property signalingstate
   * @type Function
   * @private
   * @since 0.6.0
   */
  signalingstate: function (com, data, listener) {
    if (typeof com.onsignalingstatechange === 'function') {
      com.onsignalingstatechange(data.state);
    }
  },

  /**
   * Handles the datachannel state trigger.
   * @property datachannel
   * @type Function
   * @private
   * @since 0.6.0
   */
  datachannel: function (com, data, listener) {
    data.channel.sourceType = data.sourceType;

    com.datachannels[data.channel.id] = data.channel;
    
    if (typeof com.ondatachannel === 'function') {
      com.ondatachannel(data.channel);
    }
  }
};

/**
 * Handles all the message events received from socket.
 * @attribute PeerEventMessageHandler
 * @for Peer
 * @since 0.6.0
 */
var PeerEventMessageHandler = {

  offer: function (com, data, listener) {
    com.remoteDescription = new window.RTCSessionDescription(data);

    com.handler('peer:offer', {
      sourceType: 'remote',
      offer: com.remoteDescription
    });
        
    com.setRemoteDescription();
  },
  
  answer: function (com, data, listener) {
    com.remoteDescription = new window.RTCSessionDescription(data);

    com.handler('peer:answer', {
      sourceType: 'remote',
      answer: com.remoteDescription
    });

    com.setLocalDescription();
  },

  candidate: function (com, data, listener) {
    var candidate = new window.RTCIceCandidate({
      sdpMLineIndex: data.label,
      candidate: data.candidate,
      sdpMid: data.id,
      label: data.label,
      id: data.id
    });

    ICE.addCandidate(com.RTCPeerConnection, candidate, com.handler);

    com.handler('peer:icecandidate', {
      sourceType: 'remote',
      candidate: candidate
    });
  },
  
  restart: function (com, data, listener) {
    
  },
  
  muteAudioEvent: function (com, data, listener) {
    if (data.muted) {
      com.stream.muteAudio();
    } else {
      com.stream.muteVideo();
    }
  },
    
  muteVideoEvent: function (com, data, listener) {
    if (data.muted) {
      com.stream.unmuteAudio();
    } else {
      com.stream.unmuteVideo();
    }
  }
};

/**
 * Handles the peer class events.
 * @attribute PeerHandler
 * @for Peer
 * @since 0.6.0
 */
var PeerHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Messaging events
  if (event.indexOf('message:') === 0) {
    
    fn.applyHandler(PeerEventMessageHandler, params, [com, data, listener]);
  
  } else {
    // Class events
    if (event.indexOf('peer:') === 0) {
      data.id = com.id;

      fn.applyHandler(PeerEventResponseHandler, params, [com, data, listener]);

    } else {
      data.peerId = com.id;

      fn.applyHandler(PeerEventReceivedHandler, params, [com, data, listener]);
    }
    
    listener(event, data);
  }
  
  //log.debug('PeerHandler', event, data);
};
var Request = {
  /**
   * The api server.
   * @property server
   * @type String
   * @private
   * @since 0.6.0
   */
  server: globals.roomServer || '//api.temasys.this.sg',

  /**
   * The flag to check if request should use XDomainRequest.
   * @property isXDomainRequest
   * @type Boolean
   * @private
   * @since 0.6.0
   */
  isXDomainRequest: window.webrtcDetectedBrowser === 'IE' &&
    (window.webrtcDetectedVersion === 9 || window.webrtcDetectedVersion === 8) &&
    typeof window.XDomainRequest === 'function',

  /**
   * The protocol the request uses to connect to.
   * @property protocol
   * @type String
   * @private
   * @since 0.6.0
   */
  protocol: (globals.enforceSSL) ? 'https:' : window.location.protocol,

  /**
   * Starts the connection to the room.
   * @property load
   * @type Function
   * @param {Function} callback The callback triggered once request has been completed.
   * @trigger peerJoined, mediaAccessRequired
   * @for Request
   * @since 0.6.0
   */
  load: function (path, deferSuccess, deferError) {
    var xhr = null;

    if (this.isXDomainRequest) {
      xhr = new XDomainRequest();

      xhr.setContentType = function (contentType) {
        xhr.contentType = contentType;
      };

    } else {
      xhr = new window.XMLHttpRequest();

      xhr.setContentType = function (contentType) {
        xhr.setRequestHeader('Content-type', contentType);
      };
    }

    xhr.onload = function () {
      var response = xhr.responseText || xhr.response;
      var status = xhr.status || 200;
      
      log.info('Request', 'Received response from API server', response, status);
      
      try {
        response = JSON.parse( response || '{}' );
      } catch (error) {
        throw error;
      }
  
      if (status === 200) {
        deferSuccess(status, response);
      
      } else {
        deferError(status, response);
      }
    };

    xhr.onerror = function (error) {
      throw error;
    };

    xhr.onprogress = function () {
      log.log('Request', 'Request load in progress');
    };

    xhr.open('GET', this.protocol + this.server + path, true);

    // xhr.setContentType('application/json;charset=UTF-8');

    xhr.send();
  }
};
function Room(name, listener) {
  'use strict';

  // Reference of instance
  var com = this;

  /**
   * The room name.
   * @attribute name
   * @type String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.name = name;

  /**
   * The room id.
   * @attribute name
   * @type String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.id = null;
  
  /**
   * The room token.
   * @attribute name
   * @type String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.token = null;
  
  /**
   * The room key.
   * @attribute key
   * @type String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.key = null;
  
  /**
   * The room start date timestamp (ISO format) for persistent mode.
   * @attribute startDateTime
   * @type String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.startDateTime = null;
  
  /**
   * The room duration for persistent mode.
   * @attribute duration
   * @type Integer
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.duration = null;

  /**
   * The request path to the api server.
   * @attribute path
   * @type String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.apiPath = null;

  /**
   * The room api owner.
   * @attribute owner
   * @type String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.owner = null;

  /**
   * The user set settings for the room.
   * @attribute credentials
   * @param {Integer} duration The room duration set by user.
   * @param {String} hash The hashed secret generated by user.
   * @param {String} startDateTime The room start date timestamp (ISO format) set by user.
   * @type JSON
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.credentials = globals.credentials;

  /**
   * The self user connection.
   * @attribute self
   * @type Self
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.self = null;
  
  /**
   * The user self custom user data.
   * @attribute self
   * @type JSON|String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.selfData = null;
  
  /**
   * The user self existing local stream connection.
   * @attribute stream
   * @param {Stream} <streamId> The stream connected to room.
   * @type JSON
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.streams = {};

  /**
   * The list of users connected to room.
   * @attribute users
   * @param {User} <userId> The user connected to room.
   * @type JSON
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.users = {};

  /**
   * The list of components connected to room.
   * - E.g. MCU, Recording
   * @attribute user
   * @param {User} [n=*] The user connected to room.
   * @type JSON
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.components = {};

  /**
   * The room duration.
   * @attribute startDateTime
   * @type Socket
   * @required
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.socket = null;
  
  /**
   * The room readyState.
   * @attribute readyState
   * @type Integer
   * @required
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.readyState = 0;
  
  /**
   * The room TURN/STUN servers connection.
   * @attribute iceServers
   * @param {Array} iceServers The list of ICE servers.
   * @param {JSON} <iceServers.n> The ICE server.
   * @type JSON
   * @required
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.iceServers = {};
  
  /**
   * The room locked state.
   * @attribute locked
   * @type Boolean
   * @required
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.locked = false;

  /**
   * The handler that manages all triggers or relaying events.
   * @attribute handler
   * @type Function
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    RoomHandler(com, event, data, listener);
  };

  
  /**
   * Function to subscribe to when room ready state has changed.
   * @method onreadystatechange
   * @for Room
   * @since 0.6.0
   */
  com.onreadystatechange = function () {};

  /**
   * Function to subscribe to when self has joined the room.
   * @method onjoin
   * @for Room
   * @since 0.6.0
   */
  com.onjoin = function () {};
  
  /**
   * Function to subscribe to when self has been kicked out of room.
   * @method onlock
   * @for Room
   * @since 0.6.0
   */
  com.onkick = function () {};
  
  /**
   * Function to subscribe to when self is warned by server.
   * @method onunlock
   * @for Room
   * @since 0.6.0
   */
  com.onwarn = function () {};

  /**
   * Function to subscribe to when room has been locked.
   * @method onlock
   * @for Room
   * @since 0.6.0
   */
  com.onlock = function () {};
  
  /**
   * Function to subscribe to when room has been unlocked.
   * @method onunlock
   * @for Room
   * @since 0.6.0
   */
  com.onunlock = function () {};
  
  /**
   * Function to subscribe to when self has leave the room.
   * @method onleave
   * @for Room
   * @since 0.6.0
   */
  com.onleave = function () {};


  /**
   * Starts the connection to the room.
   * @method join
   * @trigger peerJoined, mediaAccessRequired
   * @for Room
   * @since 0.6.0
   */
  com.join = function (stream, config) {
    config = config || {};

    com.self.bandwidth = StreamParser.parseBandwidthConfig(config.bandwidth);
    com.self.data = config.userData;
  
    if (!fn.isEmpty(stream)) {
      com.self.addStreamConnection(stream, 'main');
    }

    com.socket.connect();
    console.log('->joined');
  };

  /**
   * Stops the connection to the room.
   * @method leave
   * @trigger peerJoined, mediaAccessRequired
   * @for Room
   * @since 0.6.0
   */
  com.leave = function () {
    com.socket.disconnect();
  };
  
  /**
   * Locks the Room.
   * @method lock
   * @for Room
   * @since 0.6.0
   */
  com.lock = function (options) {
    com.socket.send({
      type: 'roomLockEvent',
      mid: com.self.id,
      rid: com.id,
      lock: true
    });
    
    com.handler('room:lock', {
      userId: com.self.id
    });
  };

  /**
   * Unlocks the Room.
   * @method unlock
   * @for Room
   * @since 0.6.0
   */
  com.unlock = function () {
    com.socket.send({
      type: 'roomLockEvent',
      mid: com.self.id,
      rid: com.id,
      lock: false
    });
    
    com.handler('room:unlock', {
      userId: com.self.id
    });
  };

  /**
   * Sends a another stream to users.
   * @method addStreamConnection
   * @param {Stream} stream The stream object.
   * @for Room
   * @since 0.6.0
   */
  com.addStreamConnection = function (stream) {
    var connectionId = fn.generateUID();

    com.self.addStreamConnection(stream, connectionId);
    
    stream.parentHandler = com.handler;
    
    fn.forEach(com.users, function (user, key) {
      data.stream = stream;
      user.handler('message:enter', data);
    });
  };

  
  /**
   * Handles the self connection to the room.
   * @class Self
   * @for Skylink
   * @extend Room
   * @since 0.6.0
   */
  function Self (config) {
    // Reference of instance
    var subcom = this;

    /**
     * The self user id.
     * @attribute name
     * @type String
     * @private
     * @for Self
     * @since 0.6.0
     */
    subcom.id = null;
    
    /**
     * The self user data.
     * @attribute data
     * @type String | JSON
     * @private
     * @for Self
     * @since 0.6.0
     */
    subcom.data = config.data;
    
    /**
     * The self user username.
     * @attribute username
     * @type String
     * @private
     * @for Self
     * @since 0.6.0
     */
    subcom.username = config.username;
    
    /**
     * The self user timestamp (ISO format).
     * @attribute timeStamp
     * @type String
     * @private
     * @for Self
     * @since 0.6.0
     */
    subcom.timeStamp = config.timeStamp;
    
    /**
     * The self user credential.
     * @attribute token
     * @type String
     * @private
     * @for Self
     * @since 0.6.0
     */
    subcom.token = config.token;
    
    /**
     * The self user local stream connection.
     * @attribute stream
     * @param {JSON} <connectionId> The stream connection to users.
     * @param {Array} <connectionId.targetUsers> The target users.
     * @param {Stream} <connectionId.stream> The stream connected to room.
     * @type JSON
     * @private
     * @for Self
     * @since 0.6.0
     */
    subcom.streams = {};
    
    /**
     * The self user browser agent information.
     * @attribute agent
     * @type JSON
     * @private
     * @for Self
     * @since 0.6.0
     */
    subcom.agent = {
      name: window.webrtcDetectedBrowser,
      version: window.webrtcDetectedVersion,
      webRTCType: window.webrtcDetectedType
    };
    
    /**
     * The self user bandwidth configuration.
     * @attribute agent
     * @type JSON
     * @private
     * @for Self
     * @since 0.6.0
     */
    subcom.bandwidth = {};
    
    /**
     * The handler that manages all triggers or relaying events.
     * @attribute handler
     * @type Function
     * @private
     * @for Self
     * @since 0.6.0
     */
    subcom.handler = function (event, data) {
      data.id = subcom.id;
      
      log.debug('SelfHandler:', event, data); 

      RoomHandler(com, event, data, listener);
    };

    
    /**
     * Function to subscribe to when self user custom user data is updated.
     * @method onupdate
     * @for Self
     * @since 0.6.0
     */
    subcom.onupdate = function () {};
    
    /**
     * Function to subscribe to when self has added a stream connection.
     * @method onaddstreamconnection
     * @for Self
     * @since 0.6.0
     */
    subcom.onaddstreamconnection = function () {};

    /**
     * Function to subscribe to when self has stopped a stream connection.
     * @method onaddstream
     * @for Self
     * @since 0.6.0
     */
    subcom.onremovestreamconnection = function () {};
    
    /**
     * Function to subscribe to when self has been disconnected from the room.
     * @method ondisconnect
     * @for Self
     * @since 0.6.0
     */
    subcom.ondisconnect = function () {};
    
  
    /**
     * Updates the self user data.
     * @method update
     * @for Self
     * @since 0.6.0
     */
    subcom.update = function (data) {
      subcom.data = data;
      
      com.socket.send({
        type: 'updateUserEvent',
        mid: subcom.id,
        rid: com.id,
        userData: subcom.data
      });
      
      subcom.handler('self:update', {
        data: subcom.data
      });
    };

    /**
     * Starts a new stream connection.
     * @method addStreamConnection
     * @param {Stream} stream The stream object.
     * @param {Array|String} The array or string "main".
     * @for Self
     * @since 0.6.0
     */
    subcom.addStreamConnection = function (stream, connectionId) {
      stream.sourceType = 'local';

      var connection = {
        id: connectionId,
        stream: stream
      };
      
      subcom.streams[connectionId] = connection;
      
      if (typeof subcom.onaddstreamconnection === 'function') {
        subcom.onaddstreamconnection(connection);
      }
      
      subcom.handler('self:addstreamconnection', {
        stream: stream,
        connectionId: connectionId
      });
    };
    
    /**
     * Stops a stream connection.
     * @method removeStreamConnection
     * @param {String} connectionId The streaming connection id.
     * @for Self
     * @since 0.6.0
     */
    subcom.removeStreamConnection = function (connectionId) {
      var stream = subcom.streams[connectionId];
      
      stream.stop();
      
      // Do not remove main connection.
      // Stream may stop, but user is still connected.
      if (connectionId !== 'main') {
        // Stream has targeted users
        if (fn.isEmpty(subcom.streams[connectionId].targetUsers)) {
          fn.forEach(com.users, function (value, key) {
            value.removeConnection(streamId);
          });

        // Stream has targeted users
        } else {
          fn.forEach(subcom.streams[connectionId].targetUsers, function (value, key) {
            if (!fn.isEmpty(com.users[key])) {
              com.users[key].removeConnection(streamId);
            }
          });
        }
      }
  
      if (typeof subcom.onremovestreamconnection === 'function') {
        subcom.onremovestreamconnection(stream, targetUsers);
      }
      
      // Remove stream reference
      delete subcom.streams[streamId];
      // Remove connections to stream reference
      delete subcom.streams[streamId];
      
      subcom.handler('self:removestreamconnection', {
        streamId: streamId
      });
    };
    
    /**
     * Gets the self user info.
     * @method getInfo
     * @param {String} connectionId The connectionId of the stream.
     * @for Self
     * @since 0.6.0
     */
    subcom.getInfo = function (connectionId) {
      var info = {
        userData: subcom.data,
        agent: subcom.agent
      };
  
      if (fn.isEmpty(connectionId)) {
        var streaming = {};

        fn.forEach(subcom.streams, function (connection, key) {
          var settings = subcom.streams[connectionId] || {};
          var stream = settings.stream || { 
            config: { 
              audio: false, 
              video: false, 
              status: { audioMuted: true, videoMuted: true }
            } 
          };

          streaming[key] = {
            audio: stream.config.audio,
            video: stream.config.video,
            bandwidth: subcom.bandwidth,
            mediaStatus: stream.config.status
          };
        
        }, function () {
          info.settings = streaming;
          
          return info;
        });
      
      } else {
        var settings = subcom.streams[connectionId] || {};
        var stream = settings.stream || { 
          config: { 
            audio: false, 
            video: false, 
            status: { audioMuted: true, videoMuted: true }
          } 
        };
  
        info.settings = {
          audio: stream.config.audio,
          video: stream.config.video,
          bandwidth: subcom.bandwidth,
          mediaStatus: stream.config.status
        };
        
        return info;
      }
    };
    
    subcom.handler('self:start', config);
  }


  // Start loading the room information
  var path = '/api/' + globals.apiKey + '/' + com.name;

  // Set credentials if there is
  if (com.credentials !== null) {
    path += com.credentials.startDateTime + '/' +
      com.credentials.duration + '?&cred=' + com.credentials.hash;
  }

  // Check if there is a other query parameters or not
  if (globals.region) {
    path += (path.indexOf('?&') > -1 ? '&' : '?&') + 'rg=' + globals.region;
  }

  // Start connection
  Request.load(path, function (status, content) {
    // Store the path information
    com.apiPath = path;

    // Room configuration settings from server
    com.key = content.cid;
    com.id = content.room_key;
    com.token = content.roomCred;
    com.startDateTime = content.start;
    com.duration = content.len;
    com.owner = content.apiOwner;

    // User configuration settings from server
    com.self = new Self({
      id: null,
      username: content.username,
      token: content.userCred,
      timeStamp: content.timeStamp,
      data: globals.userData
    });
    
    //com.constraints = JSON.parse(content.pc_constraints);

    // Signalling information
    com.socket = new Socket({
      server: content.ipSigserver,
      httpPortList: content.httpPortList,
      httpsPortList: content.httpsPortList

    }, com.handler);
    
    // Bind the message events handler
    MessageHandler(com, listener);
    
    listener('room:start', {
      id: com.id,
      name: com.name
    });
  
  }, function (status, error) {
    com.handler('trigger:error', {
      error: error,
      state: -1
    });
  });
}
var RoomEventReceivedHandler = {

  socket: {

    connect: function (com, data, listener) {
      com.socket.send({
        type: 'joinRoom',
        uid: com.self.username,
        cid: com.key,
        rid: com.id,
        userCred: com.self.token,
        timeStamp: com.self.timeStamp,
        apiOwner: com.owner,
        roomCred: com.token,
        start: com.startDateTime,
        len: com.duration
      });
    },

    disconnect: function (com, data, listener) {
      com.handler('room:leave', {});

      if (typeof com.onleave === 'function') {
        com.onleave();
      }
    },

    error: function (com, data, listener) {
      com.handler('room:error', {
        error: data,
        state: -2
      });
    }
  },

  user: {
    start: function (com, data, listener) {
      var user = com.users[data.mid];

      // Get stream
      var connection = com.self.streams[data.prid];

      // Check if stream connection exists
      if (!fn.isEmpty(connection)) {
        data.stream = connection.stream;
      }

      data.iceServers = com.iceServers;

      user.handler('message:' + data.type, data);
    }
  },
  
  peer: {
    connect: function (com, data, listener) {
      var user = com.users[data.userId];
      var userInfo = user.getInfo();
  
      // Send welcome after creating object
      if (data.SDPType === 'answer') {
        com.socket.send({
          type: 'welcome',
          mid: com.self.id,
          rid: com.id,
          prid: data.id,
          agent: window.webrtcDetectedBrowser,
          version: window.webrtcDetectedVersion,
          webRTCType: window.webrtcDetectedType,
          userInfo: com.self.getInfo(data.id),
          target: data.userId,
          weight: data.weight
        });
      }
    },
    
    offer: {
      success: function (com, data, listener) {
        com.socket.send({
          type: 'offer',
          sdp: data.offer.sdp,
          prid: data.id,
          mid: com.self.id,
          target: data.userId,
          rid: com.id
        });
      }
    },

    answer: {
      success: function (com, data, listener) {
        com.socket.send({
          type: 'answer',
          sdp: data.answer.sdp,
          prid: data.id,
          mid: com.self.id,
          target: data.userId,
          rid: com.id
        });
      }
    },

    icecandidate: function (com, data, listener) {
      if (data.sourceType === 'local') {
        com.socket.send({
          type: 'candidate',
          label: data.candidate.sdpMLineIndex,
          id: data.candidate.sdpMid,
          candidate: data.candidate.candidate,
          mid: com.self.id,
          prid: data.id,
          target: data.userId,
          rid: com.id
        });
      }
    }
  }
};

/**
 * Handles all the events to respond to other parent classes.
 * @attribute RoomEventResponseHandler
 * @for Room
 * @since 0.6.0
 */
var RoomEventResponseHandler = {
  /**
   * Handles the error state trigger.
   * @property error
   * @type Function
   * @private
   * @since 0.6.0
   */
  error: function (com, data, listener) {
    com.readyState = data.state;

    com.handler('room:error', {
      error: data.error,
      state: data.state
    });

    if (typeof com.onerror === 'function') {
      com.onerror({
        error: data.error,
        state: data.state
      });
    }
  }

};

/**
 * Handles the room class events.
 * @attribute RoomHandler
 * @for Room
 * @since 0.6.0
 */
var RoomHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  if (event.indexOf('room:') === 0) {
    data.name = com.name;

    fn.applyHandler(RoomEventResponseHandler, params, [com, data, listener]);

  } else {
    data.roomName = com.name;

    fn.applyHandler(RoomEventReceivedHandler, params, [com, data, listener]);
  }

  listener(event, data);
  
  log.debug('RoomHandler', event, data);
};

/**
 * Stores the room messaging events.
 * @attribute MessageHandlerEvent
 * @for Room
 * @since 0.6.0
 */
var MessageHandlerEvent = {
  /**
   * Self is in the room.
   * @property inRoom
   * @type JSON
   * @private
   * @since 0.6.0
   */
  inRoom: function (com, data, listener) {
    com.self.id = data.sid;

    com.iceServers = data.pc_config;

    com.socket.send({
      type: 'enter',
      mid: com.self.id,
      rid: com.id,
      prid: 'main',
      agent: window.webrtcDetectedBrowser,
      version: window.webrtcDetectedVersion,
      webRTCType: window.webrtcDetectedType,
      userInfo: com.self.getInfo('main')
    });

    com.handler('room:join', {
      userId: com.self.id,
      user: com.self,
      isSelf: true
    });

    if (typeof com.onjoin === 'function') {
      com.onjoin(data.mid);
    }
  },

  /**
   * User has sent self an enter.
   * @property enter
   * @type JSON
   * @private
   * @since 0.6.0
   */
  enter: function (com, data, listener) {
    var user = com.users[data.mid];
    
    if (fn.isEmpty(user)) {
      user = new User(data, com.handler);
      
      com.users[data.mid] = user;
    }
  },

  /**
   * User has sent self an welcome.
   * @property enter
   * @type JSON
   * @private
   * @since 0.6.0
   */
  welcome: function (com, data, listener) {
    var user = com.users[data.mid];
    
    if (fn.isEmpty(user)) {
      user = new User(data, com.handler);
      
      com.users[data.mid] = user;
    }
  },

  /**
   * A user has sent an offer to self.
   * @property offer
   * @type JSON
   * @private
   * @since 0.6.0
   */
  offer: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.handler('message:offer', data);
    }
  },

  /**
   * A user has sent an answer to self.
   * @property answer
   * @type JSON
   * @private
   * @since 0.6.0
   */
  answer: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.handler('message:answer', data);
    }
  },

  /**
   * A user has sent an ICE candidate to self.
   * @property candidate
   * @type Function
   * @private
   * @since 0.6.0
   */
  candidate: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.handler('message:candidate', data);
    }
  },

  /**
   * A user has updated their own custom user data.
   * @property updateUserEvent
   * @type Function
   * @private
   * @since 0.6.0
   */
  updateUserEvent: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.handler('message:updateUserEvent', data.userData);
    }
  },

  /**
   * An audio stream muted status has been updated.
   * @property muteAudioEvent
   * @type Function
   * @private
   * @since 0.6.0
   */
  muteAudioEvent: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.handler('message:muteAudioEvent', data);
    }
  },

  /**
   * A video stream muted status has been updated.
   * @property muteVideoEvent
   * @type Function
   * @private
   * @since 0.6.0
   */
  muteVideoEvent: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.handler('message:muteVideoEvent', data);
    }
  },

  /**
   * The room is lock status has been updated.
   * @property roomLockEvent
   * @type Function
   * @private
   * @since 0.6.0
   */
  roomLockEvent: function (com, data, listener) {
    com.locked = data.lock;

    if (com.locked) {
      if (typeof com.onlock === 'function') {
        com.onlock(data.mid);
      }

    } else {
      if (typeof com.onunlock === 'function') {
        com.onunlock(data.mid);
      }
    }
  },

  /**
   * The room is lock status has been updated.
   * @property roomLockEvent
   * @type Function
   * @private
   * @since 0.6.0
   */
  restart: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.handler('message:restart', data);
    }
  },

  /**
   * The self is redirected or warned.
   * @property redirect
   * @type Function
   * @private
   * @since 0.6.0
   */
  redirect: function (com, data, listener) {
    if (data.action === 'reject') {
      if (typeof com.onkick === 'function') {
        com.onkick({
          message: data.info,
          reason: data.reason
        });
        
        com.leave();
      }
    }

    if (data.action === 'warning') {
      if (typeof com.onwarn === 'function') {
        com.onwarn({
          message: data.info,
          reason: data.reason
        });
      }
    }
  },

  /**
   * The a user or self is disconnected from room.
   * @property bye
   * @type Function
   * @private
   * @since 0.6.0
   */
  bye: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.disconnect();
    }
  }

};

/**
 * Handles the room messaging events.
 * @attribute MessageHandler
 * @for Room
 * @since 0.6.0
 */
var MessageHandler = function (com, listener) {
  // Handles the socket events
  fn.forEach(MessageHandlerEvent, function (response, event) {
    com.socket.when(event, function (data) {
      response(com, data, listener);
    });
  });
};
var SDP = {
  /**
   * Finds a line in the sdp based on the condition provided
   * @property SDP.find
   * @type Function
   * @param {Array} sdpLines The sdp in array.
   * @param {Array} condition The beginning part of the sdp line. E.g. a=fmtp
   * @return {Array} [index, line] The sdp line.
   * @private
   * @for Skylink
   * @since 0.6.0
   */
  find: function(sdpLines, condition) {
    var i, j;
    
    for (i = 0; i < sdpLines.length; i += 1) {
      for (j = 0; j < condition.length; j += 1) {
        sdpLines[i] = sdpLines[i] || '';

        if (sdpLines[i].indexOf(condition[j]) === 0) {
          return [i, sdpLines[i]];
        }
      }
    }
    
    return [];
  },
  
  /**
   * Enables the stereo feature if OPUS is enabled.
   * @property SDP.addStereo
   * @type Function
   * @param {Array} sdpLines Sdp received.
   * @return {Array} Updated version with Stereo feature
   * @private
   * @for Skylink
   * @since 0.6.0
   */
  addStereo: function(sdpLines) {
    var opusLineFound = false, opusPayload = 0;
    // Check if opus exists
    var rtpmapLine = this.find(sdpLines, ['a=rtpmap:']);
    if (rtpmapLine.length) {
      if (rtpmapLine[1].split(' ')[1].indexOf('opus/48000/') === 0) {
        opusLineFound = true;
        opusPayload = (rtpmapLine[1].split(' ')[0]).split(':')[1];
      }
    }
    // Find the A=FMTP line with the same payload
    if (opusLineFound) {
      var fmtpLine = this.find(sdpLines, ['a=fmtp:' + opusPayload]);
      if (fmtpLine.length) {
        sdpLines[fmtpLine[0]] = fmtpLine[1] + '; stereo=1';
      }
    }
    return sdpLines;
  },
  
  /**
   * Sets the audio, video and DataChannel data bitrate in the sdp.
   * - In low-environment cases, bandwidth is managed by the browsers
   *   and the quality of the resolution or audio may change to suit.
   * @property SDP.setBitrate
   * @type Function
   * @param {Array} sdpLines Sdp received.
   * @return {Array} Updated version with custom Bandwidth settings
   * @private
   * @for Skylink
   * @since 0.6.0
   */
  setBitrate: function (sdpLines, bandwidth) {
    // Find if user has audioStream
    var maLineFound = this.find(sdpLines, ['m=', 'a=']).length;
    var cLineFound = this.find(sdpLines, ['c=']).length;

    // Find the RTPMAP with Audio Codec
    if (maLineFound && cLineFound) {
      if (bandwidth.audio) {
        var audioLine = this.find(sdpLines, ['a=audio', 'm=audio']);
        
        if (!fn.isEmpty(audioLine)) {
          sdpLines.splice(audioLine[0], 1, audioLine[1], 'b=AS:' + bandwidth.audio);
        }
      }
      
      if (bandwidth.video) {
        var videoLine = this.find(sdpLines, ['a=video', 'm=video']);
        
        if (!fn.isEmpty(videoLine)) {
          sdpLines.splice(videoLine[0], 1, videoLine[1], 'b=AS:' + bandwidth.video);
        }
      }
      
      if (bandwidth.data && this._enableDataChannel) {
        var dataLine = this.find(sdpLines, ['a=application', 'm=application']);
        
        if (!fn.isEmpty(dataLine)) {
          sdpLines.splice(dataLine[0], 1, dataLine[1], 'b=AS:' + bandwidth.data);
        }
      }
    }
    return sdpLines;
  },
    
  /**
   * Set video stream resolution in the sdp.
   * - As noted, this is not working.
   * @property SDP.setResolution
   * @type Function
   * @param {Array} sdpLines Sdp received.
   * @return {Array} Updated version with custom Bandwidth settings
   * @private
   * @for Skylink
   * @since 0.6.0
   */
  setResolution: function (sdpLines) {
    var video = this._streamSettings.video;
    var frameRate = video.frameRate || 50;
    var resolution = video.resolution || {};
    var fmtpLine = this.find(sdpLines, ['a=fmtp:']);
    if (fmtpLine.length){
        sdpLines.splice(fmtpLine[0], 1,fmtpLine[1] + ';max-fr=' + frameRate +
        ';max-recv-width=' + (resolution.width ? resolution.width : 640) +
        ';max-recv-height=' + (resolution.height ? resolution.height : 480));
    }
    return sdpLines;
  },
    
  /**
   * Removes the H264 preference in sdp because other browsers does not support it yet.
   * @property SDP.removeH264Support
   * @type Function
   * @param {Array} sdpLines Sdp received.
   * @return {Array} Updated version removing Firefox h264 pref support.
   * @private
   * @for Skylink
   * @since 0.6.0
   */
  removeH264Support: function (sdpLines) {
    var invalidLineIndex = sdpLines.indexOf(
      'a=fmtp:0 profile-level-id=0x42e00c;packetization-mode=1');
    if (invalidLineIndex > -1) {
      log.debug('Firefox H264 invalid pref found:', invalidLineIndex);
      sdpLines.splice(invalidLineIndex, 1);
    }
    return sdpLines;
  },
  
  /**
   * Modifies a local session description with the configuration provided
   * @property SDP.configure
   * @type Function
   * @param {Array} sdpLines Sdp received.
   * @return {String} Updated local session description.
   * @private
   * @for Skylink
   * @since 0.6.0
   */
  configure: function (sdp, config) {
    var sdpLines = sdp.split('\r\n');
    
    sdpLines = this.removeH264Support(sdpLines);

    if (config.stereo) {
      sdpLines = this.addStereo(sdpLines);
    }

    if (config.bandwidth) {
      sdpLines = this.setBitrate(sdpLines, config.bandwidth);
    }

    return sdpLines.join('\r\n');
  }
  
};
function Socket(config, listener) {
  'use strict';

  // Reference of instance
  var com = this;

  /**
   * The signalling server.
   * @attribute server
   * @type String
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.server = config.server;

  /**
   * The signalling server protocol to connect with.
   * @attribute protocol
   * @type String
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.protocol = globals.enforceSSL ? 'https:' : window.location.protocol;

  /**
   * The signalling server port to connect with.
   * @attribute server
   * @type String
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.port = null;

  /**
   * The timeout the Socket should wait for before throwing an error.
   * @attribute timeout
   * @type Integer
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.timeout = globals.socketTimeout || 0;

  /**
   * The interval to wait before sending the next message.
   * @attribute messageInterval
   * @type Integer
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.messageInterval = 1000;
  
   /**
   * The queue of messages (throttle) before sending the next
   * @attribute messageQueue
   * @type Array
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.messageQueue = [];
  
  /**
   * The socket readyState.
   * @attribute readyState
   * @type String
   * @required
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.readyState = 'new';

  /**
   * The list of available signalling server ports.
   * @attribute ports
   * @param {Array} http: The list of Http ports.
   * @param {Array} https: The list of Https ports.
   * @type JSON
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.ports = {
    'https:': config.httpsPortList,
    'http:': config.httpPortList
  };

  /**
   * The socket configuratin.
   * @attribute config
   * @type JSON
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.config = {};

  /**
   * The type of socket connection.
   * @attribute type
   * @type String
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.type = config.type || 'WebSocket';

  /**
   * The Socket.io object.
   * @attribute Socket
   * @type Object
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.Socket = null;

  /**
   * The responses attached to message events.
   * @attribute responses
   * @type JSON
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.responses = {};
  
  /**
   * The handler that manages all triggers or relaying events.
   * @attribute handler
   * @type Function
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    data.server = com.server;
    data.port = com.port;
    data.type = com.type;
    data.protocol = com.protocol;
    
    //log.debug('SocketHandler', event, data); 
  
    listener(event, data);
  };


  
  /**
   * Function to subscribe to when socket has been connected.
   * @method onconnect
   * @for Socket
   * @since 0.6.0
   */
  com.onconnect = function () {};

  /**
   * Function to subscribe to when socket has been disconnected.
   * @method ondisconnect
   * @for Room
   * @since 0.6.0
   */
  com.ondisconnect = function () {};
  
  /**
   * Function to subscribe to when socket has connection error.
   * @method onconnecterror
   * @for Room
   * @since 0.6.0
   */
  com.onconnecterror = function () {};
  
  /**
   * Function to subscribe to when socket attempts to reconnect.
   * @method onreconnect
   * @for Room
   * @since 0.6.0
   */
  com.onreconnect = function () {};
  
  /**
   * Function to subscribe to when socket has an exception.
   * @method onerror
   * @for Room
   * @since 0.6.0
   */
  com.onerror = function () {};

  
  /**
   * Starts the connection to the signalling server
   * @method connect
   * @trigger peerJoined, mediaAccessRequired
   * @for Socket
   * @since 0.6.0
   */
  com.connect = function () {
    com.port = com.ports[window.location.protocol][0];
    
    if (com.type === 'XHRPolling') {
      com.Socket = new com.XHRPolling();
    } else {
      com.Socket = new com.WebSocket();
    }
  };

  /**
   * Stops the connection to the Socket.
   * @method disconnect
   * @trigger peerJoined, mediaAccessRequired
   * @for Socket
   * @since 0.6.0
   */
  com.disconnect = function () {
    com.Socket.disconnect();
    com.Socket.responses = {};
  };

  /**
   * Attaches a listener to a particular socket message event received.
   * @method when
   * @trigger peerJoined, mediaAccessRequired
   * @for Socket
   * @since 0.6.0
   */
  com.when = function (event, callback) {
    com.responses[event] = com.responses[event] || [];
    // Push callback for listening
    com.responses[event].push(callback);
  };
 
  /**
   * Sends a socket data.
   * @method send
   * @trigger peerJoined, mediaAccessRequired
   * @for Socket
   * @since 0.6.0
   */
  com.send = function (data) {
    /*var interval = com.messageInterval;

    if (data.type === 'enter') {
      interval = 0;
    }
    setTimeout(function () {*/
      com.Socket.send(JSON.stringify(data));
      com.handler('socket:send', {
        message: data
      });
    //}, interval);
  };

  /**
   * Handles the event when socket is connected to signaling.
   * @method bindOnConnect
   * @for Socket
   * @since 0.6.0
   */
  com.bindOnConnect = function (options) {
    com.handler('socket:connect', {});

    com.Socket.removeAllListeners();

    com.Socket.on('disconnect', com.bindOnDisconnect);

    com.Socket.on('message', com.bindOnMessage);
    
    com.Socket.on('error', com.bindOnError);
    
    if (typeof com.onconnect === 'function') {
      com.onconnect();
    }
  };

  /**
   * Handles the event when socket is disconnected to signaling.
   * @method bindOnDisconnect
   * @for Socket
   * @since 0.6.0
   */
  com.bindOnDisonnect = function () {
    com.handler('socket:disconnect', {});
    
    if (typeof com.onerror === 'function') {
      com.ondisconnect();
    }
  };

  /**
   * Handles the event when socket receives a message from signaling.
   * @method bindOnMessage
   * @trigger peerJoined, mediaAccessRequired
   * @for Socket
   * @since 0.6.0
   */
  com.bindOnMessage = function (result) {
    var data = JSON.parse(result);
    
    com.handler('socket:message', {
      message: data
    });

    // Check if bulk message
    if (data.type === 'group') {
      fn.forEach(function (message, key) {
        com.respond(message.type, message);
      });

    } else {
      com.respond(data.type, data);
    }
  };
  
  /**
   * Handles the event when socket have a connection error.
   * @method bindOnConnectError
   * @for Socket
   * @since 0.6.0
   */
  com.bindOnConnectError = function (error) {
    com.handler('socket:connect_error', {
      error: error
    });

    var ports = com.ports[window.location.protocol];

    for (var i = 0; i < ports.length; i++) {
      // Get current port
      if (ports[i] === com.port) {
        // Check if reach the end
        if ((i + 1) < ports.length) {
          // Set if there is still the next port
          com.port = ports[i + 1];
          com.reconnect();

        } else {
          if (com.type === 'WebSocket') {
            com.type = 'XHRLongPolling';
            com.port = ports[0];
            com.reconnect();
          }
        }
        break;
      }
    }
    
    if (typeof com.onconnecterror === 'function') {
      com.onconnecterror(error);
    }
  };
  
  /**
   * Handles the event when socket catches an exception.
   * @method bindOnError
   * @for Socket
   * @since 0.6.0
   */
  com.bindOnError = function (error) {
    com.handler('socket:error', {
      error: error
    });
    
    if (typeof com.onerror === 'function') {
      com.onerror(error);
    }
  };

  /**
   * Responses to the attached socket message responses.
   * @method respond
   * @trigger peerJoined, mediaAccessRequired
   * @for Socket
   * @since 0.6.0
   */
  com.respond = function (type, data) {
    // Parse for events tied to type.
    com.responses[type] = com.responses[type] || [];
    
    fn.forEach(com.responses[type], function (response, i) {
      response(data);
    });
  };

  /**
   * Restarts the connection to the Socket.
   * @method reconnect
   * @trigger peerJoined, mediaAccessRequired
   * @for Socket
   * @since 0.6.0
   */
  com.reconnect = function () {
    com.Socket.removeAllListeners();

    switch (com.type) {
    case 'WebSocket':
      com.Socket = com.WebSocket();
      break;
    //case 'XHRPolling':
    default:
      com.Socket = com.XHRPolling();
    }
    
    if (typeof com.onreconnect === 'function') {
      com.onreconnect(com.type);
    }
  };



  /**
   * Creates a WebSocket connection in socket.io.
   * @method WebSocket
   * @trigger peerJoined, mediaAccessRequired
   * @for Socket
   * @since 0.6.0
   */
  com.WebSocket = function () {
    var options = {
      forceNew: true,
      reconnection: false,
      transports: ['websocket']
    };

    if (com.timeout !== 0) {
      options.timeout = com.timeout;
    }

    var server = com.protocol + '//' + com.server + ':' + com.port;

    var socket = io.connect(server, options);

    socket.on('connect', com.bindOnConnect);
    socket.on('connect_error', com.bindOnConnectError);

    return socket;
  };

  /**
   * Creates a XHR Long-polling connection in socket.io.
   * @method XHRPolling
   * @trigger peerJoined, mediaAccessRequired
   * @for Socket
   * @since 0.6.0
   */
  com.XHRPolling = function () {
    var ports = com.ports[window.location.protocol];

    var options = {
      forceNew: true,
      reconnection: com.port === ports[ports.length - 1],
      transports: ['xhr-polling', 'jsonp-polling', 'polling']
    };

    if (com.timeout !== 0) {
      options.timeout = com.timeout;
    }

    var server = com.protocol + '//' + com.server + ':' + com.port;

    var socket = io.connect(server, options);

    socket.on('connect', com.bindOnConnect);
    socket.on('reconnect', com.bindOnConnect);
    socket.on('connect_error', com.bindOnConnectError);
    socket.on('reconnect_failed', com.bindOnConnectError);

    return socket;
  };

  // Throw an error if socket.io is not loaded
  if (!window.io) {
    throw new Error('Required dependency socket.io not found');
  }
  
  fn.runSync(function () {
    com.handler('socket:start', config);
  });
}
function Stream(stream, config, listener) {
  'use strict';

  // Reference of instance
  var com = this;

  /**
   * The stream id.
   * @attribute id
   * @type String
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.id = null;

  /**
   * The getUserMedia constraints.
   * @attribute constraints
   * @type JSON
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.constraints = null;

  /**
   * The streaming configuration.
   * @attribute config
   * @type JSON
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.config = config;
  
  /**
   * The stream source type.
   * @attribute sourceType
   * @type String
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.sourceType = 'local';

  /**
   * The MediaStream object.
   * @attribute MediaStream
   * @type Object
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.MediaStream = null;

  /**
   * The parent handler that redirects the stream object messages to.
   * @attribute MediaStream
   * @type Object
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.parentHandler = function () {};

  /**
   * The handler that manages all triggers or relaying events.
   * @attribute handler
   * @type Function
   * @private
   * @for User
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    listener(event, data);
    
    //log.debug('StreamHandler', event, data); 

    if (typeof com.parentHandler === 'function') {
      com.parentHandler(event, data);
    }
  };

  
  /**
   * Function to subscribe to when stream has ended.
   * @method onstreamended
   * @for Stream
   * @since 0.6.0
   */
  com.onstreamended = function () { };
  
  /**
   * Function to subscribe to when stream track has been ended.
   * @method ontrackended
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackended = function () { };
  
  /**
   * Function to subscribe to when stream track has been muted.
   * @method ontrackmute
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackmute = function () { };

  /**
   * Function to subscribe to when stream track has been unmuted.
   * @method ontrackunmute
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackunmute = function () { };
  

  /**
   * Starts a MediaStream object connection with getUserMedia.
   * @method start
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.start = function () {
    window.getUserMedia(com.constraints, com.bind, function (error) {
      com.handler('stream:error', {
        id: com.id,
        error: error,
        sourceType: com.sourceType
      });
    });
  };

  /**
   * Binds events to MediaStream object.
   * @method bind
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.bind = function (bindStream) {
    // Set a MediaStream id if Firefox or Chrome doesn't
    com.id = bindStream.id || fn.generateUID();

    // Bind events to MediaStream
    // bindStream.onaddtrack = com.onAddTrack;
    // bindStream.onremovetrack = com.onRemoveTrack;
    bindStream.onended = com.bindOnStreamEnded(bindStream);
    bindStream.newId = com.id;

    // Bind track events
    com.bindTracks(bindStream.getAudioTracks());
    com.bindTracks(bindStream.getVideoTracks());

    com.MediaStream = bindStream;
 
    com.handler('stream:start', {
      id: com.id,
      label: bindStream.label,
      constraints: com.constraints,
      sourceType: com.sourceType
    });
  };

  /**
   * Binds events to MediaStreamTrack object.
   * @method bind
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.bindTracks = function (bindTracks) {
    fn.forEach(bindTracks, function (track, i) {
      track.newId = track.id || fn.generateUID();

      // Bind events to MediaStreamTrack
      // bindTracks[i].onstarted = com.onStarted;
      track.onended = function () {
        com.handler('stream:track:stop', {
          streamId: com.id,
          id: track.newId,
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          sourceType: com.sourceType
        });

        if (typeof com.ontrackended === 'function') {
          com.ontrackended(track);
        }
      };

      // Un-implemented events functions
      //track.onmute = function(event) {};
      //track.onunmute = function(event) {};
      // track.onoverconstrained = function(event) {};

      // Set the mute status
      var isEnabled = true;

      if (track.kind === 'audio') {
        isEnabled = (typeof com.config.audio === 'object') ?
          !!!com.config.status.audioMuted : !!com.config.audio;
      } else {
        isEnabled = (typeof com.config.video === 'object') ?
          !!!com.config.status.videoMuted : !!com.config.video;
      }
      
      track.enabled = isEnabled;

      com.handler('stream:track:start', {
        streamId: com.id,
        id: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
      });
    });
  };

  /**
   * Attaches the Stream object to a video element.
   * @method attachElement
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.attachElement = function (element) {
    if (window.webrtcDetectedBrowser === 'firefox' &&
      (com.MediaStream instanceof LocalMediaStream) === false) {
      window.reattachMediaStream(element, com.MediaStream.checkingVideo);
    
    } else {
      window.attachMediaStream(element, com.MediaStream);
    }
  };

  /**
   * Handles the non-implemented firefox onended event for stream.
   * @method bindOnStreamEnded
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.bindOnStreamEnded = function (bindStream) {
    var fn = function () {
      com.handler('stream:stop', {
        id: com.id,
        label: stream.label,
        constraints: com.constraints,
        sourceType: com.sourceType
      });
      
      if (typeof com.onended === 'function') {
        com.onended(bindStream);
      }
    };
    
    // Firefox browsers
    if (window.webrtcDetectedBrowser === 'firefox') {
      // LocalMediaStream
      if (bindStream.constructor === LocalMediaStream) {
        return setInterval(function () {
          if (bindStream.hasEnded) {
            clearInterval(bindStream.onended);
            // trigger that it has ended
            fn();
          }
  
          if (typeof bindStream.recordedTime === 'undefined') {
            bindStream.recordedTime = 0;
          }

          if (bindStream.recordedTime === bindStream.currentTime) {
            clearInterval(bindStream.onended);
            // trigger that it has ended
            fn();

          } else {
            bindStream.recordedTime = bindStream.currentTime;
          }
        }, 1000);

        // Remote MediaStream
      } else {
        return (function () {
          // Use a video to attach to check if stream has ended
          var video = document.createElement('video');
          video.onstreamended = setInterval(function () {
            if (bindStream.hasEnded) {
              clearInterval(video.onstreamended);
              fn();
            }
            
            if (!fn.isEmpty(video.mozSrcObject)) {
              if (video.mozSrcObject.ended === true) {
                clearInterval(video.onstreamended);
                fn();
              }
            }
          }, 1000);
          
          bindStream.checkingVideo = video;
  
          window.attachMediaStream(video, bindStream);
          return video;
        })();
      }
    }
    // Non-firefox browsers
    return fn;
  };

  /**
   * Mutes all audio MediaStreamTracks.
   * @method muteAudio
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.muteAudio = function () {
    var tracks = com.MediaStream.getAudioTracks();
    
    fn.forEach(tracks, function (track, i) {
      track.enabled = false;
      
      com.handler('stream:track:mute', {
        streamId: com.id,
        id: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
      });

      if (typeof com.ontrackmute === 'function') {
        com.ontrackmute(track);
      }
    });
  };

  /**
   * Unmutes all audio MediaStreamTracks.
   * @method unmuteAudio
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.unmuteAudio = function () {
    var tracks = com.MediaStream.getAudioTracks();

    fn.forEach(tracks, function (track, i) {
      track.enabled = true;
      
      com.handler('stream:track:unmute', {
        streamId: com.id,
        id: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
      });

      if (typeof com.ontrackunmute === 'function') {
        com.ontrackunmute(track);
      }
    });
  };

  /**
   * Stops all audio MediaStreamTracks streaming.
   * @method stopAudio
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.stopAudio = function () {
    var tracks = com.MediaStream.getAudioTracks();

    fn.forEach(tracks, function (track, i) {
      track.stop();

      // Workaround for firefox as it does not have stop events
      if (window.webrtcDetectedBrowser === 'firefox') {
        if (track.hasEnded !== true) {
          track.onended(track);
          track.hasEnded = true;
        }
      }
    
    }, function () {
      // Workaround for firefox as it does not have stop stream when all track ends
      if (window.webrtcDetectedBrowser === 'firefox') {
        if (com.MediaStream.videoEnded === true) {
          com.MediaStream.hasEnded = true;
        }
        com.MediaStream.audioEnded = true;
      }
    });
  };

  /**
   * Mutes all video MediaStreamTracks.
   * @method muteVideo
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.muteVideo = function () {
    var tracks = com.MediaStream.getVideoTracks();

    fn.forEach(tracks, function (track, i) {
      track.enabled = false;
      
      com.handler('stream:track:mute', {
        streamId: com.id,
        id: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
      });

      if (typeof com.ontrackmute === 'function') {
        com.ontrackmute(track);
      }
    });
  };

  /**
   * Unmutes all video MediaStreamTracks.
   * @method unmuteVideo
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.unmuteVideo = function () {
    var tracks = com.MediaStream.getVideoTracks();

    fn.forEach(tracks, function (track, i) {
      track.enabled = true;
      
      com.handler('stream:track:unmute', {
        streamId: com.id,
        id: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
      });

      if (typeof com.ontrackunmute === 'function') {
        com.ontrackunmute(track);
      }
    });
  };

  /**
   * Stops all video MediaStreamTracks streaming.
   * @method stopVideo
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.stopVideo = function () {
    var tracks = com.MediaStream.getVideoTracks();

    fn.forEach(tracks, function (track, i) {
      track.stop();

      // Workaround for firefox as it does not have stop events
      if (window.webrtcDetectedBrowser === 'firefox') {
        if (track.hasEnded !== true) {
          track.onended(tracks[i]);
          track.hasEnded = true;
        }
      }
    
    }, function () {
      // Workaround for firefox as it does not have stop stream when all track ends
      if (window.webrtcDetectedBrowser === 'firefox') {
        if (com.MediaStream.audioEnded === true) {
          com.MediaStream.hasEnded = true;
        }
        com.MediaStream.videoEnded = true;
      }
    });
  };

  com.stop = function () {
    // Stop MediaStream tracks
    com.stopVideo();
    com.stopAudio();
    // Stop MediaStream
    com.MediaStream.stop();
  };
  
  // Throw an error if adapterjs is not loaded
  if (!window.attachMediaStream) {
    throw new Error('Required dependency adapterjs not found');
  }

  // Bind or start MediaStream
  if (fn.isEmpty(stream)) {
    var audioSettings = StreamParser.parseAudioConfig(config.audio);
    var videoSettings = StreamParser.parseVideoConfig(config.video);
    var statusSettings = StreamParser.parseMutedConfig(config);

    com.constraints = {
      audio: audioSettings.userMedia,
      video: videoSettings.userMedia
    };

    com.config = {
      audio: audioSettings.settings,
      video: audioSettings.settings,
      status: statusSettings
    };

    com.start();

  } else {
    // Allow javascript to return object before code execution
    fn.runSync(function () {
      com.config = {
        audio: fn.isSafe(function () { return stream.getAudioTracks().length > 0; }),
        video: fn.isSafe(function () { return stream.getVideoTracks().length > 0; })
      };
      com.bind(stream);
    });
  }
}
var StreamParser = {
  /**
   * Stores the default Stream / Bandwidth settings.
   * @property defaultConfig
   * @param {JSON} audio The default audio settings.
   * @param {Boolean} audio.stereo The default flag to indicate if stereo is enabled.
   * @param {JSON} video The default video settings.
   * @param {JSON} video.resolution The default video resolution.
   * @param {Integer} video.resolution.width The default video resolution width.
   * @param {Integer} video.resolution.height The default video resolution height.
   * @param {Integer} video.frameRate The default video maximum framerate.
   * @param {JSON} bandwidth The default bandwidth streaming settings.
   * @param {Integer} bandwidth.audio The default audio bandwidth bitrate.
   * @param {Integer} bandwidth.video The default video bandwidth bitrate.
   * @param {Integer} bandwidth.data The default DataChannel data bandwidth bitrate.
   * @type JSON
   * @private
   * @since 0.6.0
   */
  defaultConfig: {
    audio: {
      stereo: false
    },
    video: {
      resolution: {
        width: 640,
        height: 480
      },
      frameRate: 50
    },
    bandwidth: {
      audio: 50,
      video: 256,
      data: 1638400
    }
  },
  
  /**
   * Parses the audio configuration for the getUserMedia constraints.
   * @property parseAudioConfig
   * @param {JSON|Boolean} options The audio settings or flag if audio is enabled.
   * @param {Boolean} options.stereo The flag to indicate if stereo is enabled.
   * @type Function
   * @return {JSON}
   * - options: The configuration.
   * - userMedia: The getUserMedia constraints.
   * @private
   * @since 0.6.0
   */
  parseAudioConfig: function (options) {
    options = (typeof options === 'object') ? options : !!options;

    var userMedia = false;
    var tempOptions = {};
  
    // Cleaning of unwanted keys
    if (options !== false) {
      options = (typeof options === 'boolean') ? {} : options;
      tempOptions.stereo = !!options.stereo;
      tempOptions.sourceId = options.sourceId;

      options = tempOptions;
    }

    userMedia = (typeof options === 'object') ?
      true : options;

    // Add video sourceId
    if (tempOptions.sourceId && tempOptions.audio !== false) {
      userMedia = { optional: [{ sourceId: tempOptions.sourceId }] };
    }

    return {
      settings: options,
      userMedia: userMedia
    };
  },
  
  /**
   * Parses the video configuration for the getUserMedia constraints.
   * @property parseVideoConfig
   * @param {JSON} options The video settings.
   * @param {JSON} options.resolution The video resolution.
   * @param {Integer} options.resolution.width The video resolution width.
   * @param {Integer} options.resolution.height The video resolution height.
   * @param {Integer} options.frameRate The video maximum framerate.
   * @type Function
   * @return {JSON}
   * - options: The configuration.
   * - userMedia: The getUserMedia constraints.
   * @private
   * @since 0.6.0
   */
  parseVideoConfig: function (options) {
    options = (typeof options === 'object') ?
    options : !!options;

    var userMedia = false;
    var tempOptions = {};

    // Cleaning of unwanted keys
    if (options !== false) {
      options = (typeof options === 'boolean') ?
        { resolution: {} } : options;
      
      // set the resolution parsing
      options.resolution = options.resolution || {};
      
      tempOptions.resolution = tempOptions.resolution || {};
      
      // set resolution
      tempOptions.resolution.width = options.resolution.width ||
        this.defaultConfig.video.resolution.width;
      
      tempOptions.resolution.height = options.resolution.height ||
        this.defaultConfig.video.resolution.height;
      
      // set the framerate
      tempOptions.frameRate = options.frameRate ||
        this.defaultConfig.video.frameRate;
      
      // set the sourceid
      tempOptions.sourceId = options.sourceId;
      
      options = tempOptions;

      userMedia = {
        mandatory: {
          //minWidth: tempOptions.resolution.width,
          //minHeight: tempOptions.resolution.height,
          maxWidth: tempOptions.resolution.width,
          maxHeight: tempOptions.resolution.height,
          //minFrameRate: tempOptions.frameRate,
          maxFrameRate: tempOptions.frameRate
        },
        optional: []
      };
      
      // Add video sourceId
      if (tempOptions.sourceId) {
        userMedia.optional[0] = { sourceId: tempOptions.sourceId };
      }

      //Remove maxFrameRate for AdapterJS to work with Safari
      if (window.webrtcDetectedType === 'plugin') {
        delete userMedia.mandatory.maxFrameRate;
      }
    }

    return {
      settings: options,
      userMedia: userMedia
    };
  },
  
  /**
   * Parses the bandwidth configuration.
   * - In low-bandwidth environment, it's mostly managed by the browser.
   *   However, this option enables you to set low bandwidth for high-bandwidth
   *   environment whichever way is possible.
   * @property parseBandwidthConfig
   * @param {JSON} options The bandwidth streaming settings.
   * @param {Integer} options.audio The audio bandwidth bitrate.
   * @param {Integer} options.video The video bandwidth bitrate.
   * @param {Integer} options.data The DataChannel data bandwidth bitrate.
   * @type Function
   * @return {JSON}
   * - options: The configuration.
   * - userMedia: The getUserMedia constraints.
   * @private
   * @since 0.6.0
   */
  parseBandwidthConfig: function (options) {
    options = (typeof options === 'object') ? options : {};

    // set audio bandwidth
    options.audio = (typeof options.audio === 'number') ?
      options.audio : this.defaultConfig.bandwidth.audio;
    
    // set video bandwidth
    options.video = (typeof options.video === 'number') ?
      options.video : this.defaultConfig.bandwidth.video;
    
    // set data bandwidth
    options.data = (typeof options.data === 'number') ?
      options.data : this.defaultConfig.bandwidth.data;

    // set the settings
    return options;
  },
  
  /**
   * Parses the stream muted configuration.
   * @property parseMutedConfig
   * @param {JSON} options The stream muted settings.
   * @param {Integer} options.audioMuted The flag to indicate if audio stream is muted.
   * @param {Integer} options.videoMuted The flag to indicate if video stream is muted.
   * @type Function
   * @return {JSON}
   * - options: The configuration.
   * - userMedia: The getUserMedia constraints.
   * @private
   * @since 0.6.0
   */
  parseMutedConfig: function (options) {
    // the stream options
    options = (typeof options === 'object') ?
      options : { audio: false, video: false };

    var updateAudioMuted = (typeof options.audio === 'object') ?
      !!options.audio.mute : !options.audio;
    var updateVideoMuted = (typeof options.video === 'object') ?
      !!options.video.mute : !options.video;

    return {
      audioMuted: updateAudioMuted,
      videoMuted: updateVideoMuted
    };
  },

  parseDefaultConfig: function (options) {
    var hasMediaChanged = false;

    // prevent undefined error
    options = options || {};

    log.debug('Parsing stream settings. Default stream options:', options);

    options.maxWidth = (typeof options.maxWidth === 'number') ? options.maxWidth :
      640;
    options.maxHeight = (typeof options.maxHeight === 'number') ? options.maxHeight :
      480;

    // parse video resolution. that's for now
    this.defaultConfig.video.resolution.width = options.maxWidth;
    this.defaultConfig.video.resolution.height = options.maxHeight;

    log.debug('Parsed default media stream settings', this.defaultConfig);
  }
};
var StreamTrackList = {
  audio: [],
  
  video: [],
  
  get: function (defer) {
    // Firefox does not support MediaStreamTrack.getSources yet
    if (window.webrtcDetectedBrowser === 'firefox') {
      StreamTrackList.readyState = 'done';

    // Chrome / Plugin / Opera supports MediaStreamTrack.getSources
    } else {
      // Retrieve list
      MediaStreamTrack.getSources(function (trackList) {
        fn.forEach(trackList, function (track, i) {
          var data = {};

          // MediaStreamTrack label - FaceHD Camera
          data.label = track.label || (track.kind + '_' + (i + 1));
          // MediaStreamTrack kind - audio / video
          data.kind = track.kind;
          // MediaStreamTrack id - The identifier
          data.id = track.id;
          // The facing environment
          data.facing = track.facing;

          if (track.kind === 'audio') {
            StreamTrackList.audio.push(data);
          } else {
            StreamTrackList.video.push(data);
          }

        }, function () {
          defer({
            audio: StreamTrackList.audio,
            video: StreamTrackList.video
          });
        });
      });
    }
  },
  
};
function User (config, listener) {
  'use strict';

  // Reference of instance
  var com = this;

  /**
   * The user id.
   * @attribute id
   * @type String
   * @readOnly
   * @for User
   * @since 0.6.0
   */
  com.id = config.mid;
  
  /**
   * The user type.
   * @attribute type
   * @type String
   * @readOnly
   * @for User
   * @since 0.6.0
   */
  com.type = 'user';

  /**
   * Stores the user data.
   * @attribute data
   * @type JSON
   * @private
   * @for User
   * @since 0.6.0
   */
  com.data = config.userInfo.userData || {};

  /**
   * Stores the browser agent information.
   * @attribute agent
   * @type JSON
   * @private
   * @for User
   * @since 0.6.0
   */
  com.agent = config.agent || {};
  
  /**
   * Stores the list of peer connections to user.
   * @attribute peers
   * @type JSON
   * @private
   * @for User
   * @since 0.6.0
   */
  com.peers = {};
  
  /**
   * Stores the list of peer streaming configuration.
   * @attribute streamingConfigs
   * @type JSON
   * @private
   * @for User
   * @since 0.6.0
   */
  com.streamingConfigs = {};
  
  /**
   * The handler that manages all triggers or relaying events.
   * @attribute handler
   * @type Function
   * @private
   * @for User
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    UserHandler(com, event, data, listener);
  };  
  
  /**
   * Function to subscribe to when user's custom data is updated.
   * @method onupdate
   * @for User
   * @since 0.6.0
   */
  com.onupdate = function () {};
  
  /**
   * Function to subscribe to when user is disconnected from the room.
   * @method ondisconnect
   * @for User
   * @since 0.6.0
   */
  com.ondisconnect = function () {};
  
  /**
   * Function to subscribe to when a new peer connection is established to user.
   * @method onaddconnection
   * @for User
   * @since 0.6.0
   */
  com.onaddconnection = function () {};
  
  /**
   * Function to subscribe to when a peer connection to user has added.
   * @method onremoveconnection
   * @for User
   * @since 0.6.0
   */
  com.onremoveconnection = function () {};
  
  /**
   * Function to subscribe to when a new data transfer request is initialized from user.
   * @method ondatarequest
   * @for User
   * @since 0.6.0
   */
  com.ondatarequest = function () {};

  /**
   * Function to subscribe to when a new data is received after transfer is completed from user.
   * @method ondata
   * @for User
   * @since 0.6.0
   */
  com.ondata = function () {};
  
  /**
   * Function to subscribe to when a new message is received from user.
   * @method ondatatransfer
   * @for User
   * @since 0.6.0
   */
  com.onmessage = function () {};


  /**
   * Starts a new peer connection to user.
   * @method addConnection
   * @for User
   * @since 0.6.0
   */
  com.addConnection = function (data, stream) {
    var peerConfig = {
      id: data.prid,
      constraints: data.iceServers,
      bandwidth: data.bandwidth,
      streamingConfig: data.settings
    };
    
    var peer = new Peer(peerConfig, com.handler);
    
    peer.connect(stream);
    
    peer.SDPType = data.SDPType;
    
    com.peers[peer.id] = peer;
  };
 
  /**
   * Stops a peer connection to user.
   * @method addConnection
   * @for User
   * @since 0.6.0
   */
  com.removeConnection = function (peerId) {
    var peer = com.peers[peerId];
    
    if (!fn.isEmpty(peer)) {
      peer.disconnect();
    }
  };

  /**
   * Disconnects this user connection.
   * @method disconnect
   * @for User
   * @since 0.6.0
   */
  com.disconnect = function () {
    fn.forEach(com.peers, function (peer, id) {
      peer.disconnect();
    });
  };
  
  /**
   * Updates this user information.
   * @method getInfo
   * @for User
   * @since 0.6.0
   */
  com.update = function (data) {
    com.data = data;
    
    com.handler('user:update', {
      data: com.data
    });
  };
  
  /**
   * Gets this user information.
   * @method getInfo
   * @for User
   * @since 0.6.0
   */
  com.getInfo = function (peerId) {
    var data = {};
    
    data.userData = com.data;
    
    data.agent = com.agent;
    
    data.settings = com.streamingConfigs;
    
    return data;
  };
  
  // Add the main streaming config
  com.streamingConfigs[config.prid] = config.settings;

  fn.runSync(function () {
    com.handler('user:start', config);
  });
}

var UserEventReceivedHandler = {
  
  peer: {
    
    connect: function (com, data, listener) {
      var peer = com.peers[data.id];

      if (typeof com.onaddconnection === 'function') {
        com.onaddconnection(peer);
      }
      
      if (peer.SDPType === 'offer') {
        peer.createOffer();
      }
    },
    
    iceconnectionstate: function (com, data, listener) {
      if (data.id === 'main' && data.state === 'connected') {
        com.handler('user:connect', {});
      }
    },
    
    disconnect: function (com, data, listener) {
      var peer = com.peers[data.id];
      
      delete com.peers[data.id];

      if (typeof com.onremoveconnection === 'function') {
        com.onremoveconnection(peer);
      }
      
      if (Object.keys(com.peers).length === 0) {
        com.handler('user:disconnect', {});
      }
    }
  },
  
  transfer: {
    
    complete: function (com, data, listener) {
      com.handler('user:data', data);
    },
    
    request: function (com, data, listener) {
      com.handler('user:datarequest', data); 
    }
  }
  
};

/**
 * Handles all the events to respond to other parent classes.
 * @attribute UserHandlerResponseHandler
 * @for User
 * @since 0.6.0
 */
var UserEventResponseHandler = {
  
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect();
    }
  },
  
  data: function (com, data, listener) {
    if (typeof com.ondata === 'function') {
      com.ondata();
    }
  },
  
  datarequest: function (com, data, listener) {
    if (typeof com.ondatarequest === 'function') {
      com.ondatarequest();
    }
  },
  
  update: function (com, data, listener) {
    if (typeof com.onupdate === 'function') {
      com.onupdate(data.data);
    }
  },

  /**
   * Handles the incoming message trigger.
   * @property message
   * @type Function
   * @private
   * @since 0.6.0
   */
  message: function (com, data, listener) {
    if (typeof com.onmessage === 'function') {
      com.onmessage();
    }
  },
  
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect();
    }
  }
  
};

/**
 * Handles all the message events received from socket.
 * @attribute UserEventMessageHandler
 * @for User
 * @since 0.6.0
 */
var UserEventMessageHandler = {
  
  enter: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      return;
    }

    data.bandwidth = com.bandwidth;
    data.SDPType = 'answer';
    com.addConnection(data, data.stream);
  },

  welcome: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      if (peer.weight < data.weight) {
        return;
      }

      peer.SDPType = 'offer';
      data.type = 'start';

    } else {

      data.bandwidth = com.bandwidth;
      com.addConnection(data, data.stream);
      peer = com.peers[data.prid];

      peer.SDPType = 'offer';
    }
  },

  offer: function (com, data, listener) {
    var peer = com.peers[data.prid];
    
    if (!fn.isEmpty(peer)) {
      peer.handler('message:offer', data);
    }
  },

  answer: function (com, data, listener) {
    var peer = com.peers[data.prid];
    
    if (!fn.isEmpty(peer)) {
      peer.handler('message:answer', data);
    }
  },

  candidate: function (com, data, listener) {
    var peer = com.peers[data.prid];
    
    if (!fn.isEmpty(peer)) {
      peer.handler('message:candidate', data);
    }
  },
  
  restart: function (com, data, listener) {
    var peer = com.peers[data.prid];
    
    if (!fn.isEmpty(peer)) {
      peer.handler('message:restart', data);
    }
  },
  
  updateUserEvent: function (com, data, listener) {
    com.data = data.data;
  
    com.handler('user:update', {
      data: data.userData
    });
  },
  
  muteAudioEvent: function (com, data, listener) {
    var peer = com.peers[data.prid];
    
    if (!fn.isEmpty(peer)) {
      peer.handler('message:muteAudioEvent', data);
    }
  },
    
  muteVideoEvent: function (com, data, listener) {
    var peer = com.peers[data.prid];
    
    if (!fn.isEmpty(peer)) {
      peer.handler('message:muteVideoEvent', data);
    }
  }
};

/**
 * Handles the user class events.
 * @attribute UserHandler
 * @for User
 * @since 0.6.0
 */
var UserHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Messaging events
  if (event.indexOf('message:') === 0) {
    
    fn.applyHandler(UserEventMessageHandler, params, [com, data, listener]);
  
  } else {
    // Class events
    if (event.indexOf('user:') === 0) {
      data.id = com.id;

      fn.applyHandler(UserEventResponseHandler, params, [com, data, listener]);

    } else {
      data.userId = com.id;

      fn.applyHandler(UserEventReceivedHandler, params, [com, data, listener]);
    }
    
    listener(event, data);
  }
  
  //log.debug('UserHandler', event, data);
};