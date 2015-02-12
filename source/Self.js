/**
 * Handles the self connection to the room.
 * @class Self
 * @constructor
 * @param {JSON} config The user configuration.
 * @param {String} config.id The self user id.
 * @param {String} config.username The self user's username received from API server.
 * @param {String} config.timeStamp The self user's timestamp (ISO format) received from API server.
 * @param {String} config.token The self user's token received from API server.
 * @param {String} [config.data] The self user's custom data.
 * @param {Function} listener The listener function.
 * @for Skylink
 * @since 0.6.0
 */
function Self (config) {
  // Reference of instance
  var com = this;

  /**
   * The self user id.
   * @attribute id
   * @type String
   * @private
   * @required
   * @for Self
   * @since 0.6.0
   */
  com.id = null;

  /**
   * The self user data.
   * @attribute data
   * @type String | JSON
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.data = config.data;

  /**
   * The self user username.
   * @attribute username
   * @type String
   * @private
   * @required
   * @for Self
   * @since 0.6.0
   */
  com.username = config.username;

  /**
   * The self user timestamp (ISO format).
   * @attribute timeStamp
   * @type String
   * @private
   * @required
   * @for Self
   * @since 0.6.0
   */
  com.timeStamp = config.timeStamp;

  /**
   * The self user credential.
   * @attribute token
   * @type String
   * @private
   * @required
   * @for Self
   * @since 0.6.0
   */
  com.token = config.token;

  /**
   * The self user local stream connection.
   * @attribute streamConnections
   * @param {Stream} (#peerId) The stream to send for this shared peer connection id.
   * @type JSON
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.streamConnections = {};

  /**
   * The self user browser agent information.
   * @attribute agent
   * @param {String} name The user's browser agent name. For other SDKs, it's indicated
   *    by their type of device <code>E.g. ios, android</code>. For components, it's indicated
   *    by their type <code>E.g. MCU, Recording</code>.
   * @param {Integer} version The user's browser agent version. For other SDKs, it's indicated
   *    by their version of device OS <code>ios8 = 8. android kitkat = 4.4</code>. For components, it's indicated
   *    by their version <code>E.g. 0.1.0, 0.2.0</code>.
   * @param {String} webRTCType The user's browser agent webrtc implementation type. For other SDKs or
   *    components, use <code>other</code>.
   * @type JSON
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.agent = {
    name: window.webrtcDetectedBrowser,
    version: window.webrtcDetectedVersion,
    webRTCType: window.webrtcDetectedType
  };

  /**
   * The self user bandwidth configuration. This does fixes 
   *   the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @attribute bandwidth
   * @param {Integer} [audio] The audio bandwidth configuration.
   * @param {Integer} [video] The video bandwidth configuration.
   * @param {Integer} [data] The data bandwidth configuration.
   * @type JSON
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.bandwidth = {};

  /**
   * The handler that manages all triggers or relaying events.
   * @attribute handler
   * @type Function
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    SelfHandler(com, event, data, listener);
  };

  /**
   * Function to subscribe to when self user object is ready to use.
   * @method onstart
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.onstart = function () {};

  /**
   * Function to subscribe to when self user custom user is connected to room.
   * @method onconnect
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.onconnect = function () {};

  /**
   * Function to subscribe to when self user custom user data is updated.
   * @method onupdate
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.onupdate = function () {};

  /**
   * Function to subscribe to when self has added a stream connection.
   * @method onaddstreamconnection
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.onaddstreamconnection = function () {};

  /**
   * Function to subscribe to when self has stopped a stream connection.
   * @method onremovestreamconnection
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.onremovestreamconnection = function () {};

  /**
   * Function to subscribe to when self has been disconnected from the room.
   * @method ondisconnect
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.ondisconnect = function () {};


  /**
   * Updates the self user data.
   * @method update
   * @for Self
   * @since 0.6.0
   */
  com.update = function (data) {
    com.data = data;

    com.handler('self:update', {
      userData: com.data
    });
  };

  /**
   * Starts a new stream connection.
   * @method addStreamConnection
   * @param {Stream} stream The stream object.
   * @param {String} peerId The shared peer connection id.
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.addStreamConnection = function (stream, peerId) {
    stream.sourceType = 'local';

    stream.parentHandler = com.handler;

    com.streamConnections[peerId] = stream;

    com.handler('self:addstreamconnection', {
      peerId: peerId,
      stream: stream
    });
  };
  
  /**
   * Finds the shared peer connection id from the stream id provided. 
   * @method addStreamConnection
   * @param {Stream} stream The stream object.
   * @param {String} peerId The shared peer connection id.
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.findStreamConnectionId = function (streamId) {
    var key;
    
    for (key in com.streamConnections) {
      if (com.streamConnections.hasOwnProperty(key)) {
        // If matches
        if (com.streamConnections[key].id === streamId) {
          return key;
        }
      }
    }
  };

  /**
   * Stops a stream connection.
   * @method removeStreamConnection
   * @param {String} [peerId] The shared peer connection id. If no
   *    shared peer connection id is provided, it will destroy all streams.
   *    Providing the <code>"main"</code> peer connection id will also result in
   *    destroying all streams.
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.removeStreamConnection = function (peerId) {
    if (fn.isEmpty(peerId) || peerId === 'main') {
      var key;
      
      for (key in com.streamConnections) {
        if (com.streamConnections.hasOwnProperty(key)) {
          com.streamConnections[key].stop();
        }
      }
    
    } else {
      var stream = com.streamConnections[peerId];
  
      if (typeof stream === 'object' ? stream instanceof Stream : false) {
        stream.stop();
        
      } else {
        log.error('Unable to remove stream connection as there is not existing ' +
          'stream connection to the peer connection', peerId);
      }
    }
  };

  /**
   * Gets the self user info.
   * @method getInfo
   * @param {String} [peerId] The shared peer connection id.
   *   If no shared peer connection id is provided, it will return as
   *   <code>"stream"</code> instead of <code>"streams".(#peerId)</code>.
   * @returns {JSON} The self user streaming configuration and custom data.
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
   * @for Self
   * @since 0.6.0
   */
  com.getInfo = function (peerId) {
    var data = {};

    data.userData = com.data;

    data.agent = com.agent;

    data.bandwidth = com.bandwidth;

    // Get all stream connections
    if (fn.isEmpty(peerId)) {
      data.streams = {};

      var key;

      for (key in com.streamConnections) {
        if (com.streamConnections.hasOwnProperty(key)) {
          var stream = com.streamConnections[key];
          data.streams[key] = stream.config;
        }
      }

    // Get that stream connection only
    } else {
      data.stream = data.streams[peerId] || {
        audio: false,
        video: false,
        status: {
          audioMuted: true,
          videoMuted: true
        }
      };
    }

    return data;
  };

  com.handler('self:start', config);
}