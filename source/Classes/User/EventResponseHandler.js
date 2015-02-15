var UserEventResponseHandler = {

  /**
   * Event fired when the user object is ready to use.
   * @event user:ready
   * @for User
   * @since 0.6.0
   */
  ready: function (com, data, listener) {
    if (typeof com.onready === 'function') {
      com.onready();
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