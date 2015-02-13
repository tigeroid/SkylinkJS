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
   * The local description type peer sends.
   * @attribute SDPType
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.SDPType = null;

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
   * The flag that indicates if trickle ICE is enable for this PeerConnection.
   * @attribute iceTrickle
   * @type Boolean
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.iceTrickle = true;
  
  /**
   * The timeout that would react if PeerConnection is unstable and refresh connection.
   * @attribute healthTimer
   * @type Function
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.healthTimer = null;
  
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
   * Stores the streaming configuration.
   * @attribute streamingConfig
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.streamingConfig = config.streamingConfig || {
    bandwidth: {},
    audio: false,
    video: false,
    mediaStatus: { audioMuted: true, videoMuted: true }
  };

  /**
   * The PeerConnection session description constraints.
   * @attribute sdpConstraints
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.sdpConstraints = {
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true
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
   * The peerconnection weight during handshake.
   * @attribute weight
   * @type Integer
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.weight = parseInt(fn.generateUID(), 10);
  
  /**
   * The handler that manages all triggers or relaying events.
   * @attribute handler
   * @type Function
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    if (event.indexOf('datatransfer')===0){
      DataTransferHandler(com, event, data, listener);
      return;
    }
    PeerHandler(com, event, data, listener);
  };


  com.datatransfers = {};

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
      
      window.data = stream.MediaStream;

      com.handler('peer:stream', {
        sourceType: 'local',
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
        com.handler('peer:stream', {
          stream: stream
        });
      }
      
      com.handler('peer:reconnect', {});
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
    
    com.handler('peer:disconnect', {});
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
    bindPeer.datachannels = {};

    bindPeer.ondatachannel = function (event) {
      var eventChannel = event.channel || event;
      
      // Send the channel only when channel has started
      var channel = new DataChannel(eventChannel, function (event, data) {
        
        com.handler(event, data);
        
        if (event === 'datachannel:start') {
          com.handler('peer:datachannel', {
            channel: channel,
            sourceType: 'remote'
          });
        }
      });

      com.datachannels[channel.id] = channel;

      if (channel.id === 'main'){

        DataTransferHandler(com, 'datatransfer:start', {
          data: data,
          dataChannel: channel,
        }, listener);

      }
    };

    bindPeer.onaddstream = function (event) {
      var eventStream = event.stream || event;
  
      // Send the stream only when stream has started
      var stream = new Stream(eventStream, config.streamingConfig, function (event, data) {
        
        com.handler(event, data);
  
        if (event === 'stream:start') {
          com.handler('peer:stream', {
            sourceType: 'remote',
            stream: stream
          });
        }
      });
    };

    bindPeer.onicecandidate = function (event) {
      var eventCandidate = event.candidate || event;
  
      if (fn.isEmpty(eventCandidate.candidate)) {
        com.handler('candidate:gathered', {
          candidate: eventCandidate
        });
        return;
      }
      
      com.handler('peer:icecandidate', {
        sourceType: 'local',
        candidate: eventCandidate
      }); 
    };

    bindPeer.oniceconnectionstatechange = function (event) {
      ICE.parseIceConnectionState(bindPeer);
    };

    bindPeer.oniceconnectionnewstatechange = function (event) {
      // Connection is successful
      if (com.RTCPeerConnection.newIceConnectionState === 'connected') {
        // Stop timer
        if (!fn.isEmpty(com.healthTimer)) {
          log.debug('Peer', com.id, 'Stopping health timer as connection is established.');

          clearInterval(com.healthTimer);
        }
      }
      
      com.handler('peer:iceconnectionstate', {
        state: com.RTCPeerConnection.newIceConnectionState
      });
    };

    bindPeer.onsignalingstatechange = function (event) {
      com.handler('peer:signalingstate', {
        state: com.RTCPeerConnection.newSignalingState
      });
    };

    bindPeer.onicegatheringstatechange = function () {
      com.handler('peer:icegatheringstate', {
        state: com.RTCPeerConnection.iceGatheringState
      }); 
    };
    
    com.RTCPeerConnection = bindPeer;

    fn.runSync(function () {
      com.handler('peer:connect', {
        weight: com.weight,
        SDPType: com.SDPType,
        streamingConfig: com.streamingConfig
      });
    });
  };

  com.sendMessage = function(message){
    if (com.datachannels.main){
      com.datachannels.main.send(message);
    }
  };

  com.transferData = function(data){
    /*for (var channel in com.datachannels){
      if (com.datachannels.hasOwnProperty(channel)){
        var dt = new DataTransfer(com.datachannels[channel], com.id, listener);
        dt.sendBlobData(data,{
          name: data.name,
          size: data.size
        });
        return;
      }
    }*/

    /*var dc = new DataChannel(com.RTCPeerConnection.createDataChannel('transfer'),listener);
    com.datachannels.transfer = dc;*/

    com.handler('datatransfer:start',{
      data: data,
      dataChannel: com.datachannels.main  
    });

    com.datatransfers.main.sendBlobData(data,{
      name: data.name,
      size: data.size
    });
    return;
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

      var eventChannel = com.RTCPeerConnection.createDataChannel('main');
      
      // Send the channel only when channel has started
      var channel = new DataChannel(eventChannel, function (event, data) {
        
        com.handler(event, data);
        
        com.handler('peer:datachannel', {
          sourceType: 'local',
          channel: channel
        });
      });

      com.datachannels.main = channel;
    }

    com.RTCPeerConnection.createOffer(function (offer) {
      offer.sdp = SDP.configure(offer.sdp, com.sdpConfig);

      com.localDescription = offer;

      com.handler('peer:offer:success', {
        offer: offer
      });

    }, function (error) {
      com.handler('peer:offer:error', {
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
      answer.sdp = SDP.configure(answer.sdp, com.sdpConfig);
  
      com.localDescription = answer;
  
      com.handler('peer:answer:success', {
        answer: answer
      });
      
      com.setLocalDescription();

    }, function (error) {
      com.handler('peer:answer:error', {
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
      com.handler('peer:localdescription:success', {
        localDescription: localDescription.sdp,
        type: localDescription.type,
      });

      if (localDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-local-answer';
        
        com.handler('peer:signalingstate', {
          state: com.RTCPeerConnection.newSignalingState
        });
      
      } else {
        com.setRemoteDescription();
      }

    }, function (error) {
      com.handler('peer:localdescription:error', {
        localDescription: localDescription.sdp,
        type: localDescription.type,
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
  com.setRemoteDescription = function () {
    var remoteDescription = com.remoteDescription;

    com.RTCPeerConnection.setRemoteDescription(remoteDescription, function () {
      com.handler('peer:remotedescription:success', {
        remoteDescription: remoteDescription.sdp,
        type: remoteDescription.type
      });
  
      if (remoteDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-remote-answer';
        
        com.handler('peer:signalingstate', {
          state: com.RTCPeerConnection.newSignalingState
        });
      
      } else {
        com.createAnswer();
      }
      
      // Add all ICE Candidate generated before remote description of answer and offer
      ICE.popCandidate(com.RTCPeerConnection, com.handler);

    }, function (error) {
      com.handler('peer:remotedescription:error', {
        remoteDescription: remoteDescription.sdp,
        type: remoteDescription.type,
        error: error
      });
    });
  };

  // Throw an error if adapterjs is not loaded
  if (!window.RTCPeerConnection) {
    throw new Error('Required dependency adapterjs not found');
  }
  
  // Parse bandwidth
  com.streamingConfig.bandwidth = StreamParser.parseBandwidthConfig(com.streamingConfig.bandwidth);

  // Parse constraints ICE servers
  com.constraints = ICE.parseICEServers(config.constraints);
  
  // Parse the sdp configuration
  com.sdpConfig = {
    stereo: fn.isSafe(function () { return config.streamingConfig.audio.stereo; }),
    bandwidth: com.bandwidth
  };
  
  // Start timer
  /*com.healthTimer = setTimeout(function () {
    if (!fn.isEmpty(com.healthTimer)) {
      log.debug('Peer', com.id, 'Restarting negotiation as timer has expired');
      
      clearInterval(com.healthTimer);
      
      com.reconnect();
    }
    
  }, com.iceTrickle ? 10000 : 50000);*/

  fn.runSync(function () {
    com.handler('peer:start', {
      weight: com.weight,
      SDPType: com.SDPType,
      streamingConfig: com.streamingConfig
    });
  });
}