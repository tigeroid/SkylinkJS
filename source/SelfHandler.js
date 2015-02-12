/**
 * Handles all the events received from sub classes.
 * @attribute SelfEventReceivedHandler
 * @private
 * @for Self
 * @since 0.6.0
 */
var SelfEventReceivedHandler = {
  
  stream: {
    stop: function (com, data, listener) {
      // Trigger the event
      var peerId = com.findStreamConnectionId(data.id);
      
      com.handler('self:removestreamconnection', {
        streamId: data.id,
        peerId: key
      });
    }
  }
};


/**
 * Handles all the events to respond to other parent classes.
 * @attribute SelfEventResponseHandler
 * @private
 * @for Self
 * @since 0.6.0
 */
var SelfEventResponseHandler = {
  /**
   * Event fired when self object to ready to use.
   *   At this stage, the self user id is empty as user has not joined the room.
   * @event self:start
   * @for Self
   * @since 0.6.0
   */
  start: function (com, data, listener) {
    if (typeof com.onstart === 'function') {
      com.onstart();
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

/**
 * Handles all the message events received from socket.
 * @attribute SelfEventMessageHandler
 * @private
 * @for Self
 * @since 0.6.0
 */
var RoomEventMessageHandler = {
  
  inRoom: function (com, data, listener) {
    com.handler('self:connect');
  }
};

/**
 * Handles the self class events.
 * @method SelfHandler
 * @param {Object} com The reference to the class object.
 * @param {String} event The event name.
 * @param {JSON} data The event data response.
 * @param {Function} listener The listener function.
 * @private
 * @for Self
 * @since 0.6.0
 */
var SelfHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Messaging events
  if (event.indexOf('message:') === 0) {
    
    fn.applyHandler(SelfEventMessageHandler, params, [com, data, listener]);
  
  } else {
    // Class events
    if (event.indexOf('room:') === 0) {
      data.id = com.id;

      fn.applyHandler(SelfEventResponseHandler, params, [com, data, listener]);

    } else {
      data.selfId = com.selfId;

      fn.applyHandler(SelfEventReceivedHandler, params, [com, data, listener]);
    }

    listener(event, data);

    // log.debug('SelfHandler', event, data);
  }
};