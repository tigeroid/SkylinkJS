/**
 * Handles the peer class events.
 * @attribute PeerHandler
 * @for Peer
 * @since 0.6.0
 */
var PeerHandler = function (com, event, data, listener) {
  if (event.indexOf('trigger:') !== 0) {
    data.peerId = com.id;

    listener(event, data);
  }
  
  var params = event.split(':');
  
  fn.isSafe(function () {
    if (subActions.length > 2) {
      PeerHandlerEvent[ params[0] ][ params[1] ][ params[2] ](com, data, listener);

    } else if (subActions.length > 1) {
      PeerHandlerEvent[ params[0] ][ params[1] ](com, data, listener);

    } else {
      PeerHandlerEvent[ params[0] ](com, data, listener);
    }
  });
};

/**
 * Stores the peer class events.
 * @attribute PeerHandlerEvent
 * @for Peer
 * @since 0.6.0
 */
var PeerHandlerEvent = {
  /**
   * Handles stream events that will require the peer class to
   * trigger the listener.
   * @property stream
   * @type JSON
   * @private
   * @since 0.6.0
   */
  'stream': {
  },
  
  /**
   * Handles events that will require the peer class to
   * trigger peer class events.
   * @property trigger
   * @type JSON
   * @private
   * @since 0.6.0
   */
  'trigger': {
    /**
     * Handles the ice connection state trigger.
     * @property iceconnectionstate
     * @type Function
     * @private
     * @since 0.6.0
     */
    'iceconnectionstate': function (com, data, listener) {
      var state = com.RTCPeerConnection.newIceConnectionState;

      listener('peer:iceconnectionstate', {
        id: com.id,
        state: state
      });

      if (typeof com.oniceconnectionstatechange === 'function') {
        com.oniceconnectionstatechange(state);
      }  
    },
    
    /**
     * Handles the ice gathering state trigger.
     * @property icegatheringstate
     * @type Function
     * @private
     * @since 0.6.0
     */
    'icegatheringstate': function (com, data, listener) {
      var state = com.RTCPeerConnection.iceGatheringState;

      listener('peer:icegatheringstate', {
        id: com.id,
        state: state
      });

      if (typeof com.onicegatheringstatechange === 'function') {
        com.onicegatheringstatechange(state);
      }
    },
    
    /**
     * Handles the ice candidate trigger.
     * @property icecandidate
     * @type Function
     * @private
     * @since 0.6.0
     */
    'icecandidate': function (com, data, listener) {
      var candidate = data.candidate;

      if (data.type === 'remote') {
        ICE.addCandidate(com.RTCPeerConnection, candidate, com.handler);
      }

      listener('peer:icecandidate', {
        id: com.id,
        type: data.type,
        candidate: data.candidate
      });
    },
    
    /**
     * Handles the signaling state trigger.
     * @property signalingstate
     * @type Function
     * @private
     * @since 0.6.0
     */
    'signalingstate': function (com, data, listener) {
      var state = com.RTCPeerConnection.newSignalingState;

      listener('peer:signalingstate', {
        id: com.id,
        state: state
      });

      if (typeof com.onsignalingstatechange === 'function') {
        com.onsignalingstatechange(state);
      }
    },
    
    /**
     * Handles the datachannel state trigger.
     * @property datachannel
     * @type Function
     * @private
     * @since 0.6.0
     */
    'datachannel': function (com, data, listener) {
      var channel = new DataChannel(data.channel, { type: data.type }, com.manager);

      com.datachannels[channel.id] = channel;

      listener('peer:datachannel', {
        id: com.id,
        channel: data.channel,
        type: data.type
      });
    },
    
    /**
     * Handles the stream trigger.
     * @property icegatheringstate
     * @type Function
     * @private
     * @since 0.6.0
     */
    'stream': function (com, data, listener) {
      var stream;

      if (data.stream instanceof Stream) {
        stream = data.stream;

      } else {
        stream = new Stream(data.stream, { 
          type: data.type, 
          audio: config.streamingConfig.audio,
          video: config.streamingConfig.video

        }, com.manager);

        com.stream = stream;
      }

      listener('peer:stream', {
        id: com.id,
        stream: data.stream,
        type: data.type
      });
    },
    
    /**
     * Handles the reconnect state trigger.
     * @property icegatheringstate
     * @type Function
     * @private
     * @since 0.6.0
     */
    'reconnect': function (com, data, listener) {
      listener('peer:reconnect', {
        id: com.id
      });

      if (typeof com.onreconnect === 'function') {
        com.onreconnect();
      }
    },
    
    /**
     * Handles the handshake state trigger.
     * @property handshake
     * @type Function
     * @private
     * @since 0.6.0
     */
    handshake: function (com, data, listener) {
      if (data.type === 'welcome') {
        com.createOffer();
      } 

      if (data.type === 'offer') {
        com.remoteDescription = new window.RTCSessionDescription(data);

        com.setRemoteDescription();
      }
      
      if (data.type === 'answer') {
        com.remoteDescription = new window.RTCSessionDescription(data);

        com.setLocalDescription();
      }
    },
    
    /**
     * Handles the disconnected state trigger.
     * @property mutestream
     * @type Function
     * @private
     * @since 0.6.0
     */
    mutestream: function (com, data, listener) {
      if (data.muted) {
        if (data.kind === 'audio') {
          com.stream.muteAudio();
        } else {
          com.stream.muteVideo();
        }
        
      } else {
        if (data.kind === 'audio') {
          com.stream.unmuteAudio();
        } else {
          com.stream.unmuteVideo();
        }
      }
    },
    
    /**
     * Handles the disconnected state trigger.
     * @property icegatheringstate
     * @type Function
     * @private
     * @since 0.6.0
     */
    'disconnect': function (com, data, listener) {
      listener('peer:disconnect', {
        id: com.id
      });

      if (typeof com.ondisconnect === 'function') {
        com.ondisconnect();
      }
    }
  }
};