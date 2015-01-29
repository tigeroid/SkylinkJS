var ICE = {

  queueCandidate: function (peer, candidate) {
    peer.queueCandidate = peer.queueCandidate || [];
    peer.queueCandidate.push(candidate);
  },
  
  popCandidate: function (peer, defer) {
    peer.queueCandidate = peer.queueCandidate || [];
    var i;
    
    for (i = 0; i < peer.queueCandidate.length; i += 1) {
      var candidate = peer.queueCandidate[i];
      defer(candidate);
    }
    peer.queueCandidate = [];
  },
  
  addCandidate: function (peer, candidate, defer) {
    if (fn.isEmpty(candidate.candidate)) {
      return defer('candidate:gathered', candidate);
    }
    
    peer.addIceCandidate(candidate, function (success) {
      defer('candidate:add', candidate); 
    }, function (error) {
      defer('candidate:error', error); 
    });
  },
  
  newIceConnectionStates: {
    starting : 'starting',
    checking : 'checking',
    connected : 'connected',
    completed : 'connected',
    done : 'completed',
    disconnected : 'disconnected',
    failed : 'failed',
    closed : 'closed'
  },
  
  parseIceConnectionState: function (peer) {
    var state = peer.iceConnectionState;
    
    var checkState = this.newIceConnectionStates[state];
    
    if (!peer.iceConnectionFiredStates || checkState === 'disconnected' || 
        checkState === 'failed' || checkState === 'closed') {
      peer.iceConnectionFiredStates = [];
    }
    
    var newState = this.newIceConnectionStates[state];
    
    if (peer.iceConnectionFiredStates.indexOf(newState) < 0) {
      peer.iceConnectionFiredStates.push(newState);
      
      if (newState === 'connected') {
        setTimeout(function () {
          peer.iceConnectionFiredStates.push('done');

          peer.newIceConnectionState = 'completed';
          peer.oniceconnectionnewstatechange(peer);
        }, 1000);
      }
      peer.newIceConnectionState = newState;
      peer.oniceconnectionnewstatechange(peer);
    }
  }
};