/**
 * Handles all the events received from sub classes.
 * @attribute PeerEventReceivedHandler
 * @private
 * @for Peer
 * @since 0.6.0
 */
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

/**
 * Handles all the events to respond to other parent classes.
 * @attribute PeerEventResponseHandler
 * @private
 * @for Peer
 * @since 0.6.0
 */
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

/**
 * Handles all the message events received from socket.
 * @attribute PeerEventMessageHandler
 * @private
 * @for Peer
 * @since 0.6.0
 */
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

/**
 * Handles the peer class events.
 * @method PeerHandler
 * @param {Object} com The reference to the class object.
 * @param {String} event The event name.
 * @param {JSON} data The event data response.
 * @param {Function} listener The listener function.
 * @private
 * @for Peer
 * @since 0.6.0
 */
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