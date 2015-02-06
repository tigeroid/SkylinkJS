/**
 * Handles all the events received from sub classes.
 * @attribute RoomEventReceivedHandler
 * @for Room
 * @since 0.6.0
 */
var RoomEventReceivedHandler = {

  socket: {

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

    disconnect: function (com, data, listener) {
      com.handler('room:leave', {});

      if (typeof com.onleave === 'function') {
        com.onleave();
      }
    },

    error: function (com, data, listener) {
      com.handler('room:error', {
        error: data,
        state: -2
      });
    }
  },

  user: {
    start: function (com, data, listener) {
      var user = com.users[data.mid];

      // Get stream
      var connection = com.self.streams[data.prid];

      // Check if stream connection exists
      if (!fn.isEmpty(connection)) {
        data.stream = connection.stream;
      }

      data.iceServers = com.iceServers;

      user.handler('message:' + data.type, data);
    }
  },
  
  peer: {
    connect: function (com, data, listener) {
      var user = com.users[data.userId];
      var userInfo = user.getInfo();
  
      // Send welcome after creating object
      if (data.SDPType === 'answer') {
        com.socket.send({
          type: 'welcome',
          mid: com.self.id,
          rid: com.id,
          prid: data.id,
          agent: window.webrtcDetectedBrowser,
          version: window.webrtcDetectedVersion,
          webRTCType: window.webrtcDetectedType,
          userInfo: com.self.getInfo(data.id),
          target: data.userId,
          weight: data.weight
        });
      }
    },
    
    offer: {
      success: function (com, data, listener) {
        com.socket.send({
          type: 'offer',
          sdp: data.offer.sdp,
          prid: data.id,
          mid: com.self.id,
          target: data.userId,
          rid: com.id
        });
      }
    },

    answer: {
      success: function (com, data, listener) {
        com.socket.send({
          type: 'answer',
          sdp: data.answer.sdp,
          prid: data.id,
          mid: com.self.id,
          target: data.userId,
          rid: com.id
        });
      }
    },

    icecandidate: function (com, data, listener) {
      if (data.sourceType === 'local') {
        com.socket.send({
          type: 'candidate',
          label: data.candidate.sdpMLineIndex,
          id: data.candidate.sdpMid,
          candidate: data.candidate.candidate,
          mid: com.self.id,
          prid: data.id,
          target: data.userId,
          rid: com.id
        });
      }
    }
  }
};

/**
 * Handles all the events to respond to other parent classes.
 * @attribute RoomEventResponseHandler
 * @for Room
 * @since 0.6.0
 */
var RoomEventResponseHandler = {
  /**
   * Handles the error state trigger.
   * @property error
   * @type Function
   * @private
   * @since 0.6.0
   */
  error: function (com, data, listener) {
    com.readyState = data.state;

    com.handler('room:error', {
      error: data.error,
      state: data.state
    });

    if (typeof com.onerror === 'function') {
      com.onerror({
        error: data.error,
        state: data.state
      });
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
  var params = event.split(':');

  // Class events
  if (event.indexOf('room:') === 0) {
    data.name = com.name;

    fn.applyHandler(RoomEventResponseHandler, params, [com, data, listener]);

  } else {
    data.roomName = com.name;

    fn.applyHandler(RoomEventReceivedHandler, params, [com, data, listener]);
  }

  listener(event, data);
  
  log.debug('RoomHandler', event, data);
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

    com.iceServers = data.pc_config;

    com.socket.send({
      type: 'enter',
      mid: com.self.id,
      rid: com.id,
      prid: 'main',
      agent: window.webrtcDetectedBrowser,
      version: window.webrtcDetectedVersion,
      webRTCType: window.webrtcDetectedType,
      userInfo: com.self.getInfo('main')
    });

    com.handler('room:join', {
      userId: com.self.id,
      user: com.self,
      isSelf: true
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
    var user = com.users[data.mid];
    
    if (fn.isEmpty(user)) {
      user = new User(data, com.handler);
      
      com.users[data.mid] = user;
    }
  },

  /**
   * User has sent self an welcome.
   * @property enter
   * @type JSON
   * @private
   * @since 0.6.0
   */
  welcome: function (com, data, listener) {
    var user = com.users[data.mid];
    
    if (fn.isEmpty(user)) {
      user = new User(data, com.handler);
      
      com.users[data.mid] = user;
    }
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

    if (!fn.isEmpty(user)) {
      user.handler('message:offer', data);
    }
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

    if (!fn.isEmpty(user)) {
      user.handler('message:answer', data);
    }
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

    if (!fn.isEmpty(user)) {
      user.handler('message:candidate', data);
    }
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

    if (!fn.isEmpty(user)) {
      user.handler('message:updateUserEvent', data.userData);
    }
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

    if (!fn.isEmpty(user)) {
      user.handler('message:muteAudioEvent', data);
    }
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

    if (!fn.isEmpty(user)) {
      user.handler('message:muteVideoEvent', data);
    }
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

    if (!fn.isEmpty(user)) {
      user.handler('message:restart', data);
    }
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
        
        com.leave();
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

    if (!fn.isEmpty(user)) {
      user.disconnect();
    }
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
  fn.forEach(MessageHandlerEvent, function (response, event) {
    com.socket.when(event, function (data) {
      response(com, data, listener);
    });
  });
};