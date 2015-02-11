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
   * Event fired when the MediaSocket has started and that the Socket object is ready to use.
   * @event Socket:start
   * @for Socket
   * @since 0.6.0
   */
  start: function (com, data, listener) {
    if (typeof com.onstart === 'function') {
      com.onstart(data.MediaSocket);
    }
  },
  
  /**
   * Event fired when usually getUserMedia fails or an exception has occurred during the
   *   MediaSocket object handling.
   * @event Socket:error
   * @param {Object} error The getUserMedia or event error.
   * @for Socket
   * @since 0.6.0
   */
  error: function (com, data, listener) {
    if (typeof com.onerror === 'function') {
      com.onerror(data);
    }
  },

  track: {
    /**
     * Event fired when the MediaSocketTrack of the MediaSocket object has started and
     *   that the track is ready to use.
     * @event Socket:track:start
     * @for Socket
     * @since 0.6.0
     */
    start: function (com, data, listener) {
      if (typeof com.ontrackstart === 'function') {
        com.ontrackstart(data);
      }
    },
    
    /**
     * Event fired when the MediaSocketTrack of the MediaSocket object has stopped.
     * @event Socket:track:stop
     * @for Socket
     * @since 0.6.0
     */
    stop: function (com, data, listener) {
      if (typeof com.ontrackstop === 'function') {
        com.ontrackstop(data);
      }
    },
    
    /**
     * Event fired when the MediaSocketTrack of the MediaSocket object has been disabled (muted).
     * @event Socket:track:mute
     * @for Socket
     * @since 0.6.0
     */
    mute: function (com, data, listener) {
      if (typeof com.ontrackmute === 'function') {
        com.ontrackmute(data);
      }
    },
    
    /**
     * Event fired when the MediaSocketTrack of the MediaSocket object has been enabled (unmuted).
     * @event Socket:track:unmute
     * @for Socket
     * @since 0.6.0
     */
    unmute: function (com, data, listener) {
      if (typeof com.ontrackunmute === 'function') {
        com.ontrackunmute(data);
      }
    },
  },
  
  /**
   * Event fired when the MediaSocket object has stopped.
   * @event Socket:stop
   * @for Socket
   * @since 0.6.0
   */
  stop: function (com, data, listener) {
    if (typeof com.onstop === 'function') {
      com.onstop(data);
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