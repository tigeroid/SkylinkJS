/*! skylinkjs - v0.5.7 - 2015-02-22 */

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
    log: window.console.log.bind(window.console, LogKey + '%s> %s'),

    error: window.console.error.bind(window.console, LogKey + '%s> %s'),

    info: window.console.info.bind(window.console,
      (window.webrtcDetectedBrowser === 'safari' ? 'INFO: ' : '') + LogKey + '%s> %s'),

    warn: window.console.warn.bind(window.console, LogKey + '%s> %s'),

    debug: window.console.newDebug.bind(window.console,
      (typeof window.console.debug !== 'function' ? 'DEBUG: ' : '') + LogKey + '%s> %s')
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
var DataProcess = {
  
  chunkSize: 49152,
  
  mozChunkSize: 16384,
  
  chunk: function (blob) {
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

  unchunk: function (data) {
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
  load: function (path, deferSuccess, deferError, deferLoad) {
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
      
      deferLoad();
    };

    xhr.open('GET', this.protocol + this.server + path, true);

    // xhr.setContentType('application/json;charset=UTF-8');

    xhr.send();
  }
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
function DataChannel(channel, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

  // Reference of instance
  var com = this;

  com.id = channel.label || fn.generateUID();
  com.type = 'message';

  /**
   * The datachannel source origin.
   * There are two types of sources:
   * - <code>"local"</code> indicates that datachannel came from self user.
   * - <code>"remote</code> indicates that datachannel came from other users.
   * @attribute sourceType
   * @type String
   * @private
   * @for DataChannel
   * @since 0.6.0
   */
  com.sourceType = 'local';

  /**
   * The RTCDataChannel object.
   * @attribute RTCDataChannel
   * @type Object
   * @private
   * @for DataChannel
   * @since 0.6.0
   */
  com.RTCDataChannel = null;


  /**
   * Function to subscribe to when datachannel has opened.
   * @method onconnect
   * @eventhandler true
   * @for DataChannel
   * @since 0.6.0
   */
  com.onconnect = function () {};

  /**
   * Function to subscribe to when datachannel has closed.
   * @method ondisconnect
   * @eventhandler true
   * @for DataChannel
   * @since 0.6.0
   */
  com.ondisconnect = function () {};

  /**
   * Function to subscribe to when datachannel has an error.
   * @method onerror
   * @eventhandler true
   * @for DataChannel
   * @since 0.6.0
   */
  com.onerror = function () {};

  com._handler = function (event, data) {
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
    // Prevent re-trigger
    var onOpenFn = function () {
      com.handler('datachannel:connect', {});
    };

    if (bindChannel.readyState !== 'open') {
      bindChannel.onopen = onOpenFn;

    } else {
      onOpenFn();
    }

    bindChannel.onerror = function (error) {
      com.handler('datachannel:error', {
        error: error
      });
    };

    // NOTE: Older firefox might close the DataChannel earlier
    bindChannel.onclose = function () {
      com.handler('datachannel:disconnect', {});
    };

    bindChannel.onmessage = function (event) {
      com.handler('datachannel:message', {
        data: event.data
      });
    };

    com.RTCDataChannel = bindChannel;

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
  start: function (com, data, listener) {
    if (typeof com.onstart === 'function') {
      com.onstart();
    }
  },
  
  /**
   * Event fired when the datachannel has opened.
   * @event datachannel:connect
   * @for DataChannel
   * @since 0.6.0
   */
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect();
    }
  },
  
  /**
   * Event fired when the datachannel has an exception occurred.
   * @event datachannel:error
   * @param {Object} error The RTCDataChannel error.
   * @for DataChannel
   * @since 0.6.0
   */
  error: function (com, data, listener) {
    if (typeof com.onerror === 'function') {
      com.onerror(error);
    }
  },
  
  /**
   * Event fired when the datachannel receives data.
   * @event datachannel:message
   * @param {JSON|String} data The data received.
   * @for DataChannel
   * @since 0.6.0
   */
  message: function (com, data, listener) {
    
  },

  /**
   * Event fired when the datachannel has closed.
   * @event datachannel:disconnect
   * @for DataChannel
   * @since 0.6.0
   */
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect();
    }
  }
};
var DataChannelHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  data.id = com.id;

  fn.applyHandler(DataChannelEventResponseHandler, params, [com, data, listener]);

  listener(event, data);
};




function Peer(stream, config, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

  // Reference of instance
  var com = this;

  /* Attributes */
  /**
   * The shared peer connection id.
   * @attribute id
   * @type String
   * @for Peer
   * @since 0.6.0
   */
  com.id = config.id || fn.generateUID();

  /**
   * The peer connection type.
   * - <code>"user"</code> denotes that this connection is used for the
   *   main peer connection.
   * - <code>"stream"</code> denotes that this connection is used for
   *   sending an extra stream connection.
   * @attribute type
   * @type String
   * @for Peer
   * @since 0.6.0
   */
  com.type = config.id === 'main' ? 'user' : 'stream';

  /**
   * The RTCSessionDescription type that the peer connection would send.
   * Types are <code>"offer"</code> or <code>"answer"</code>.
   * This is used for superclasses to check and send the relevant
   *   information.
   * @attribute _sdpType
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._sdpType = config.sdpType || 'answer';

  /**
   * The local RTCSessionDescription set for this peer connection.
   * @attribute _localDescription
   * @type Object
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._localDescription = null;

  /**
   * The remote RTCSessionDescription set for this peer connection.
   * @attribute _remoteDescription
   * @type Object
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._remoteDescription = null;

  /**
   * The datachannels connected to peer connection.
   * @attribute _datachannels
   * @param {DataChannel} (#channelId) The datachannel connected to peer.
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._dataChannels = {};

  /**
   * The flag that indicates if datachannel connection should be enabled or not.
   * @attribute _dataConnection
   * @type Boolean
   * @default this.type === 'user' ? true : false
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._dataConnection = com.type === 'user' ? (typeof config.dataChannel === 'boolean' ?
    config.dataChannel : true) : false;

  /**
   * The flag that indicates if trickle ICE is enable for this peer connection.
   * @attribute _trickleIce
   * @type Boolean
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._trickleIce = typeof config.trickleIce === 'boolean' ? config.trickleIce : true;

  /**
   * The timeout that would be invoked when peer connection has expired without
   *   an established connection.
   * @attribute _healthTimer
   * @type Object
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._healthTimer = null;

  /**
   * The remote stream received from this peer.
   * @attribute _stream
   * @type Stream
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._stream = null;

  /**
   * Stores the streaming configuration for the peer connection.
   * @attribute _streamingConfig
   * @param {JSON|Boolean} [audio=false] The audio stream configuration.
   *    If parsed as a boolean, other configuration settings under the audio
   *    configuration would be set as the default setting in the connection.
   * @param {Boolean} [audio.stereo=false] The flag that indiciates
   *    if stereo is enabled for this connection.
   * @param {String} [audio.sourceId] The source id of the audio MediaStreamTrack
     *    used for this connection.
   * @param {String|Boolean} [video=false] The video stream configuration.
   *    If parsed as a boolean, other configuration settings under the video
   *    configuration would be set as the default setting in the connection.
   * @param {JSON} [video.resolution] The video streaming resolution.
   * @param {Integer} video.resolution.width The video resolution width.
   * @param {Integer} video.resolution.height The video resolution height.
   * @param {Integer} video.frameRate The video stream framerate.
   * @param {String} [video.sourceId] The source id of the video MediaStreamTrack
   *    used for this connection.
   * @param {JSON} status The stream MediaStreamTrack status.
   * @param {Boolean} [status.audioMuted=false] The flag that indicates if audio is muted.
   *    If audio is set to false, this would be set as true.
   * @param {Boolean} [status.videoMuted=false] The flag that indicates if video is muted.
   *    If video is set to false, this would be set as true.
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._streamingConfig = null;

  /**
   * The RTCSessionDescription session description modification configuration.
   * This uses the user's sent streaming configuration.
   * @attribute _sdpConfig
   * @param {Boolean} stereo The flag that indicates if stereo is enabled for this connection.
   * @param {JSON} bandwidth The bandwidth configuration the peer connections.
   *    This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @param {Integer} [bandwidth.audio] The bandwidth configuration for the audio stream.
   * @param {Boolean} [bandwidth.video] The bandwidth configuration for the video stream.
   * @param {Boolean} [bandwidth.data] The bandwidth configuration for the data stream.
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._sdpConfig = null;

  /**
   * The RTCPeerConnection object.
   * @attribute _RTCPeerConnection
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._RTCPeerConnection = null;

  /**
   * The generated weight for the "welcome" handshake priority.
   * @attribute _weight
   * @type Integer
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._weight = parseInt(fn.generateUID(), 10);


  /* Methods */
  /**
   * The handler that the manages response and received events.
   * @method _handler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._handler = function (event, data) {
    PeerHandler(com, event, data, listener);
  };

  /**
   * Restarts the connection and re-initialize the RTCPeerConnection object
   *   to restart the ICE connection.
   * @method reconnect
   * @param {Stream} stream The updated stream object.
   * @for Peer
   * @since 0.6.0
   */
  com.reconnect = function (stream) {
    var hasStream = !!stream;

    stream = stream || fn.isSafe(function () {
      return com.RTCPeerConnection.getLocalStreams()[0]; });

    com.RTCPeerConnection.close();
    com.RTCPeerConnection = null;

    var peer = new window.RTCPeerConnection(com.ICEConfig, com.config);

    // Send stream
    if ((!fn.isEmpty(stream)) ? stream instanceof Stream : false) {

      // Adds the RTCMediaStream object to RTCPeerConnection
      peer.addStream(stream.MediaStream);

      if (hasStream) {
        com._handler('peer:stream', {
          stream: stream
        });
      }

      com._handler('peer:reconnect', {});
    }
    com.bind(peer);
  };

  /**
   * Stops and closes the RTCPeerConnection connection.
   * @method _disconnect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._disconnect = function () {
    if (com.RTCPeerConnection.newSignalingState !== 'closed') {
      com.RTCPeerConnection.close();
    }

    com._handler('peer:disconnect', {});
  };

  /**
   * Binds events to RTCPeerConnection object.
   * @method _bind
   * @param {Object} bind The RTCPeerConnection object.
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._bind = function (bind) {
    // Bind events to RTCPeerConnection
    // Un-implemented events functions
    // bind.onidentityresult = function () {};
    // bind.onidpassertionerror = function () {};
    // bind.onidpvalidationerror = function () {};
    // bind.onpeeridentity = function () {};

    bind.ondatachannel = function (event) {
      var eventChannel = event.channel || event;

      // Send the channel only when channel has started
      var channel = new DataChannel(eventChannel, function (event, data) {

        com._handler(event, data);

        if (event === 'datachannel:start') {
          com._handler('peer:datachannel', {
            channel: channel,
            sourceType: 'remote'
          });
        }
      });
    };

    bind.onaddstream = function (event) {
      var eventStream = event.stream || event;

      // Send the stream only when stream has started
      var stream = new Stream(eventStream, config.streamingConfig, function (event, data) {

        com._handler(event, data);

        if (event === 'stream:start') {
          com._handler('peer:stream', {
            sourceType: 'remote',
            stream: stream
          });
        }
      });
    };

    bind.onremovestream = function (event) {};

    bind.onicecandidate = function (event) {
      var eventCandidate = event.candidate || event;

      if (fn.isEmpty(eventCandidate.candidate)) {
        com._handler('candidate:gathered', {
          candidate: eventCandidate
        });
        return;
      }

      // Implement ice trickle disabling here

      com._handler('peer:icecandidate', {
        sourceType: 'local',
        candidate: eventCandidate
      });
    };

    // Use helper function
    PeerHelper.ICE.state(bind);

    bind.oniceconnectionnewstatechange = function (event) {
      // Connection is successful
      if (com.RTCPeerConnection.newIceConnectionState === 'connected') {
        // Stop timer
        if (!fn.isEmpty(com.healthTimer)) {
          log.debug('Peer', com.id, 'Stopping health timer as connection is established.');

          clearInterval(com.healthTimer);
        }
      }

      com._handler('peer:iceconnectionstate', {
        state: com.RTCPeerConnection.newIceConnectionState
      });
    };

    bind.onsignalingstatechange = function (event) {
      com._handler('peer:signalingstate', {
        state: com.RTCPeerConnection.newSignalingState
      });
    };

    bind.onicegatheringstatechange = function () {
      com._handler('peer:icegatheringstate', {
        state: com.RTCPeerConnection.iceGatheringState
      });
    };

    bind.onnegotiationneeded = function (event) {
      com._handler('peer:ready', {
        weight: com._weight,
        sdpType: com._sdpType,
        streamingConfig: com._streamingConfig
      });
    };

    com.RTCPeerConnection = bind;

    fn.runSync(function () {
      com._handler('peer:ready', {
        weight: com.weight,
        SDPType: com.SDPType,
        streamingConfig: com.streamingConfig
      });
    });
  };

  /**
   * Starts and initiates the handshaking to establish the RTCPeerConnection.
   * @method _initiate
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._initiate = function () {
    // Create datachannel
    if (com._dataConnection) {
      var eventChannel = com.RTCPeerConnection.createDataChannel('main');

      // Send the channel only when channel has started
      var channel = new DataChannel(eventChannel, function (event, data) {

        com._handler(event, data);

        com._handler('peer:datachannel', {
          sourceType: 'local',
          channel: channel
        });
      });
    }

    com.RTCPeerConnection.createOffer(function (offer) {
      offer.sdp = SDP.configure(offer.sdp, com.sdpConfig);

      com.localDescription = offer;

      com._handler('peer:offer', {
        offer: offer
      });

    }, function (error) {
      throw error;

    }, com.sdpConstraints);
  };

  /**
   * Starts and initiates the handshaking to establish the RTCPeerConnection.
   * @method _initiate
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.createAnswer = function () {
    com.RTCPeerConnection.createAnswer(function (answer) {
      answer.sdp = SDP.configure(answer.sdp, com.sdpConfig);

      com.localDescription = answer;

      com._handler('peer:answer', {
        answer: answer
      });

      com.setLocalDescription();

    }, function (error) {
      throw error;

    }, com.sdpConstraints);
  };

  com.setLocalDescription = function () {
    var localDescription = com.localDescription;

    com.RTCPeerConnection.setLocalDescription(localDescription, function () {
      com._handler('peer:localdescription', {
        localDescription: localDescription.sdp,
        type: localDescription.type,
      });

      if (localDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-local-answer';

        com._handler('peer:signalingstate', {
          state: com.RTCPeerConnection.newSignalingState
        });

      } else {
        com.setRemoteDescription();
      }

    }, function (error) {
      throw error;
    });
  };

  com.setRemoteDescription = function () {
    var remoteDescription = com.remoteDescription;

    com.RTCPeerConnection.setRemoteDescription(remoteDescription, function () {
      com._handler('peer:remotedescription', {
        remoteDescription: remoteDescription.sdp,
        type: remoteDescription.type
      });

      if (remoteDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-remote-answer';

        com._handler('peer:signalingstate', {
          state: com.RTCPeerConnection.newSignalingState
        });

      } else {
        com.createAnswer();
      }

      // Add all ICE Candidate generated before remote description of answer and offer
      ICE.popCandidate(com.RTCPeerConnection, com.handler);

    }, function (error) {
      throw error;
    });
  };

  /* Event Handlers */
  /**
   * Function to subscribe to when peer connection has been started and
   *   class object is ready to use.
   * @method onready
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.onready = function () {};

  /**
   * Function to subscribe to when peer connection is established.
   * @method onconnect
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.onconnect = function () {};

  /**
   * Function to subscribe to when ICE connection state changes.
   * @method oniceconnectionstatechange
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.oniceconnectionstatechange = function () {};

  /**
   * Function to subscribe to when ICE gathering state changes.
   * @method onicegatheringstatechange
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.onicegatheringstatechange = function () {};

  /**
   * Function to subscribe to when there is an incoming stream received.
   * @method onaddstream
   * @param {Stream} stream The stream object.
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.onaddstream = function () {};

  /**
   * Function to subscribe to when signaling state has changed.
   * @method onsignalingstatechange
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.onsignalingstatechange = function () {};

  /**
   * Function to subscribe to when peer connection has been restarted.
   * @method onreconnect
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.onreconnect = function () {};

  /**
   * Function to subscribe to when peer connection been disconnected.
   * @method onremoveconnection
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.ondisconnect = function () {};


  /* Beginning Logic */
  // Throw an error if adapterjs is not loaded
  if (!window.RTCPeerConnection) {
    throw new Error('Required dependency adapterjs not found');
  }

  // Parse bandwidth
  com._streamingConfig = config.streamingConfig || {
    audio: false,
    video: false,
    status: {
      audioMuted: true,
      videoMuted: true
    }
  };

  // Parse sdp modification settings
  com._sdpConfig = {
    stereo: !!config.streamingConfig.audio.stereo,
    bandwidth: StreamParser.parseBandwidthConfig(config.bandwidth)
  };

  // Parse constraints ICE servers
  var peerConfig = {
    iceServers: config.iceServers
  };

  // Create the object
  var peer = PeerHelper.create(peerConfig);

  // Bind peer
  com._bind(peer);

  // Send stream
  fn.runSync(function () {
    // Start timer
    /*com.healthTimer = setTimeout(function () {
      if (!fn.isEmpty(com.healthTimer)) {
        log.debug('Peer', com.id, 'Restarting negotiation as timer has expired');

        clearInterval(com.healthTimer);

        com.reconnect();
      }

    }, com.iceTrickle ? 10000 : 50000);*/

    // When peer connection is ready to use, the connection connect() can start
    if ((!fn.isEmpty(stream)) ? stream instanceof Stream : false) {
      // Check class type
      peer.addStream(stream.MediaStream);

      com._handler('peer:stream', {
        sourceType: 'local',
        stream: stream
      });

    } else {
      com._handler('peer:ready', {
        weight: com._weight,
        sdpType: com._sdpType,
        streamingConfig: com._streamingConfig
      });
    }
  });
}
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
var PeerEventReceivedHandler = {
  
  // Handles the stream events */
  stream: {
    // Handles the stream stop event */
    stop: function (com, data, listener) {
      // When receiving stream stops and it is not the main peer connection, it means
      // that connection has stopped
      // If stream is not the main, disconnect the peer connection.
      if (com.id !== 'main') {
        com.disconnect();
      }
    }
  }
  
};
var PeerEventResponseHandler = {
  
  /**
   * Event fired when peer connection has started.
   * This happens when RTCPeerConnection object has just
   *   been initialized and local MediaStream has been added.
   * @event peer:connect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect(com.id);
    }
  },
  
  /**
   * Event fired when peer connection is reconnecting.
   * This happens when RTCPeerConnection object is
   *   re-initialized and the ICE connection restarts again.
   * It adds the re-updated local MediaStream.
   * @event peer:reconnect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  reconnect: function (com, data, listener) {
    if (typeof com.onreconnect === 'function') {
      com.onreconnect();
    }
  },
  
  /**
   * Event fired when peer connection is established and connected.
   * This happens when RTCPeerConnection ICE connection state is
   *  connected and completed.
   * @event peer:connected
   * @private
   * @for Peer
   * @since 0.6.0
   */
  connected: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect(com.id);
    }
  },
  
  /**
   * Event fired when peer connection has been disconnected.
   * This happens when RTCPeerConnection close is invoked and 
   *  connection stops.
   * @event peer:disconnect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect();
    }
  },
  
  /**
   * Event fired when peer connection adds or receives a stream object.
   * This happens when user sends a local MediaStream to peer or receives
   *   a remote MediaStream from onaddstream event.
   * @event peer:disconnect
   * @private
   * @for Peer
   * @since 0.6.0
   */
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
   * Event fired when peer connection ICE connection state has changed.
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
   * Event fired when peer connection ICE gathering state has changed.
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
   * Event fired when peer connection ICE candidate is received.
   * @property icecandidate
   * @type Function
   * @private
   * @since 0.6.0
   */
  icecandidate: function (com, data, listener) {},

  /**
   * Event fired when peer connection signaling state changes.
   * This happens when RTCPeerConnection receives local or remote offer.
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
   * Event fired when peer connection datachannel is received.
   * This happens when RTCPeerConnection receives a local or remote RTCDataChannel.
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
var PeerHelper = {
  /* RTCPeerConnection polyfills */
  /**
   * Handles the configuration settings for cross-browser interopability and
   *   getConfiguration, getStreamById and canTrickleIceCandidates polyfill.
   * @method PeerHelper.create
   * @param {JSON} config The RTCConfiguration for the new RTCPeerConnection object.
   * @param {JSON} [optional] The optional RTCConfiguration for the new RTCPeerConnection object.
   * @private
   * @for Peer
   * @since 0.6.0
   */
  create: function (config, optional) {
    // Peer configuration
    var peerConfig = null;
    // Required parameters for Firefox interopability
    var peerOptional = {
      optional: [{
        DtlsSrtpKeyAgreement: true
      }]
    };

    if (config !== null && typeof config === 'object') {
      peerConfig = config;

      if (typeof config.iceServers === 'object' ? config.iceServers instanceof Array : false) {
        peerConfig.iceServers = this.ICE.configureTURN(peerConfig.iceServers);
      }
    }

    if (config !== null && typeof config === 'object') {
      peerOptional = optional;
    }

    var peer = new window.RTCPeerConnection(peerConfig, peerOptional);

    // Polyfill getConfiguration function
    // Override firefox unsupported feature
    if (typeof peer.getConfiguration !== 'function' || window.webrtcDetectedBrowser === 'firefox') {
      peer.getConfiguration = function () {
        peerConfig.optional = typeof peerOptional === 'object' ? peerOptional.optional || null : null;
        return peerConfig;
      };
    }

    // Polyfill getStreamById function
    // Override firefox unsupported feature
    if (typeof peer.getStreamById !== 'function' || window.webrtcDetectedBrowser === 'firefox') {
      peer.getStreamById = function (streamId) {
        var localStreams = peer.getLocalStreams();
        var remoteStreams = peer.getRemoteStreams();

        var i, j;

        for (i = 0; i < localStreams.length; i += 1) {
          if (streamId === localStreams[i].id) {
            return localStreams[i];
          }
        }

        for (j = 0; j < remoteStreams.length; j += 1) {
          if (streamId === remoteStreams[i].id) {
            return remoteStreams[j];
          }
        }

        return null;
      };
    }

    // Polyfill canTrickleIceCandidates property
    if (typeof peer.canTrickleIceCandidates !== 'boolean') {
      peer.canTrickleIceCandidates = window.webrtcDetectedBrowser === 'firefox' ?
        window.webrtcDetectedVersion > 27 : true;
    }

    if (window.webrtcDetectedBrowser !== 'chrome' && window.webrtcDetectedBrowser !== 'opera') {
      var remoteStreamStatusChangedFn = function (prev, current) {
        if (prev === true) {
          peer.onremovestream(peer);
        }
      };

      var remoteStreamChecker = setInterval(function () {
        if (typeof peer.hasStream === 'undefined') {
          peer.hasStream = peer.getRemoteStreams().length > 0;
        }

        // Clear interval if peer connection is closed
        if (peer.signalingState === 'closed') {
          clearInterval(remoteStreamChecker);
        }

        var status = peer.getRemoteStreams().length > 0;

        if (peer.hasStream !== status) {
          remoteStreamStatusChangedFn(!!peer.hasStream, status);
          peer.hasStream = status;
        }
      }, 10);
    }

    return peer;
  },

  /**
   * Handles the addStream polyfill for RTCPeerConnection object.
   * If onnegotiationneeded event is not supported, fire if a stream has been added.
   * This polyfills the missing onnegotiationneeded event handler.
   * Support are for multi-stream sending only.
   * @method PeerHelper.addStream
   * @param {Object} peer The RTCPeerConnection object.
   * @param {Object} stream The MediaStream object.
   * @private
   * @support Chrome, Opera
   * @for Peer
   * @since 0.6.0
   */
  addStream: function (peer, stream) {
    if (window.webrtcDetectedBrowser === 'chrome' && window.webrtcDetectedBrowser === 'opera') {
      peer.addStream(stream);

    // Firefox and Safari / IE (plugin-enabled) browsers don't enable multi-stream
    // Firefox and Safari / IE (plugin-enabled) browsers does not support onnegotiationneeded
    } else {
      if (peer.getLocalStream().length > 0) {
        log.warn('StreamPolyfill', 'You cannot add more than 1 stream. Multi-stream sending is ' +
          'not supported in ' + window.webrtcDetectedBrowser.toUpperCase() +
          (window.webrtcDetectedType === 'plugin' ? ' (plugin-enabled)' : '') + ' browser');
        return;
      }

      // Add stream once
      peer.addStream(stream);

      if (typeof peer.onnegotiationneeded === 'function') {
        peer.onnegotiationneeded(peer);
      }
    }
  },

  /**
   * Handles the removeStream polyfill for RTCPeerConnection object.
   * For non-supported browsers, the peer connection will be re-initialized
   *   without adding any stream.
   * @method PeerHelper.removeStream
   * @param {Object} peer The RTCPeerConnection object.
   * @param {Object} stream The MediaStream object.
   * @private
   * @support Chrome, Opera
   * @for Peer
   * @since 0.6.0
   */
  removeStream: function (peer, stream) {
    if (window.webrtcDetectedBrowser === 'chrome' && window.webrtcDetectedBrowser === 'opera') {
      peer.removeStream(stream);

    // Firefox and Safari / IE (plugin-enabled) browsers don't enable multi-stream
    // Firefox and Safari / IE (plugin-enabled) browsers does not support onnegotiationneeded
    } else {
      if (peer.getLocalStream().length > 0) {
        var constraints = null;
        var optional;

        // Restart the negotiation
        if (typeof peer.constraints === 'object') {
          constraints = peer.constraints;
          optional = peer.optional;
        }

        var peer2 = this.create(constraints, optional);

        // Recopy all the functions again.
        var key;

        var unwantedKeys = [
          'signalingState',
          'iceConnectionState',
          'iceGatheringState',
          'localDescription',
          'remoteDescription',
          'createDataChannel',
          'updateIce',
          'addIceCandidate',
          'addStream',
          'removeStream',
          'getStats',
          'getStreamById',
          'createDataChannel',
          'createDTMFSender',
          'createOffer',
          'createAnswer',
          'setLocalDescription',
          'setRemoteDescription',
          'getSenders',
          'getReceivers',
          'addTrack',
          'removeTrack'
        ];

        for (key in peer) {
          if (peer.hasOwnProperty(key)) {
            if (unwantedKeys.indexof(key) === -1) {
              try {
                peer2[key] = peer[key];

              } catch (error) {
                log.warn('Not supported to replace "' + key + '" key');
              }
            }
          }
        }

        // If subscribed to our event
        if (!!peer2.newiceConnectionState) {
          this.ICE.state(peer2);
        }

        /*// Check if remoteDescription is set before firing onremovestream
        var checkForRemoteDesc = setInterval(function () {
          if (!!peer2.remoteDescription) {
            clearInterval(checkForRemoteDesc);

            if (typeof peer2.onremovestream === 'function') {
              peer2.onremovestream(peer);
            }
          }
        }, 10);*/


        // Re-invoke negotiation needed
        if (typeof peer2.onnegotiationneeded === 'function') {
          peer2.onnegotiationneeded(peer2);
        }

        peer = peer2;
      }
    }
  },

  /* ICE helper functions */
  ICE: {

    /**
     * Parses the received ICE connection state and updates to a new version
     *   to handle the differences received from cross-browsers.
     * Use <code>pc.onnewiceconnectionstatechange</code> instead of
     *   <code>pc.oniceconnectionstatechange</code>.
     * Use <code>pc.newiceConnectionState</code> for the updated ICE connection state.
     * State should go from <code>checking > connected > completed</code>.
     * @method PeerHelper.ICE.state
     * @param {Object} peer The RTCPeerConnection object.
     * @private
     * @example
     *   PeerHelper.ICE.state(pc);
     *   pc.onnewiceconnectionstatechange = function () {
     *     // here's my new state.
     *     var state = pc.newiceConnectionState;
     *   };
     * @for Peer
     * @since 0.6.0
     */
    state: function (peer) {
      var updatedStateList = {
        starting : 'starting',
        checking : 'checking',
        connected : 'connected',
        completed : 'connected',
        done : 'completed',
        disconnected : 'disconnected',
        failed : 'failed',
        closed : 'closed'
      };

      peer.newiceConnectionState = peer.iceConnectionState || 'new';

      peer.oniceconnectionstatechange = function () {
        var state = peer.iceConnectionState;
        var checkState = updatedStateList[state];

        // Check if state is new or has been disconnected / failed / closed
        if (!peer.iceConnectionFiredStates || checkState === 'disconnected' ||
            checkState === 'failed' || checkState === 'closed') {
          peer.iceConnectionFiredStates = [];
        }

        // Display updated state
        var newState = updatedStateList[state];

        if (peer.iceConnectionFiredStates.indexOf(newState) < 0) {
          peer.iceConnectionFiredStates.push(newState);

          if (newState === 'connected') {
            setTimeout(function () {
              peer.iceConnectionFiredStates.push('done');

              peer.newiceConnectionState = 'completed';

              // Set using a new attached function instead to prevent
              // overriding the original one
              peer.oniceconnectionnewstatechange(peer);
            }, 1000);

            if (peer.iceConnectionState === 'connected' || peer.iceConnectionState === 'completed') {
              if (window.webrtcDetectedBrowser !== 'opera' || window.webrtcDetectedBrowser !== 'chrome') {
                if (peer.hasStream && peer.getRemoteStreams().length === 0) {
                  peer.hasStream = false;

                  if (typeof peer.onremovestream === 'function') {
                    peer.onremovestream(peer);
                  }
                }
              }
            }
          }
          peer.newiceConnectionState = newState;
          peer.onnewiceconnectionstatechange(peer);
        }
      };
    },

    /**
     * Adds ICE candidate to the RTCPeerConnection object and buffers
     *   candidates if remote description has not yet be set.
     * Use a common success and failure defer.
     * Once remote description is set, the buffered ICE candidates will be
     *   added to the RTCPeerConnection object.
     * @method PeerHelper.ICE.addCandidate
     * @param {Object} peer The RTCPeerConnection object.
     * @param {Object} candidate The RTCIceCandidate object.
     * @param {Function} successDefer The defer fired once ICE candidate is
     *   added successfully.
     * @param {Function} failureDefer The defer fired once ICE candidate has
     *   an exception adding it.
     * @private
     * @example
     *   PeerHelper.ICE.addCandidate(peer, candidate, function () {
     *     console.log('Successfully added candidate');
     *   }, function (error) {
     *     console.error('Failed adding candidate. Exception occurred:', error)
     *   });
     * @for Peer
     * @since 0.6.0
     */
    addCandidate: function (peer, candidate, successDefer, failureDefer) {
      if (!!peer.remoteDescription) {
        // Add the candidates
        peer.addIceCandidate(candidate, successDefer, failureDefer);

      } else {
        // Buffer the candidates
        peer.bufferCandidates = peer.bufferCandidates || [];
        peer.bufferCandidates.push(candidate);

        // If peer has a steady connection, do not add. If peer does not has an interval
        //   create
        if (!!peer.waitForBuffer && (peer.newiceConnectionState !== 'connected' ||
          peer.newiceConnectionState !== 'completed')) {
          // Do a buffer to check
          var waitForBuffer = setInterval(function () {
            if (!!peer.remoteDescription) {
              console.log('Adding buffered candidates');

              // Clear interval
              clearInterval(waitForBuffer);

              var i;

              // Loop and add all bufferred candidates
              for (i = 0; i < peer.bufferCandidates.length; i += 1) {
                peer.addIceCandidate(peer.bufferCandidates[i], successDefer, failureDefer);
              }

              // Remove reference
              delete peer.waitForBuffer;
            }
          }, 10);
        }
      }
    },

    /**
     * Parses TURN url format for cross-browser interopability.
     * For an example, Firefox does not support <code>username@turnserver.com</code>,
     *   whereas Chrome supports it.
     * @method PeerHelper.ICE.configureTURN
     * @param {Array} iceServers The list of ICE servers.
     * @param {JSON} iceServers.(#index) The ICE server.
     * @param {String} iceServers.(#index).credential The ICE server credential (password).
     * @param {String} iceServers.(#index).url The ICE server url. For TURN server,
     *   the format may vary depending on the support of the TURN url format.
     * @returns {Array} The updated ICE servers list.
     * - <code>(#index)</code> <var>: <b>type</b> JSON</var><br>
     *   The ICE server.
     * - <code>(#index).credential</code> <var>: <b>type</b> String</var><br>
     *   The ICE server credential (password). Only used in TURN servers.
     * - <code>(#index).url</code> <var>: <b>type</b> String</var><br>
     *   The ICE server url. For TURN server, the format may vary depending on the support of
     *   the TURN url format.
     * - <code>(#index).username</code> <var>: <b>type</b> String</var><br>
     *   The ICE server username. Only used in TURN servers for Firefox browsers.
     * @private
     * @example
     *   var updateIceServers = PeerHelper.ICE.configureTURN(iceServers);
     * @for Peer
     * @since 0.6.0
     */
    configureTURN: function (iceServers) {
      var newConfig = [];
      var i;

      for (i = 0; i < iceServers.length; i += 1) {
        // The new ice server object
        var iceServer = {
          url: iceServers[i].url
        };

        // If there is credential, add it.
        if (!!iceServers[i].credential) {
          iceServer.credential = iceServers[i].credential;
        }

        // If there is username, add it.
        if (!!iceServers[i].username) {
          iceServer.username = iceServers[i].username;
        }

        // For Firefox only
        if (window.webrtcDetectedBrowser === 'firefox') {
          // If it's a TURN server
          if (iceServer.url.indexOf('turn') === 0) {
            // Check if the url is username@turn.com
            if (iceServer.url.indexOf('@') > 0) {
              var iceParts = iceServer.url.split(':');
              var subIceParts = iceParts[1].split('@'); // user '@' url

              iceParts[1] = subIceParts[1];
              iceServer.url = iceParts.join(':');
              iceServer.username = subIceParts[0];
            }
          }
        }
        newConfig.push(iceServer);
      }
      // Return the new data
      return newConfig;
    }

  }
};
function Room(name, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

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
   * @attribute id
   * @type String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.id = null;

  /**
   * The room token.
   * @attribute token
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
   * @attribute apiPath
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
   * The list of users connected to room.
   * @attribute users
   * @param {User} (#userId) The user connected to room.
   * @type JSON
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.users = {};

  /**
   * The list of components connected to room.
   * This could be <var>MCU</var> or <var>Recording</var> peers.
   * @attribute components
   * @param {Component} (#index) The component connected to room.
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
   * The room TURN/STUN servers connection.
   * @attribute iceServers
   * @param {JSON} (#index) The ICE server.
   * @param {String} (#index).credential The ICE server credential (password).
   * @param {String} (#index).url The ICE server url. The current format
   *    for TURN servers is <code>turn:username@urlhost</code>. It may be
   *    required to parse it differently in
   *    <code>{ username: 'username', credential: 'xxx', url: 'turn:urlhost' }</code>
   *    format for unsupported browsers like firefox.
   * @type Array
   * @required
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.iceServers = [];

  /**
   * The flag that indicates if the self user has joined the room.
   * @attribute connected
   * @type Boolean
   * @required
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.connected = false;

  /**
   * The flag that indicates if the room is locked.
   * @attribute locked
   * @type Boolean
   * @required
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.locked = false;


  /**
   * Function to subscribe to when room is initializating the configuration.
   * @method oninit
   * @eventhandler true
   * @for Room
   * @since 0.6.0
   */
  com.oninit = function () {};

  /**
   * Function to subscribe to when room object has loaded and is ready to use.
   * @method onready
   * @eventhandler true
   * @for Room
   * @since 0.6.0
   */
  com.onready = function () {};

  /**
   * Function to subscribe to when self has joined the room.
   * @method onjoin
   * @eventhandler true
   * @for Room
   * @since 0.6.0
   */
  com.onjoin = function () {};

  /**
   * Function to subscribe to when a user has joined the room.
   * @method onuserjoin
   * @eventhandler true
   * @for Room
   * @since 0.6.0
   */
  com.onuserjoin = function () {};

  /**
   * Function to subscribe to when self has been kicked out of room.
   * @method onkick
   * @eventhandler true
   * @for Room
   * @since 0.6.0
   */
  com.onkick = function () {};

  /**
   * Function to subscribe to when self is warned by server before kicking self user.
   * @method onwarn
   * @eventhandler true
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
   * @eventhandler true
   * @for Room
   * @since 0.6.0
   */
  com.onunlock = function () {};

  /**
   * Function to subscribe to when self has leave the room.
   * @method onleave
   * @eventhandler true
   * @for Room
   * @since 0.6.0
   */
  com.onleave = function () {};


  /**
   * The handler handles events.
   * @method handler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    RoomHandler(com, event, data, listener);
  };

  /**
   * Loads the connection information of the room.
   * @method init
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.init = function () {
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
      var userConfig = {
        id: null,
        username: content.username,
        token: content.userCred,
        timeStamp: content.timeStamp,
        data: null
      };

      com.self = new Self(userConfig, com.routeEvent);

      //com.constraints = JSON.parse(content.pc_constraints);

      // Signalling information
      var socketConfig = {
        server: content.ipSigserver,
        httpPortList: content.httpPortList,
        httpsPortList: content.httpsPortList
      };
      com.socket = new Socket(socketConfig, com.routeEvent);

      com.respond('room:ready');

    }, function (status, error) {
      com.respond('room:error', {
        error: error
      });

    }, function () {
      com.respond('room:init');
    });
  };

  /**
   * Starts the connection to the room.
   * @method join
   * @param {Stream} stream The stream object to send. <mark>Stream</mark> object must
   *   be ready before sending. Look at <var>stream:start</var> event.
   *   Set as <code>null</code> for non-stream connection.
   * @param {JSON} [config] The configuration settings.
   * @param {JSON} [config.bandwidth] The bandwidth configuration for the connection.
   *    This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @param {Integer} [config.bandwidth.audio] The audio banwidth configuration.
   * @param {Integer} [config.bandwidth.video] The video banwidth configuration.
   * @param {Integer} [config.bandwidth.data] The data banwidth configuration.
   * @param {JSON|String} [config.userData] The self user's custom data.
   * @for Room
   * @since 0.6.0
   */
  com.join = function (stream, config) {
    if (com.connected) {
      throw new Error('You are already connected to this "' + com.name +'" room');
    }

    config = config || {};

    // Parse self configuration first
    com.self.bandwidth = StreamParser.parseBandwidthConfig(config.bandwidth);
    com.self.data = config.userData;

    // Add stream if stream is not empty
    if (typeof stream === 'object' ? stream instanceof Stream : false) {
      com.self.addStreamConnection(stream, 'main');
    }

    // Start socket connection
    com.socket.connect();
  };

  /**
   * Stops the connection to the room.
   * @method leave
   * @for Room
   * @since 0.6.0
   */
  com.leave = function () {
    // Disconnect socket connection
    com.socket.disconnect();
  };

  /**
   * Locks the room.
   * @method lock
   * @for Room
   * @since 0.6.0
   */
  com.lock = function () {
    var message = {
      type: 'roomLockEvent',
      mid: com.self.id,
      rid: com.id,
      lock: true
    };

    com.socket.send(message);

    com.respond('room:lock', {
      selfId: com.self.id
    });
  };

  /**
   * Unlocks the room.
   * @method unlock
   * @for Room
   * @since 0.6.0
   */
  com.unlock = function () {
    var message = {
      type: 'roomLockEvent',
      mid: com.self.id,
      rid: com.id,
      lock: false
    };

    com.socket.send(message);

    com.respond('room:unlock', {
      userId: com.self.id
    });
  };

  /**
   * Sends a stream to users.
   * @method sendStream
   * @param {Stream} stream The stream object. <mark>Stream</mark> object must
   *   be ready before sending. Look at <var>stream:start</var> event.
   * @for Room
   * @since 0.6.0
   */
  com.sendStream = function (stream, targetUsers) {
    var peerId = fn.generateUID();
    var key;

    // Do a check of targetUsers to send
    com.self.addStreamConnection(stream, peerId);

    for (key in com.users) {
      if (com.users.hasOwnProperty(key)) {
        var message = {
          type: 'enter',
          mid: com.self.id,
          rid: com.id,
          prid: peerId,
          stream: com.self.getStreamingInfo('main')
        };

        com.users[key].routeMessage('message:enter', message);
      }
    }
  };

  // Start the room connection information
  com.init();
}
/**
 * Handles all the message events received from socket.
 * @attribute RoomEventMessageHandler
 * @private
 * @for Room
 * @since 0.6.0
 */
var RoomEventMessageHandler = {

  /**
   * The message that indicates that self user is in the room.
   * @event inRoom
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.sid The self user id.
   * @param {JSON} message.pc_config The RTCPeerConnection configuration.
   * @param {Array} message.pc_config.iceServers The list of ICE servers.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  inRoom: function (com, data, listener) {
    // Respond to self user that self user is in the room
    // and set the relevant data to self user.
    com.self.routeMessage(data);

    // The ICE servers received when "inRoom"
    com.iceServers = fn.isSafe(function () {
      return data.pc_config.iceServers;
    }) || [];

    // Notify to trigger onjoin event
    com.respond('room:join', {
      user: com.self
    });
  },

  /**
   * The message that indicates that a user has joined the room.
   * This is sent when user has just started a connection to the room.
   * @event enter
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.mid The user id.
   * @param {String} message.prid The shared peer connection id.
   * @param {JSON} message.stream The peer connection streaming configuration.
   * @param {JSON|Boolean} [message.stream.audio=false] The audio stream configuration.
   *    If parsed as a boolean, other configuration settings under the audio
   *    configuration would be set as the default setting in the connection.
   * @param {Boolean} [message.stream.audio.stereo=false] The flag that indiciates
   *    if stereo is enabled for this connection.
   * @param {String} [message.stream.audio.sourceId] The source id of the audio MediaStreamTrack
   *    used for this connection.
   * @param {String|Boolean} [message.stream.video=false] The video stream configuration.
   *    If parsed as a boolean, other configuration settings under the video
   *    configuration would be set as the default setting in the connection.
   * @param {JSON} [message.stream.video.resolution] The video streaming resolution.
   * @param {Integer} message.stream.video.resolution.width The video resolution width.
   * @param {Integer} message.stream.video.resolution.height The video resolution height.
   * @param {Integer} message.stream.video.frameRate The video stream framerate.
   * @param {String} [message.stream.video.sourceId] The source id of the video MediaStreamTrack
   *    used for this connection.
   * @param {JSON} message.stream.status The stream MediaStreamTrack status.
   * @param {Boolean} [message.stream.status.audioMuted=false] The flag that indicates if audio is muted.
   *    If audio is set to false, this would be set as true.
   * @param {Boolean} [message.stream.status.videoMuted=false] The flag that indicates if video is muted.
   *    If video is set to false, this would be set as true.
   * @param {Integer} message.userData The user custom data. Only given for "main" peer connections.
   * @param {JSON} message.agent The user's browser agent information. Only given for "main" peer connections.
   * @param {String} message.agent.name The user's browser agent name. For other SDKs, it's indicated
   *    by their type of device <code>E.g. ios, android</code>. For components, it's indicated
   *    by their type <code>E.g. MCU, Recording</code>.
   * @param {Integer} message.agent.version The user's browser agent version. For other SDKs, it's indicated
   *    by their version of device OS <code>ios8 = 8. android kitkat = 4.4</code>. For components, it's indicated
   *    by their version <code>E.g. 0.1.0, 0.2.0</code>.
   * @param {String} message.agent.webRTCType The user's browser agent webrtc implementation type. For other SDKs or
   *    components, use <code>other</code>.
   * @param {JSON} message.bandwidth The peer connection bandwidth configuration.
   *    This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @param {Integer} [message.bandwidth.audio] The bandwidth configuration for the audio stream.
   * @param {Boolean} [message.bandwidth.video] The bandwidth configuration for the video stream.
   * @param {Boolean} [message.bandwidth.data] The bandwidth configuration for the data stream.
   * @param {String} message.rid The room id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  enter: function (com, data, listener) {
    // A user has just joined the room
    var user = com.users[data.mid];

    // If the user is empty (which is supposed to be that case),
    // create a user which will create a peer connection when
    // the user object is ready
    if (fn.isEmpty(user)) {
      var config = {
        id: data.mid,
        stream: data.stream,
        agent: data.agent,
        bandwidth: data.bandwidth,
        data: data.userData,
        SDPType: 'answer'
      };

      user = new User(config, com.routeEvent);

      com.users[data.mid] = user;

      // Invoke function that user has joined
      if (typeof com.onuserjoin === 'function') {
        com.onuserjoin(user);
      }
    }
  },

  /**
   * The message that indicates that a user has joined the room.
   * This is sent as a response to user's "enter" message.
   * @event welcome
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.mid The user id.
   * @param {String} message.prid The shared peer connection id.
   * @param {JSON} message.stream The peer connection streaming configuration.
   * @param {JSON|Boolean} [message.stream.audio=false] The audio stream configuration.
   *    If parsed as a boolean, other configuration settings under the audio
   *    configuration would be set as the default setting in the connection.
   * @param {Boolean} [message.stream.audio.stereo=false] The flag that indiciates
   *    if stereo is enabled for this connection.
   * @param {String} [message.stream.audio.sourceId] The source id of the audio MediaStreamTrack
   *    used for this connection.
   * @param {String|Boolean} [message.stream.video=false] The video stream configuration.
   *    If parsed as a boolean, other configuration settings under the video
   *    configuration would be set as the default setting in the connection.
   * @param {JSON} [message.stream.video.resolution] The video streaming resolution.
   * @param {Integer} message.stream.video.resolution.width The video resolution width.
   * @param {Integer} message.stream.video.resolution.height The video resolution height.
   * @param {Integer} message.stream.video.frameRate The video stream framerate.
   * @param {String} [message.stream.video.sourceId] The source id of the video MediaStreamTrack
   *    used for this connection.
   * @param {JSON} message.stream.status The stream MediaStreamTrack status.
   * @param {Boolean} [message.stream.status.audioMuted=false] The flag that indicates if audio is muted.
   *    If audio is set to false, this would be set as true.
   * @param {Boolean} [message.stream.status.videoMuted=false] The flag that indicates if video is muted.
   *    If video is set to false, this would be set as true.
   * @param {Integer} message.userData The user custom data. Only given for "main" peer connections.
   * @param {JSON} message.agent The user's browser agent information. Only given for "main" peer connections.
   * @param {String} message.agent.name The user's browser agent name. For other SDKs, it's indicated
   *    by their type of device <code>E.g. ios, android</code>. For components, it's indicated
   *    by their type <code>E.g. MCU, Recording</code>.
   * @param {Integer} message.agent.version The user's browser agent version. For other SDKs, it's indicated
   *    by their version of device OS <code>ios8 = 8. android kitkat = 4.4</code>. For components, it's indicated
   *    by their version <code>E.g. 0.1.0, 0.2.0</code>.
   * @param {String} message.agent.webRTCType The user's browser agent webrtc implementation type. For other SDKs or
   *    components, use <code>other</code>.
   * @param {Integer} message.weight The priority weight of the message. In use-cases where both users receives each
   *    others "enter" message during the first handshake, the priority would indicate which user gets to do
   *    the offer.
   * @param {JSON} message.bandwidth The peer connection bandwidth configuration.
   *    This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @param {Integer} [message.bandwidth.audio] The bandwidth configuration for the audio stream.
   * @param {Boolean} [message.bandwidth.video] The bandwidth configuration for the video stream.
   * @param {Boolean} [message.bandwidth.data] The bandwidth configuration for the data stream.
   * @param {String} message.rid The room id.
   * @param {String} message.target The targeted user id to receive welcome.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  welcome: function (com, data, listener) {
    var user = com.users[data.mid];

    if (fn.isEmpty(user)) {
      var config = {
        id: data.mid,
        stream: data.stream,
        agent: data.agent,
        bandwidth: data.bandwidth,
        data: data.userData,
        SDPType: 'offer'
      };

      user = new User(config, com.routeEvent);

      com.users[data.mid] = user;

      // Invoke function when user has joined
      if (typeof com.onuserjoin === 'function') {
        com.onuserjoin(user);
      }
    }
  },

  /**
   * The message that starts a user's peer connection offer and answer handshake.
   * @event offer
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.sdp The offer session description.
   * @param {String} message.prid The peer connection id.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.target The targeted user id to receive offer.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  offer: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data);
    }
  },

  /**
   * The message that responses to a user's peer connection offer.
   * @event answer
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.sdp The answer session description.
   * @param {String} message.prid The peer connection id.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.target The targeted user id to receive answer.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  answer: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data);
    }
  },

  /**
   * The message that is received when candidate is generated from the user's peer connection.
   * It's recommend to add all the relevant information when instianting a new <var>RTCIceCandidate</var>
   *   object.
   * @event candidate
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.candidate The candidate's candidate session description.
   * @param {String} message.id The candidate's sdpMid.
   * @param {Integer} message.label The candidate's sdpMLineIndex.
   * @param {String} message.prid The peer connection id.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.target The targeted user id to receive generated candidate.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  candidate: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data);
    }
  },

  /**
   * The message that is received when user's custom data is updated.
   * @event updateUserEvent
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {JSON|String} message.userData The updated custom user data.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  updateUserEvent: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data.userData);
    }
  },

  /**
   * The message that is received when user's peer connection audio stream mute status
   *   have changed. This is inline with <var>MediaStreamTrack</var> API's <code>enabled = true/false</code>.
   * @event muteAudioEvent
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {Boolean} message.muted The updated audio stream mute status.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.prid The shared peer connection id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  muteAudioEvent: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data);
    }
  },

  /**
   * The message that is received when user's peer connection video stream mute status
   *   have changed. This is inline with <var>MediaStreamTrack</var> API's <code>enabled = true/false</code>.
   * @event muteVideoEvent
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {Boolean} message.muted The updated video stream mute status.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.prid The shared peer connection id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  muteVideoEvent: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data);
    }
  },

  /**
   * The message that is received when the current room lock status have changed.
   * @event roomLockEvent
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {Boolean} message.locked The updated room lock status.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @private
   * @for Messaging
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
   * The message that is received when user's peer connection is going through a refresh.
   * @event restart
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.prid The shared peer connection id.
   * @param {String} message.SDPType The handshake SDP type. <code>"offer"</code> is for the peer
   *   connection that initiated the restart. <code>"answer"</code> is for the peer
   *   connection that is responding to the restart.
   * @param {JSON} message.sdp The session description message for restart.
   * @param {String} message.sdp.type The <var>RTCSessionDescription</var> type.
   * @param {String} message.sdp.sdp The <var>RTCSessionDescription</var> session description.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  restart: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.respondMessage(data);

    } else {
      throw new Error('User "' + data.mid + '" does not exists');
    }
  },

  /**
   * The message that is received when user is receiving a rejection or warning from signaling server.
   * @event redirect
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.action The action received that indicates if user is warned or rejected.
   *    <code>"warning"</code> is when signaling is warning user of the action and comply accordingly.
   *    <code>"reject"</code> is when signaling has kicked user out of the room.
   * @param {JSON} message.info The signaling message for the redirect message.
   * @param {String} message.reason The reason for the action taken by signaling.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  redirect: function (com, data, listener) {
    if (data.action === 'reject') {
      // User is kicked out of the room
      com.respond('room:kick', {});
    }

    if (data.action === 'warning') {
      // User is warned
      com.respond('room:warn', {});
    }
  },

  /**
   * The message that is received when user has left the room.
   * @event bye
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  bye: function (com, data, listener) {
    var user = com.users[data.mid];

    // Disconnect user
    if (!fn.isEmpty(user)) {
      user.disconnect();

    } else {
      throw new Error('User "' + data.mid + '" does not exists');
    }
  }

};
var RoomEventReceivedHandler = {

  // Handles the stream events
  socket: {

    // When socket is connected, join the room
    connect: function (com, data, listener) {
      var message = {
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
      };

      com.socket.send(message);
    },

    // When socket is disconnected, trigger that leave
    disconnect: function (com, data, listener) {
      com.respond('room:leave', {});
    },

    // When socket sends or receives a message
    message: function (com, data, listener) {
      // If it's a remote source
      if (data.sourceType === 'remote') {
        listener('message:' + com.data, data);
      }
    },

    // When socket has exception, room has exception
    error: function (com, data, listener) {
      com.respond('room:error', {
        error: data,
        state: -2
      });
    }

  },

  // Handles the user events */
  user: {

    // When user object is initialized, start the "main" peer connection
    ready: function (com, data, listener) {
      // Get user object
      var user = com.users[data.id];

      // Get self local MediaStream
      var stream = com.self.streamConnections.main;

      // If stream exists, append it as streamObject
      if (!fn.isEmpty(stream)) {
        data.streamObject = stream;
      }

      // Set the ICE servers
      data.iceServers = com.iceServers;

      // Relay it to the userhandler
      user.routeMessage(data);
    }

  },

  // Handles the self user events */
  self: {

    // When self user custom data is updated, send to socket to update other users
    update: function (com, data, listener) {
      var message = {
        type: 'updateUserEvent',
        mid: data.id,
        rid: com.id,
        userData: data.userData
      };

      com.socket.send(message);
    },

    // When self user is connected to the room (after setting the self user id and
    // relevant information) start to send the enter
    connect: function (com, data, listener) {
      // Send and start the "main" peer connection
      var message = com.self.getInfo('main');

      message.type = 'enter';
      message.mid = com.self.id;
      message.rid = com.id;
      message.prid = 'main';

      com.socket.send(message);
    }

  },

  // Handles the peer events */
  peer: {

    // When peer connection object is initialized, we can start sending the welcome
    // to start the O/A handshake
    connect: function (com, data, listener) {
      // Retrieve the user
      var user = com.users[data.userId];

      // Check if user exists
      if (!fn.isEmpty(user)) {
        // Retrieve the user for this peer only
        var userInfo = user.getInfo(data.id);

        // Send welcome after creating object for answerer
        if (data.SDPType === 'answer') {
          var message = {
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
          };
          com.socket.send(message);
        }

      } else {
        throw new Error('User "' + data.userId + '" does not exists');
      }
    },

    // When peer connection starts creating an offer, send to the user
    offer: function (com, data, listener) {
      var message = {
        type: 'offer',
        sdp: data.offer.sdp,
        prid: data.id,
        mid: com.self.id,
        target: data.userId,
        rid: com.id
      };

      com.socket.send(message);
    },

    // When peer connection starts creating an answer to offer, send to the user
    answer: function (com, data, listener) {
      var message = {
        type: 'answer',
        sdp: data.answer.sdp,
        prid: data.id,
        mid: com.self.id,
        target: data.userId,
        rid: com.id
      };

      com.socket.send(message);
    },

    // When peer connection generates an ice candidate send to user
    icecandidate: function (com, data, listener) {
      // For generated candidate not received candidate
      if (data.sourceType === 'local') {
        var message = {
          type: 'candidate',
          label: data.candidate.sdpMLineIndex,
          id: data.candidate.sdpMid,
          candidate: data.candidate.candidate,
          mid: com.self.id,
          prid: data.id,
          target: data.userId,
          rid: com.id
        };

        com.socket.send(message);
      }
    }

  }

};
var RoomEventResponseHandler = {

  /**
   * Event fired when room is initializing configuration information
   * from API server.
   * @event room:init
   * @for Room
   * @since 0.6.0
   */
  init: function (com, data, listener) {
    if (typeof com.oninit === 'function') {
      com.oninit();
    }
  },

  /**
   * Event fired when room object to ready to use.
   * @event room:ready
   * @for Room
   * @since 0.6.0
   */
  ready: function (com, data, listener) {
    if (typeof com.onready === 'function') {
      com.onready();
    }
  },

  /**
   * Event fired when there is room connection problems.
   * @event room:error
   * @for Room
   * @since 0.6.0
   */
  error: function (com, data, listener) {
    com.respond('room:error', {
      error: data.error,
      state: data.state
    });

    if (typeof com.onerror === 'function') {
      com.onerror(data);
    }
  },

  /**
   * Event fired when room object to ready to use.
   * @event room:join
   * @for Room
   * @since 0.6.0
   */
  join: function (com, data, listener) {
    if (typeof com.onjoin === 'function') {
      com.onjoin(com.self);
    }
  },

  /**
   * Event fired when self user is disconnect from the room.
   * @event room:leave
   * @for Room
   * @since 0.6.0
   */
  leave: function (com, data, listener) {
    if (typeof com.onleave === 'function') {
      com.onleave();
    }
  },

  /**
   * Event fired when self user is kicked out from the room.
   * @event room:kick
   * @for Room
   * @since 0.6.0
   */
  kick: function (com, data, listener) {
    if (typeof com.onkick === 'function') {
      com.onkick({
        message: data.info,
        reason: data.reason
      });

      com.leave();
    }
  },

  /**
   * Event fired when self user is warned regarding an action.
   * @event room:warn
   * @for Room
   * @since 0.6.0
   */
  warn: function (com, data, listener) {
    if (typeof com.onwarn === 'function') {
      com.onwarn({
        message: data.info,
        reason: data.reason
      });
    }
  }
};
var RoomHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Messaging events
  if (event.indexOf('message:') === 0) {
    
    fn.applyHandler(RoomEventMessageHandler, params, [com, data, listener]);
  
    log.debug('Room', 'Received message event =>', event, data);
  
  } else {
    // Class events
    if (event.indexOf('room:') === 0) {
      data.name = com.name;

      fn.applyHandler(RoomEventResponseHandler, params, [com, data, listener]);
      
      log.debug('Room', 'Responding with event =>', event, data);

    } else {
      data.roomName = com.name;

      fn.applyHandler(RoomEventReceivedHandler, params, [com, data, listener]);
    
      log.debug('Room', 'Received sub-class event =>', event, data);
    }
  
    listener(event, data);
  }
};
function Self (config, listener) {
  // Reference of instance
  var com = this;

  /**
   * The self user id.
   * @attribute id
   * @type String
   * @private
   * @required
   * @for Self
   * @since 0.6.0
   */
  com.id = null;

  /**
   * The self user data.
   * @attribute data
   * @type String | JSON
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.data = config.data;

  /**
   * The self user username.
   * @attribute username
   * @type String
   * @private
   * @required
   * @for Self
   * @since 0.6.0
   */
  com.username = config.username;

  /**
   * The self user timestamp (ISO format).
   * @attribute timeStamp
   * @type String
   * @private
   * @required
   * @for Self
   * @since 0.6.0
   */
  com.timeStamp = config.timeStamp;

  /**
   * The self user credential.
   * @attribute token
   * @type String
   * @private
   * @required
   * @for Self
   * @since 0.6.0
   */
  com.token = config.token;

  /**
   * The self user local stream connection.
   * @attribute streamConnections
   * @param {Stream} (#peerId) The stream to send for this shared peer connection id.
   * @type JSON
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.streamConnections = {};

  /**
   * The self user browser agent information.
   * @attribute agent
   * @param {String} name The user's browser agent name. For other SDKs, it's indicated
   *    by their type of device <code>E.g. ios, android</code>. For components, it's indicated
   *    by their type <code>E.g. MCU, Recording</code>.
   * @param {Integer} version The user's browser agent version. For other SDKs, it's indicated
   *    by their version of device OS <code>ios8 = 8. android kitkat = 4.4</code>. For components, it's indicated
   *    by their version <code>E.g. 0.1.0, 0.2.0</code>.
   * @param {String} webRTCType The user's browser agent webrtc implementation type. For other SDKs or
   *    components, use <code>other</code>.
   * @type JSON
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.agent = {
    name: window.webrtcDetectedBrowser,
    version: window.webrtcDetectedVersion,
    webRTCType: window.webrtcDetectedType
  };

  /**
   * The self user bandwidth configuration. This does fixes
   *   the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @attribute bandwidth
   * @param {Integer} [audio] The audio bandwidth configuration.
   * @param {Integer} [video] The video bandwidth configuration.
   * @param {Integer} [data] The data bandwidth configuration.
   * @type JSON
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.bandwidth = {};

  /**
   * The handler handles received events.
   * @method routeEvent
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.routeEvent = function (event, data) {
    var params = event.split(':');

    data = data || {};
    data.roomName = com.name;

    fn.applyHandler(SelfEventReceivedHandler, params, [com, data, listener]);

    listener(event, data);

    log.debug('Self: Received event = ', event, data);
  };

  /**
   * The handler handles received socket message events.
   * @method routeMessage
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.routeMessage = function (message) {
    // Messaging events
    var fn = SelfEventMessageHandler[message.type];

    if (typeof fn === 'function') {
      fn(com, message, listener);
    }

    log.debug('Self: Received message = ', event, message);
  };

  /**
   * The handler handles response events.
   * @method respond
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.respond = function (event, data) {
    var params = event.split(':');

    data = data || {};
    data.name = com.name;

    fn.applyHandler(SelfEventResponseHandler, params, [com, data, listener]);

    listener(event, data);

    log.debug('Self: Responding with event = ', event, data);
  };

  /**
   * Function to subscribe to when self user object is ready to use.
   * @method onready
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.onready = function () {};

  /**
   * Function to subscribe to when self user custom user is connected to room.
   * @method onconnect
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.onconnect = function () {};

  /**
   * Function to subscribe to when self user custom user data is updated.
   * @method onupdate
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.onupdate = function () {};

  /**
   * Function to subscribe to when self has added a stream connection.
   * @method onaddstreamconnection
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.onaddstreamconnection = function () {};

  /**
   * Function to subscribe to when self has stopped a stream connection.
   * @method onremovestreamconnection
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.onremovestreamconnection = function () {};

  /**
   * Function to subscribe to when self has been disconnected from the room.
   * @method ondisconnect
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.ondisconnect = function () {};


  /**
   * Updates the self user data.
   * @method update
   * @for Self
   * @since 0.6.0
   */
  com.update = function (data) {
    com.data = data;

    com.respond('self:update', {
      userData: com.data
    });
  };

  /**
   * Starts a new stream connection.
   * @method addStreamConnection
   * @param {Stream} stream The stream object.
   * @param {String} peerId The shared peer connection id.
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.addStreamConnection = function (stream, peerId) {
    stream.sourceType = 'local';

    stream.routeEventToParent = com.routeEvent;

    com.streamConnections[peerId] = stream;

    com.respond('self:addstreamconnection', {
      peerId: peerId,
      stream: stream
    });
  };

  /**
   * Finds the shared peer connection id from the stream id provided.
   * @method addStreamConnection
   * @param {Stream} stream The stream object.
   * @param {String} peerId The shared peer connection id.
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.findStreamConnectionId = function (streamId) {
    var key;

    for (key in com.streamConnections) {
      if (com.streamConnections.hasOwnProperty(key)) {
        // If matches
        if (com.streamConnections[key].id === streamId) {
          return key;
        }
      }
    }
  };

  /**
   * Stops a stream connection.
   * @method removeStreamConnection
   * @param {String} [peerId] The shared peer connection id. If no
   *    shared peer connection id is provided, it will destroy all streams.
   *    Providing the <code>"main"</code> peer connection id will also result in
   *    destroying all streams.
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.removeStreamConnection = function (peerId) {
    if (fn.isEmpty(peerId) || peerId === 'main') {
      var key;

      for (key in com.streamConnections) {
        if (com.streamConnections.hasOwnProperty(key)) {
          com.streamConnections[key].stop();
        }
      }

    } else {
      var stream = com.streamConnections[peerId];

      if (typeof stream === 'object' ? stream instanceof Stream : false) {
        stream.stop();

      } else {
        log.error('Unable to remove stream connection as there is not existing ' +
          'stream connection to the peer connection', peerId);
      }
    }
  };

  /**
   * Gets the self user info.
   * @method getInfo
   * @param {String} [peerId] The shared peer connection id.
   *   If no shared peer connection id is provided, it will return as
   *   <code>"stream"</code> instead of <code>"streams".(#peerId)</code>.
   * @returns {JSON} The self user streaming configuration and custom data.
   * - <code>userData</code> <var>: <b>type</b> String | JSON</var><br>
   *   The custom data.
   * - <code>agent</code> <var>: <b>type</b> JSON</var><br>
   *   The user's browser agent information.
   * - <code>agent.name</code> <var>: <b>type</b> String</var><br>
   *   The user's browser agent name.
   * - <code>agent.version</code> <var>: <b>type</b> Integer</var><br>
   *   The user's browser agent version.
   * - <code>agent.webRTCType</code> <var>: <b>type</b> String</var><br>
   *   The user's browser webrtc implementation type.
   * - <code>streams</code> <var>: <b>type</b> JSON</var><br>
   *   The list of peer connections streaming.
   * - <code>streams.(#peerId)</code> <var>: <b>type</b> JSON</var><br>
   *   The peer connection streaming information.
   * - <code>streams.(#peerId).audio</code> <var>: <b>type</b> JSON|Boolean</var><br>
   *   The audio streaming information. If there is no stream connection with the peer,
   *   it's <code>false</code>.
   * - <code>streams.(#peerId).audio.stereo</code> <var>: <b>type</b> Boolean</var><br>
   *   The flag that indicates if stereo is enabled for this connection. By default,
   *   it's <code>false</code>.
   * - <code>streams.(#peerId).audio.sourceId</code> <var>: <b>type</b> String</var><br>
   *   The audio MediaStreamTrack source used for this connection.
   * - <code>streams.(#peerId).video</code> <var>: <b>type</b> JSON|Boolean</var><br>
   *   The video streaming information. If there is no stream connection with the peer,
   *   it's <code>false</code>.
   * - <code>streams.(#peerId).video.resolution</code> <var>: <b>type</b> JSON</var><br>
   *   The video stream resolution.
   * - <code>streams.(#peerId).video.resolution.width</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution height.
   * - <code>streams.(#peerId).video.resolution.height</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution width.
   * - <code>streams.(#peerId).video.frameRate</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution framerate.
   * - <code>streams.(#peerId).video.sourceId</code> <var>: <b>type</b> String</var><br>
   *   The video MediaStreamTrack source used for this connection.
   * - <code>streams.(#peerId).status</code> <var>: <b>type</b> JSON</var><br>
   *   The MediaStreamTracks enabled status (muted/unmuted).
   * - <code>streams.(#peerId).status.audioMuted</code> <var>: <b>type</b> Boolean</var><br>
   *   The audio MediaStreamTrack enabled status (muted/unmuted).
   * - <code>streams.(#peerId).status.audioMuted</code> <var>: <b>type</b> Boolean</var><br>
   *   The video MediaStreamTrack enabled status (muted/unmuted).
   * - <code>bandwidth</code> <var>: <b>type</b> JSON</var><br>
   *   The bandwidth configuration for the peer connections.
   *   This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * - <code>bandwidth.data</code> <var>: <b>type</b> Integer</var><br>
   *   The bandwidth configuration for data stream.
   * - <code>bandwidth.video</code> <var>: <b>type</b> Integer</var><br>
   *   The bandwidth configuration for video stream.
   * - <code>bandwidth.audio</code> <var>: <b>type</b> Integer</var><br>
   *   The bandwidth configuration for audio stream.
   * @for Self
   * @since 0.6.0
   */
  com.getInfo = function (peerId) {
    var data = {};

    // Pass jshint error
    var getStreamSettingsFn = function (stream) {
      stream = stream || {};

      return stream.config || {
        audio: false,
        video: false,
        status: {
          audioMuted: true,
          videoMuted: true
        }
      };
    };

    data.userData = com.data;
    data.agent = com.agent;
    data.bandwidth = com.bandwidth;

    // Get all stream connections
    if (!fn.isEmpty(peerId)) {
      data.stream = getStreamSettingsFn(com.streamConnections[peerId]);

    // Get that stream connection only
    } else {
      data.streams = {};

      var key;

      for (key in com.streamConnections) {
        if (com.streamConnections.hasOwnProperty(key)) {
          data.streams[key] = getStreamSettingsFn(com.streamConnections[key]);
        }
      }
    }

    return data;
  };

  com.respond('self:ready', config);
}

var SelfEventReceivedHandler = {

  stream: {
    stop: function (com, data, listener) {
      // Trigger the event
      var peerId = com.findStreamConnectionId(data.id);

      com.respond('self:removestreamconnection', {
        streamId: data.id,
        peerId: key
      });
    }
  }
};
var SelfEventResponseHandler = {
  /**
   * Event fired when self object to ready to use.
   *   At this stage, the self user id is empty as user has not joined the room.
   * @event self:ready
   * @for Self
   * @since 0.6.0
   */
  ready: function (com, data, listener) {
    if (typeof com.onready === 'function') {
      com.onready();
    }
  },

  /**
   * Event fired when self has updated data.
   * @event self:update
   * @param {JSON|String} userData The updated self custom data.
   * @for Self
   * @since 0.6.0
   */
  update: function (com, data, listener) {
    if (typeof com.onupdate === 'function') {
      com.onupdate(data);
    }
  },

  /**
   * Event fired when self has added a new stream for connection.
   * @event self:addstreamconnection
   * @for Self
   * @since 0.6.0
   */
  addstreamconnection: function (com, data, listener) {
    if (typeof com.onaddstreamconnection === 'function') {
      com.onaddstreamconnection(data);
    }
  },

  /**
   * Event fired when self has removed a stream connection.
   * @event self:removestreamconnection
   * @for Self
   * @since 0.6.0
   */
  removestreamconnection: function (com, data, listener) {
    delete com.streamConnections[data.peerId];

    if (typeof com.onremovestreamconnection === 'function') {
      com.onremovestreamconnection(data);
    }
  },

  /**
   * Event fired when self user is connected to room.
   * @event self:connect
   * @for Self
   * @since 0.6.0
   */
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect();
    }
  },

  /**
   * Event fired when self user is disconnected from room.
   * @event self:disconnect
   * @for Self
   * @since 0.6.0
   */
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect(data);
    }
  }
};
var SelfHandler = function (com, event, data, listener) {
  var params = event.split(':');
  data = data || {};

  // Messaging events
  if (event.indexOf('message:') === 0) {

    fn.applyHandler(SelfEventMessageHandler, params, [com, data, listener]);

  } else {
    // Class events
    if (event.indexOf('self:') === 0) {
      data.id = com.id;

      fn.applyHandler(SelfEventResponseHandler, params, [com, data, listener]);

    } else {
      data.selfId = com.selfId;

      fn.applyHandler(SelfEventReceivedHandler, params, [com, data, listener]);
    }

    listener(event, data);
  }
};

function Socket(config, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

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
   * The signalling server port that is connecting with.
   * @attribute server
   * @type Integer
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
   * The list of available signalling server ports.
   * @attribute ports
   * @param {Array} http: The list of HTTP ports.
   * @param {Integer} http:.(#index) The port number.
   * @param {Array} https: The list of HTTPS ports.
   * @param {Integer} https:.(#index) The port number.
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
   * The socket configuration passed into the <code>io.socket</code>.
   * @attribute config
   * @param {Boolean} forceNew The flag to indicate if socket.io should
   *   force a new connection everytime.
   * @param {Boolean} [reconnection=false] The flag to indicate if socket.io
   *   should reconnect if connection attempt fails. Reconnection is set to
   *   <code>true</code> only when it's reconnecting the last port of the fallback
   *   XHRPolling connection.
   * @param {Array} transports The transports that are used for the socket.io connection.
   * - <code>['websocket']</code> is used for WebSocket connection.
   * - <code>['xhr-polling', 'jsonp-polling', 'polling']</code> is used for XHRPoling connection.
   * @param {Integer} [timeout] The socket.io timeout to wait for an established connection before
   *   throwing an exception.
   * @type JSON
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.config = {};

  /**
   * The type of socket connection. There are two types:
   * - <code>"WebSocket"</code> indicates a WebSocket connection.
   * - <code>"XHRPolling"</code> indicates a LongPolling connection.
   * @attribute type
   * @type String
   * @default "WebSocket"
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.type = config.type || 'WebSocket';

  /**
   * The socket.io object.
   * @attribute Socket
   * @type Object
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.Socket = null;


  /**
   * Function to subscribe to when socket object is ready to use.
   * @method onready
   * @eventhandler true
   * @for Socket
   * @since 0.6.0
   */
  com.onready = function () {};

  /**
   * Function to subscribe to when socket has been connected.
   * @method onconnect
   * @eventhandler true
   * @for Socket
   * @since 0.6.0
   */
  com.onconnect = function () {};

  /**
   * Function to subscribe to when socket has been disconnected.
   * @method ondisconnect
   * @eventhandler true
   * @for Socket
   * @since 0.6.0
   */
  com.ondisconnect = function () {};

  /**
   * Function to subscribe to when socket has connection error.
   * @method onconnecterror
   * @eventhandler true
   * @for Socket
   * @since 0.6.0
   */
  com.onconnecterror = function () {};

  /**
   * Function to subscribe to when socket attempts to reconnect.
   * @method onreconnect
   * @eventhandler true
   * @for Socket
   * @since 0.6.0
   */
  com.onreconnect = function () {};

  /**
   * Function to subscribe to when socket has an exception.
   * @method onerror
   * @eventhandler true
   * @for Socket
   * @since 0.6.0
   */
  com.onerror = function () {};


  com._handler = function (event, data) {
    SocketHandler(com, event, data, listener);
  };

  /**
   * Starts the connection to the signalling server.
   * @method connect
   * @private
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
   * Stops the connection to the signalling server.
   * @method disconnect
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.disconnect = function () {
    com.Socket.disconnect();
  };

  /**
   * Sends data to the signaling server for relaying.
   * NOTE to Thanh: Please implement the throttle for messaging here.
   * @method send
   * @param {JSON} data The data to send.
   * @private
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
      com.respond('socket:message', {
        message: data,
        sourceType: 'local'
      });
    //}, interval);
  };

  /**
   * Handles the event when socket is connected to signaling.
   * @method bindOnConnect
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.bindOnConnect = function () {
    com.respond('socket:connect');

    com.Socket.removeAllListeners();

    com.Socket.on('disconnect', function () {
      com.respond('socket:disconnect');

      if (typeof com.onerror === 'function') {
        com.ondisconnect();
      }
    });

    com.Socket.on('message', function (result) {
      var data = JSON.parse(result);

      // Check if bulk message
      if (data.type === 'group') {
        log.info('Received a group message. Breaking down messages into individual messages', data);

        var i;

        for (i = 0; i < data.list.length; i++) {
          var message = data.list[i];
          com.respond('socket:message', {
            message: message,
            sourceType: 'remote'
          });
        }

      } else {
        com.respond('socket:message', {
          message: data,
          sourceType: 'remote'
        });
      }
    });

    com.Socket.on('error', function (error) {
      com.respond('socket:error', {
        error: error
      });

      if (typeof com.onerror === 'function') {
        com.onerror(error);
      }
    });

    if (typeof com.onconnect === 'function') {
      com.onconnect();
    }
  };

  /**
   * Handles the event when socket have a connection error.
   * @method bindOnConnectError
   * @param {Object} error The socket.io connection error.
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.bindOnConnectError = function (error) {
    com.respond('socket:connecterror', {
      error: error
    });

    var ports = com.ports[window.location.protocol];
    var i;

    for (i = 0; i < ports.length; i += 1) {
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
   * Restarts the connection to the signaling server when attempt to
   *   establish socket connection failed.
   * @method reconnect
   * @private
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

    com.respond('socket:reconnect');
  };

  /**
   * Creates a WebSocket connection in socket.io.
   * @method WebSocket
   * @private
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

    com.config = options;

    socket.on('connect', com.bindOnConnect);
    socket.on('connect_error', com.bindOnConnectError);

    return socket;
  };

  /**
   * Creates a XHR Long-polling connection in socket.io.
   * @method XHRPolling
   * @private
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

    com.config = options;

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
    com.respond('socket:ready', config);
  });
}

var SocketEventResponseHandler = {

  /**
   * Event fired when the socket object is ready to use.
   * @event socket:ready
   * @for Socket
   * @since 0.6.0
   */
  ready: function (com, data, listener) {
    if (typeof com.onstart === 'function') {
      com.onstart(data);
    }
  },

  /**
   * Event fired when socket occurs an exception during connection.
   * @event socket:error
   * @param {Object} error The getUserMedia or event error.
   * @for Socket
   * @since 0.6.0
   */
  error: function (com, data, listener) {
    if (typeof com.onerror === 'function') {
      com.onerror(data);
    }
  },

  /**
   * Event fired when socket connection has been established to the signaling server.
   * @event socket:connect
   * @param {Object} error The getUserMedia or event error.
   * @for Socket
   * @since 0.6.0
   */
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect(data);
    }
  },

  /**
   * Event fired when socket connection fails to connect to the signaling server.
   * @event socket:connecterror
   * @param {Object} error The getUserMedia or event error.
   * @for Socket
   * @since 0.6.0
   */
  connecterror: function (com, data, listener) {
    if (typeof com.onconnecterror === 'function') {
      com.onconnecterror(data);
    }
  },

  /**
   * Event fired when socket attempts to reconnect with signaling server when attempt
   *  to establish connection fails.
   * @event socket:reconnect
   * @for Socket
   * @since 0.6.0
   */
  reconnect: function (com, data, listener) {
    if (typeof com.onreconnect === 'function') {
      com.onreconnect(data);
    }
  },

  /**
   * Event fired when socket sends a message to the signaling server.
   * @event socket:message
   * @param {String} event The message event type.
   * @param {JSON} data The data received from server.
   * @param {String} sourceType The source type of the message received.
   * @for Socket
   * @since 0.6.0
   */
  message: function (com, data, listener) {},

  /**
   * Event fired when socket connection with signaling server has been disconnected.
   * @event socket:disconnect
   * @for Socket
   * @since 0.6.0
   */
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect(data);
    }
  }
};

var StreamHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  data.server = com.server;
  data.port = com.port;
  data.type = com.type;
  data.protocol = com.protocol;

  fn.applyHandler(StreamEventResponseHandler, params, [com, data, listener]);

  listener(event, data);

  log.debug('Stream', 'Responding with event =>', event, data);
};
function Stream(stream, config, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

  // Reference of instance
  var com = this;

  /* Attributes */
  /**
   * The stream id.
   * @attribute id
   * @type String
   * @for Stream
   * @since 0.6.0
   */
  com.id = null;

  /**
   * The stream label.
   * @attribute label
   * @type String
   * @for Stream
   * @since 0.6.0
   */
  com.label = '';

  /**
   * The getUserMedia constraints.
   * @attribute _constraints
   * @type JSON
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com._constraints = null;

  /**
   * The streaming configuration.
   * @attribute config
   * @type JSON
   * @for Stream
   * @since 0.6.0
   */
  com.config = config;

  /**
   * The stream source origin.
   * There are two types of sources:
   * - <code>"local"</code> indicates that the stream came from self user.
   * - <code>"remote</code> indicates that the stream came from other users.
   * @attribute sourceType
   * @type String
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
  com._MediaStream = null;


  /* Methods */
  /**
   * The handler that the parent classes utilises to listen to events.
   * @method _parentHandler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com._parentHandler = function () {};

  /**
   * The handler that the manages response and received events.
   * @method _handler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com._handler = function (event, data) {
    StreamHandler(com, event, data, listener);

    if (typeof com._parentHandler === 'function') {
      com._parentHandler(event, data);
    }
  };

  /**
   * Binds events to MediaStream object.
   * @method _bind
   * @param {Object} bind The MediaStream object to bind events to.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com._bind = function (bind) {

    com.id = fn.generateUID();

    // Bind events to MediaStream
    // Un-implemented events functions
    // bindStream.onaddtrack = function () { };
    // bindStream.onremovetrack = function () { };

    // For firefox browsers
    StreamPolyfill.checkEnded(bind);

    bind.onended = function (event) {
      com._handler('stream:stop', {});
    };

    com.label = bind.label || 'Stream ' + com.id;

    // Bind track events
    com._bindTracks(bind.getAudioTracks(), bind);
    com._bindTracks(bind.getVideoTracks(), bind);

    com._MediaStream = bind;

    com._handler('stream:start', {});
  };

  /**
   * Binds track events to all MediaStreamTrack objects of the MediaStream object.
   * @method _bindTracks
   * @param {Array} bindTracks The list of MediaStreamTrack objects.
   * @param {Object} bindTracks.(#index) The MediaStreamTrack object to bind events to.
   * @param {Object} bind The MediaStream object to bind events to.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com._bindTracks = function (bindTracks, bind) {
    var i;

    // Passing jshint (Don't make functions within a loop)
    var onended = function (track) {
      return function () {
        com._handler('stream:track:stop', {
          track: track
        });
      };
    };

    var onmute = function (track) {
      return function () {
        com._handler('stream:track:mute', {
          track: track
        });
      };
    };

    var onunmute = function (track) {
      return function () {
        com._handler('stream:track:unmute', {
          track: track
        });
      };
    };

    for (i = 0; i < bindTracks.length; i += 1) {
      var track = bindTracks[i];

      var trackData = {
        id: track.id || fn.generateUID(),
        kind: track.kind,
        label: track.label,
        facing: track.facing
      };

      // Bind events to MediaStreamTrack
      // Un-implemented events functions
      // track.onstarted = function () { };
      // track.onoverconstrained = function(event) {};

      // Bind events first
      track.onended = onended(trackData);
      track.onmute = onmute(trackData);
      track.onunmute = onunmute(trackData);

      // Fallback for Safari / IE browsers. Events must be BINDED first.
      StreamPolyfill.track.checkEnded(track, bind);
      StreamPolyfill.track.checkMute(track, bind);
      StreamPolyfill.track.checkUnmute(track, bind);

      // Set the mute status
      var isEnabled = true;

      if (track.kind === 'audio') {
        isEnabled = (typeof com.config.audio === 'object') ?
          !!!com.config.audio.mute : !!com.config.audio;
      } else {
        isEnabled = (typeof com.config.video === 'object') ?
          !!!com.config.video.mute : !!com.config.video;
      }

      track.enabled = isEnabled;

      window.track = track;

      com._handler('stream:track:start', {
        track: track
      });
    }
  };

  /**
   * Attaches the MediaStream object to a video element.
   * @method attachElement
   * @param {DOM} element The video DOM element to bind the MediaStream to.
   * @for Stream
   * @since 0.6.0
   */
  com.attachElement = function (element) {
    StreamPolyfill.attachMediaStream(element, com._MediaStream);
  };

  /**
   * Stops MediaStream object streaming.
   * This is only available for LocalMediaStreams.
   * @method stop
   * @for Stream
   * @since 0.6.0
   */
  com.stop = function () {
    // Stop MediaStream
    StreamPolyfill.stop(com._MediaStream);
  };

  /**
   * Stops all audio MediaStreamTracks streaming in the MediaStream object.
   * This is only available for LocalMediaStreams.
   * @method stopAudio
   * @support Firefox, Chrome, Opera
   * @for Stream
   * @since 0.6.0
   */
  com.stopAudio = function () {
    if (com.config.audio === false) {
      log.warn('There is no available audio tracks to stop');
      return;
    }

    var tracks = com._MediaStream.getAudioTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      StreamPolyfill.track.stop(track);
    }
  };

  /**
   * Stops all video MediaStreamTracks streaming of the MediaStream object.
   * This is only available for LocalMediaStreams.
   * @method stopVideo
   * @support Firefox, Chrome, Opera
   * @for Stream
   * @since 0.6.0
   */
  com.stopVideo = function () {
    if (com.config.video === false) {
      log.warn('There is no available video tracks to stop');
      return;
    }

    var tracks = com._MediaStream.getVideoTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      StreamPolyfill.track.stop(track);
    }
  };

  /**
   * Mutes all audio MediaStreamTracks of the MediaStream object.
   * This is only available for LocalMediaStreams.
   * @method muteAudio
   * @for Stream
   * @since 0.6.0
   */
  com.muteAudio = function () {
    if (com.config.audio === false) {
      log.warn('There is no available audio tracks to mute');
      return;
    }

    var tracks = com._MediaStream.getAudioTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      StreamPolyfill.track.mute(track, com._MediaStream.id);
    }
  };

  /**
   * Mutes all video MediaStreamTracks of the MediaStream object.
   * This is only available for LocalMediaStreams.
   * @method muteVideo
   * @for Stream
   * @since 0.6.0
   */
  com.muteVideo = function () {
    if (com.config.video === false) {
      log.warn('There is no available video tracks to mute');
      return;
    }

    var tracks = com._MediaStream.getVideoTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      StreamPolyfill.track.mute(track, com._MediaStream.id);
    }
  };


  /**
   * Unmutes all audio MediaStreamTracks of the MediaStream object.
   * This is only available for LocalMediaStreams.
   * @method unmuteAudio
   * @for Stream
   * @since 0.6.0
   */
  com.unmuteAudio = function () {
    if (com.config.audio === false) {
      log.warn('There is no available audio tracks to unmute');
      return;
    }

    var tracks = com._MediaStream.getAudioTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      StreamPolyfill.track.unmute(track, com._MediaStream.id);
    }
  };

  /**
   * Unmutes all video MediaStreamTracks of the MediaStream object.
   * This is only available for LocalMediaStreams.
   * @method unmuteVideo
   * @for Stream
   * @since 0.6.0
   */
  com.unmuteVideo = function () {
    if (com.config.video === false) {
      log.warn('There is no available video tracks to unmute');
      return;
    }

    var tracks = com._MediaStream.getVideoTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      StreamPolyfill.track.unmute(track, com._MediaStream.id);
    }
  };


  /* Event Handlers */
  /**
   * Function to subscribe to when stream object is ready to use.
   * @method onstart
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.onstart = function () {};

  /**
   * Function to subscribe to when getUserMedia throws an exception or event has error.
   * @method onerror
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.onerror = function () {};

  /**
   * Function to subscribe to when MediaStreamTrack of the MediaStream object has started.
   * @method ontrackstart
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackstart = function () {};

  /**
   * Function to subscribe to when MediaStreamTrack of the MediaStream object has stopped.
   * @method ontrackstop
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackstop = function () {};

  /**
   * Function to subscribe to when MediaStreamTrack of the MediaStream object has been disabled (muted).
   * @method ontrackmute
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackmute = function () {};

  /**
   * Function to subscribe to when MediaStreamTrack of the MediaStream object has been enabled (unmuted).
   * @method ontrackunmute
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackunmute = function () {};

  /**
   * Function to subscribe to when MediaStream object has ended.
   * @method onstop
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.onstop = function () {};


  /* Beginning Logic */
  // Throw an error if adapterjs is not loaded
  if (!window.attachMediaStream) {
    throw new Error('Required dependency adapterjs not found');
  }

  // Bind or start MediaStream
  if (fn.isEmpty(stream)) {
    var audioSettings = StreamParser.parseAudioConfig(config.audio);
    var videoSettings = StreamParser.parseVideoConfig(config.video);

    com._constraints = {
      audio: audioSettings.userMedia,
      video: videoSettings.userMedia
    };

    com.config = {
      audio: audioSettings.settings,
      video: audioSettings.settings
    };

    // Get user media
    window.getUserMedia(com._constraints, com._bind, function (error) {
      com._handler('stream:error', {
        error: error,
        sourceType: com.sourceType
      });
    });

  } else {
    // Allow javascript to return object before code execution
    fn.runSync(function () {
      com.config = {
        audio: fn.isSafe(function () {
          return stream.getAudioTracks().length > 0;
        }),
        video: fn.isSafe(function () {
          return stream.getVideoTracks().length > 0;
        })
      };
      com._bind(stream);
    });
  }
}
var StreamEventResponseHandler = {

  /* Stream events */
  /**
   * Event fired when the MediaStream has started and that the stream object is ready to use.
   * @event stream:start
   * @for Stream
   * @since 0.6.0
   */
  start: function (com, data, listener) {
    if (typeof com.onstart === 'function') {
      com.onstart(data.MediaStream);
    }
  },

  /**
   * Event fired when usually getUserMedia fails or an exception has occurred during the
   *   MediaStream object handling.
   * @event stream:error
   * @param {Object} error The getUserMedia or event error.
   * @for Stream
   * @since 0.6.0
   */
  error: function (com, data, listener) {
    if (typeof com.onerror === 'function') {
      com.onerror(data);
    }
  },

  /**
   * Event fired when the MediaStream object has stopped.
   * @event stream:stop
   * @for Stream
   * @since 0.6.0
   */
  stop: function (com, data, listener) {
    if (typeof com.onstop === 'function') {
      com.onstop(data);
    }
  },

  /* StreamTrack events */
  track: {

    /**
     * Event fired when the MediaStreamTrack of the MediaStream object has started and
     *   that the track is ready to use.
     * @event stream:track:start
     * @for Stream
     * @since 0.6.0
     */
    start: function (com, data, listener) {
      if (typeof com.ontrackstart === 'function') {
        com.ontrackstart(data);
      }
    },

    /**
     * Event fired when the MediaStreamTrack of the MediaStream object has stopped.
     * @event stream:track:stop
     * @for Stream
     * @since 0.6.0
     */
    stop: function (com, data, listener) {
      if (typeof com.ontrackstop === 'function') {
        com.ontrackstop(data);
      }
    },

    /**
     * Event fired when the MediaStreamTrack of the MediaStream object has been disabled (muted).
     * @event stream:track:mute
     * @for Stream
     * @since 0.6.0
     */
    mute: function (com, data, listener) {
      if (typeof com.ontrackmute === 'function') {
        com.ontrackmute(data);
      }
    },

    /**
     * Event fired when the MediaStreamTrack of the MediaStream object has been enabled (unmuted).
     * @event stream:track:unmute
     * @for Stream
     * @since 0.6.0
     */
    unmute: function (com, data, listener) {
      if (typeof com.ontrackunmute === 'function') {
        com.ontrackunmute(data);
      }
    },
  }

};
var StreamHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  data.id = com.id;
  data.label = com.label;

  fn.applyHandler(StreamEventResponseHandler, params, [com, data, listener]);

  listener(event, data);

  log.debug('Stream', 'Responding with event', event, data);
};
var StreamParser = {
  /**
   * Stores the default stream and bandwidth settings.
   * @attribute StreamParser.defaultConfig
   * @type JSON
   * @param {JSON} audio The default audio streaming configuraiton.
   * @param {Boolean} audio.stereo The default flag to indicate if stereo is enabled.
   * @param {JSON} video The default video streaming configuraiton.
   * @param {JSON} video.resolution The default video resolution.
   * @param {Integer} video.resolution.width The default video resolution width.
   * @param {Integer} video.resolution.height The default video resolution height.
   * @param {Integer} video.frameRate The default video maximum framerate.
   * @param {JSON} bandwidth The default bandwidth streaming settings.
   * @param {Integer} bandwidth.audio The default audio bandwidth bitrate.
   * @param {Integer} bandwidth.video The default video bandwidth bitrate.
   * @param {Integer} bandwidth.data The default DataChannel data bandwidth bitrate.
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
   * Parses the audio configuration for the stream configuration and getUserMedia constraints.
   * @method StreamParser.parseAudioConfig
   * @param {JSON|Boolean} options The audio settings or flag if audio is enabled.
   * @param {Boolean} options.stereo The flag to indicate if stereo is enabled.
   * @param {String} options.sourceId The source id of the audio MediaStreamTrack.
   * @return {JSON} Returns the output parsed audio configuration.
   * - <code>settings</code> <var>: <b>type</b> JSON|Boolean</var><br>
   *   The audio stream configuration.
   * - <code>settings.stereo</code> <var>: <b>type</b> Boolean</var><br>
   *   The flag that indicates if stereo is enabled for this streaming.
   * - <code>settings.sourceId</code> <var>: <b>type</b> JSON</var><br>
   *   The audio stream source id.
   * - <code>userMedia</code> <var>: <b>type</b> Boolean|JSON</var><br>
   *   The audio stream getUserMedia constraints.
   * - <code>userMedia.optional</code> <var>: <b>type</b> Array</var><br>
   *   The audio stream optional configuration.
   * - <code>settings.optional.(#index)</code> <var>: <b>type</b> JSON</var><br>
   *   The audio stream optional configuration item.
   * - <code>settings.optional.(#index).sourceId</code> <var>: <b>type</b> String</var><br>
   *   The audio stream source id.
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
      tempOptions.sourceId = options.sourceId || null;
      tempOptions.mute = typeof options.mute === 'boolean' ? options.mute : false;

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
   * Parses the video configuration for the stream configuration and getUserMedia constraints.
   * @method StreamParser.parseVideoConfig
   * @param {JSON|Boolean} options The video settings.
   * @param {JSON} options.resolution The video resolution.
   * @param {Integer} options.resolution.width The video resolution width.
   * @param {Integer} options.resolution.height The video resolution height.
   * @param {Integer} options.frameRate The video maximum framerate.
   * @param {String} options.sourceId The source id of the video MediaStreamTrack.
   * @return {JSON} Returns the output parsed video configuration.
   * - <code>settings</code> <var>: <b>type</b> JSON|Boolean</var><br>
   *   The video stream configuration.
   * - <code>settings.resolution</code> <var>: <b>type</b> Boolean</var><br>
   *   The video stream resolution.
   * - <code>settings.resolution.width</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution width.
   * - <code>settings.resolution.height</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution height.
   * - <code>settings.resolution.frameRate</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution maximum framerate.
   * - <code>settings.sourceId</code> <var>: <b>type</b> JSON</var><br>
   *   The video stream source id.
   * - <code>userMedia</code> <var>: <b>type</b> Boolean|JSON</var><br>
   *   The video stream getUserMedia constraints.
   * - <code>userMedia.mandatory</code> <var>: <b>type</b> JSON</var><br>
   *   The video stream mandatory configuration.
   * - <code>userMedia.mandatory.maxWidth</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream maximum width resolution.
   * - <code>userMedia.mandatory.maxHeight</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream maximum height resolution.
   * - <code>userMedia.mandatory.maxFrameRate</code> <var>: <b>type</b> Array</var><br>
   *   The video stream maximum framerate. Not supported in current Plugin browsers.
   * - <code>userMedia.optional</code> <var>: <b>type</b> Array</var><br>
   *   The video stream optional configuration.
   * - <code>settings.optional.(#index)</code> <var>: <b>type</b> JSON</var><br>
   *   The video stream optional configuration item.
   * - <code>settings.optional.(#index).sourceId</code> <var>: <b>type</b> String</var><br>
   *   The video stream source id.
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
      tempOptions.sourceId = options.sourceId || null;

      // set the mute options
      tempOptions.mute = typeof options.mute === 'boolean' ? options.mute : false;

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
   * In low-bandwidth environment, it's mostly managed by the browser.
   * However, this option enables you to set low bandwidth for high-bandwidth
   *   environment whichever way is possible.
   * @property StreamParser.parseBandwidthConfig
   * @param {JSON} options The bandwidth streaming settings.
   * @param {Integer} options.audio The audio bandwidth bitrate.
   * @param {Integer} options.video The video bandwidth bitrate.
   * @param {Integer} options.data The DataChannel data bandwidth bitrate.
   * @return {JSON} Returns the output parsed bandwidth configuration.
   * - <code>video</code> <var>: <b>type</b> Integer</var><br>
   *   The video bandwidth configuration (bitrate).
   * - <code>audio</code> <var>: <b>type</b> Integer</var><br>
   *   The audio bandwidth configuration (bitrate).
   * - <code>data</code> <var>: <b>type</b> Integer</var><br>
   *   The data bandwidth configuration (bitrate).
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
var StreamPolyfill = {

  /* MediaStream polyfills */
  /**
   * Handles the polyfill stop() function for MediaStream to trigger un-implemented
   *   MediaStream.onended in Firefox.
   * @method StreamPolyfill.stop
   * @param {Object} bind The MediaStream object.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  stop: function (bind) {
    // End MediaStreamTracks as well for non-Webkit browsers
    if (window.webrtcDetectedType !== 'webkit') {
      var audioTracks = bind.getAudioTracks();
      var videoTracks = bind.getVideoTracks();

      var i, j;
      var track = null;
      var fn = function () {};

      for (i = 0; i < audioTracks.length; i += 1) {
        track = audioTracks[i];

        if (window.webrtcDetectedBrowser === 'firefox') {
          this.track.stop(track);

        // Polyfill temporarily for Safari / IE plugin-enabled browsers to trigger onended event
        } else {
          fn = this.track.getFn(track, bind.id, 'onended');
          fn(track);
        }
      }

      for (j = 0; j < videoTracks.length; j += 1) {
        track = videoTracks[j];

        if (window.webrtcDetectedBrowser === 'firefox') {
          this.track.stop(track);

        // Polyfill temporarily for Safari / IE plugin-enabled browsers to trigger onended event
        } else {
          fn = this.track.getFn(track, bind.id, 'onended');
          fn(track);
        }
      }
    }

    // Allow users to use polystop to polyfill stop and onended for MediaStreamTrack
    if (window.webrtcDetectedBrowser === 'firefox' ? bind instanceof LocalMediaStream : true) {
      bind.stop();
    }

    if (window.webrtcDetectedType === 'safari' || window.webrtcDetectedBrowser === 'IE') {
      delete this.track.fns[bind.id];
    }

    if (window.webrtcDetectedBrowser === 'firefox') {
      bind.ended = true;
    }
  },

  /**
   * Handles the un-implemented MediaStream.onended events. Use this to set a checker
   *   for Firefox MediaStreams when ended. It will trigger onended when stream has ended.
   * @method StreamPolyfill.checkEnded
   * @param {Object} bind The MediaStream object.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  checkEnded: function (bind) {
    // Firefox browsers
    if (window.webrtcDetectedBrowser === 'firefox') {

      // Check if tracks have all ended
      bind.checkTracksEnded = setInterval(function () {
        var i, j;

        var audios = bind.getAudioTracks();
        var videos = bind.getVideoTracks();

        var audioEnded = true;
        var videoEnded = true;

        // Check for all tracks if ended
        for (i = 0; i < audios.length; i += 1) {
          if (audios[i].ended !== true) {
            audioEnded = false;
            break;
          }
        }

        for (i = 0; i < videos.length; i += 1) {
          if (videos[i].ended !== true) {
            videoEnded = false;
            break;
          }
        }

        if (audioEnded && videoEnded) {
          clearInterval(bind.checkTracksEnded);
          bind.ended = true;
        }

      }, 1000);

      // LocalMediaStream
      if (bind.constructor === LocalMediaStream) {
        bind.checkEnded = setInterval(function () {
          // If stream has flag ended because of media tracks being stopped
          if (bind.ended) {
            clearInterval(bind.checkEnded);

            // trigger that it has ended
            if (typeof bind.onended === 'function') {
              bind.onended(bind);
            }
          }

          if (typeof bind.recordedTime === 'undefined') {
            bind.recordedTime = 0;
          }

          if (bind.recordedTime === bind.currentTime) {
            clearInterval(bind.checkEnded);

            bind.ended = true;

            // trigger that it has ended
            if (typeof bind.onended === 'function') {
              bind.onended(bind);
            }

          } else {
            bind.recordedTime = bind.currentTime;
          }
        }, 1000);

      // Remote MediaStream
      } else {

        // Use a video to attach to check if stream has ended
        var video = document.createElement('video');

        video.checkEnded = setInterval(function () {
          // If stream has flag ended because of media tracks being stopped
          if (bind.ended) {
            clearInterval(bind.checkEnded);

            // trigger that it has ended
            if (typeof bind.onended === 'function') {
              bind.onended(bind);
            }
          }

          // Check if mozSrcObject is not empty
          if (typeof video.mozSrcObject === 'object' &&
              video.mozSrcObject !== null) {

            if (video.mozSrcObject.ended === true) {
              clearInterval(bind.checkEnded);

              bind.ended = true;

              // trigger that it has ended
              if (typeof bind.onended === 'function') {
                bind.onended(bind);
              }
            }
          }
        }, 1000);

        // Bind the video element to MediaStream object
        bind.checkingVideo = video;

        window.attachMediaStream(video, bind);
      }
    }
  },

  /**
   * Handles the attachMediaStream function due to stop polyfill code
   *   attaching the stream to the video element, hence attachMediaStream
   *   has to be reattachMediaStream.
   * @method StreamPolyfill.attachMediaStream
   * @param {DOM} element The video element object.
   * @param {Object} bind The MediaStream object.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  attachMediaStream: function (element, bind) {
    // Firefox browsers
    if (window.webrtcDetectedBrowser === 'firefox') {
      // If there's an element used for checking stream stop
      // for an instance remote MediaStream for firefox
      // reattachmediastream instead
      if (typeof bind.checkingVideo !== 'undefined' &&
        bind instanceof LocalMediaStream === false) {
        window.reattachMediaStream(element, bind.checkingVideo);

      // LocalMediaStream
      } else {
        window.attachMediaStream(element, bind);
      }

    // Non-firefox browsers
    } else {
      window.attachMediaStream(element, bind);
    }
  },

  /* MediaStreamTrack polyfills */
  track: {
    /**
     * Stores the list of subscription events to prevent over-bloating the MediaStream object
     *   for Safari / IE (plugin-enabled) browsers.
     * @attribute StreamPolyfill.track.fns
     * @type JSON
     * @param {JSON} (#streamId) The stream id of the parent MediaStream.
     * @param {JSON} (#streamId).(#trackId) The track id that holds the functions.
     * @param {Function} [(#streamId).(#trackId).onended] The track's onended function.
     * @param {Function} [(#streamId).(#trackId).onmute] The track's onmute function.
     * @param {Function} [(#streamId).(#trackId).onunmute] The track's onunmute function.
     * @private
     * @support Safari, IE
     * @for Stream
     * @since 0.6.0
     */
    fns: {},

    /**
     * Gets the track.onsomething event subscribed.
     * @method StreamPolyfill.track.getFn
     * @param {Object} bindTrack The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @param {String} fnName The onsomething event name.
     * @param {Function} [fn] The subscription function. If not provided, it
     *   returns the subscription function.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    getFn: function (bindTrack, mediaStreamId, fnName, fn) {
      // Prevent undefined error
      this.fns[mediaStreamId] = this.fns[mediaStreamId] || {
        audio: {},
        video: {}
      };
      this.fns[mediaStreamId][bindTrack.kind] = this.fns[mediaStreamId][bindTrack.kind] || {};
      this.fns[mediaStreamId][bindTrack.kind][bindTrack.id] = this.fns[mediaStreamId][bindTrack.kind][bindTrack.id] || {};

      if (typeof fn === 'function') {
        this.fns[mediaStreamId][bindTrack.kind][bindTrack.id][fnName] = fn || function () {};

      } else {
        return this.fns[mediaStreamId][bindTrack.kind][bindTrack.id][fnName] || function () {};
      }
    },

    /**
     * Handles the polyfill stop() function for MediaStreamTrack to trigger
     *   un-implemented MediaStreamTrack.onended event for Firefox.
     * @method StreamPolyfill.track.stop
     * @param {Object} bind The MediaStreamTrack object.
     * @support Firefox, Chrome, Opera
     * @private
     * @for Stream
     * @since 0.6.0
     */
    stop: function (bind) {

      // Allow users to use polystop to polyfill stop and onended for MediaStreamTrack
      // Tell users that stop() is not implemented in plugin browsers for MediaStreamTrack
      //    due to certain issues with the feature
      if (window.webrtcDetectedBrowser === 'safari' || window.webrtcDetectedBrowser === 'IE') {
        log.warn('StreamPolyfill', window.webrtcDetectedBrowser.toUpperCase() + ' (plugin-enabled) browser ' +
          'does not support MediaStreamTrack.stop() due to issues with the feature');
        return;
      }

      bind.stop();

      // Workaround for firefox as it does not have stop events
      if (window.webrtcDetectedBrowser === 'firefox') {

        if (bind.ended !== true) {
          bind.ended = true;

          if (typeof bind.onended === 'function') {
            bind.onended(bind);
          }
        }
      }
    },

    /**
     * Handles the un-implemented MediaStream.onended events. Use this to set a checker
     *   for plugin-enabled browsers MediaStreams when ended. It will trigger onended when
     *   stream has ended.
     * @method StreamPolyfill.track.checkEnded
     * @param {Object} bind The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    checkEnded: function (bind, mediaStreamId) {
      if (window.webrtcDetectedBrowser === 'safari' ||
        window.webrtcDetectedBrowser === 'IE') {
        this.getFn(bind, mediaStreamId, 'onended', bind.onended);
      }
    },

    /**
     * Handles the un-implemented MediaStream.onmute events. Use this to set a checker
     *   for plugin-enabled browsers MediaStreams when muted. It will trigger onm,ute when
     *   stream has been muted.
     * @method StreamPolyfill.track.checkMute
     * @param {Object} bind The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    checkMute: function (bind, mediaStreamId) {
      if (window.webrtcDetectedBrowser === 'safari' ||
        window.webrtcDetectedBrowser === 'IE') {
        this.getFn(bind, mediaStreamId, 'onmute', bind.onmute);
      }
    },

    /**
     * Handles the un-implemented MediaStream.onunmute events. Use this to set a checker
     *   for plugin-enabled browsers MediaStreams when unmuted. It will trigger onunmuted when
     *   stream has unmuted.
     * @method StreamPolyfill.track.checkUnmute
     * @param {Object} bind The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    checkUnmute: function (bind, mediaStreamId) {
      if (window.webrtcDetectedBrowser === 'safari' ||
        window.webrtcDetectedBrowser === 'IE') {
        this.getFn(bind, mediaStreamId, 'onunmute', bind.onunmute);
      }
    },

    /**
     * Handles the polyfill muted attribute and sets it to <code>true</code> for
     *   MediaStreamTrack to trigger un-implemented MediaStreamTrack.onmute event.
     * This uses the enabled attribute and sets it to <code>false</code>.
     * @method StreamPolyfill.track.mute
     * @param {Object} bind The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    mute: function (bind, mediaStreamId) {

      // Allow users to use polymute to polyfill muted = true and onmute for MediaStreamTrack
      bind.enabled = false;
      bind.muted = true;

      // Workaround for Safari / IE users
      if (window.webrtcDetectedBrowser === 'safari' || window.webrtcDetectedBrowser === 'IE') {
        var fn = this.getFn(bind, mediaStreamId, 'onmute');
        fn(bind);

      } else {
        if (typeof bind.onmute === 'function') {
          bind.onmute(bind);
        }
      }
    },

    /**
     * Handles the polyfill muted attribute and sets it to <code>false</code> for
     *   MediaStreamTrack to trigger un-implemented MediaStreamTrack.onunmute event.
     * This uses the enabled attribute and sets it to <code>true</code>.
     * @method StreamPolyfill.track.unmute
     * @param {Object} bind The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    unmute: function (bind, mediaStreamId) {

      // Allow users to use polyunmute to polyfill muted = false and onunmute for MediaStreamTrack
      bind.enabled = true;
      bind.muted = false;

      // Workaround for Safari / IE users
      if (window.webrtcDetectedBrowser === 'safari' || window.webrtcDetectedBrowser === 'IE') {
        var fn = this.getFn(bind, mediaStreamId, 'onunmute');
        fn(bind);

      } else {
        if (typeof bind.onunmute === 'function') {
          bind.onunmute(bind);
        }
      }
    }

  }
};
var StreamGetSources = function (defer) {
  // Firefox does not support MediaStreamTrack.getSources yet
  // Chrome / Plugin / Opera supports MediaStreamTrack.getSources
  if (window.webrtcDetectedBrowser !== 'firefox') {
    var audioList = [];
    var videoList = [];

    // Retrieve list
    MediaStreamTrack.getSources(function (trackList) {
      var i;

      for (i = 0; i < trackList.length; i += 1) {
        var track = trackList[i];
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
          audioList.push(data);
        } else {
          videoList.push(data);
        }
      }

      defer({
        audio: audioList,
        video: videoList
      });
    });
  }
};
function User (config, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

  // Reference of instance
  var com = this;

  /* Attributes */
  /**
   * The user id.
   * @attribute id
   * @type String
   * @readOnly
   * @for User
   * @since 0.6.0
   */
  com.id = config.id;

  /**
   * The user type.
   * @attribute type
   * @type String
   * @default "user"
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
  com.data = config.data || {};

  /**
   * Stores the browser agent information.
   * @attribute agent
   * @param {String} name The browser agent name.
   * @param {Integer} version The browser agent version.
   * @param {String} webRTCType The browser agent WebRTC type of implementation.
   * @type JSON
   * @for User
   * @since 0.6.0
   */
  com.agent = config.agent || {};

  /**
   * Stores the user's bandwidth configuration.
   * @attribute bandwidth
   * @param {Integer} audio The bandwidth audio configuration.
   * @param {Integer} data The bandwidth data configuration.
   * @param {Integer} video The bandwidth video configuration.
   * @type JSON
   * @private
   * @for User
   * @since 0.6.0
   */
  com.bandwidth = config.bandwidth || {};

  /**
   * Stores the list of peer connections to user.
   * @attribute peers
   * @type JSON
   * @private
   * @for User
   * @since 0.6.0
   */
  com.peers = {};


  /* Methods */
  /**
   * The handler that the manages response and received events.
   * @method _handler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com._handler = function (event, data) {
    UserHandler(com, event, data, listener);
  };

  /**
   * Starts a new peer connection to user.
   * @method addConnection
   * @param {JSON} data The shared peer connection streaming configuration.
   * @param {JSON} data.prid The shared peer connection id.
   * @param {Array} data.iceServers The ICE servers the connection should use.
   * @param {JSON} data.stream The streamming configuration for the shared peer connection.
   * @param {JSON|Boolean} [data.stream.audio=false] The audio stream configuration.
   *    If parsed as a boolean, other configuration settings under the audio
   *    configuration would be set as the default setting in the connection.
   * @param {Boolean} [data.stream.audio.stereo=false] The flag that indiciates
   *    if stereo is enabled for this connection.
   * @param {String} [data.stream.audio.sourceId] The source id of the audio MediaStreamTrack
     *    used for this connection.
   * @param {String|Boolean} [data.stream.video=false] The video stream configuration.
   *    If parsed as a boolean, other configuration settings under the video
   *    configuration would be set as the default setting in the connection.
   * @param {JSON} [data.stream.video.resolution] The video streaming resolution.
   * @param {Integer} data.stream.video.resolution.width The video resolution width.
   * @param {Integer} data.stream.video.resolution.height The video resolution height.
   * @param {Integer} data.stream.video.frameRate The video stream framerate.
   * @param {String} [data.stream.video.sourceId] The source id of the video MediaStreamTrack
   *    used for this connection.
   * @param {JSON} data.stream.status The stream MediaStreamTrack status.
   * @param {Boolean} [data.stream.status.audioMuted=false] The flag that indicates if audio is muted.
   *    If audio is set to false, this would be set as true.
   * @param {Boolean} [data.stream.status.videoMuted=false] The flag that indicates if video is muted.
   *    If video is set to false, this would be set as true.
   * @param {JSON} data.bandwidth The bandwidth configuration the peer connections.
   *    This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @param {Integer} [data.bandwidth.audio] The bandwidth configuration for the audio stream.
   * @param {Boolean} [data.bandwidth.video] The bandwidth configuration for the video stream.
   * @param {Boolean} [data.bandwidth.data] The bandwidth configuration for the data stream.
   * @param {String} data.SDPType The session description type that the peer connection would send.
   *    Types are <code>"offer"</code> or <code>"answer"</code>.
   * @param {Stream} [stream] The stream object.
   * @private
   * @for User
   * @since 0.6.0
   */
  com.addConnection = function (data, stream) {
    var peerConfig = {
      id: data.prid,
      iceServers: data.iceServers,
      sdpConfig: {
        bandwidth: data.bandwidth,
        stereo: fn.isSafe(function () {
          return !!data.settings.audio.stereo;
        }),
        SDPType: data.SDPType
      },
      streamingConfig: data.settings
    };

    // Add the main streaming config
    com.streamingConfigs[data.stream.prid] = data.settings;

    var peer = new Peer(peerConfig, com.routeEvent);

    peer.connect(stream);

    com.peers[peer.id] = peer;

    com._handler('user:addconnection', {
      peer: peer,
      peerId: data.prid,
      config: peerConfig
    });
  };

  /**
   * Stops a peer connection to user.
   * @method removeConnection
   * @param {String} peerId The shared peer connection id.
   * @private
   * @for User
   * @since 0.6.0
   */
  com.removeConnection = function (peerId) {
    var peer = com.peers[peerId];

    if (!fn.isEmpty(peer)) {
      peer.disconnect();
    }

    com._handler('user:removeconnection', {
      peerId: peerId
    });
  };

  /**
   * Disconnects this user connection.
   * @method disconnect
   * @private
   * @for User
   * @since 0.6.0
   */
  com.disconnect = function () {
    fn.forEach(com.peers, function (peer, id) {
      peer.disconnect();
    });
  };

  /**
   * Gets this user information.
   * @method getInfo
   * @param {String} [peerId] The shared peer connection id to retrieve
   *    that streaming information only.
   * @returns {JSON} The user streaming configuration and custom data.
   * - <code>userData</code> <var>: <b>type</b> String | JSON</var><br>
   *   The custom data.
   * - <code>agent</code> <var>: <b>type</b> JSON</var><br>
   *   The user's browser agent information.
   * - <code>agent.name</code> <var>: <b>type</b> String</var><br>
   *   The user's browser agent name.
   * - <code>agent.version</code> <var>: <b>type</b> Integer</var><br>
   *   The user's browser agent version.
   * - <code>agent.webRTCType</code> <var>: <b>type</b> String</var><br>
   *   The user's browser webrtc implementation type.
   * - <code>streams</code> <var>: <b>type</b> JSON</var><br>
   *   The list of peer connections streaming.
   * - <code>streams.(#peerId)</code> <var>: <b>type</b> JSON</var><br>
   *   The peer connection streaming information.
   * - <code>streams.(#peerId).audio</code> <var>: <b>type</b> JSON|Boolean</var><br>
   *   The audio streaming information. If there is no stream connection with the peer,
   *   it's <code>false</code>.
   * - <code>streams.(#peerId).audio.stereo</code> <var>: <b>type</b> Boolean</var><br>
   *   The flag that indicates if stereo is enabled for this connection. By default,
   *   it's <code>false</code>.
   * - <code>streams.(#peerId).audio.sourceId</code> <var>: <b>type</b> String</var><br>
   *   The audio MediaStreamTrack source used for this connection.
   * - <code>streams.(#peerId).video</code> <var>: <b>type</b> JSON|Boolean</var><br>
   *   The video streaming information. If there is no stream connection with the peer,
   *   it's <code>false</code>.
   * - <code>streams.(#peerId).video.resolution</code> <var>: <b>type</b> JSON</var><br>
   *   The video stream resolution.
   * - <code>streams.(#peerId).video.resolution.width</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution height.
   * - <code>streams.(#peerId).video.resolution.height</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution width.
   * - <code>streams.(#peerId).video.frameRate</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution framerate.
   * - <code>streams.(#peerId).video.sourceId</code> <var>: <b>type</b> String</var><br>
   *   The video MediaStreamTrack source used for this connection.
   * - <code>streams.(#peerId).status</code> <var>: <b>type</b> JSON</var><br>
   *   The MediaStreamTracks enabled status (muted/unmuted).
   * - <code>streams.(#peerId).status.audioMuted</code> <var>: <b>type</b> Boolean</var><br>
   *   The audio MediaStreamTrack enabled status (muted/unmuted).
   * - <code>streams.(#peerId).status.audioMuted</code> <var>: <b>type</b> Boolean</var><br>
   *   The video MediaStreamTrack enabled status (muted/unmuted).
   * - <code>bandwidth</code> <var>: <b>type</b> JSON</var><br>
   *   The bandwidth configuration for the peer connections.
   *   This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * - <code>bandwidth.data</code> <var>: <b>type</b> Integer</var><br>
   *   The bandwidth configuration for data stream.
   * - <code>bandwidth.video</code> <var>: <b>type</b> Integer</var><br>
   *   The bandwidth configuration for video stream.
   * - <code>bandwidth.audio</code> <var>: <b>type</b> Integer</var><br>
   *   The bandwidth configuration for audio stream.
   * @for User
   * @since 0.6.0
   */
  com.getInfo = function (peerId) {
    var data = {};

    // Pass jshint error
    var getStreamSettingsFn = function (peer) {
      var stream = peer.stream || {};
      return stream.config || {
        audio: false,
        video: false,
        status: {
          audioMuted: true,
          videoMuted: true
        }
      };
    };

    data.userData = com.data;
    data.agent = com.agent;
    data.bandwidth = com.bandwidth;


    // If it's retrieving on peer connection streaming information or not
    if (!fn.isEmpty(peerId)) {
      var onepeer = com.peers[peerId];

      // If the peer connection is empty, throw an exception
      if (!fn.isEmpty(onepeer)) {
        data.stream = getStreamSettingsFn(onepeer);

      } else {
        throw new Error('Peer connection for "' + peerId + '" does not exist');
      }


    } else {
      data.streams = {};

      var key;

      for (key in com.peers) {
        if (com.peers.hasOwnProperty(key)) {
          var peer = com.peers[key];

          var settings = getStreamSettingsFn(peer);

          settings.bandwidth = peer.bandwidth || {};

          data.streams[peer.id] = settings;
        }
      }
    }
    return data;
  };

  /* Event Handlers */
  /**
   * Function to subscribe to when the user object is ready to use.
   * @method onready
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onready = function () {};

  /**
   * Function to subscribe to when user's custom data is updated.
   * @method onupdate
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onupdate = function () {};

  /**
   * Function to subscribe to when user has an established "main" peer connection.
   * @method onconnect
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onconnect = function () {};

  /**
   * Function to subscribe to when user is disconnected from the room.
   * @method ondisconnect
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.ondisconnect = function () {};

  /**
   * Function to subscribe to when a new peer connection is established to user.
   * @method onaddconnection
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onaddconnection = function () {};

  /**
   * Function to subscribe to when a peer connection to user has added.
   * @method onremoveconnection
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onremoveconnection = function () {};

  /**
   * Function to subscribe to when a new data transfer request is initialized from user.
   * @method ondatarequest
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.ondatarequest = function () {};

  /**
   * Function to subscribe to when a new data is received after transfer is completed from user.
   * @method ondata
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.ondata = function () {};

  /**
   * Function to subscribe to when a new message is received from user.
   * @method onmessage
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onmessage = function () {};


  /* Beginning Logic */
  // Run sync so there is time to return the user object before running ready.
  // Example user = new User(). Return and assign to user the user object reference
  //   before running user:ready
  fn.runSync(function () {
    com._handler('user:ready', config);
  });
}
var UserEventMessageHandler = {

  // Add peer connection if peer doesn't exists
  // If exist, exit
  enter: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      return;
    }

    // Adds a peer connection
    com.addConnection({
      id: data.prid,
      iceServers: data.iceServers,
      bandwidth: com.bandwidth,
      stream: data.stream,
      SDPType: 'answer'

    }, data.streamObject);
  },

  // Add peer connection if peer doesn't exists
  // If exist, it could be a weight checking
  // For an instance, when both users receives each other's welcome
  welcome: function (com, data, listener) {
    var peer = com.peers[data.prid];

    // If peer has been created because of duplicate enter,
    // Check which weight received is higher first
    if (!fn.isEmpty(peer)) {
      if (peer.weight < data.weight) {
        return;
      }

      peer.SDPType = 'offer';
      data.type = 'start';

    // New peer
    } else {
      // Adds a peer connection
      com.addConnection({
        id: data.prid,
        iceServers: data.iceServers,
        bandwidth: com.bandwidth,
        stream: data.stream,
        SDPType: 'offer'

      }, data.streamObject);
    }
  },

  // Receives a peer offer, send to the correct peer
  offer: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:offer', data);
    }
  },

  // Receives a peer answer, send to the correct peer
  answer: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:answer', data);
    }
  },

  // Receives an ice candidate, send to the correct peer
  candidate: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:candidate', data);
    }
  },

  // Receives a restart, send to the correct peer
  restart: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:restart', data);
    }
  },

  // Receives an updateUserEvent. Update the user data
  updateUserEvent: function (com, data, listener) {
    com.data = data.data;

    com.handler('user:update', {
      data: data.userData
    });
  },

  // Receives an audio muted event. relay to correct peer
  muteAudioEvent: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:muteAudioEvent', data);
    }
  },

  // Receives an video muted event. relay to correct peer
  muteVideoEvent: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:muteVideoEvent', data);
    }
  }
};

var UserEventReceivedHandler = {

  /* Handles peer events */
  peer: {

    // Peer connection object is created an binded with
    // apprioate rtcevents.
    // Ready to start creating offer
    connect: function (com, data, listener) {
      var peer = com.peers[data.id];

      if (typeof com.onaddconnection === 'function') {
        com.onaddconnection(peer);
      }

      if (peer.SDPType === 'offer') {
        peer.createOffer();
      }
    },

    // Check if peer's ice connection state is connected
    // If connected, user has one connection - meaning connected
    iceconnectionstate: function (com, data, listener) {
      if (data.id === 'main' && data.state === 'connected') {
        com.handler('user:connect', {});
      }
    },

    // Handles the peers that disconnects
    // TODO: If main connection disconnects, it should disconnect the other peers too
    // If no peer connections connected, it should reflect user:disconnect
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

  /* Handles data transfer events */
  transfer: {
    // TODO
    complete: function (com, data, listener) {
      com.handler('user:data', data);
    },

    // TODO
    request: function (com, data, listener) {
      com.handler('user:datarequest', data);
    }
  }

};
var UserEventResponseHandler = {

  /**
   * Event fired when the user object is ready to use.
   * @event user:ready
   * @for User
   * @since 0.6.0
   */
  ready: function (com, data, listener) {
    if (typeof com.onready === 'function') {
      com.onready();
    }
  },

  /**
   * Event fired when the user has an established "main" peer connection.
   * @event user:connect
   * @for User
   * @since 0.6.0
   */
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect();
    }
  },

  /**
   * Event fired when the user has transferred a data successfully.
   * @event user:data
   * @for User
   * @since 0.6.0
   */
  data: function (com, data, listener) {
    if (typeof com.ondata === 'function') {
      com.ondata();
    }
  },

  /**
   * Event fired when the user is initiating a data transfer request.
   * @event user:datarequest
   * @for User
   * @since 0.6.0
   */
  datarequest: function (com, data, listener) {
    if (typeof com.ondatarequest === 'function') {
      com.ondatarequest();
    }
  },

  /**
   * Event fired when the user's custom data has been updated.
   * @event user:data
   * @for User
   * @since 0.6.0
   */
  update: function (com, data, listener) {
    if (typeof com.onupdate === 'function') {
      com.onupdate(data.data);
    }
  },

  /**
   * Event fired when the user has started a peer connection.
   * @event user:addconnection
   * @for User
   * @since 0.6.0
   */
  addconnection: function (com, data, listener) {
    if (typeof com.onaddconnection === 'function') {
      com.onaddconnection();
    }
  },

  /**
   * Event fired when the user has ended a peer connection
   * @event user:removeconnection
   * @for User
   * @since 0.6.0
   */
  removeconnection: function (com, data, listener) {
    if (typeof com.onremoveconnection === 'function') {
      com.onremoveconnection(data.data);
    }
  },

  /**
   * Event fired when the user sends an incoming message.
   * @event user:message
   * @for User
   * @since 0.6.0
   */
  message: function (com, data, listener) {
    if (typeof com.onmessage === 'function') {
      com.onmessage();
    }
  },

  /**
   * Event fired when the user's peer connections has been disconnected.
   * Usually fired when user leaves the room.
   * @event user:disconnect
   * @for User
   * @since 0.6.0
   */
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect();
    }
  }

};
var UserHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Messaging events
  if (event.indexOf('message:') === 0) {

    fn.applyHandler(UserEventMessageHandler, params, [com, data, listener]);

    log.debug('Stream', 'Received message event', event, data);

  } else {
    // Class events
    if (event.indexOf('user:') === 0) {
      data.id = com.id;

      fn.applyHandler(UserEventResponseHandler, params, [com, data, listener]);

      log.debug('Stream', 'Responding with event', event, data);

    } else {
      data.userId = com.id;

      fn.applyHandler(UserEventReceivedHandler, params, [com, data, listener]);

      log.debug('Stream', 'Received sub-class event', event, data);
    }

    listener(event, data);
  }
};