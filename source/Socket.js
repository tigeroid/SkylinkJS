/**
 * Handles the socket.io object connection and events.
 * @class Socket
 * @constructor
 * @param {JSON} config The socket connection configuration.
 * @param {String} config.server The socket signaling server.
 * @param {Array} config.httpsPortList The list of HTTPS ports that the socket connection
 *    would use. It uses the first port and fallbacks to the next alternative port when connection fails.
 * @param {Array} config.httpPortList The list of HTTP ports that the socket connection
 *    would use. It uses the first port and fallbacks to the next alternative port when connection fails.
 * @parma {String} config.type The type of socket connection. There are two types:
 * - <code>"WebSocket"</code> indicates a WebSocket connection.
 * - <code>"XHRPolling"</code> indicates a LongPolling connection.
 * @param {Function} listener The listener function.
 * @for Skylink
 * @since 0.6.0
 */
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
   * The list of available signalling server ports.
   * @attribute ports
   * @param {Array} http: The list of HTTP ports.
   * @param {Array} https: The list of HTTPS ports.
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
   * The responses attached to message events.
   * @attribute responses
   * @type JSON
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.responses = {};

  
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
   * @for Socket
   * @since 0.6.0
   */
  com.ondisconnect = function () {};
  
  /**
   * Function to subscribe to when socket has connection error.
   * @method onconnecterror
   * @for Socket
   * @since 0.6.0
   */
  com.onconnecterror = function () {};
  
  /**
   * Function to subscribe to when socket attempts to reconnect.
   * @method onreconnect
   * @for Socket
   * @since 0.6.0
   */
  com.onreconnect = function () {};
  
  /**
   * Function to subscribe to when socket has an exception.
   * @method onerror
   * @for Socket
   * @since 0.6.0
   */
  com.onerror = function () {};

  
  /**
   * The handler that manages all triggers or relaying events.
   * @method handler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    SocketHandler(com, event, data, listener);
  };

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