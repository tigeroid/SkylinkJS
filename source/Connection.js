/**
 * Handles the PeerConnection object.
 * @class Connection
 * @for Skylink
 * @since 0.6.0
 */
function Connection(stream, config, listener) {
  'use strict';

  // Reference of instance
  var com = this;

  /**
   * The connection id.
   * @attribute id
   * @type String
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.id = Date.UTC();

  /**
   * The peer type.
   * @attribute type
   * @type String
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.type = config.type || 'stream';

  /**
   * The PeerConnection constraints.
   * @attribute constraints
   * @type String
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.constraints = config.constraints || null;

  /**
   * The PeerConnection configuration.
   * @attribute config
   * @type String
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.config = config.config || {
    optional: [{
      DtlsSrtpKeyAgreement: true
    }]
  };
  
  /**
   * The PeerConnection sdp constraints options.
   * @attribute config
   * @type JSON
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.streamingOptions = {
    'user': {
      'mandatory': {
        'OfferToReceiveAudio': true,
        'OfferToReceiveVideo': true
      }
    },
    'stream': {
      'mandatory': {
        'OfferToReceiveAudio': false,
        'OfferToReceiveVideo': false
      }
    }
  };

  /**
   * The PeerConnection streaming configuration.
   * @attribute streamingConfig
   * @type JSON
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.streamingConfig = com.streamingOptions[config.type];
  
  /**
   * The flag that indicates if stereo is enabled for this connection.
   * @attribute stereo
   * @type Boolean
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.stereo = false;

  /**
   * The bandwidth to use in bitrate.
   * - In low-environment, the bandwidth is handled by the browser.
   * @attribute bandwidth
   * @type JSON
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.bandwidth = StreamParser.defaultConfig;

  /**
   * The PeerConnection object.
   * @attribute RTCPeerConnection
   * @type JSON
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.RTCPeerConnection = null;

  /**
   * Binds events to RTCPeerConnection object.
   * @method bind
   * @trigger StreamJoined, mediaAccessRequired
   * @for Connection
   * @since 0.6.0
   */
  com.bind = function (bindPeer) {
    bindPeer.queueCandidate = [];
    bindPeer.iceConnectionFiredStates = [];
    bindPeer.newSignalingState = 'new';
    bindPeer.newIceConnectionState = 'checking';

    bindPeer.ondatachannel = function (event) {
      //var dc = event.channel || event;
      com.onDataChannel(event);
    };

    bindPeer.onaddstream = function (event) {
      com.onAddStream(event);
    };

    bindPeer.onicecandidate = function (event) {
      com.onIceCandidate(event, bindPeer);
    };

    bindPeer.oniceconnectionstatechange = function (event) {
      ICE.parseIceConnectionState(bindPeer);
    };

    bindPeer.oniceconnectionnewstatechange = function (event) {
      com.onIceConnectionStateChange(bindPeer);
    };

    // bindPeer.onremovestream = function (event) {};

    bindPeer.onsignalingstatechange = function (event) {
      bindPeer.newSignalingState = bindPeer.signalingState;
      com.onSignalingStateChange(event, bindPeer);
    };

    bindPeer.onicegatheringstatechange = function () {
      com.onIceGatheringStateChange(event);
    };
    
    com.RTCPeerConnection = bindPeer;

    fn.runSync(function () {
      listener('connection:start', {
        id: com.id
      });
    });
  };

  /**
   * Handles the event when a datachannel is received.
   * @method onDataChannel
   * @trigger StreamJoined, mediaAccessRequired
   * @for Connection
   * @since 0.6.0
   */
  com.onDataChannel = function (event) {
    var received = event.channel || event;

    listener('connection:remotedatachannel', {
      id: com.id,
      event: received
    });
  };

  /**
   * Handles the event when a remote stream is received.
   * @method onAddStream
   * @trigger StreamJoined, mediaAccessRequired
   * @for Connection
   * @since 0.6.0
   */
  com.onAddStream = function (event) {
    var received = event.stream || event;

    com.remoteStream = received;

    listener('connection:remotestream', {
      id: com.id,
      event: received
    });
  };

  /**
   * Handles the event when an ice candidate is received.
   * @method onIceCandidate
   * @trigger StreamJoined, mediaAccessRequired
   * @for Connection
   * @since 0.6.0
   */
  com.onIceCandidate = function (event, bindPeer) {
    var received = event.candidate || event;

    ICE.addCandidate(bindPeer, received, function (event, data) {
      listener(event, {
        id: com.id,
        event: data
      });
    });
    
    listener('connection:icecandidate', {
      id: com.id,
      event: received
    });
  };

  /**
   * Handles the event when an ice connection state changes.
   * @method onIceConnectionStateChange
   * @trigger StreamJoined, mediaAccessRequired
   * @for Connection
   * @since 0.6.0
   */
  com.onIceConnectionStateChange = function (bindPeer) {
    listener('connection:iceconnectionstate', {
      id: com.id,
      state: bindPeer.newIceConnectionState
    });
  };

  /**
   * Handles the event when a peer connection state changes.
   * @method onSignalingStateChange
   * @trigger StreamJoined, mediaAccessRequired
   * @for Connection
   * @since 0.6.0
   */
  com.onSignalingStateChange = function (event, bindPeer) {
    var state = bindPeer.signalingState;
    listener('connection:signalingstate', {
      id: com.id,
      state: state
    });
  };

  /**
   * Handles the event when an ice gathering state changes.
   * @method onIceGatheringStateChange
   * @trigger StreamJoined, mediaAccessRequired
   * @for Connection
   * @since 0.6.0
   */
  com.onIceGatheringStateChange = function (event, bindPeer) {
    var state = ICE.parseIceGatheringState(bindPeer.iceGatheringState);
  };

  /**
   * Creates an offer session description.
   * @method createOffer
   * @trigger StreamJoined, mediaAccessRequired
   * @for Connection
   * @since 0.6.0
   */
  com.createOffer = function () {
    com.RTCPeerConnection.createOffer(function (offer) {
      listener('connection:offer:success', {
        id: com.id,
        event: offer
      });

      com.setLocalDescription(offer);

    }, function (error) {
      listener('connection:offer:failure', {
        id: com.id,
        error: error
      });
    }, com.streamingConfig);
  };

  /**
   * Creates an answer session description.
   * @method createAnswer
   * @trigger StreamJoined, mediaAccessRequired
   * @for Connection
   * @since 0.6.0
   */
  com.createAnswer = function () {
    com.RTCPeerConnection.createAnswer(function (offer) {
      listener('connection:answer:success', {
        id: com.id,
        event: offer
      });

      com.setLocalDescription(offer);

    }, function (error) {
      listener('connection:answer:failure', {
        id: com.id,
        error: error
      });
      
    }, com.streamingConfig);
  };

  /**
   * Sets local description.
   * @method setLocalDescription
   * @for Connection
   * @since 0.6.0
   */
  com.setLocalDescription = function (localDescription) {
    var sdpLines = localDescription.sdp.split('\r\n');
    sdpLines = SDP.removeH264Support(sdpLines);

    if (fn.isSafe(function () { return com.stereo; })) {
      sdpLines = SDP.addStereo(sdpLines);
    }
    if (com.bandwidth) {
      sdpLines = SDP.setBitrate(sdpLines, com.bandwidth);
    }

    localDescription.sdp = sdpLines.join('\r\n');

    com.RTCPeerConnection.setLocalDescription(localDescription, function () {
      listener('connection:localdescription:success', {
        id: com.id,
        event: localDescription
      });

      if (localDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-local-answer';
        com.onSignalingStateChange(null, com.RTCPeerConnection);
      }

    }, function (error) {
      listener('connection:localdescription:error', {
        id: com.id,
        error: error
      });
    });
  };

  /**
   * Sets remote description.
   * @method setRemoteDescription
   * @for Connection
   * @since 0.6.0
   */
  com.setRemoteDescription = function (remoteSdp) {
    var remoteDescription = new window.RTCSessionDescription(remoteSdp);

    com.RTCPeerConnection.setRemoteDescription(remoteDescription, function () {
      listener('peer:remotedescription:success', {
        id: com.id,
        event: remoteDescription
      });

      if (remoteDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-remote-answer';
        com.onSignalingStateChange(null, com.RTCPeerConnection);
      }
      
      // Add all ICE Candidate generated before remote description of answer and offer
      ICE.popCandidate(com.RTCPeerConnection);

    }, function (error) {
      listener('peer:remotedescription:error', {
        id: com.id,
        error: error
      });
    });
  };

  /**
   * Stops the peer connection.
   * @method disconnect
   * @trigger peerJoined, mediaAccessRequired
   * @for Connection
   * @since 0.6.0
   */
  com.disconnect = function () {
    if (com.RTCPeerConnection.newSignalingState !== 'closed') {
      com.RTCPeerConnection.close();
    }
  };

  fn.runSync(function () {
    var peer = new window.RTCPeerConnection(com.constraints, com.config);
  
    // Send stream
    if ((!fn.isEmpty(stream)) ? stream instanceof Stream : false) {
      // Set the data
      com.stereo = fn.isSafe(function () { return stream.audio.stereo; });
    
      // Check class type
      peer.addStream(stream.MediaStream);

      listener('connection:localstream', {
        id: com.id,
        event: stream
      });
    }

    // Create datachannel
    if (config.dataChannel) {
      var channel = peer.createDataChannel(com.id);

      listener('connection:localdatachannel', {
        id: com.id,
        event: channel
      });
    }
  
    // Parse bandwidth
    com.bandwidth = StreamParser.parseBandwidthConfig(config.bandwidth);

    com.bind(peer);
  });
}