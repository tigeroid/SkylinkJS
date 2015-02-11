/**
 * Handles all the events received from sub classes.
 * @attribute UserHandlerReceivedHandler
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
 * @for User
 * @since 0.6.0
 */
var UserEventResponseHandler = {
  
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect();
    }
  },
  
  data: function (com, data, listener) {
    if (typeof com.ondata === 'function') {
      com.ondata();
    }
  },
  
  datarequest: function (com, data, listener) {
    if (typeof com.ondatarequest === 'function') {
      com.ondatarequest();
    }
  },
  
  update: function (com, data, listener) {
    if (typeof com.onupdate === 'function') {
      com.onupdate(data.data);
    }
  },

  /**
   * Handles the incoming message trigger.
   * @property message
   * @type Function
   * @private
   * @since 0.6.0
   */
  message: function (com, data, listener) {
    if (typeof com.onmessage === 'function') {
      com.onmessage();
    }
  },
  
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect();
    }
  }
  
};

/**
 * Handles all the message events received from socket.
 * @attribute UserEventMessageHandler
 * @for User
 * @since 0.6.0
 */
var UserEventMessageHandler = {
  
  enter: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      return;
    }

    data.bandwidth = com.bandwidth;
    data.SDPType = 'answer';
    com.addConnection(data, data.stream);
  },

  welcome: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      if (peer.weight < data.weight) {
        return;
      }

      peer.SDPType = 'offer';
      data.type = 'start';

    } else {

      data.bandwidth = com.bandwidth;
      com.addConnection(data, data.stream);
      peer = com.peers[data.prid];

      peer.SDPType = 'offer';
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
 * @attribute UserHandler
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
  
  //log.debug('UserHandler', event, data);
};