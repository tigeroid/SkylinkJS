/**
 * Handles all the events received from sub classes.
 * @attribute RoomEventReceivedHandler
 * @private
 * @for Room
 * @since 0.6.0
 */
var RoomEventReceivedHandler = {

  // Handles the stream events */
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
      if (data.sourceType === 'remote') {
        console.log('respond', data.message);
        com.routeMessage(data.message);
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

/**
 * Handles all the events to respond to other parent classes.
 * @attribute RoomEventResponseHandler
 * @private
 * @for Room
 * @since 0.6.0
 */
var RoomEventResponseHandler = {

  /**
   * Event fired when room is initializing configuration information
   * from API server.
   * @event room:init
   * @for Room
   * @since 0.6.0
   */
  init: function (com, data, listener) {
    if (typeof com.oninit === 'function') {
      com.oninit();
    }
  },

  /**
   * Event fired when room object to ready to use.
   * @event room:ready
   * @for Room
   * @since 0.6.0
   */
  ready: function (com, data, listener) {
    if (typeof com.onready === 'function') {
      com.onready();
    }
  },

  /**
   * Event fired when there is room connection problems.
   * @event room:error
   * @for Room
   * @since 0.6.0
   */
  error: function (com, data, listener) {
    com.respond('room:error', {
      error: data.error,
      state: data.state
    });

    if (typeof com.onerror === 'function') {
      com.onerror(data);
    }
  },

  /**
   * Event fired when room object to ready to use.
   * @event room:join
   * @for Room
   * @since 0.6.0
   */
  join: function (com, data, listener) {
    if (typeof com.onjoin === 'function') {
      com.onjoin(com.self);
    }
  },

  /**
   * Event fired when self user is disconnect from the room.
   * @event room:leave
   * @for Room
   * @since 0.6.0
   */
  leave: function (com, data, listener) {
    if (typeof com.onleave === 'function') {
      com.onleave();
    }
  },

  /**
   * Event fired when self user is kicked out from the room.
   * @event room:kick
   * @for Room
   * @since 0.6.0
   */
  kick: function (com, data, listener) {
    if (typeof com.onkick === 'function') {
      com.onkick({
        message: data.info,
        reason: data.reason
      });

      com.leave();
    }
  },

  /**
   * Event fired when self user is warned regarding an action.
   * @event room:warn
   * @for Room
   * @since 0.6.0
   */
  warn: function (com, data, listener) {
    if (typeof com.onwarn === 'function') {
      com.onwarn({
        message: data.info,
        reason: data.reason
      });
    }
  }
};


/*
 * Handles all the Skylink SDK messaging protocols.
 * @class Messaging
 * @private
 * @isDocument true
 * @for Skylink
 * @since 0.6.0
 */
/**
 * Handles all the message events received from socket.
 * @attribute RoomEventMessageHandler
 * @private
 * @for Room
 * @since 0.6.0
 */
var RoomEventMessageHandler = {

  /**
   * The message that indicates that self user is in the room.
   * @event inRoom
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.sid The self user id.
   * @param {JSON} message.pc_config The RTCPeerConnection configuration.
   * @param {Array} message.pc_config.iceServers The list of ICE servers.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  inRoom: function (com, data, listener) {
    // Respond to self user that self user is in the room
    // and set the relevant data to self user.
    com.self.routeMessage(data);

    // The ICE servers received when "inRoom"
    com.iceServers = fn.isSafe(function () {
      return data.pc_config.iceServers;
    }) || [];

    // Notify to trigger onjoin event
    com.respond('room:join', {
      user: com.self
    });
  },

  /**
   * The message that indicates that a user has joined the room.
   * This is sent when user has just started a connection to the room.
   * @event enter
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.mid The user id.
   * @param {String} message.prid The shared peer connection id.
   * @param {JSON} message.stream The peer connection streaming configuration.
   * @param {JSON|Boolean} [message.stream.audio=false] The audio stream configuration.
   *    If parsed as a boolean, other configuration settings under the audio
   *    configuration would be set as the default setting in the connection.
   * @param {Boolean} [message.stream.audio.stereo=false] The flag that indiciates
   *    if stereo is enabled for this connection.
   * @param {String} [message.stream.audio.sourceId] The source id of the audio MediaStreamTrack
   *    used for this connection.
   * @param {String|Boolean} [message.stream.video=false] The video stream configuration.
   *    If parsed as a boolean, other configuration settings under the video
   *    configuration would be set as the default setting in the connection.
   * @param {JSON} [message.stream.video.resolution] The video streaming resolution.
   * @param {Integer} message.stream.video.resolution.width The video resolution width.
   * @param {Integer} message.stream.video.resolution.height The video resolution height.
   * @param {Integer} message.stream.video.frameRate The video stream framerate.
   * @param {String} [message.stream.video.sourceId] The source id of the video MediaStreamTrack
   *    used for this connection.
   * @param {JSON} message.stream.status The stream MediaStreamTrack status.
   * @param {Boolean} [message.stream.status.audioMuted=false] The flag that indicates if audio is muted.
   *    If audio is set to false, this would be set as true.
   * @param {Boolean} [message.stream.status.videoMuted=false] The flag that indicates if video is muted.
   *    If video is set to false, this would be set as true.
   * @param {Integer} message.userData The user custom data. Only given for "main" peer connections.
   * @param {JSON} message.agent The user's browser agent information. Only given for "main" peer connections.
   * @param {String} message.agent.name The user's browser agent name. For other SDKs, it's indicated
   *    by their type of device <code>E.g. ios, android</code>. For components, it's indicated
   *    by their type <code>E.g. MCU, Recording</code>.
   * @param {Integer} message.agent.version The user's browser agent version. For other SDKs, it's indicated
   *    by their version of device OS <code>ios8 = 8. android kitkat = 4.4</code>. For components, it's indicated
   *    by their version <code>E.g. 0.1.0, 0.2.0</code>.
   * @param {String} message.agent.webRTCType The user's browser agent webrtc implementation type. For other SDKs or
   *    components, use <code>other</code>.
   * @param {JSON} message.bandwidth The peer connection bandwidth configuration.
   *    This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @param {Integer} [message.bandwidth.audio] The bandwidth configuration for the audio stream.
   * @param {Boolean} [message.bandwidth.video] The bandwidth configuration for the video stream.
   * @param {Boolean} [message.bandwidth.data] The bandwidth configuration for the data stream.
   * @param {String} message.rid The room id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  enter: function (com, data, listener) {
    // A user has just joined the room
    var user = com.users[data.mid];

    // If the user is empty (which is supposed to be that case),
    // create a user which will create a peer connection when
    // the user object is ready
    if (fn.isEmpty(user)) {
      var config = {
        id: data.mid,
        stream: data.stream,
        agent: data.agent,
        bandwidth: data.bandwidth,
        data: data.userData,
        SDPType: 'answer'
      };

      user = new User(config, com.routeEvent);

      com.users[data.mid] = user;

      // Invoke function that user has joined
      if (typeof com.onuserjoin === 'function') {
        com.onuserjoin(user);
      }
    }
  },

  /**
   * The message that indicates that a user has joined the room.
   * This is sent as a response to user's "enter" message.
   * @event welcome
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.mid The user id.
   * @param {String} message.prid The shared peer connection id.
   * @param {JSON} message.stream The peer connection streaming configuration.
   * @param {JSON|Boolean} [message.stream.audio=false] The audio stream configuration.
   *    If parsed as a boolean, other configuration settings under the audio
   *    configuration would be set as the default setting in the connection.
   * @param {Boolean} [message.stream.audio.stereo=false] The flag that indiciates
   *    if stereo is enabled for this connection.
   * @param {String} [message.stream.audio.sourceId] The source id of the audio MediaStreamTrack
   *    used for this connection.
   * @param {String|Boolean} [message.stream.video=false] The video stream configuration.
   *    If parsed as a boolean, other configuration settings under the video
   *    configuration would be set as the default setting in the connection.
   * @param {JSON} [message.stream.video.resolution] The video streaming resolution.
   * @param {Integer} message.stream.video.resolution.width The video resolution width.
   * @param {Integer} message.stream.video.resolution.height The video resolution height.
   * @param {Integer} message.stream.video.frameRate The video stream framerate.
   * @param {String} [message.stream.video.sourceId] The source id of the video MediaStreamTrack
   *    used for this connection.
   * @param {JSON} message.stream.status The stream MediaStreamTrack status.
   * @param {Boolean} [message.stream.status.audioMuted=false] The flag that indicates if audio is muted.
   *    If audio is set to false, this would be set as true.
   * @param {Boolean} [message.stream.status.videoMuted=false] The flag that indicates if video is muted.
   *    If video is set to false, this would be set as true.
   * @param {Integer} message.userData The user custom data. Only given for "main" peer connections.
   * @param {JSON} message.agent The user's browser agent information. Only given for "main" peer connections.
   * @param {String} message.agent.name The user's browser agent name. For other SDKs, it's indicated
   *    by their type of device <code>E.g. ios, android</code>. For components, it's indicated
   *    by their type <code>E.g. MCU, Recording</code>.
   * @param {Integer} message.agent.version The user's browser agent version. For other SDKs, it's indicated
   *    by their version of device OS <code>ios8 = 8. android kitkat = 4.4</code>. For components, it's indicated
   *    by their version <code>E.g. 0.1.0, 0.2.0</code>.
   * @param {String} message.agent.webRTCType The user's browser agent webrtc implementation type. For other SDKs or
   *    components, use <code>other</code>.
   * @param {Integer} message.weight The priority weight of the message. In use-cases where both users receives each
   *    others "enter" message during the first handshake, the priority would indicate which user gets to do
   *    the offer.
   * @param {JSON} message.bandwidth The peer connection bandwidth configuration.
   *    This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @param {Integer} [message.bandwidth.audio] The bandwidth configuration for the audio stream.
   * @param {Boolean} [message.bandwidth.video] The bandwidth configuration for the video stream.
   * @param {Boolean} [message.bandwidth.data] The bandwidth configuration for the data stream.
   * @param {String} message.rid The room id.
   * @param {String} message.target The targeted user id to receive welcome.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  welcome: function (com, data, listener) {
    var user = com.users[data.mid];

    if (fn.isEmpty(user)) {
      var config = {
        id: data.mid,
        stream: data.stream,
        agent: data.agent,
        bandwidth: data.bandwidth,
        data: data.userData,
        SDPType: 'offer'
      };

      user = new User(config, com.routeEvent);

      com.users[data.mid] = user;

      // Invoke function when user has joined
      if (typeof com.onuserjoin === 'function') {
        com.onuserjoin(user);
      }
    }
  },

  /**
   * The message that starts a user's peer connection offer and answer handshake.
   * @event offer
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.sdp The offer session description.
   * @param {String} message.prid The peer connection id.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.target The targeted user id to receive offer.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  offer: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data);
    }
  },

  /**
   * The message that responses to a user's peer connection offer.
   * @event answer
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.sdp The answer session description.
   * @param {String} message.prid The peer connection id.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.target The targeted user id to receive answer.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  answer: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data);
    }
  },

  /**
   * The message that is received when candidate is generated from the user's peer connection.
   * It's recommend to add all the relevant information when instianting a new <var>RTCIceCandidate</var>
   *   object.
   * @event candidate
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.candidate The candidate's candidate session description.
   * @param {String} message.id The candidate's sdpMid.
   * @param {Integer} message.label The candidate's sdpMLineIndex.
   * @param {String} message.prid The peer connection id.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.target The targeted user id to receive generated candidate.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  candidate: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data);
    }
  },

  /**
   * The message that is received when user's custom data is updated.
   * @event updateUserEvent
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {JSON|String} message.userData The updated custom user data.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  updateUserEvent: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data.userData);
    }
  },

  /**
   * The message that is received when user's peer connection audio stream mute status
   *   have changed. This is inline with <var>MediaStreamTrack</var> API's <code>enabled = true/false</code>.
   * @event muteAudioEvent
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {Boolean} message.muted The updated audio stream mute status.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.prid The shared peer connection id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  muteAudioEvent: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data);
    }
  },

  /**
   * The message that is received when user's peer connection video stream mute status
   *   have changed. This is inline with <var>MediaStreamTrack</var> API's <code>enabled = true/false</code>.
   * @event muteVideoEvent
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {Boolean} message.muted The updated video stream mute status.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.prid The shared peer connection id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  muteVideoEvent: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data);
    }
  },

  /**
   * The message that is received when the current room lock status have changed.
   * @event roomLockEvent
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {Boolean} message.locked The updated room lock status.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @private
   * @for Messaging
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
   * The message that is received when user's peer connection is going through a refresh.
   * @event restart
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.prid The shared peer connection id.
   * @param {String} message.SDPType The handshake SDP type. <code>"offer"</code> is for the peer
   *   connection that initiated the restart. <code>"answer"</code> is for the peer
   *   connection that is responding to the restart.
   * @param {JSON} message.sdp The session description message for restart.
   * @param {String} message.sdp.type The <var>RTCSessionDescription</var> type.
   * @param {String} message.sdp.sdp The <var>RTCSessionDescription</var> session description.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  restart: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.respondMessage(data);

    } else {
      throw new Error('User "' + data.mid + '" does not exists');
    }
  },

  /**
   * The message that is received when user is receiving a rejection or warning from signaling server.
   * @event redirect
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.action The action received that indicates if user is warned or rejected.
   *    <code>"warning"</code> is when signaling is warning user of the action and comply accordingly.
   *    <code>"reject"</code> is when signaling has kicked user out of the room.
   * @param {JSON} message.info The signaling message for the redirect message.
   * @param {String} message.reason The reason for the action taken by signaling.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  redirect: function (com, data, listener) {
    if (data.action === 'reject') {
      // User is kicked out of the room
      com.respond('room:kick', {});
    }

    if (data.action === 'warning') {
      // User is warned
      com.respond('room:warn', {});
    }
  },

  /**
   * The message that is received when user has left the room.
   * @event bye
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  bye: function (com, data, listener) {
    var user = com.users[data.mid];

    // Disconnect user
    if (!fn.isEmpty(user)) {
      user.disconnect();

    } else {
      throw new Error('User "' + data.mid + '" does not exists');
    }
  }

};
