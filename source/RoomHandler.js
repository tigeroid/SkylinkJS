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
        data.streamObject = connection.stream;
      }

      data.iceServers = com.iceServers;

      user.handler('message:' + data.type, data);
    }
    
  },
  
  self: {
    
    update: function (com, data, listener) {
      com.socket.send({
        type: 'updateUserEvent',
        mid: data.id,
        rid: com.id,
        userData: data.userData
      });
    },
    
    connect: function (com, data, listener) {
      // Send and start the first peer connection
      com.socket.send({
        type: 'enter',
        mid: com.self.id,
        rid: com.id,
        prid: 'main',
        agent: {
          name: window.webrtcDetectedBrowser,
          version: window.webrtcDetectedVersion,
          webRTCType: window.webrtcDetectedType
        },
        stream: com.self.getStreamingInfo('main'),
        bandwidth: com.self.bandwidth
      });
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
 * @private
 * @for Room
 * @since 0.6.0
 */
var RoomEventResponseHandler = {
  /**
   * Event fired when room object to ready to use.
   * @event room:start
   * @for Room
   * @since 0.6.0
   */
  start: function (com, data, listener) {
    if (typeof com.onstart === 'function') {
      com.onstart();
    }
  },
  
  /**
   * Event fired when there is room connection problems.
   * @event room:error
   * @for Room
   * @since 0.6.0
   */
  error: function (com, data, listener) {
    com.handler('room:error', {
      error: data.error,
      state: data.state
    });

    if (typeof com.onerror === 'function') {
      com.onerror(data);
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
   * Event fired when self user is connected to the room.
   * @event room:join
   * @for Room
   * @since 0.6.0
   */
  join: function (com, data, listener) {
    if (typeof com.onjoin === 'function') {
      com.onjoin(data.user);
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
    com.self.handler('message:' + data.type, data);

    com.iceServers = fn.isSafe(function () {
      return data.pc_config.iceServers;
    }()) || [];

    // User has joined the room
    com.handler('room:join', {
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
    var user = com.users[data.mid];
    
    if (fn.isEmpty(user)) {
      user = new User({
        id: data.mid,
        stream: data.stream,
        agent: data.agent,
        bandwidth: data.bandwidth,
        data: data.userData,
        SDPType: 'answer'
      
      }, com.handler);
      
      com.users[data.mid] = user;
      
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
      user = new User({
        id: data.mid,
        stream: data.stream,
        agent: data.agent,
        bandwidth: data.bandwidth,
        data: data.userData,
        SDPType: 'offer'
      
      }, com.handler);
      
      com.users[data.mid] = user;
      
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
      user.handler('message:offer', data);
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
      user.handler('message:answer', data);
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
      user.handler('message:candidate', data);
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
      user.handler('message:updateUserEvent', data.userData);
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
      user.handler('message:muteAudioEvent', data);
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
      user.handler('message:muteVideoEvent', data);
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
      user.handler('message:restart', data);
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

    if (!fn.isEmpty(user)) {
      user.disconnect();
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

  // Messaging events
  if (event.indexOf('message:') === 0) {
    
    fn.applyHandler(RoomEventMessageHandler, params, [com, data, listener]);
  
  } else {
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
  }
};