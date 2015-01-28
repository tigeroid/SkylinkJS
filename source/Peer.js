/**
 * Handles the PeerConnection and Peer data.
 * @class Peer
 * @for Skylink
 * @since 0.6.0
 */
function Peer(config, listener) {
  'use strict';

  // Reference of instance
  var com = this;

  /**
   * The userId tied to the Peer.
   * @attribute id
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.userId = config.id || null;
  
  /**
   * The peer id.
   * @attribute id
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.id = config.id || Date.UTC();
  
  /**
   * The peer type.
   * @attribute type
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.type = config.type || 'stream';

  /**
   * The PeerConnection constraints.
   * @attribute constraints
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.constraints = config.constraints;

  /**
   * The DataChannel connected to PeerConnection.
   * @attribute datamessengers
   * @type Peer
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.datamessenger = null;
  
  /**
   * Stores the list DataTransfers.
   * @attribute datatransfers
   * @type Peer
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.datatransfers = {};

  /**
   * The stream sent from the Peer
   * @attribute stream
   * @type JSON
   * @param {Stream} [n..] The stream object.
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.stream = null;
 
  /**
   * Stores the user data.
   * @attribute data
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.data = config.data || {};
  
  /**
   * The connection id.
   * @attribute id
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.id = Date.UTC();

  /**
   * The PeerConnection constraints.
   * @attribute constraints
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.constraints = config.constraints || null;

  /**
   * The PeerConnection configuration.
   * @attribute config
   * @type String
   * @private
   * @for Peer
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
   * @for Peer
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
   * @for Peer
   * @since 0.6.0
   */
  com.streamingConfig = com.streamingOptions[com.type];
  
  /**
   * The flag that indicates if stereo is enabled for this connection.
   * @attribute stereo
   * @type Boolean
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.stereo = false;

  /**
   * The bandwidth to use in bitrate.
   * - In low-environment, the bandwidth is handled by the browser.
   * @attribute bandwidth
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.bandwidth = StreamParser.defaultConfig;

  /**
   * The PeerConnection object.
   * @attribute RTCPeerConnection
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.RTCPeerConnection = null;


  /**
   * Starts the peer connection.
   * @method connect
   * @trigger peerJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.connect = function (stream) {
    var peer = new window.RTCPeerConnection(com.constraints, com.config);
  
    // Send stream
    if ((!fn.isEmpty(stream)) ? stream instanceof Stream : false) {
      // Set the data
      com.stereo = fn.isSafe(function () { return stream.audio.stereo; });
    
      // Check class type
      peer.addStream(stream.MediaStream);
    }

    com.bind(peer);
  };

  /**
   * Stops the peer connection.
   * @method disconnect
   * @trigger peerJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.disconnect = function () {
    if (com.RTCPeerConnection.newSignalingState !== 'closed') {
      com.RTCPeerConnection.close();
    }
  };

  /**
   * Binds events to RTCPeerConnection object.
   * @method bind
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
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
      
      if (bindPeer.newIceConnectionState === 'completed') {
        
      }
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
      listener('peer:start', {
        id: com.id
      });
    });
  };

  /**
   * Handles the event when a datachannel is received.
   * @method onDataChannel
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.onDataChannel = function (event) {
    var channel = event.channel || event;
    
    if (channel.label === 'main_' + com.userId) {
      com.datamessenger = new DataMessage(channel, listener);
    
    } else {
      com.datatransfers[channel.label] = new DataTransfer(channel, listener);
    }
  };

  /**
   * Handles the event when a remote stream is received.
   * @method onAddStream
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.onAddStream = function (event) {
    var stream = event.stream || event;

    com.stream = new Stream(stream, config.streamConfig
      || {}, listener);
  };

  /**
   * Handles the event when an ice candidate is received.
   * @method onIceCandidate
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
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
    
    listener('peer:icecandidate', {
      id: com.id,
      event: received
    });
  };

  /**
   * Handles the event when an ice connection state changes.
   * @method onIceConnectionStateChange
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.onIceConnectionStateChange = function (bindPeer) {
    listener('peer:iceconnectionstate', {
      id: com.id,
      state: bindPeer.newIceConnectionState
    });
  };

  /**
   * Handles the event when a peer connection state changes.
   * @method onSignalingStateChange
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.onSignalingStateChange = function (event, bindPeer) {
    var state = bindPeer.signalingState;
    
    listener('peer:signalingstate', {
      id: com.id,
      state: state
    });
  };

  /**
   * Handles the event when an ice gathering state changes.
   * @method onIceGatheringStateChange
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.onIceGatheringStateChange = function (event, bindPeer) {
    var state = ICE.parseIceGatheringState(bindPeer.iceGatheringState);
    
    listener('peer:signalingstate', {
      id: com.id,
      state: state
    });
  };

  /**
   * Creates an offer session description.
   * @method createOffer
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.createOffer = function () {
    // Create datachannel
    if (globals.dataChannel && com.type === 'user') {
      var channel = peer.createDataChannel('main_' + com.userId);
  
      com.datamessenger = new DataMessage(channel, listener);
    }

    com.RTCPeerConnection.createOffer(function (offer) {
      listener('peer:offer:success', {
        id: com.id,
        event: offer
      });

      com.setLocalDescription(offer);

    }, function (error) {
      listener('peer:offer:failure', {
        id: com.id,
        error: error
      });
    }, com.streamingConfig);
  };

  /**
   * Creates an answer session description.
   * @method createAnswer
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.createAnswer = function () {
    com.RTCPeerConnection.createAnswer(function (offer) {
      listener('peer:answer:success', {
        id: com.id,
        event: offer
      });

      com.setLocalDescription(offer);

    }, function (error) {
      listener('peer:answer:failure', {
        id: com.id,
        error: error
      });
      
    }, com.streamingConfig);
  };

  /**
   * Sets local description.
   * @method setLocalDescription
   * @for Peer
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
      listener('peer:localdescription:success', {
        id: com.id,
        event: localDescription
      });

      if (localDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-local-answer';
        com.onSignalingStateChange(null, com.RTCPeerConnection);
      }

    }, function (error) {
      listener('peer:localdescription:error', {
        id: com.id,
        error: error
      });
    });
  };

  /**
   * Sets remote description.
   * @method setRemoteDescription
   * @for Peer
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
   * Starts a datatransfer.
   * @method startDataTransfer
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.startDataTransfer = function () {
    var channel = com.RTCPeerConnection.createDataChannel(Date.UTC);
    
    com.datatransfers[channel.label] = new DataTransfer(channel, listener);
  };
  
  /**
   * Gets the peer information.
   * @method getInfo
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.getInfo = function () {
    var data = {};
    
    if (fn.isEmpty(com.stream)) {
      data.stream = {
        audio: false,
        video: false,
        bandwidth: com.bandwidth
      };
    } else {
      data.stream = {
        audio: fn.isSafe(function () {
            return com.stream.config.audio;
          }),
        video: fn.isSafe(function () {
            return com.stream.config.video;
          }),
        bandwidth: com.bandwidth
      };
    }
    
    data.userData = com.data;
  
    return data;
  };

  // Throw an error if adapterjs is not loaded
  if (!window.RTCPeerConnection) {
    throw new Error('Required dependency adapterjs not found');
  }
  
  // Parse bandwidth
  com.bandwidth = StreamParser.parseBandwidthConfig(config.bandwidth);
  
  // Start health checker
  com.startChecker();
}