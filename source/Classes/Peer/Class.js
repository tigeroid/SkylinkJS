/**
 * Handles the MediaStream object connection and events.
 * @class Peer
 * @constructor
 * @param {Stream} stream The stream object to send. Leave as <code>null</code> for no streaming.
 * @param {JSON} config The connection configuration.
 * @param {Boolean} config.dataChannel The flag to enable datachannel connection or not.
 * @param {Boolean} config.trickleIce The flag to enable trickle ICE for this connection or not.
 * @param {JSON} config.stream The stream connection configuration.
 * @param {JSON|Boolean} [config.stream.audio=false] The audio stream configuration.
 *    If parsed as a boolean, other configuration settings under the audio
 *    configuration would be set as the default setting in the connection.
 * @param {Boolean} [config.stream.audio.stereo=false] The flag that indiciates
 *    if stereo is enabled for this stream connection.
 * @param {String} [config.stream.audio.sourceId] The source id of the audio MediaStreamTrack
 *    used for this connection.
 * @param {Boolean} [config.stream.audio.mute=false] The flag that indicates if audio stream
 *    should be muted when retrieving.
 * @param {String|Boolean} [config.stream.video=false] The video stream configuration.
 *    If parsed as a boolean, other configuration settings under the video
 *    configuration would be set as the default setting in the connection.
 * @param {JSON} [config.stream.video.resolution] The video streaming resolution.
 * @param {Integer} config.stream.video.resolution.width The video resolution width.
 * @param {Integer} config.stream.video.resolution.height The video resolution height.
 * @param {Integer} config.stream.video.frameRate The video stream framerate.
 * @param {String} [config.stream.video.sourceId] The source id of the video MediaStreamTrack
 *    used for this connection.
 * @param {Boolean} [config.stream.video.mute=false] The flag that indicates if video stream
 *    should be muted when retrieving.
 * @param {Function} [listener] The listener function.
 * @for Skylink
 * @since 0.6.0
 */
function Peer(stream, config, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

  // Reference of instance
  var com = this;

  /* Attributes */
  /**
   * The shared peer connection id.
   * @attribute id
   * @type String
   * @for Peer
   * @since 0.6.0
   */
  com.id = config.id || fn.generateUID();

  /**
   * The peer connection type.
   * - <code>"user"</code> denotes that this connection is used for the
   *   main peer connection.
   * - <code>"stream"</code> denotes that this connection is used for
   *   sending an extra stream connection.
   * @attribute type
   * @type String
   * @for Peer
   * @since 0.6.0
   */
  com.type = config.id === 'main' ? 'user' : 'stream';

  /**
   * The RTCSessionDescription type that the peer connection would send.
   * Types are <code>"offer"</code> or <code>"answer"</code>.
   * This is used for superclasses to check and send the relevant
   *   information.
   * @attribute _sdpType
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._sdpType = config.sdpType || 'answer';

  /**
   * The local RTCSessionDescription set for this peer connection.
   * @attribute _localDescription
   * @type Object
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._localDescription = null;

  /**
   * The remote RTCSessionDescription set for this peer connection.
   * @attribute _remoteDescription
   * @type Object
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._remoteDescription = null;

  /**
   * The datachannels connected to peer connection.
   * @attribute _datachannels
   * @param {DataChannel} (#channelId) The datachannel connected to peer.
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._dataChannels = {};

  /**
   * The flag that indicates if datachannel connection should be enabled or not.
   * @attribute _dataConnection
   * @type Boolean
   * @default this.type === 'user' ? true : false
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._dataConnection = com.type === 'user' ? (typeof config.dataChannel === 'boolean' ?
    config.dataChannel : true) : false;

  /**
   * The flag that indicates if trickle ICE is enable for this peer connection.
   * @attribute _trickleIce
   * @type Boolean
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._trickleIce = typeof config.trickleIce === 'boolean' ? config.trickleIce : true;

  /**
   * The timeout that would be invoked when peer connection has expired without
   *   an established connection.
   * @attribute _healthTimer
   * @type Object
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._healthTimer = null;

  /**
   * The remote stream received from this peer.
   * @attribute _stream
   * @type Stream
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._stream = null;

  /**
   * Stores the streaming configuration for the peer connection.
   * @attribute _streamingConfig
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
  com._streamingConfig = null;

  /**
   * The RTCSessionDescription session description modification configuration.
   * This uses the user's sent streaming configuration.
   * @attribute _sdpConfig
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
  com._sdpConfig = null;

  /**
   * The RTCPeerConnection object.
   * @attribute _RTCPeerConnection
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._RTCPeerConnection = null;

  /**
   * The generated weight for the "welcome" handshake priority.
   * @attribute _weight
   * @type Integer
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._weight = parseInt(fn.generateUID(), 10);


  /* Methods */
  /**
   * The handler that the manages response and received events.
   * @method _handler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._handler = function (event, data) {
    PeerHandler(com, event, data, listener);
  };

  /**
   * Restarts the connection and re-initialize the RTCPeerConnection object
   *   to restart the ICE connection.
   * @method reconnect
   * @param {Stream} stream The updated stream object.
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
        com._handler('peer:stream', {
          stream: stream
        });
      }

      com._handler('peer:reconnect', {});
    }
    com.bind(peer);
  };

  /**
   * Stops and closes the RTCPeerConnection connection.
   * @method _disconnect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._disconnect = function () {
    if (com.RTCPeerConnection.newSignalingState !== 'closed') {
      com.RTCPeerConnection.close();
    }

    com._handler('peer:disconnect', {});
  };

  /**
   * Binds events to RTCPeerConnection object.
   * @method _bind
   * @param {Object} bind The RTCPeerConnection object.
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._bind = function (bind) {
    // Bind events to RTCPeerConnection
    // Un-implemented events functions
    // bind.onidentityresult = function () {};
    // bind.onidpassertionerror = function () {};
    // bind.onidpvalidationerror = function () {};
    // bind.onpeeridentity = function () {};

    bind.ondatachannel = function (event) {
      var eventChannel = event.channel || event;

      // Send the channel only when channel has started
      var channel = new DataChannel(eventChannel, function (event, data) {

        com._handler(event, data);

        if (event === 'datachannel:start') {
          com._handler('peer:datachannel', {
            channel: channel,
            sourceType: 'remote'
          });
        }
      });
    };

    bind.onaddstream = function (event) {
      var eventStream = event.stream || event;

      // Send the stream only when stream has started
      var stream = new Stream(eventStream, config.streamingConfig, function (event, data) {

        com._handler(event, data);

        if (event === 'stream:start') {
          com._handler('peer:stream', {
            sourceType: 'remote',
            stream: stream
          });
        }
      });
    };

    bind.onremovestream = function (event) {};

    bind.onicecandidate = function (event) {
      var eventCandidate = event.candidate || event;

      if (fn.isEmpty(eventCandidate.candidate)) {
        com._handler('candidate:gathered', {
          candidate: eventCandidate
        });
        return;
      }

      // Implement ice trickle disabling here

      com._handler('peer:icecandidate', {
        sourceType: 'local',
        candidate: eventCandidate
      });
    };

    // Use helper function
    PeerHelper.ICE.state(bind);

    bind.oniceconnectionnewstatechange = function (event) {
      // Connection is successful
      if (com.RTCPeerConnection.newIceConnectionState === 'connected') {
        // Stop timer
        if (!fn.isEmpty(com.healthTimer)) {
          log.debug('Peer', com.id, 'Stopping health timer as connection is established.');

          clearInterval(com.healthTimer);
        }
      }

      com._handler('peer:iceconnectionstate', {
        state: com.RTCPeerConnection.newIceConnectionState
      });
    };

    bind.onsignalingstatechange = function (event) {
      com._handler('peer:signalingstate', {
        state: com.RTCPeerConnection.newSignalingState
      });
    };

    bind.onicegatheringstatechange = function () {
      com._handler('peer:icegatheringstate', {
        state: com.RTCPeerConnection.iceGatheringState
      });
    };

    bind.onnegotiationneeded = function (event) {
      com._handler('peer:ready', {
        weight: com._weight,
        sdpType: com._sdpType,
        streamingConfig: com._streamingConfig
      });
    };

    com.RTCPeerConnection = bind;

    fn.runSync(function () {
      com._handler('peer:ready', {
        weight: com.weight,
        SDPType: com.SDPType,
        streamingConfig: com.streamingConfig
      });
    });
  };

  /**
   * Starts and initiates the handshaking to establish the RTCPeerConnection.
   * @method _initiate
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._initiate = function () {
    // Create datachannel
    if (com._dataConnection) {
      var eventChannel = com.RTCPeerConnection.createDataChannel('main');

      // Send the channel only when channel has started
      var channel = new DataChannel(eventChannel, function (event, data) {

        com._handler(event, data);

        com._handler('peer:datachannel', {
          sourceType: 'local',
          channel: channel
        });
      });
    }

    com.RTCPeerConnection.createOffer(function (offer) {
      offer.sdp = SDP.configure(offer.sdp, com.sdpConfig);

      com.localDescription = offer;

      com._handler('peer:offer', {
        offer: offer
      });

    }, function (error) {
      throw error;

    }, com.sdpConstraints);
  };

  /**
   * Starts and initiates the handshaking to establish the RTCPeerConnection.
   * @method _initiate
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.createAnswer = function () {
    com.RTCPeerConnection.createAnswer(function (answer) {
      answer.sdp = SDP.configure(answer.sdp, com.sdpConfig);

      com.localDescription = answer;

      com._handler('peer:answer', {
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
      com._handler('peer:localdescription', {
        localDescription: localDescription.sdp,
        type: localDescription.type,
      });

      if (localDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-local-answer';

        com._handler('peer:signalingstate', {
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
      com._handler('peer:remotedescription', {
        remoteDescription: remoteDescription.sdp,
        type: remoteDescription.type
      });

      if (remoteDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-remote-answer';

        com._handler('peer:signalingstate', {
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
  /**
   * Function to subscribe to when peer connection has been started and
   *   class object is ready to use.
   * @method onready
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.onready = function () {};

  /**
   * Function to subscribe to when peer connection is established.
   * @method onconnect
   * @eventhandler true
   * @for Peer
   * @since 0.6.0
   */
  com.onconnect = function () {};

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


  /* Beginning Logic */
  // Throw an error if adapterjs is not loaded
  if (!window.RTCPeerConnection) {
    throw new Error('Required dependency adapterjs not found');
  }

  // Parse bandwidth
  com._streamingConfig = config.streamingConfig || {
    audio: false,
    video: false,
    status: {
      audioMuted: true,
      videoMuted: true
    }
  };

  // Parse sdp modification settings
  com._sdpConfig = {
    stereo: !!config.streamingConfig.audio.stereo,
    bandwidth: StreamParser.parseBandwidthConfig(config.bandwidth)
  };

  // Parse constraints ICE servers
  var peerConfig = {
    iceServers: config.iceServers
  };

  // Create the object
  var peer = PeerHelper.create(peerConfig);

  // Bind peer
  com._bind(peer);

  // Send stream
  fn.runSync(function () {
    // Start timer
    /*com.healthTimer = setTimeout(function () {
      if (!fn.isEmpty(com.healthTimer)) {
        log.debug('Peer', com.id, 'Restarting negotiation as timer has expired');

        clearInterval(com.healthTimer);

        com.reconnect();
      }

    }, com.iceTrickle ? 10000 : 50000);*/

    // When peer connection is ready to use, the connection connect() can start
    if ((!fn.isEmpty(stream)) ? stream instanceof Stream : false) {
      // Check class type
      peer.addStream(stream.MediaStream);

      com._handler('peer:stream', {
        sourceType: 'local',
        stream: stream
      });

    } else {
      com._handler('peer:ready', {
        weight: com._weight,
        sdpType: com._sdpType,
        streamingConfig: com._streamingConfig
      });
    }
  });
}