var StreamEventResponseHandler = {

  start: function (com, data, listener) {
    if (typeof com.onstart === 'function') {
      com.onstart(data.MediaStream);
    }
  },

  error: function (com, data, listener) {
    if (typeof com.onerror === 'function') {
      com.onerror(data);
    }
  },

  stop: function (com, data, listener) {
    if (typeof com.onstop === 'function') {
      com.onstop(data);
    }
  },

  track: {

    start: function (com, data, listener) {
      if (typeof com.ontrackstart === 'function') {
        com.ontrackstart(data);
      }
    },

    stop: function (com, data, listener) {
      if (typeof com.ontrackstop === 'function') {
        com.ontrackstop(data);
      }
    },

   mute: function (com, data, listener) {
      if (typeof com.ontrackmute === 'function') {
        com.ontrackmute(data);
      }
    },

    unmute: function (com, data, listener) {
      if (typeof com.ontrackunmute === 'function') {
        com.ontrackunmute(data);
      }
    },
  }
};