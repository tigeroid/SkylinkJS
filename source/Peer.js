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
   * The PeerConnection constraints - iceServers.
   * @attribute constraints
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.constraints = null;

  /**
   * The local description to be set.
   * @attribute localDescription
   * @type Object
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.localDescription = null;
  
  /**
   * The remote description to be set.
   * @attribute remoteDescription
   * @type Object
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.remoteDescription = null;
  
  /**
   * The datachannels connected to PeerConnection.
   * @attribute datachannels
   * @param {DataChannel} <channelId> The datachannel connected to peer.
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.datachannels = {};
  
  /**
   * The stream send from this peer.
   * @attribute stream
   * @type Stream
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.stream = null;

  /**
   * The PeerConnection session description constraints.
   * @attribute sdpConstraints
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.sdpConstraints = {
    'mandatory': {
      'OfferToReceiveAudio': true,
      'OfferToReceiveVideo': true
    }
  };
  
  /**
   * The PeerConnection session description configuration.
   * @attribute sdpConfig
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.sdpConfig = null;

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
   * The PeerConnection object.
   * @attribute RTCPeerConnection
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.RTCPeerConnection = null;
  
  /**
   * The handler that manages all triggers or relaying events.
   * @attribute handler
   * @type Function
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    PeerHandler(com, event, data, listener);
  };


  /**
   * Function to subscribe to when peer's connection has been started.
   * @method onconnect
   * @for Peer
   * @since 0.6.0
   */
  com.onconnect = function () {};

  /**
   * Function to subscribe to when peer's ice connection state changes.
   * @method oniceconnectionstatechange
   * @for Peer
   * @since 0.6.0
   */
  com.oniceconnectionstatechange = function () {};
  
  /**
   * Function to subscribe to when peer's ice gathering state changes.
   * @method onicegatheringstatechange
   * @for Peer
   * @since 0.6.0
   */
  com.onicegatheringstatechange = function () {};
  
  /**
   * Function to subscribe to when peer's remote stream is received.
   * @method onaddstream
   * @for Peer
   * @since 0.6.0
   */
  com.onaddstream = function () {};
  
  /**
   * Function to subscribe to when peer's signaling state has changed.
   * @method onsignalingstatechange
   * @for Peer
   * @since 0.6.0
   */
  com.onsignalingstatechange = function () {};
  
  /**
   * Function to subscribe to when peer's connection has been restarted.
   * @method onreconnect
   * @for Peer
   * @since 0.6.0
   */
  com.onreconnect = function () {};
  
  /**
   * Function to subscribe to when peer's connection has been restarted.
   * @method onreconnect
   * @for Peer
   * @since 0.6.0
   */
  com.onreconnect = function () {};
  
  /**
   * Function to subscribe to when a peer connection been disconnected.
   * @method onremoveconnection
   * @for Peer
   * @since 0.6.0
   */
  com.ondisconnect = function () {};
  
  

  /**
   * Starts the peer connection.
   * @method connect
   * @private
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
      
      listener('peer:localstream', {
        id: com.id,
        userId: com.userId,
        stream: stream
      });
    }

    com.bind(peer);
  };
  
  /**
   * Restarts the peer connection.
   * @method reconnect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.reconnect = function (stream) {
    var hasStream = !!stream;

    stream = stream || fn.isSafe(function () { 
      return com.RTCPeerConnection.getLocalStreams()[0]; });

    com.RTCPeerConnection.close();
    com.RTCPeerConnection = null;
    
    var peer = new window.RTCPeerConnection(com.constraints, com.config);

    // Send stream
    if ((!fn.isEmpty(stream)) ? stream instanceof Stream : false) {    
      
      // Set the data
      com.stereo = fn.isSafe(function () { return stream.audio.stereo; });
    
      // Check class type
      peer.addStream(stream.MediaStream);
      
      if (hasStream) {
        listener('peer:localstream', {
          id: com.id,
          userId: com.userId,
          stream: stream
        });
      }
      
      com.handler('trigger:reconnect', peer);
    }
    com.bind(peer);
  };

  /**
   * Stops the peer connection.
   * @method disconnect
   * @private
   * @trigger peerJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.disconnect = function () {
    if (com.RTCPeerConnection.newSignalingState !== 'closed') {
      com.RTCPeerConnection.close();
    }
    com.handler('trigger:disconnect');
  };

  /**
   * Binds events to RTCPeerConnection object.
   * @method bind
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.bind = function (bindPeer) {
    bindPeer.iceConnectionFiredStates = [];
    bindPeer.queueCandidate = [];
    bindPeer.newSignalingState = 'new';
    bindPeer.newIceConnectionState = 'new';

    bindPeer.ondatachannel = function (event) {
      com.handler('trigger:datachannel', {
        type: 'remote',
        channel: event.channel || event
      }); 
    };

    bindPeer.onaddstream = function (event) {
      com.handler('trigger:stream', {
        type: 'remote',
        stream: event.stream || event
      }); 
    };

    bindPeer.onicecandidate = function (event) {
      com.handler('trigger:icecandidate', {
        type: 'local',
        candidate: event.candidate || event
      }); 
    };

    bindPeer.oniceconnectionstatechange = function (event) {
      ICE.parseIceConnectionState(bindPeer);
    };

    bindPeer.oniceconnectionnewstatechange = function (event) {
      com.handler('trigger:iceconnectionstate', bindPeer); 
    };

    bindPeer.onsignalingstatechange = function (event) {
      com.handler('trigger:signalingstate', bindPeer);
    };

    bindPeer.onicegatheringstatechange = function () {
      com.handler('trigger:icegatheringstate', bindPeer); 
    };
    
    com.RTCPeerConnection = bindPeer;

    fn.runSync(function () {
      listener('peer:connect', {
        id: com.id
      });
      
      if (typeof com.onconnect === 'function') {
        com.onconnect(com.id);
      }
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
      com.handler('trigger:datachannel', {
        type: 'local',
        channel: com.RTCPeerConnection.createDataChannel('main')
      });
    }

    com.RTCPeerConnection.createOffer(function (offer) {
      var sdp = SDP.configure(offer, com.sdpConfig);

      com.localDescription = offer;

      listener('peer:offer:success', {
        id: com.id,
        sdp: sdp
      });

    }, function (error) {
      listener('peer:offer:error', {
        id: com.id,
        error: error
      });
    }, com.sdpConstraints);
  };

  /**
   * Creates an answer session description.
   * @method createAnswer
   * @trigger StreamJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.createAnswer = function () {
    com.RTCPeerConnection.createAnswer(function (answer) {
      var sdp = SDP.configure(answer, com.sdpConfig);
  
      com.localDescription = offer;
  
      listener('peer:answer:success', {
        id: com.id,
        sdp: sdp
      });
      
      com.setLocalDescription();

    }, function (error) {
      listener('peer:answer:error', {
        id: com.id,
        error: error
      });
      
    }, com.sdpConstraints);
  };

  /**
   * Sets local description.
   * @method setLocalDescription
   * @for Peer
   * @since 0.6.0
   */
  com.setLocalDescription = function () {
    var localDescription = com.localDescription;
  
    com.RTCPeerConnection.setLocalDescription(localDescription, function () {
      listener('peer:localdescription:success', {
        id: com.id,
        sdp: data.sdp,
        type: data.type,
      });

      if (localDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-local-answer';
        
        com.handler('trigger:signalingstate', com.RTCPeerConnection);
      
      } else {
        com.setRemoteDescription();
      }

    }, function (error) {
      listener('peer:localdescription:error', {
        id: com.id,
        sdp: data.sdp,
        type: data.type,
        error: data.error
      });
    });
  };

  /**
   * Sets remote description.
   * @method setRemoteDescription
   * @for Peer
   * @since 0.6.0
   */
  com.setRemoteDescription = function () {
    var remoteDescription = com.remoteDescription;

    com.RTCPeerConnection.setRemoteDescription(remoteDescription, function () {
      listener('peer:remotedescription:success', {
        id: com.id,
        sdp: data.sdp,
        type: data.type
      });
  
      if (remoteDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-remote-answer';
        
        com.handler('trigger:signalingstate', com.RTCPeerConnection);
      
      } else {
        com.createAnswer();
      }
      
      // Add all ICE Candidate generated before remote description of answer and offer
      ICE.popCandidate(com.RTCPeerConnection, com.handler);

    }, function (error) {
      listener('peer:remotedescription:error', {
        id: com.id,
        sdp: data.sdp,
        type: data.type,
        error: data.error
      });
    });
  };


  // Throw an error if adapterjs is not loaded
  if (!window.RTCPeerConnection) {
    throw new Error('Required dependency adapterjs not found');
  }
  
  // Parse bandwidth
  com.bandwidth = StreamParser.parseBandwidthConfig(config.bandwidth);

  // Parse constraints ICE servers
  com.constraints = ICE.parseTURNServers(config.constraints);
  com.constraints = ICE.parseSTUNServers(com.constraints);
  
  // Parse the sdp configuration
  com.sdpConfig = {
    stereo: fn.isSafe(function () {
      return config.streamingConfig.audio.stereo;
    }),         
    bandwidth: com.bandwidth,
  };
  
  listener('peer:start', {
    id: com.id
  });
}