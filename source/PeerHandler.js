/**
 * Handles all the events received from sub classes.
 * @attribute PeerEventReceivedHandler
 * @for Peer
 * @since 0.6.0
 */
var PeerEventReceivedHandler = {
  
  stream: {
    
    stop: function (com, data, listener) {
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
 * @for Peer
 * @since 0.6.0
 */
var PeerEventResponseHandler = {
  
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect(com.id);
    }
  },
  
  reconnect: function (com, data, listener) {
    if (typeof com.onreconnect === 'function') {
      com.onreconnect();
    }
  },
  
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect();
    }
  },
  
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
   * Handles the ice connection state trigger.
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
   * Handles the ice gathering state trigger.
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
   * Handles the ice candidate trigger.
   * @property icecandidate
   * @type Function
   * @private
   * @since 0.6.0
   */
  icecandidate: function (com, data, listener) {},

  /**
   * Handles the signaling state trigger.
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
   * Handles the datachannel state trigger.
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
 * @attribute PeerHandler
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