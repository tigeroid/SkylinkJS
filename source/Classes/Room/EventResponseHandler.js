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