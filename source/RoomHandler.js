/**
 * Handles all the events received from sub classes.
 * @attribute RoomEventReceivedHandler
 * @private
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
 * @method RoomHandler
 * @param {Object} com The reference to the class object.
 * @param {String} event The event name.
 * @param {JSON} data The event data response.
 * @param {Function} listener The listener function.
 * @private
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