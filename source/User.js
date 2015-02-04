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
  com.bandwidth = config.settings.bandwidth || {};
  
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
    
    var peer = new Peer(peerConfig, com.manager);

    peer.connect(stream);
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
    com.peers.forEach(function (value, key) {
      value.disconnect();
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
      var streamList = fn.clone(com.peers);
      
      streamList.forEach(function (value, key) {
        // set the key settings
        var peerSettings = value.stream ? 
          value.stream.config || {} : {};
        
        // Filter audio and video bandwidth?
        peerSettings.bandwidth = com.bandwidth || {};
        
        data.settings[key] = data;
        
        delete streamList[key];
        
        if (fn.isEmpty(streamList)) {
          return data;
        }
      });
    }
  };
}
