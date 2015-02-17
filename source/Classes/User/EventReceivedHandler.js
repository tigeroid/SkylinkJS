var UserEventReceivedHandler = {

  /* Handles peer events */
  peer: {

    // Peer connection object is created an binded with
    // apprioate rtcevents.
    // Ready to start creating offer
    connect: function (com, data, listener) {
      var peer = com.peers[data.id];

      if (typeof com.onaddconnection === 'function') {
        com.onaddconnection(peer);
      }

      if (peer.SDPType === 'offer') {
        peer.createOffer();
      }
    },

    // Check if peer's ice connection state is connected
    // If connected, user has one connection - meaning connected
    iceconnectionstate: function (com, data, listener) {
      if (data.id === 'main' && data.state === 'connected') {
        com.handler('user:connect', {});
      }
    },

    // Handles the peers that disconnects
    // TODO: If main connection disconnects, it should disconnect the other peers too
    // If no peer connections connected, it should reflect user:disconnect
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

  /* Handles data transfer events */
  transfer: {
    // TODO
    complete: function (com, data, listener) {
      com.handler('user:data', data);
    },

    // TODO
    request: function (com, data, listener) {
      com.handler('user:datarequest', data);
    }
  }

};