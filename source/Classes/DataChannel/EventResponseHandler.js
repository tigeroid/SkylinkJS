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