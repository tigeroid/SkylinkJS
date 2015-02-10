/**
 * Handles the DataChannel connections.
 * @class DataChannel
 * @for Skylink
 * @since 0.6.0
 */
function DataChannel(channel, peerId, listener) {
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
   * @for DataMessage
   * @since 0.6.0
   */
  com.type = 'message';

  /**
   * The peer the datachannel is linked to.
   * @attribute peerId
   * @type String
   * @private
   * @for DataChannel
   * @since 0.6.0
   */
  com.peerId = peerId;

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
   * Binds events to RTCDataChannel object.
   * @method bind
   * @trigger StreamJoined, mediaAccessRequired
   * @for DataChannel
   * @since 0.6.0
   */
  com.bind = function (bindChannel) {
    // Prevent re-trigger
    if (bindChannel.readyState !== 'open') {
      bindChannel.onopen = function () {
        com.onOpen(bindChannel);
      };
    } else {
      com.onOpen(bindChannel);
    }
    
    bindChannel.onerror = function (error) {
      com.onError(bindChannel, error);
    };

    // NOTE: Older firefox might close the DataChannel earlier 
    bindChannel.onclose = function () {
      com.onClose(bindChannel);
    };

    bindChannel.onmessage = function (event) {
      //console.log('xbinding');
      com.onMessage(bindChannel, event.data);
    };
    
    com.RTCDataChannel = bindChannel;

    console.log(com.RTCDataChannel.onmessage);

    fn.runSync(function () {
      listener('datachannel:start', {
        id: com.id,
        peerId: com.peerId
      });
    });
  };
  
  /**
   * Handles the event when DataChannel is opened.
   * @method onOpen
   * @trigger peerJoined, mediaAccessRequired
   * @for DataChannel
   * @since 0.6.0
   */
  com.onOpen = function (bindChannel) {
    console.log('->datachannel opened');
    listener('datachannel:connect', {
      id: com.id,
      peerId: com.peerId
    });
  };
  
  /**
   * Handles the event when DataChannel is closed.
   * @method onClose
   * @trigger peerJoined, mediaAccessRequired
   * @for DataChannel
   * @since 0.6.0
   */
  com.onClose = function (bindChannel) {
    listener('datachannel:disconnect', {
      id: com.id,
      peerId: com.peerId
    });
  };
  
  /**
   * Handles the event when DataChannel has an exception.
   * @method onClose
   * @trigger peerJoined, mediaAccessRequired
   * @for DataChannel
   * @since 0.6.0
   */
  com.onError = function (bindChannel, error) {
    listener('datachannel:error', {
      id: com.id,
      peerId: com.peerId,
      error: error
    });
  };
  
  /**
   * Handles the event when DataChannel has a message received.
   * @method onMessage
   * @trigger peerJoined, mediaAccessRequired
   * @for DataChannel
   * @since 0.6.0
   */
  com.onMessage = function (bindChannel, data) {
    listener('datachannel:message', {
      id: com.id,
      peerId: com.peerId,
      data: data
    });
  };

  com.close = function(){
    channel.close();
    listener('datachannel:close',{
      id: com.id,
      peerId: com.peerId
    });
  }

  /**
   * Sends data over the datachannel.
   * @method send
   * @param {JSON|String} data The data to send.
   * @trigger peerJoined, mediaAccessRequired
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

  com.bind(channel);
}