/**
 * Handles all the events received from sub classes.
 * @attribute RoomEventReceivedHandler
 * @private
 * @for Room
 * @since 0.6.0
 */
var RoomEventReceivedHandler = {

  // Handles the stream events
  socket: {

    // When socket is connected, join the room
    connect: function (com, data, listener) {
      var message = {
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
      };

      com.socket.send(message);
    },

    // When socket is disconnected, trigger that leave
    disconnect: function (com, data, listener) {
      com.respond('room:leave', {});
    },

    // When socket sends or receives a message
    message: function (com, data, listener) {
      // If it's a remote source
      if (data.sourceType === 'remote') {
        listener('message:' + com.data
      }
    },

    // When socket has exception, room has exception
    error: function (com, data, listener) {
      com.respond('room:error', {
        error: data,
        state: -2
      });
    }

  },

  // Handles the user events */
  user: {

    // When user object is initialized, start the "main" peer connection
    ready: function (com, data, listener) {
      // Get user object
      var user = com.users[data.id];

      // Get self local MediaStream
      var stream = com.self.streamConnections.main;

      // If stream exists, append it as streamObject
      if (!fn.isEmpty(stream)) {
        data.streamObject = stream;
      }

      // Set the ICE servers
      data.iceServers = com.iceServers;

      // Relay it to the userhandler
      user.routeMessage(data);
    }

  },

  // Handles the self user events */
  self: {

    // When self user custom data is updated, send to socket to update other users
    update: function (com, data, listener) {
      var message = {
        type: 'updateUserEvent',
        mid: data.id,
        rid: com.id,
        userData: data.userData
      };

      com.socket.send(message);
    },

    // When self user is connected to the room (after setting the self user id and
    // relevant information) start to send the enter
    connect: function (com, data, listener) {
      // Send and start the "main" peer connection
      var message = com.self.getInfo('main');

      message.type = 'enter';
      message.mid = com.self.id;
      message.rid = com.id;
      message.prid = 'main';

      com.socket.send(message);
    }

  },

  // Handles the peer events */
  peer: {

    // When peer connection object is initialized, we can start sending the welcome
    // to start the O/A handshake
    connect: function (com, data, listener) {
      // Retrieve the user
      var user = com.users[data.userId];

      // Check if user exists
      if (!fn.isEmpty(user)) {
        // Retrieve the user for this peer only
        var userInfo = user.getInfo(data.id);

        // Send welcome after creating object for answerer
        if (data.SDPType === 'answer') {
          var message = {
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
          };
          com.socket.send(message);
        }

      } else {
        throw new Error('User "' + data.userId + '" does not exists');
      }
    },

    // When peer connection starts creating an offer, send to the user
    offer: function (com, data, listener) {
      var message = {
        type: 'offer',
        sdp: data.offer.sdp,
        prid: data.id,
        mid: com.self.id,
        target: data.userId,
        rid: com.id
      };

      com.socket.send(message);
    },

    // When peer connection starts creating an answer to offer, send to the user
    answer: function (com, data, listener) {
      var message = {
        type: 'answer',
        sdp: data.answer.sdp,
        prid: data.id,
        mid: com.self.id,
        target: data.userId,
        rid: com.id
      };

      com.socket.send(message);
    },

    // When peer connection generates an ice candidate send to user
    icecandidate: function (com, data, listener) {
      // For generated candidate not received candidate
      if (data.sourceType === 'local') {
        var message = {
          type: 'candidate',
          label: data.candidate.sdpMLineIndex,
          id: data.candidate.sdpMid,
          candidate: data.candidate.candidate,
          mid: com.self.id,
          prid: data.id,
          target: data.userId,
          rid: com.id
        };

        com.socket.send(message);
      }
    }

  }

};