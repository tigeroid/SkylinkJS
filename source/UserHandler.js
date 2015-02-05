/**
 * Stores the user class events.
 * @attribute UserHandlerEvent
 * @for User
 * @since 0.6.0
 */
var UserHandlerEvent = {
  /**
   * Handles stream events that will require the user class to
   * trigger the listener.
   * @property peer
   * @type JSON
   * @private
   * @since 0.6.0
   */
  peer: {
    /**
     * Handles the event when peer is connected.
     * @property connect
     * @type Function
     * @private
     * @since 0.6.0
     */
    connect: function (com, data, listener) {
      var peer = com.peers[data.id];

      if (typeof com.onupdate === 'function') {
        com.onaddconnection(data.id, peer);
      }
      
      data.type = 'start';
      
      peer.handler('trigger:handshake', data);
    },
    
    /**
     * Handles the event when peer is disconnected.
     * @property disconnect
     * @type Function
     * @private
     * @since 0.6.0
     */
    disconnect: function (com, data, listener) {
      var peer = com.peers[peerId];

      delete com.peers[peerId];

      if (typeof com.onupdate === 'function') {
        com.onremoveconnection(peerId, peer);
      }
    }
  },
  
  /**
   * Handles transfer events that will require the user class to
   * trigger the listener.
   * @property transfer
   * @type JSON
   * @private
   * @since 0.6.0
   */
  transfer: {
    /**
     * Handles the event when transfer is completed.
     * @property complete
     * @type Function
     * @private
     * @since 0.6.0
     */
    complete: function (com, data, listener) {
      listener('user:data', {
        id: com.id,
        data: data
      });

      if (typeof com.ondata === 'function') {
        com.ondata();
      }
    },
    
    /**
     * Handles the event when a request transfer is received.
     * @property request
     * @type Function
     * @private
     * @since 0.6.0
     */
    request: function (com, data, listener) {
      listener('user:datarequest', {
        id: com.id,
        request: dataInfo
      });

      if (typeof com.ondatarequest === 'function') {
        com.ondatarequest();
      }
    }
  },
  
  /**
   * Handles events that will require the user class to
   * trigger user class events.
   * @property trigger
   * @type JSON
   * @private
   * @since 0.6.0
   */
  trigger: {
    /**
     * Handles the update user data trigger.
     * @property update
     * @type Function
     * @private
     * @since 0.6.0
     */
    update: function (com, data, listener) {
      com.data = newData;

      listener('user:update', {
        id: com.id,
        userData: com.data
      });

      if (typeof com.onupdate === 'function') {
        com.onupdate(newData);
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
      listener('user:message', {
        id: com.id,
        message: data
      });

      if (typeof com.ondatarequest === 'function') {
        com.ondatarequest();
      }
    },
    
    /**
     * Handles the handshake trigger.
     * @property handshake
     * @type Function
     * @private
     * @since 0.6.0
     */
    handshake: function (com, data, listener) {
      var peer = com.peers[data.prid];
      
      // welcome | enter
      if (data.type === 'welcome' || data.type === 'enter') {
        if (!fn.isEmpty(peer)) {
          if (data.type === 'welcome') {
            if (peer.weight < data.weight) {
              return;
            }
          }

          peer.SDPType = 'offer';
          data.type = 'start';

          peer.handler('trigger:handshake', data);

        } else {

          data.bandwidth = com.bandwidth;
          com.addConnection(data, data.stream);

          peer = com.peers[data.prid];

          if (data.type === 'welcome') {
            peer.SDPType = 'offer';

          } else {
            peer.SDPType = 'answer';
          }
        }
      
      // answer | offer
      } else {
        peer.handler('trigger:handshake', data);
      }
      console.info('exe', data);
    },
    
    /**
     * Handles the candidate trigger.
     * @property candidate
     * @type Function
     * @private
     * @since 0.6.0
     */
    candidate: function (com, data, listener) {
      var candidate = new window.RTCIceCandidate({
        sdpMLineIndex: data.label,
        candidate: data.candidate,
        sdpMid: data.id,
        label: data.label,
        id: data.id
      });

      var peer = com.peers[data.prid];
      
      data.sourceType = 'remote';
      data.candidate = candidate;
      
      peer.handler('trigger:icecandidate', data);
    },
    
    /**
     * Handles the mute stream trigger.
     * @property mutestream
     * @type Function
     * @private
     * @since 0.6.0
     */
    mutestream: function (com, data, listener) {
      var peer = com.peers[data.prid];
      
      peer.handler('trigger:mutestream', data);
    },
    
    /**
     * Handles the peer connection restart trigger.
     * @property restart
     * @type Function
     * @private
     * @since 0.6.0
     */
    restart: function (com, data, listener) {
      var peer = com.peers[data.prid];
      
      peer.handler('trigger:reconnect', data);
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
  if (event.indexOf('trigger:') !== 0) {
    data.userId = com.id;

    listener(event, data);
  }
  
  var params = event.split(':');
  
  fn.applyHandler(UserHandlerEvent, params, [com, data, listener]);
};