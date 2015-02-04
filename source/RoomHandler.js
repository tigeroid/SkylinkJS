/**
 * Stores the room class events.
 * @attribute RoomHandlerEvent
 * @for Room
 * @since 0.6.0
 */
var RoomHandlerEvent = {
  /**
   * Handles socket events that will require the room class to
   * trigger the listener.
   * @property socket
   * @type JSON
   * @private
   * @since 0.6.0
   */
  socket: {
    /**
     * Handles the socket connect state.
     * @property connect
     * @type Function
     * @private
     * @since 0.6.0
     */
    connect: function (com, data, listener) {
      com.socket.send({
        type: 'joinRoom',
        uid: com.self.username,
        cid: com.key,
        rid: com.id,
        userCred: com.self.token,
        timeStamp: com.self.timeStamp,
        apiOwner: com.owner,
        roomCred: com.token,
        start: com.startDateTime,
        len: com.duration
      });  
    },
    
    /**
     * Handles the socket disconnect state.
     * @property disconnect
     * @type Function
     * @private
     * @since 0.6.0
     */
    disconnect: function (com, data, listener) {
      listener('room:leave', {
        id: com.id,
        name: com.name
      });

      if (typeof com.onleave === 'function') {
        com.onleave();
      }
    },
    
    /**
     * Handles the socket disconnect state.
     * @property disconnect
     * @type Function
     * @private
     * @since 0.6.0
     */
    error: function (com, data, listener) {
      com.handler('trigger:error', {
        error: data,
        state: -2
      });
    }
  },
  
  /**
   * Handles events that will require the peer class to
   * trigger peer class events.
   * @property trigger
   * @type JSON
   * @private
   * @since 0.6.0
   */
  trigger: {
    /**
     * Handles the ice gathering state trigger.
     * @property icegatheringstate
     * @type Function
     * @private
     * @since 0.6.0
     */
    error: function (com, data, listener) {
      com.readyState = data.state;
  
      listener('room:error', {
        id: com.id,
        name: com.name,
        error: data.error,
        state: data.state
      });

      if (typeof com.onerror === 'function') {
        com.onerror({
          error: data.error,
          state: data.state
        });
      }
    },
    
    /**
     * Handles the ice candidate trigger.
     * @property icecandidate
     * @type Function
     * @private
     * @since 0.6.0
     */
    'icecandidate': function (com, data, listener) {
      var candidate = data.candidate;

      if (data.type === 'remote') {
        ICE.addCandidate(com.RTCPeerConnection, candidate, com.handler);
      }

      listener('peer:icecandidate', {
        id: com.id,
        type: data.type,
        candidate: data.candidate
      });
    },
    
    /**
     * Handles the signaling state trigger.
     * @property signalingstate
     * @type Function
     * @private
     * @since 0.6.0
     */
    'signalingstate': function (com, data, listener) {
      var state = com.RTCPeerConnection.newSignalingState;

      listener('peer:signalingstate', {
        id: com.id,
        state: state
      });

      if (typeof com.onsignalingstatechange === 'function') {
        com.onsignalingstatechange(state);
      }
    },
    
    /**
     * Handles the datachannel state trigger.
     * @property datachannel
     * @type Function
     * @private
     * @since 0.6.0
     */
    'datachannel': function (com, data, listener) {
      var channel = new DataChannel(data.channel, { type: data.type }, com.manager);

      com.datachannels[channel.id] = channel;

      listener('peer:datachannel', {
        id: com.id,
        channel: data.channel,
        type: data.type
      });
    },
    
    /**
     * Handles the stream trigger.
     * @property icegatheringstate
     * @type Function
     * @private
     * @since 0.6.0
     */
    'stream': function (com, data, listener) {
      var stream;

      if (data.stream instanceof Stream) {
        stream = data.stream;

      } else {
        stream = new Stream(data.stream, { 
          type: data.type, 
          audio: config.streamingConfig.audio,
          video: config.streamingConfig.video

        }, com.manager);

        com.stream = stream;
      }

      listener('peer:stream', {
        id: com.id,
        stream: data.stream,
        type: data.type
      });
    },
    
    /**
     * Handles the reconnect state trigger.
     * @property icegatheringstate
     * @type Function
     * @private
     * @since 0.6.0
     */
    'reconnect': function (com, data, listener) {
      listener('peer:reconnect', {
        id: com.id
      });

      if (typeof com.onreconnect === 'function') {
        com.onreconnect();
      }
    },
    
    /**
     * Handles the handshake state trigger.
     * @property icegatheringstate
     * @type Function
     * @private
     * @since 0.6.0
     */
    'handshake': function (com, data, listener) {
      if (data.type === 'welcome') {
        com.createOffer();
      } 

      if (data.type === 'offer' || data.type === 'answer') {
        com.remoteDescription = new window.RTCSessionDescription(data);

        com.setLocalDescription();
      }
    },
    
    /**
     * Handles the disconnected state trigger.
     * @property icegatheringstate
     * @type Function
     * @private
     * @since 0.6.0
     */
    'disconnect': function (com, data, listener) {
      listener('peer:disconnect', {
        id: com.id
      });

      if (typeof com.ondisconnect === 'function') {
        com.ondisconnect();
      }
    }
  }
};

/**
 * Handles the room class events.
 * @attribute RoomHandler
 * @for Room
 * @since 0.6.0
 */
var RoomHandler = function (com, event, data, listener) {
  if (event.indexOf('trigger:') !== 0) {
    data.peerId = com.id;

    listener(event, data);
  }
  
  var params = event.split(':');
  
  fn.isSafe(function () {
    if (params.length > 2) {
      RoomHandlerEvent[ params[0] ][ params[1] ][ params[2] ](com, data, listener);

    } else if (params.length > 1) {
      RoomHandlerEvent[ params[0] ][ params[1] ](com, data, listener);

    } else {
      RoomHandlerEvent[ params[0] ](com, data, listener);
    }
  });
};

/**
 * Stores the room messaging events.
 * @attribute MessageHandlerEvent
 * @for Room
 * @since 0.6.0
 */
var MessageHandlerEvent = {
  /**
   * Self is in the room.
   * @property inRoom
   * @type JSON
   * @private
   * @since 0.6.0
   */
  inRoom: function (com, data, listener) {
    com.self.id = data.sid;

    com.socket.send({
      type: 'enter',
      mid: com.self.id,
      rid: com.id,
      prid: 'main',
      agent: window.webrtcDetectedBrowser,
      version: window.webrtcDetectedVersion,
      webRTCType: window.webrtcDetectedType,
      userInfo: com.self.getInfo()
    });
    
    if (typeof com.onjoin === 'function') {
      com.onjoin(data.mid);
    }
  },
  
  /**
   * User has sent self an enter.
   * @property enter
   * @type JSON
   * @private
   * @since 0.6.0
   */
  enter: function (com, data, listener) {
    com.handshake(data);

    com.socket.send({
      type: 'welcome',
      mid: com.self.id,
      rid: com.id,
      prid: data.prid,
      agent: window.webrtcDetectedBrowser,
      version: window.webrtcDetectedVersion,
      webRTCType: window.webrtcDetectedType,
      userInfo: com.self.getInfo(),
      target: data.mid,
      weight: com.users[data.mid][data.prid].weight
    });
  },
  
  /**
   * User has sent self an welcome.
   * @property enter
   * @type JSON
   * @private
   * @since 0.6.0
   */
  welcome: function (com, data, listener) {
    com.handshake(data);
  },
  
  /**
   * A user has sent an offer to self.
   * @property offer
   * @type JSON
   * @private
   * @since 0.6.0
   */
  offer: function (com, data, listener) {
    var user = com.users[data.mid];

    user.handler('trigger:handshake', data);
  },
  
  /**
   * A user has sent an answer to self.
   * @property answer
   * @type JSON
   * @private
   * @since 0.6.0
   */
  answer: function (com, data, listener) {
    var user = com.users[data.mid];

    user.handler('trigger:handshake', data);
  },
  
  /**
   * A user has sent an ICE candidate to self.
   * @property candidate
   * @type Function
   * @private
   * @since 0.6.0
   */
  candidate: function (com, data, listener) {
    var user = com.users[data.mid];

    user.handler('trigger:candidate', data);
  },
  
  /**
   * A user has updated their own custom user data.
   * @property updateUserEvent
   * @type Function
   * @private
   * @since 0.6.0
   */
  updateUserEvent: function (com, data, listener) {
    var user = com.users[data.mid];

    user.handler('trigger:update', data.userData);
  },
  
  /**
   * An audio stream muted status has been updated.
   * @property muteAudioEvent
   * @type Function
   * @private
   * @since 0.6.0
   */
  muteAudioEvent: function (com, data, listener) {
    var user = com.users[data.mid];

    data.kind = 'audio';

    user.handler('trigger:mutestream', data);
  },
  
  /**
   * A video stream muted status has been updated.
   * @property muteVideoEvent
   * @type Function
   * @private
   * @since 0.6.0
   */
  muteVideoEvent: function (com, data, listener) {
    var user = com.users[data.mid];

    data.kind = 'video';

    user.handler('trigger:mutestream', data);
  },
  
  /**
   * The room is lock status has been updated.
   * @property roomLockEvent
   * @type Function
   * @private
   * @since 0.6.0
   */
  roomLockEvent: function (com, data, listener) {
    com.locked = data.lock;

    if (com.locked) {
      if (typeof com.onlock === 'function') {
        com.onlock(data.mid);
      }

    } else {
      if (typeof com.onunlock === 'function') {
        com.onunlock(data.mid);
      }
    }
  },
  
  /**
   * The room is lock status has been updated.
   * @property roomLockEvent
   * @type Function
   * @private
   * @since 0.6.0
   */
  restart: function (com, data, listener) {
    var user = com.users[data.mid];

    user.handler('trigger:restart', data);
  },
  
  /**
   * The self is redirected or warned.
   * @property redirect
   * @type Function
   * @private
   * @since 0.6.0
   */
  redirect: function (com, data, listener) {
    if (data.action === 'reject') {
      if (typeof com.onkick === 'function') {
        com.onkick({
          message: data.info,
          reason: data.reason
        });
      }
    }
    
    if (data.action === 'warning') {
      if (typeof com.onwarn === 'function') {
        com.onwarn({
          message: data.info,
          reason: data.reason
        });
      }
    }
  },
  
  /**
   * The a user or self is disconnected from room.
   * @property bye
   * @type Function
   * @private
   * @since 0.6.0
   */
  bye: function (com, data, listener) {
    var user = com.users[data.mid];

    user.disconnect();
  }  
    
};

/**
 * Handles the room messaging events.
 * @attribute MessageHandler
 * @for Room
 * @since 0.6.0
 */
var MessageHandler = function (com, listener) {
  // Handles the socket events
  MessageHandlerEvent.forEach(function (value, key) {
    com.socket.when(key, function (data) {
      value(com, event, data, listener);
    });
  });
};