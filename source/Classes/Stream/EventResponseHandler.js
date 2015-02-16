/**
 * Handles all the events to respond to other parent classes.
 * @attribute StreamEventResponseHandler
 * @type JSON
 * @private
 * @for Stream
 * @since 0.6.0
 */
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