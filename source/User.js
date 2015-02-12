/**
 * Handles the user that joins the room.
 * @class User
 * @constructor
 * @param {JSON} config The user configuration.
 * @param {String} config.id The user id.
 * @param {JSON} config.agent The user browser agent information.
 * @param {String} config.agent.name The user browser agent name.
 * @param {Integer} config.agent.version The user browser version.
 * @param {String} config.agent.webRTCType The user browser WebRTC implementation type.
 * @param {JSON|String} config.data The user custom data.
 * @param {JSON} config.stream The streamming configuration for the "main" shared peer connection.
 * @param {JSON|Boolean} [config.stream.audio=false] The audio stream configuration.
 *    If parsed as a boolean, other configuration settings under the audio
 *    configuration would be set as the default setting in the connection.
 * @param {Boolean} [config.stream.audio.stereo=false] The flag that indiciates
 *    if stereo is enabled for this connection.
 * @param {String} [config.stream.audio.sourceId] The source id of the audio MediaStreamTrack
   *    used for this connection.
 * @param {String|Boolean} [config.stream.video=false] The video stream configuration.
 *    If parsed as a boolean, other configuration settings under the video
 *    configuration would be set as the default setting in the connection.
 * @param {JSON} [config.stream.video.resolution] The video streaming resolution.
 * @param {Integer} config.stream.video.resolution.width The video resolution width.
 * @param {Integer} config.stream.video.resolution.height The video resolution height.
 * @param {Integer} config.stream.video.frameRate The video stream framerate.
 * @param {String} [config.stream.video.sourceId] The source id of the video MediaStreamTrack
 *    used for this connection.
 * @param {JSON} config.stream.status The stream MediaStreamTrack status.
 * @param {Boolean} [config.stream.status.audioMuted=false] The flag that indicates if audio is muted.
 *    If audio is set to false, this would be set as true.
 * @param {Boolean} [config.stream.status.videoMuted=false] The flag that indicates if video is muted.
 *    If video is set to false, this would be set as true.
 * @param {JSON} config.bandwidth The bandwidth configuration for the peer connections.
 *    This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
 * @param {Integer} [config.bandwidth.audio] The bandwidth configuration for the audio stream.
 * @param {Boolean} [config.bandwidth.video] The bandwidth configuration for the video stream.
 * @param {Boolean} [config.bandwidth.data] The bandwidth configuration for the data stream.
 * @param {Stream} [config.streamObject] The stream object passed for the "main" peer connection.
 * @param {String} config.SDPType The session description type that the "main" peer connection would send.
 * @param {Function} listener The listener function.
 * @for Skylink
 * @since 0.6.0
 */
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
   * @method onstart
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onstart = function () {};

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
   * The handler that manages all triggers or relaying events.
   * @method handler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for User
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    UserHandler(com, event, data, listener);
  };

  /**
   * Starts a new peer connection to user.
   * @method addConnection
   * @param {JSON} data The shared peer connection streaming configuration.
   * @param {JSON} data.prid The shared peer connection id.
   * @param {Array} data.iceServers The ICE servers the connection should use.
   * @param {JSON} data.stream The streamming configuration for the "main" shared peer connection.
   * @param {JSON|Boolean} [data.stream.stream.audio=false] The audio stream configuration.
   *    If parsed as a boolean, other configuration settings under the audio
   *    configuration would be set as the default setting in the connection.
   * @param {Boolean} [data.stream.stream.audio.stereo=false] The flag that indiciates
   *    if stereo is enabled for this connection.
   * @param {String} [data.stream.stream.audio.sourceId] The source id of the audio MediaStreamTrack
     *    used for this connection.
   * @param {String|Boolean} [data.stream.stream.video=false] The video stream configuration.
   *    If parsed as a boolean, other configuration settings under the video
   *    configuration would be set as the default setting in the connection.
   * @param {JSON} [data.stream.stream.video.resolution] The video streaming resolution.
   * @param {Integer} data.stream.stream.video.resolution.width The video resolution width.
   * @param {Integer} data.stream.stream.video.resolution.height The video resolution height.
   * @param {Integer} data.stream.stream.video.frameRate The video stream framerate.
   * @param {String} [data.stream.stream.video.sourceId] The source id of the video MediaStreamTrack
   *    used for this connection.
   * @param {JSON} data.stream.stream.status The stream MediaStreamTrack status.
   * @param {Boolean} [data.stream.stream.status.audioMuted=false] The flag that indicates if audio is muted.
   *    If audio is set to false, this would be set as true.
   * @param {Boolean} [data.stream.stream.status.videoMuted=false] The flag that indicates if video is muted.
   *    If video is set to false, this would be set as true.
   * @param {JSON} data.bandwidth The bandwidth configuration the peer connections.
   *    This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @param {Integer} [data.bandwidth.audio] The bandwidth configuration for the audio stream.
   * @param {Boolean} [data.bandwidth.video] The bandwidth configuration for the video stream.
   * @param {Boolean} [data.bandwidth.data] The bandwidth configuration for the data stream.
   * @param {String} data.SDPType The session description type that the peer connection would send.
   * @param {Stream} [stream] The stream object.
   * @private
   * @for User
   * @since 0.6.0
   */
  com.addConnection = function (data, stream) {
    var peerConfig = {
      id: data.prid,
      iceServers: data.iceServers,
      bandwidth: data.bandwidth,
      streamingConfig: data.settings
    };
    
    // Add the main streaming config
    com.streamingConfigs[data.stream.prid] = data.settings;
    
    var peer = new Peer(peerConfig, com.handler);
    
    peer.connect(stream);
    
    peer.SDPType = data.SDPType;
    
    com.peers[peer.id] = peer;
    
    com.handler('user:addconnection', {
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
    
    com.handler('user:removeconnection', {
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
  com.getInfo = function () {
    var data = {};
    
    data.userData = com.data;
    
    data.agent = com.agent;
    
    data.streams = {};
    
    var i;
    
    for (i = 0; i < com.peers.length; i += 1) {
      var peer = com.peers[i];
  
      var settings = (fn.isSafe() {
        return peer.stream.config;
      })() || {
        audio: false,
        video: false,
        status: {
          audioMuted: true,
          videoMuted: true
        }
      };
      
      settings.bandwidth = peer.bandwidth || {};
      
      data.streams[peer.id] = settings;
    }

    return data;
  };

  fn.runSync(function () {
    com.handler('user:start', config);
  });
}
