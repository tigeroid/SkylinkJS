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
  com.userId = config.userId || null;
  
  /**
   * The peer id.
   * @attribute id
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.id = config.id || fn.generateUID();
  
  /**
   * The peer type.
   * @attribute type
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.type = config.id === 'main' ? 'user' : 'stream';

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
   * Stores the browser agent information.
   * @attribute agent
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.agent = config.agent || {};
 
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
  com.config = {
    optional: [{
      DtlsSrtpKeyAgreement: true
    }]
  };
  
  /**
   * The PeerConnection answer sdp configuration.
   * @attribute sdpConfig
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.sdpConfig = {
    'mandatory': {
      'OfferToReceiveAudio': true,
      'OfferToReceiveVideo': true
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
  com.streamingConfig = config.streamingConfig;
  
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
      com.stereo = fn.isSafe(function () { return com.stream.audio.stereo; });
    
      // Check class type
      peer.addStream(stream.MediaStream);
      
      listener('peer:localstream', {
        id: com.id,
        userId: com.userId,
        stream: stream
      });
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
    bindPeer.newIceConnectionState = 'new';
    bindPeer.channels = {};

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
        id: com.id,
        userId: com.userId,
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
    var channel = new DataChannel(event.channel || event, com.id, listener);
    
    com.RTCPeerConnection.channels['main'] = channel;

    if (channel.id === 'main') {
      //com.datamessenger = new DataMessage(channel, listener);
    
    } else {
      //com.datatransfers[channel.label] = new DataTransfer(channel, null, listener);
    }
    
    listener('peer:remotedatachannel', {
      id: com.id,
      userId: com.userId,
      channel: channel 
    });
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

    com.stream = new Stream(stream, com.streamingConfig
      || {}, function (event, data) {
      
      listener(event, data);

      if (event === 'stream:start') {
        listener('peer:remotestream', {
          id: com.id,
          userId: com.userId,
          stream: com.stream
        });
      }
    });
  };

  /**
   * Handles the event when an ice candidate is received.
   * @method onIceCandidate
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.onIceCandidate = function (event, bindPeer) {
    var candidate = event.candidate || event;
    
    if (com.RTCPeerConnection.newSignalingState === 'have-local-answer' ||
        com.RTCPeerConnection.newSignalingState === 'have-remote-answer') {
      listener('peer:icecandidate', {
        id: com.id,
        userId: com.userId,
        candidate: candidate
      });
    
    } else {
      ICE.queueCandidate(com.RTCPeerConnection, candidate);
    }
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
      userId: com.userId,
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
      userId: com.userId,
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
      var channel = com.RTCPeerConnection.createDataChannel('main');
      //console.log(com.RTCPeerConnection);

      com.RTCPeerConnection.channels['main'] = new DataChannel(channel,com.id,listener);
      console.log('->channel');
  
      //com.datamessenger = new DataMessage(channel, listener);
      
      listener('peer:localdatachannel', {
        id: com.id,
        userId: com.userId,
        channel: com.RTCPeerConnection.channels['main']
        //channel: new DataChannel(channel,com.id,listener)
      });
    }

    com.RTCPeerConnection.createOffer(function (offer) {
      listener('peer:offer:success', {
        id: com.id,
        userId: com.userId,
        sdp: offer
      });

      com.setLocalDescription(offer);

    }, function (error) {
      listener('peer:offer:failure', {
        id: com.id,
        userId: com.userId,
        error: error
      });
    }, com.sdpConfig);
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
        userId: com.userId,
        sdp: offer
      });

      com.setLocalDescription(offer);

    }, function (error) {
      listener('peer:answer:failure', {
        id: com.id,
        userId: com.userId,
        error: error
      });
      
    }, com.sdpConfig);
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
        userId: com.userId,
        sdp: localDescription
      });

      if (localDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-local-answer';
        com.onSignalingStateChange(null, com.RTCPeerConnection);
      }

    }, function (error) {
      listener('peer:localdescription:error', {
        id: com.id,
        userId: com.userId,
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
        userId: com.userId,
        sdp: remoteDescription
      });

      if (remoteDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-remote-answer';
        com.onSignalingStateChange(null, com.RTCPeerConnection);
      }
      
      // Add all ICE Candidate generated before remote description of answer and offer
      ICE.popCandidate(com.RTCPeerConnection, function (candidate) {
        listener('peer:icecandidate', {
          id: com.id,
          userId: com.userId,
          candidate: candidate
        });
      });

    }, function (error) {
      listener('peer:remotedescription:error', {
        id: com.id,
        userId: com.userId,
        error: error
      });
    });
  };
  
  /**
   * Adds the ICE candidate.
   * @method setRemoteDescription
   * @for Peer
   * @since 0.6.0
   */
  com.addIceCandidate = function (candidate) {
    ICE.addCandidate(com.RTCPeerConnection, candidate, listener);
  };
  
  /**
   * Starts a datatransfer.
   * @method startDataTransfer
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.transferData = function (data) {
    var channel = com.RTCPeerConnection.createDataChannel(fn.generateUID());
    
    //com.datatransfers[channel.label] = new DataTransfer(channel, data, listener);
  };
  
  /**
   * Gets the peer information.
   * @method getInfo
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.getInfo = function () {
    return {
      userData: com.data,
      agent: com.agent,
      settings: (function () {
        var streaming = [];
        streaming[com.stream.id] = {
          audio: fn.isSafe(function () {
            return com.stream.config.audio;
          }),
          video: fn.isSafe(function () {
            return com.stream.config.video;
          }),
          mediaStatus: fn.isSafe(function () {
            return com.stream.config.status;
          }),
          bandwidth: com.bandwidth || {}
        };
      
        return streaming;
      })()
    };
    
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
  
  com.sendMessage = function(message){
    if (com.RTCPeerConnection.channels['main']){
      com.RTCPeerConnection.channels['main'].send(message);
    }
  }

  /**
   * Handles the event when peer information is updated.
   * @method onUpdate
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.onUpdate = function () {
    listener('peer:update', {
      id: com.id,
      userId: com.userId,
      data: com.getInfo()
    });
  };

  // Throw an error if adapterjs is not loaded
  if (!window.RTCPeerConnection) {
    throw new Error('Required dependency adapterjs not found');
  }
  
  // Parse bandwidth
  com.bandwidth = StreamParser.parseBandwidthConfig(config.bandwidth);
  
  // Start health checker
  //com.startChecker();
}