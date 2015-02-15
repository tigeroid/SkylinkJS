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

    }, data.streamObject);
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

      }, data.streamObject);
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
