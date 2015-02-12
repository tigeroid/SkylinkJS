/**
 * Handles all the events to respond to other parent classes.
 * @attribute SocketEventResponseHandler
 * @type JSON
 * @private
 * @for Socket
 * @since 0.6.0
 */
var SocketEventResponseHandler = {
  /**
   * Event fired when the socket object is ready to use.
   * @event socket:start
   * @for Socket
   * @since 0.6.0
   */
  start: function (com, data, listener) {
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
    if (typeof com.onerror === 'function') {
      com.onerror(data);
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
   * Event fired when socket receives a message from the signaling server.
   * @event socket:message
   * @param {String} event The message event type.
   * @param {JSON} data The data received from server.
   * @param {String} sourceType The source type of the message received.
   * There are two types of sources:
   * - <code>"local"</code> indicates that message was sent by socket.
   * - <code>"remote</code> indicates that message was received by socket.
   * @for Socket
   * @since 0.6.0
   */
  message: function (com, data, listener) {
    listener('message:' + data.event, data.message);
  },
  
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

/**
 * Handles the Socket class events.
 * @method SocketHandler
 * @param {Object} com The reference to the class object.
 * @param {String} event The event name.
 * @param {JSON} data The event data response.
 * @param {Function} listener The listener function.
 * @private
 * @for Socket
 * @since 0.6.0
 */
var SocketHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  data.server = com.server;
  data.port = com.port;
  data.type = com.type;
  data.protocol = com.protocol;

  fn.applyHandler(SocketEventResponseHandler, params, [com, data, listener]);

  listener(event, data);
};