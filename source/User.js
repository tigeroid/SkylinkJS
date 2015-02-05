function User (config, listener) {
  'use strict';

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
  com.id = config.mid;
  
  /**
   * The user type.
   * @attribute type
   * @type String
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
  com.data = config.userInfo.data || {};

  /**
   * Stores the browser agent information.
   * @attribute agent
   * @type JSON
   * @private
   * @for User
   * @since 0.6.0
   */
  com.agent = config.agent || {};
  
  /**
   * Stores the bandwidth configuration.
   * @attribute bandwidth
   * @type JSON
   * @private
   * @for User
   * @since 0.6.0
   */
  com.bandwidth = config.userInfo.settings.bandwidth || {};
  
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
   * The handler that manages all triggers or relaying events.
   * @attribute handler
   * @type Function
   * @private
   * @for User
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    UserHandler(com, event, data, listener);
  };
  
  
  /**
   * Function to subscribe to when user's custom data is updated.
   * @method onupdate
   * @for User
   * @since 0.6.0
   */
  com.onupdate = function () {};
  
  /**
   * Function to subscribe to when user is disconnected from the room.
   * @method ondisconnect
   * @for User
   * @since 0.6.0
   */
  com.ondisconnect = function () {};
  
  /**
   * Function to subscribe to when a new peer connection is established to user.
   * @method onaddconnection
   * @for User
   * @since 0.6.0
   */
  com.onaddconnection = function () {};
  
  /**
   * Function to subscribe to when a peer connection to user has added.
   * @method onremoveconnection
   * @for User
   * @since 0.6.0
   */
  com.onremoveconnection = function () {};
  
  /**
   * Function to subscribe to when a new data transfer request is initialized from user.
   * @method ondatarequest
   * @for User
   * @since 0.6.0
   */
  com.ondatarequest = function () {};

  /**
   * Function to subscribe to when a new data is received after transfer is completed from user.
   * @method ondata
   * @for User
   * @since 0.6.0
   */
  com.ondata = function () {};
  
  /**
   * Function to subscribe to when a new message is received from user.
   * @method ondatatransfer
   * @for User
   * @since 0.6.0
   */
  com.onmessage = function () {};


  /**
   * Starts a new peer connection to user.
   * @method addConnection
   * @for User
   * @since 0.6.0
   */
  com.addConnection = function (data, stream) {
    console.info(data.iceServers);
  
    var peerConfig = {
      id: data.prid,
      constraints: data.iceServers,
      bandwidth: data.bandwidth,
      streamingConfig: {
        audio: fn.isSafe(function () { 
          return data.userInfo.settings.audio;
        }),
        video: fn.isSafe(function () { 
          return data.userInfo.settings.video;
        }),
        status: fn.isSafe(function () { 
          return data.userInfo.settings.mediaStatus;
        })
      }
    };
    
    var peer = new Peer(peerConfig, com.handler);

    console.info('data:', stream);

    peer.connect(stream);
    
    com.peers[peer.id] = peer;
  };
 
  /**
   * Stops a peer connection to user.
   * @method addConnection
   * @for User
   * @since 0.6.0
   */
  com.removeConnection = function (peerId) {
    com.peers[peerId].disconnect();
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
   * @for User
   * @since 0.6.0
   */
  com.getInfo = function () {
    var data = {};
    
    data.userData = com.data;
    
    data.agent = com.agent;
    
    data.settings = {};
    
    if (fn.isEmpty(com.peers)) {
      return data;
    
    } else {
      fn.forEach(com.peers, function (peer, id) {
        var stream = peer.stream;

        // Check if there is stream
        if (!fn.isEmpty(stream)) {
          data.settings[stream.id] = {
            audio: stream.config.audio,
            video: stream.config.video,
            mediaStatus: stream.config.status,
            bandwidth: com.bandwidth || StreamParser.defaultConfig.bandwidth
          };
        
        // No stream
        } else {
          data.settings[id] = {
            audio: false,
            video: false,
            mediaStatus: { audioMuted: true, videoMuted: true },
            bandwidth: com.bandwidth || StreamParser.defaultConfig.bandwidth
          };
        }
      
      }, function () {
        return data;
      });
    }
  };
}
