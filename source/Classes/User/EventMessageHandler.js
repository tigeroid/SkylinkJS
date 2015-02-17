var UserEventMessageHandler = {

  // Add peer connection if peer doesn't exists
  // If exist, exit
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

  // Add peer connection if peer doesn't exists
  // If exist, it could be a weight checking
  // For an instance, when both users receives each other's welcome
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

  // Receives a peer offer, send to the correct peer
  offer: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:offer', data);
    }
  },

  // Receives a peer answer, send to the correct peer
  answer: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:answer', data);
    }
  },

  // Receives an ice candidate, send to the correct peer
  candidate: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:candidate', data);
    }
  },

  // Receives a restart, send to the correct peer
  restart: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:restart', data);
    }
  },

  // Receives an updateUserEvent. Update the user data
  updateUserEvent: function (com, data, listener) {
    com.data = data.data;

    com.handler('user:update', {
      data: data.userData
    });
  },

  // Receives an audio muted event. relay to correct peer
  muteAudioEvent: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:muteAudioEvent', data);
    }
  },

  // Receives an video muted event. relay to correct peer
  muteVideoEvent: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:muteVideoEvent', data);
    }
  }
};
