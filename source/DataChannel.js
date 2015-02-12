/**
 * Handles the RTCDataChannel object connection and events.
 * @class DataChannel
 * @constructor
 * @param {Object} channel The RTCDataChannel object to parse and hook events on.
 * @param {Function} listener The listener function.
 * @for Skylink
 * @since 0.6.0
 */
function DataChannel(channel, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

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
  com.id = channel.label || fn.generateUID();
  
  /**
   * The type of datachannel.
   * @attribute type
   * @type String
   * @private
   * @for DataChannel
   * @since 0.6.0
   */
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