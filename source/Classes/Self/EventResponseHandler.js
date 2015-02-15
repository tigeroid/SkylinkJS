var SelfEventResponseHandler = {
  /**
   * Event fired when self object to ready to use.
   *   At this stage, the self user id is empty as user has not joined the room.
   * @event self:ready
   * @for Self
   * @since 0.6.0
   */
  ready: function (com, data, listener) {
    if (typeof com.onready === 'function') {
      com.onready();
    }
  },

  /**
   * Event fired when self has updated data.
   * @event self:update
   * @param {JSON|String} userData The updated self custom data.
   * @for Self
   * @since 0.6.0
   */
  update: function (com, data, listener) {
    if (typeof com.onupdate === 'function') {
      com.onupdate(data);
    }
  },

  /**
   * Event fired when self has added a new stream for connection.
   * @event self:addstreamconnection
   * @for Self
   * @since 0.6.0
   */
  addstreamconnection: function (com, data, listener) {
    if (typeof com.onaddstreamconnection === 'function') {
      com.onaddstreamconnection(data);
    }
  },

  /**
   * Event fired when self has removed a stream connection.
   * @event self:removestreamconnection
   * @for Self
   * @since 0.6.0
   */
  removestreamconnection: function (com, data, listener) {
    delete com.streamConnections[data.peerId];

    if (typeof com.onremovestreamconnection === 'function') {
      com.onremovestreamconnection(data);
    }
  },

  /**
   * Event fired when self user is connected to room.
   * @event self:connect
   * @for Self
   * @since 0.6.0
   */
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect();
    }
  },

  /**
   * Event fired when self user is disconnected from room.
   * @event self:disconnect
   * @for Self
   * @since 0.6.0
   */
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect(data);
    }
  }
};