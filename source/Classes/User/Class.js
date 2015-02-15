function User (config, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

  // Reference of instance
  var com = this;

  /**
   * The user id.
   * @attribute id
   * @type String
   * @readOnly
   * @for User
   * @since 0.6.0
   */
  com.id = config.id;

  /**
   * The user type.
   * @attribute type
   * @type String
   * @default "user"
   * @readOnly
   * @for User
   * @since 0.6.0
   */
  com.type = 'user';

  /**
   * Stores the user data.
   * @attribute data
   * @type JSON
   * @private
   * @for User
   * @since 0.6.0
   */
  com.data = config.data || {};

  /**
   * Stores the browser agent information.
   * @attribute agent
   * @param {String} name The browser agent name.
   * @param {Integer} version The browser agent version.
   * @param {String} webRTCType The browser agent WebRTC type of implementation.
   * @type JSON
   * @private
   * @for User
   * @since 0.6.0
   */
  com.agent = config.agent || {};

  /**
   * Stores the user's bandwidth configuration.
   * @attribute bandwidth
   * @param {Integer} audio The bandwidth audio configuration.
   * @param {Integer} data The bandwidth data configuration.
   * @param {Integer} video The bandwidth video configuration.
   * @type JSON
   * @private
   * @for User
   * @since 0.6.0
   */
  com.bandwidth = config.bandwidth || {};

  /**
   * Stores the list of peer connections to user.
   * @attribute peers
   * @type JSON
   * @private
   * @for User
   * @since 0.6.0
   */
  com.peers = {};


  /**
   * Function to subscribe to when the user object is ready to use.
   * @method onready
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onready = function () {};

  /**
   * Function to subscribe to when user's custom data is updated.
   * @method onupdate
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onupdate = function () {};

  /**
   * Function to subscribe to when user has an established "main" peer connection.
   * @method onconnect
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onconnect = function () {};

  /**
   * Function to subscribe to when user is disconnected from the room.
   * @method ondisconnect
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.ondisconnect = function () {};

  /**
   * Function to subscribe to when a new peer connection is established to user.
   * @method onaddconnection
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onaddconnection = function () {};

  /**
   * Function to subscribe to when a peer connection to user has added.
   * @method onremoveconnection
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onremoveconnection = function () {};

  /**
   * Function to subscribe to when a new data transfer request is initialized from user.
   * @method ondatarequest
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.ondatarequest = function () {};

  /**
   * Function to subscribe to when a new data is received after transfer is completed from user.
   * @method ondata
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.ondata = function () {};

  /**
   * Function to subscribe to when a new message is received from user.
   * @method onmessage
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onmessage = function () {};


  /**
   * The handler handles received events.
   * @method routeEvent
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for User
   * @since 0.6.0
   */
  com.routeEvent = function (event, data) {
    var params = event.split(':');

    data = data || {};
    data.userId = com.id;

    fn.applyHandler(UserEventReceivedHandler, params, [com, data, listener]);

    listener(event, data);

    log.debug('User: Received event = ', event, data);
  };

  /**
   * The handler handles received socket message events.
   * @method routeMessage
   * @param {JSON} message The message received.
   * @private
   * @for User
   * @since 0.6.0
   */
  com.routeMessage = function (message) {
    // Messaging events
    var fn = UserEventMessageHandler[message.type];

    if (typeof fn === 'function') {
      fn(com, message, listener);
    }

    log.debug('User: Received message = ', event, message);
  };

  /**
   * The handler handles response events.
   * @method respond
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for User
   * @since 0.6.0
   */
  com.respond = function (event, data) {
    var params = event.split(':');

    data = data || {};
    data.id = com.id;

    fn.applyHandler(UserEventResponseHandler, params, [com, data, listener]);

    listener(event, data);

    log.debug('User: Responding with even = ', event, data);
  };

  /**
   * Starts a new peer connection to user.
   * @method addConnection
   * @param {JSON} data The shared peer connection streaming configuration.
   * @param {JSON} data.prid The shared peer connection id.
   * @param {Array} data.iceServers The ICE servers the connection should use.
   * @param {JSON} data.stream The streamming configuration for the shared peer connection.
   * @param {JSON|Boolean} [data.stream.audio=false] The audio stream configuration.
   *    If parsed as a boolean, other configuration settings under the audio
   *    configuration would be set as the default setting in the connection.
   * @param {Boolean} [data.stream.audio.stereo=false] The flag that indiciates
   *    if stereo is enabled for this connection.
   * @param {String} [data.stream.audio.sourceId] The source id of the audio MediaStreamTrack
     *    used for this connection.
   * @param {String|Boolean} [data.stream.video=false] The video stream configuration.
   *    If parsed as a boolean, other configuration settings under the video
   *    configuration would be set as the default setting in the connection.
   * @param {JSON} [data.stream.video.resolution] The video streaming resolution.
   * @param {Integer} data.stream.video.resolution.width The video resolution width.
   * @param {Integer} data.stream.video.resolution.height The video resolution height.
   * @param {Integer} data.stream.video.frameRate The video stream framerate.
   * @param {String} [data.stream.video.sourceId] The source id of the video MediaStreamTrack
   *    used for this connection.
   * @param {JSON} data.stream.status The stream MediaStreamTrack status.
   * @param {Boolean} [data.stream.status.audioMuted=false] The flag that indicates if audio is muted.
   *    If audio is set to false, this would be set as true.
   * @param {Boolean} [data.stream.status.videoMuted=false] The flag that indicates if video is muted.
   *    If video is set to false, this would be set as true.
   * @param {JSON} data.bandwidth The bandwidth configuration the peer connections.
   *    This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @param {Integer} [data.bandwidth.audio] The bandwidth configuration for the audio stream.
   * @param {Boolean} [data.bandwidth.video] The bandwidth configuration for the video stream.
   * @param {Boolean} [data.bandwidth.data] The bandwidth configuration for the data stream.
   * @param {String} data.SDPType The session description type that the peer connection would send.
   *    Types are <code>"offer"</code> or <code>"answer"</code>.
   * @param {Stream} [stream] The stream object.
   * @private
   * @for User
   * @since 0.6.0
   */
  com.addConnection = function (data, stream) {
    var peerConfig = {
      id: data.prid,
      iceServers: data.iceServers,
      sdpConfig: {
        bandwidth: data.bandwidth,
        stereo: fn.isSafe(function () {
          return !!data.settings.audio.stereo;
        }),
        SDPType: data.SDPType
      },
      streamingConfig: data.settings
    };

    // Add the main streaming config
    com.streamingConfigs[data.stream.prid] = data.settings;

    var peer = new Peer(peerConfig, com.routeEvent);

    peer.connect(stream);

    com.peers[peer.id] = peer;

    com.respond('user:addconnection', {
      peer: peer,
      peerId: data.prid,
      config: peerConfig
    });
  };

  /**
   * Stops a peer connection to user.
   * @method removeConnection
   * @param {String} peerId The shared peer connection id.
   * @private
   * @for User
   * @since 0.6.0
   */
  com.removeConnection = function (peerId) {
    var peer = com.peers[peerId];

    if (!fn.isEmpty(peer)) {
      peer.disconnect();
    }

    com.respond('user:removeconnection', {
      peerId: peerId
    });
  };

  /**
   * Disconnects this user connection.
   * @method disconnect
   * @for User
   * @since 0.6.0
   */
  com.disconnect = function () {
    fn.forEach(com.peers, function (peer, id) {
      peer.disconnect();
    });
  };

  /**
   * Gets this user information.
   * @method getInfo
   * @param {String} [peerId] The shared peer connection id to retrieve
   *    that streaming information only.
   * @returns {JSON} The user streaming configuration and custom data.
   * - <code>userData</code> <var>: <b>type</b> String | JSON</var><br>
   *   The custom data.
   * - <code>agent</code> <var>: <b>type</b> JSON</var><br>
   *   The user's browser agent information.
   * - <code>agent.name</code> <var>: <b>type</b> String</var><br>
   *   The user's browser agent name.
   * - <code>agent.version</code> <var>: <b>type</b> Integer</var><br>
   *   The user's browser agent version.
   * - <code>agent.webRTCType</code> <var>: <b>type</b> String</var><br>
   *   The user's browser webrtc implementation type.
   * - <code>streams</code> <var>: <b>type</b> JSON</var><br>
   *   The list of peer connections streaming.
   * - <code>streams.(#peerId)</code> <var>: <b>type</b> JSON</var><br>
   *   The peer connection streaming information.
   * - <code>streams.(#peerId).audio</code> <var>: <b>type</b> JSON|Boolean</var><br>
   *   The audio streaming information. If there is no stream connection with the peer,
   *   it's <code>false</code>.
   * - <code>streams.(#peerId).audio.stereo</code> <var>: <b>type</b> Boolean</var><br>
   *   The flag that indicates if stereo is enabled for this connection. By default,
   *   it's <code>false</code>.
   * - <code>streams.(#peerId).audio.sourceId</code> <var>: <b>type</b> String</var><br>
   *   The audio MediaStreamTrack source used for this connection.
   * - <code>streams.(#peerId).video</code> <var>: <b>type</b> JSON|Boolean</var><br>
   *   The video streaming information. If there is no stream connection with the peer,
   *   it's <code>false</code>.
   * - <code>streams.(#peerId).video.resolution</code> <var>: <b>type</b> JSON</var><br>
   *   The video stream resolution.
   * - <code>streams.(#peerId).video.resolution.width</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution height.
   * - <code>streams.(#peerId).video.resolution.height</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution width.
   * - <code>streams.(#peerId).video.frameRate</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution framerate.
   * - <code>streams.(#peerId).video.sourceId</code> <var>: <b>type</b> String</var><br>
   *   The video MediaStreamTrack source used for this connection.
   * - <code>streams.(#peerId).status</code> <var>: <b>type</b> JSON</var><br>
   *   The MediaStreamTracks enabled status (muted/unmuted).
   * - <code>streams.(#peerId).status.audioMuted</code> <var>: <b>type</b> Boolean</var><br>
   *   The audio MediaStreamTrack enabled status (muted/unmuted).
   * - <code>streams.(#peerId).status.audioMuted</code> <var>: <b>type</b> Boolean</var><br>
   *   The video MediaStreamTrack enabled status (muted/unmuted).
   * - <code>bandwidth</code> <var>: <b>type</b> JSON</var><br>
   *   The bandwidth configuration for the peer connections.
   *   This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * - <code>bandwidth.data</code> <var>: <b>type</b> Integer</var><br>
   *   The bandwidth configuration for data stream.
   * - <code>bandwidth.video</code> <var>: <b>type</b> Integer</var><br>
   *   The bandwidth configuration for video stream.
   * - <code>bandwidth.audio</code> <var>: <b>type</b> Integer</var><br>
   *   The bandwidth configuration for audio stream.
   * @for User
   * @since 0.6.0
   */
  com.getInfo = function (peerId) {
    var data = {};

    // Pass jshint error
    var getStreamSettingsFn = function (peer) {
      var stream = peer.stream || {};
      return stream.config || {
        audio: false,
        video: false,
        status: {
          audioMuted: true,
          videoMuted: true
        }
      };
    };

    data.userData = com.data;
    data.agent = com.agent;
    data.bandwidth = com.bandwidth;


    // If it's retrieving on peer connection streaming information or not
    if (!fn.isEmpty(peerId)) {
      var onepeer = com.peers[peerId];

      // If the peer connection is empty, throw an exception
      if (!fn.isEmpty(onepeer)) {
        data.stream = getStreamSettingsFn(onepeer);

      } else {
        throw new Error('Peer connection for "' + peerId + '" does not exist');
      }


    } else {
      data.streams = {};

      var key;

      for (key in com.peers) {
        if (com.peers.hasOwnProperty(key)) {
          var peer = com.peers[key];

          var settings = getStreamSettingsFn(peer);

          settings.bandwidth = peer.bandwidth || {};

          data.streams[peer.id] = settings;
        }
      }
    }
    return data;
  };

  fn.runSync(function () {
    com.respond('user:ready', config);
  });
}