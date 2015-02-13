/**
 * Handles the socket.io object connection and events.
 * @class Socket
 * @constructor
 * @param {JSON} config The socket connection configuration.
 * @param {String} config.server The socket signaling server.
 * @param {Array} config.httpsPortList The list of HTTPS ports that the socket connection
 *    would use. It uses the first port and fallbacks to the next alternative port when connection fails.
 * @param {Integer} config.httpsPortList.(#index) The port number.
 * @param {Array} config.httpPortList The list of HTTP ports that the socket connection
 *    would use. It uses the first port and fallbacks to the next alternative port when connection fails.
 * @param {Integer} config.httpPortList.(#index) The port number.
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


  /**
   * The handler that manages all triggers or relaying events.
   * @method handler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.respond = function (event, data) {
    var params = event.split(':');
    data = data || {};

    // Class events
    data.server = com.server;
    data.port = com.port;
    data.type = com.type;
    data.protocol = com.protocol;

    fn.applyHandler(SocketEventResponseHandler, params, [com, data, listener]);

    listener(event, data);

    log.debug('Socket: Responding with event = ', event, data);
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
