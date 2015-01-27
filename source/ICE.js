var ICE = {
  queueCandidate: function (peer, candidate, defer) {
    peer.queueCandidate = peer.queueCandidate || [];
    peer.queueCandidate.push([candidate, defer]);
  },
  
  popCandidate: function (peer) {
    peer.queueCandidate = peer.queueCandidate || [];
    var i;
    
    for (i = 0; i < peer.queueCandidate.length; i += 1) {
      var candidate = peer.queueCandidate[i][0];
      var defer = peer.queueCandidate[i][1];
      
      console.info('candidate', candidate);
      
      peer.addIceCandidate(candidate, function (success) {
        defer('candidate:success', success);
      }, function (error) {
        defer('candidate:error', error);
      });
    }
    peer.queueCandidate = [];
  },
  
  addCandidate: function (peer, candidate, defer) {
    if (fn.isEmpty(candidate.candidate)) {
      return defer('candidate:gathered', candidate);
    }

    if (peer.newSignalingState === 'have-local-pranswer' ||
      peer.newSignalingState === 'have-remote-pranswer') {
      
      peer.addIceCandidate(candidate, function (success) {
        defer('candidate:add', success); 
      }, function (error) {
        defer('candidate:error', error); 
      });
    
    } else {
      this.queueCandidate(peer, candidate, defer);
      defer('candidate:wait');
    }
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