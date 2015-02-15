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