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

  /**
   * The shared peer connection id.
   * @attribute id
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.id = config.id || fn.generateUID();

  /**
   * The peer connection type.
   * @attribute type
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.type = config.id === 'main' ? 'user' : 'stream';

  /**
   * The RTCSessionDescription type that the peer connection would send.
   * Types are <code>"offer"</code> or <code>"answer"</code>.
   * @attribute SDPType
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.SDPType = config.SDPType;

  /**
   * The RTCPeerConnection ICE servers configuration.
   * @attribute ICEConfig
   * @param {Array} iceServers The list of ICE servers this peer connection
   *    would use.
   * @param {JSON} iceServers.(#index) The ICE server.
   * @param {String} iceServers.(#index).credential The ICE server credential (password).
   *    Only used in TURN servers.
   * @param {String} iceServers.(#index).url The ICE server url. For TURN server,
   *   the format may vary depending on the support of the TURN url format.
   * @param {String} iceServers.(#index).username The ICE server username.
   *    Only used in TURN servers for Firefox browsers.
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.ICEConfig = null;

  /**
   * The RTCPeerConnection optional configuration.
   * @attribute optionalConfig
   * @param {Array} optional The optional configuration.
   * @param {JSON} optional.(#index) The optional setting.
   * @param {Boolean} optional.(#index).DtlsSrtpKeyAgreement Required flag
   *    for Chrome and Firefox to interop.
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.optionalConfig = {
    optional: [{
      DtlsSrtpKeyAgreement: true
    }]
  };

  /**
   * The local RTCSessionDescription set for this peer connection.
   * @attribute localDescription
   * @type Object
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.localDescription = null;

  /**
   * The remote RTCSessionDescription set for this peer connection.
   * @attribute remoteDescription
   * @type Object
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.remoteDescription = null;

  /**
   * The datachannels connected to peer connection.
   * @attribute datachannels
   * @param {DataChannel} (#channelId) The datachannel connected to peer.
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.datachannels = {};

  /**
   * The flag that indicates if trickle ICE is enable for this peer connection.
   * @attribute iceTrickle
   * @type Boolean
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.iceTrickle = true;

  /**
   * The timeout that would be invoked when peer connection has expired without
   *   an established connection.
   * @attribute healthTimer
   * @type Function
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.healthTimer = null;

  /**
   * The remote stream received from this peer.
   * @attribute stream
   * @type Stream
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.stream = null;

  /**
   * Stores the streaming configuration for the peer connection.
   * @attribute streamingConfig
   * @param {JSON|Boolean} [audio=false] The audio stream configuration.
   *    If parsed as a boolean, other configuration settings under the audio
   *    configuration would be set as the default setting in the connection.
   * @param {Boolean} [audio.stereo=false] The flag that indiciates
   *    if stereo is enabled for this connection.
   * @param {String} [audio.sourceId] The source id of the audio MediaStreamTrack
     *    used for this connection.
   * @param {String|Boolean} [video=false] The video stream configuration.
   *    If parsed as a boolean, other configuration settings under the video
   *    configuration would be set as the default setting in the connection.
   * @param {JSON} [video.resolution] The video streaming resolution.
   * @param {Integer} video.resolution.width The video resolution width.
   * @param {Integer} video.resolution.height The video resolution height.
   * @param {Integer} video.frameRate The video stream framerate.
   * @param {String} [video.sourceId] The source id of the video MediaStreamTrack
   *    used for this connection.
   * @param {JSON} status The stream MediaStreamTrack status.
   * @param {Boolean} [status.audioMuted=false] The flag that indicates if audio is muted.
   *    If audio is set to false, this would be set as true.
   * @param {Boolean} [status.videoMuted=false] The flag that indicates if video is muted.
   *    If video is set to false, this would be set as true.
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.streamingConfig = config.streamingConfig || {
    audio: false,
    video: false,
    status: {
      audioMuted: true,
      videoMuted: true
    }
  };

  /**
   * The RTCPeerConnection createOffer and createAnswer.
   * @attribute sdpConstraints
   * @param {JSON} mandatory The mandatory constraints. This format is only
   *    for Chrome browsers.
   * @param {Boolean} mandatory.OfferToReceiveAudio The flag that indicates if
   *    this RTCPeerConnection should receive audio.
   * @param {Boolean} mandatory.OfferToReceiveVideo The flag that indicates if
   *    this RTCPeerConnection should receive video.
   * @param {Boolean} OfferToReceiveAudio The flag that indicates if
   *    this RTCPeerConnection should receive audio. This format is only
   *    for Firefox browsers (30+).
   * @param {Boolean} OfferToReceiveVideo The flag that indicates if
   *    this RTCPeerConnection should receive video. This format is only
   *    for Firefox browsers (30+).
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
   * The RTCSessionDescription session description modification configuration.
   * This uses the user's sent streaming configuration.
   * @attribute sdpConfig
   * @param {Boolean} stereo The flag that indicates if stereo is enabled for this connection.
   * @param {JSON} bandwidth The bandwidth configuration the peer connections.
   *    This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @param {Integer} [bandwidth.audio] The bandwidth configuration for the audio stream.
   * @param {Boolean} [bandwidth.video] The bandwidth configuration for the video stream.
   * @param {Boolean} [bandwidth.data] The bandwidth configuration for the data stream.
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.sdpConfig = {
    stereo: false,
    bandwidth: config.bandwidth
  };

  /**
   * The RTCPeerConnection object.
   * @attribute RTCPeerConnection
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.RTCPeerConnection = null;

  /**
   * The generated weight for the "welcome" handshake priority.
   * @attribute weight
   * @type Integer
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.weight = parseInt(fn.generateUID(), 10);


  /**
   * Function to subscribe to when peer connection has been started.
   * @method onconnect
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.onconnect = function () {};

  /**
   * Function to subscribe to when peer connection is established.
   * @method onconnected
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.onconnected = function () {};

  /**
   * Function to subscribe to when ICE connection state changes.
   * @method oniceconnectionstatechange
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.oniceconnectionstatechange = function () {};

  /**
   * Function to subscribe to when ICE gathering state changes.
   * @method onicegatheringstatechange
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.onicegatheringstatechange = function () {};

  /**
   * Function to subscribe to when there is an incoming stream received.
   * @method onaddstream
   * @param {Stream} stream The stream object.
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.onaddstream = function () {};

  /**
   * Function to subscribe to when signaling state has changed.
   * @method onsignalingstatechange
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.onsignalingstatechange = function () {};

  /**
   * Function to subscribe to when peer connection has been restarted.
   * @method onreconnect
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.onreconnect = function () {};

  /**
   * Function to subscribe to when peer connection been disconnected.
   * @method onremoveconnection
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.ondisconnect = function () {};



  /**
   * The handler handles received events.
   * @method routeEvent
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.routeEvent = function (event, data) {
    var params = event.split(':');

    data = data || {};
    data.peerId = com.id;

    fn.applyHandler(PeerEventReceivedHandler, params, [com, data, listener]);

    listener(event, data);

    log.debug('Peer: Received event = ', event, data);
  };

  /**
   * The handler handles received socket message events.
   * @method routeMessage
   * @param {JSON} message The message data.
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.routeMessage = function (message) {
    // Messaging events
    var fn = PeerEventMessageHandler[message.type];

    if (typeof fn === 'function') {
      fn(com, message, listener);
    }

    log.debug('Peer: Received message = ', message.type, message);
  };

  /**
   * The handler handles response events.
   * @method respond
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.respond = function (event, data) {
    var params = event.split(':');

    data = data || {};
    data.id = com.name;

    fn.applyHandler(PeerEventResponseHandler, params, [com, data, listener]);

    listener(event, data);

    log.debug('Peer: Responding with event = ', event, data);
  };

  /**
   * Starts the connection and initializes the RTCPeerConnection object.
   * @method connect
   * @param {Stream} stream The stream object.
   * @private
   * @for Peer
   * @since 0.6.0
   */
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

  /**
   * Restarts the connection and re-initialize the RTCPeerConnection object
   *   to restart the ICE connection.
   * @method reconnect
   * @param {Stream} stream The updated stream object.
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

  /**
   * Stops and closes the RTCPeerConnection connection.
   * @method disconnect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.disconnect = function () {
    if (com.RTCPeerConnection.newSignalingState !== 'closed') {
      com.RTCPeerConnection.close();
    }

    com.respond('peer:disconnect', {});
  };

  /**
   * Binds events to RTCPeerConnection object.
   * @method bind
   * @private
   * @for Peer
   * @since 0.6.0
   */
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

  /**
   * Creates a local offer RTCSessionDescription.
   * @method createOffer
   * @private
   * @for Peer
   * @since 0.6.0
   */
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

  /**
   * Creates a local answer RTCSessionDescription.
   * @method createAnswer
   * @private
   * @for Peer
   * @since 0.6.0
   */
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

  /**
   * Sets local RTCSessionDescription to the RTCPeerConnection.
   * @method setLocalDescription
   * @private
   * @for Peer
   * @since 0.6.0
   */
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

  /**
   * Sets remote RTCSessionDescription to the RTCPeerConnection.
   * @method setRemoteDescription
   * @private
   * @for Peer
   * @since 0.6.0
   */
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
