/**
 * Handles the PeerConnection and Peer data.
 * @class Peer
 * @for Skylink
 * @since 0.6.0
 */
function Peer(config, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

  // Reference of instance
  var com = this;

  /* Attributes */
  com.id = config.id || fn.generateUID();
  com.type = config.id === 'main' ? 'user' : 'stream';
  com._SDPType = config.SDPType;
  com._ICEConfig = null;
  com._optionalConfig = {
    optional: [{
      DtlsSrtpKeyAgreement: true
    }]
  };
  com._localDescription = null;
  com._remoteDescription = null;
  com._dataChannels = {};
  com._iceTrickle = true;
  com._healthTimer = null;
  com._stream = null;
  com._streamingConfig = config.streamingConfig || {
    audio: false,
    video: false,
    status: {
      audioMuted: true,
      videoMuted: true
    }
  };
  com._sdpConstraints = {
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true
    }
  };
  com._sdpConfig = {
    stereo: false,
    bandwidth: config.bandwidth
  };
  com._RTCPeerConnection = null;
  com._weight = parseInt(fn.generateUID(), 10);


  /* Methods */
  com._handler = function (event, data) {
    PeerHandler(com, event, data, listener);
  };

  com.connect = function (stream) {
    var peer = new window.RTCPeerConnection(com.ICEConfig, com.optionalConfig);

    // Send stream
    if ((!fn.isEmpty(stream)) ? stream instanceof Stream : false) {

      // Set the data
      com.stereo = fn.isSafe(function () { return stream.audio.stereo; });

      // Check class type
      peer.addStream(stream.MediaStream);

      com.respond('peer:stream', {
        sourceType: 'local',
        stream: stream
      });
    }

    com.bind(peer);
  };

  com.reconnect = function (stream) {
    var hasStream = !!stream;

    stream = stream || fn.isSafe(function () {
      return com.RTCPeerConnection.getLocalStreams()[0]; });

    com.RTCPeerConnection.close();
    com.RTCPeerConnection = null;

    var peer = new window.RTCPeerConnection(com.ICEConfig, com.config);

    // Send stream
    if ((!fn.isEmpty(stream)) ? stream instanceof Stream : false) {

      // Adds the RTCMediaStream object to RTCPeerConnection
      peer.addStream(stream.MediaStream);

      if (hasStream) {
        com.respond('peer:stream', {
          stream: stream
        });
      }

      com.respond('peer:reconnect', {});
    }
    com.bind(peer);
  };

  com.disconnect = function () {
    if (com.RTCPeerConnection.newSignalingState !== 'closed') {
      com.RTCPeerConnection.close();
    }

    com.respond('peer:disconnect', {});
  };

  com.bind = function (bindPeer) {
    bindPeer.iceConnectionFiredStates = [];
    bindPeer.queueCandidate = [];
    bindPeer.newSignalingState = 'new';
    bindPeer.newIceConnectionState = 'new';

    bindPeer.ondatachannel = function (event) {
      var eventChannel = event.channel || event;

      // Send the channel only when channel has started
      var channel = new DataChannel(eventChannel, function (event, data) {

        com.respond(event, data);

        if (event === 'datachannel:start') {
          com.respond('peer:datachannel', {
            channel: channel,
            sourceType: 'remote'
          });
        }
      });
    };

    bindPeer.onaddstream = function (event) {
      var eventStream = event.stream || event;

      // Send the stream only when stream has started
      var stream = new Stream(eventStream, config.streamingConfig, function (event, data) {

        com.routeEvent(event, data);

        if (event === 'stream:start') {
          com.respond('peer:stream', {
            sourceType: 'remote',
            stream: stream
          });
        }
      });
    };

    bindPeer.onicecandidate = function (event) {
      var eventCandidate = event.candidate || event;

      if (fn.isEmpty(eventCandidate.candidate)) {
        com.respond('candidate:gathered', {
          candidate: eventCandidate
        });
        return;
      }

      // Implement ice trickle disabling here

      com.respond('peer:icecandidate', {
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

      com.respond('peer:iceconnectionstate', {
        state: com.RTCPeerConnection.newIceConnectionState
      });
    };

    bindPeer.onsignalingstatechange = function (event) {
      com.respond('peer:signalingstate', {
        state: com.RTCPeerConnection.newSignalingState
      });
    };

    bindPeer.onicegatheringstatechange = function () {
      com.respond('peer:icegatheringstate', {
        state: com.RTCPeerConnection.iceGatheringState
      });
    };

    com.RTCPeerConnection = bindPeer;

    fn.runSync(function () {
      com.respond('peer:connect', {
        weight: com.weight,
        SDPType: com.SDPType,
        streamingConfig: com.streamingConfig
      });
    });
  };

  com.createOffer = function () {
    // Create datachannel
    if (globals.dataChannel && com.type === 'user') {
      var eventChannel = com.RTCPeerConnection.createDataChannel('main');

      // Send the channel only when channel has started
      var channel = new DataChannel(eventChannel, function (event, data) {

        com.respond(event, data);

        com.respond('peer:datachannel', {
          sourceType: 'local',
          channel: channel
        });
      });
    }

    com.RTCPeerConnection.createOffer(function (offer) {
      offer.sdp = SDP.configure(offer.sdp, com.sdpConfig);

      com.localDescription = offer;

      com.respond('peer:offer', {
        offer: offer
      });

    }, function (error) {
      throw error;

    }, com.sdpConstraints);
  };

  com.createAnswer = function () {
    com.RTCPeerConnection.createAnswer(function (answer) {
      answer.sdp = SDP.configure(answer.sdp, com.sdpConfig);

      com.localDescription = answer;

      com.respond('peer:answer', {
        answer: answer
      });

      com.setLocalDescription();

    }, function (error) {
      throw error;

    }, com.sdpConstraints);
  };

  com.setLocalDescription = function () {
    var localDescription = com.localDescription;

    com.RTCPeerConnection.setLocalDescription(localDescription, function () {
      com.respond('peer:localdescription', {
        localDescription: localDescription.sdp,
        type: localDescription.type,
      });

      if (localDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-local-answer';

        com.respond('peer:signalingstate', {
          state: com.RTCPeerConnection.newSignalingState
        });

      } else {
        com.setRemoteDescription();
      }

    }, function (error) {
      throw error;
    });
  };

  com.setRemoteDescription = function () {
    var remoteDescription = com.remoteDescription;

    com.RTCPeerConnection.setRemoteDescription(remoteDescription, function () {
      com.respond('peer:remotedescription', {
        remoteDescription: remoteDescription.sdp,
        type: remoteDescription.type
      });

      if (remoteDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-remote-answer';

        com.respond('peer:signalingstate', {
          state: com.RTCPeerConnection.newSignalingState
        });

      } else {
        com.createAnswer();
      }

      // Add all ICE Candidate generated before remote description of answer and offer
      ICE.popCandidate(com.RTCPeerConnection, com.handler);

    }, function (error) {
      throw error;
    });
  };
  
  /* Event Handlers */
  com.onconnect = function () {};
  com.onconnected = function () {};
  com.oniceconnectionstatechange = function () {};
  com.onicegatheringstatechange = function () {};
  com.onaddstream = function () {};
  com.onsignalingstatechange = function () {};
  com.onreconnect = function () {};
  com.ondisconnect = function () {};

  // Throw an error if adapterjs is not loaded
  if (!window.RTCPeerConnection) {
    throw new Error('Required dependency adapterjs not found');
  }

  // Parse bandwidth
  com.streamingConfig.bandwidth = StreamParser.parseBandwidthConfig(com.streamingConfig.bandwidth);

  // Parse constraints ICE servers
  var iceServers = ICE.parseICEServers(config.iceServers);

  com.ICEConfig = {
    iceServers: iceServers
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
    // When peer connection is ready to use, the connection connect() can start
    com.respond('peer:start', {
      weight: com.weight,
      SDPType: com.SDPType,
      streamingConfig: com.streamingConfig
    });
  });
}