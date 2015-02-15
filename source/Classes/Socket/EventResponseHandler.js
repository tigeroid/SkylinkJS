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
