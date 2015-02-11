/**
 * Handles all the events received from sub classes.
 * @attribute UserHandlerReceivedHandler
 * @private
 * @for User
 * @since 0.6.0
 */
var UserEventReceivedHandler = {
  
  peer: {
    
    connect: function (com, data, listener) {
      var peer = com.peers[data.id];

      if (typeof com.onaddconnection === 'function') {
        com.onaddconnection(peer);
      }
      
      if (peer.SDPType === 'offer') {
        peer.createOffer();
      }
    },
    
    iceconnectionstate: function (com, data, listener) {
      if (data.id === 'main' && data.state === 'connected') {
        com.handler('user:connect', {});
      }
    },
    
    disconnect: function (com, data, listener) {
      var peer = com.peers[data.id];
      
      delete com.peers[data.id];

      if (typeof com.onremoveconnection === 'function') {
        com.onremoveconnection(peer);
      }
      
      if (Object.keys(com.peers).length === 0) {
        com.handler('user:disconnect', {});
      }
    }
  },
  
  transfer: {
    
    complete: function (com, data, listener) {
      com.handler('user:data', data);
    },
    
    request: function (com, data, listener) {
      com.handler('user:datarequest', data); 
    }
  }
  
};

/**
 * Handles all the events to respond to other parent classes.
 * @attribute UserHandlerResponseHandler
 * @private
 * @for User
 * @since 0.6.0
 */
var UserEventResponseHandler = {
  
  /**
   * Event fired when the user object is ready to use.
   * @event user:start
   * @for User
   * @since 0.6.0
   */
  start: function (com, data, listener) {
    if (typeof com.onstart === 'function') {
      com.onstart();
    }
  },
  
  /**
   * Event fired when the user has an established "main" peer connection.
   * @event user:connect
   * @for User
   * @since 0.6.0
   */
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect();
    }
  },
  
  /**
   * Event fired when the user has transferred a data successfully.
   * @event user:data
   * @for User
   * @since 0.6.0
   */
  data: function (com, data, listener) {
    if (typeof com.ondata === 'function') {
      com.ondata();
    }
  },
  
  /**
   * Event fired when the user is initiating a data transfer request.
   * @event user:datarequest
   * @for User
   * @since 0.6.0
   */
  datarequest: function (com, data, listener) {
    if (typeof com.ondatarequest === 'function') {
      com.ondatarequest();
    }
  },
  
  /**
   * Event fired when the user's custom data has been updated.
   * @event user:data
   * @for User
   * @since 0.6.0
   */
  update: function (com, data, listener) {
    if (typeof com.onupdate === 'function') {
      com.onupdate(data.data);
    }
  },

  /**
   * Event fired when the user has started a peer connection.
   * @event user:addconnection
   * @for User
   * @since 0.6.0
   */
  addconnection: function (com, data, listener) {
    if (typeof com.onaddconnection === 'function') {
      com.onaddconnection();
    }
  },
  
  /**
   * Event fired when the user has ended a peer connection
   * @event user:removeconnection
   * @for User
   * @since 0.6.0
   */
  removeconnection: function (com, data, listener) {
    if (typeof com.onremoveconnection === 'function') {
      com.onremoveconnection(data.data);
    }
  },

  /**
   * Event fired when the user sends an incoming message.
   * @event user:message
   * @for User
   * @since 0.6.0
   */
  message: function (com, data, listener) {
    if (typeof com.onmessage === 'function') {
      com.onmessage();
    }
  },
  
  /**
   * Event fired when the user's peer connections has been disconnected.
   * Usually fired when user leaves the room.
   * @event user:disconnect
   * @for User
   * @since 0.6.0
   */
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect();
    }
  }
  
};

/**
 * Handles all the message events received from socket.
 * @attribute UserEventMessageHandler
 * @private
 * @for User
 * @since 0.6.0
 */
var UserEventMessageHandler = {
  
  enter: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      return;
    }

    // Adds a peer connection
    com.addConnection({
      id: data.prid,
      iceServers: data.iceServers,
      bandwidth: com.bandwidth,
      stream: data.stream,
      SDPType: 'answer'
    
    }, data.stream);
  },

  welcome: function (com, data, listener) {
    var peer = com.peers[data.prid];

    // If peer has been created because of duplicate enter,
    // Check which weight received is higher first
    if (!fn.isEmpty(peer)) {
      if (peer.weight < data.weight) {
        return;
      }

      peer.SDPType = 'offer';
      data.type = 'start';

    // New peer
    } else {
      // Adds a peer connection
      com.addConnection({
        id: data.prid,
        iceServers: data.iceServers,
        bandwidth: com.bandwidth,
        stream: data.stream,
        SDPType: 'offer'

      }, data.stream);
    }
  },

  offer: function (com, data, listener) {
    var peer = com.peers[data.prid];
    
    if (!fn.isEmpty(peer)) {
      peer.handler('message:offer', data);
    }
  },

  answer: function (com, data, listener) {
    var peer = com.peers[data.prid];
    
    if (!fn.isEmpty(peer)) {
      peer.handler('message:answer', data);
    }
  },

  candidate: function (com, data, listener) {
    var peer = com.peers[data.prid];
    
    if (!fn.isEmpty(peer)) {
      peer.handler('message:candidate', data);
    }
  },
  
  restart: function (com, data, listener) {
    var peer = com.peers[data.prid];
    
    if (!fn.isEmpty(peer)) {
      peer.handler('message:restart', data);
    }
  },
  
  updateUserEvent: function (com, data, listener) {
    com.data = data.data;
  
    com.handler('user:update', {
      data: data.userData
    });
  },
  
  muteAudioEvent: function (com, data, listener) {
    var peer = com.peers[data.prid];
    
    if (!fn.isEmpty(peer)) {
      peer.handler('message:muteAudioEvent', data);
    }
  },
    
  muteVideoEvent: function (com, data, listener) {
    var peer = com.peers[data.prid];
    
    if (!fn.isEmpty(peer)) {
      peer.handler('message:muteVideoEvent', data);
    }
  }
};

/**
 * Handles the user class events.
 * @method UserHandler
 * @param {Object} com The reference to the class object.
 * @param {String} event The event name.
 * @param {JSON} data The event data response.
 * @param {Function} listener The listener function.
 * @private
 * @for User
 * @since 0.6.0
 */
var UserHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Messaging events
  if (event.indexOf('message:') === 0) {
    
    fn.applyHandler(UserEventMessageHandler, params, [com, data, listener]);
  
  } else {
    // Class events
    if (event.indexOf('user:') === 0) {
      data.id = com.id;

      fn.applyHandler(UserEventResponseHandler, params, [com, data, listener]);

    } else {
      data.userId = com.id;

      fn.applyHandler(UserEventReceivedHandler, params, [com, data, listener]);
    }
    
    listener(event, data);
  }
};