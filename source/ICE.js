var ICE = {
  
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

  queueCandidate: function (peer, candidate) {
    peer.queueCandidate = peer.queueCandidate || [];
    peer.queueCandidate.push(candidate);
  },
  
  popCandidate: function (peer, defer) {
    peer.queueCandidate = peer.queueCandidate || [];

    var i;
    
    peer.queueCandidate.forEach(function (candidate) {
      var type = candidate.candidate.split(' ')[7];

      peer.addIceCandidate(candidate, function (success) {
        defer('candidate:success', {
          candidate: candidate,
          type: type
        }); 
      }, function (error) {
        defer('candidate:error', {
          candidate: candidate,
          type: type,
          error: error
        }); 
      });
    });
    

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
    
    if (fn.isEmpty(peer.remoteDescription)) {
      this.queueCandidate(peer, candidate, defer);
    
    } else {
      var type = candidate.candidate.split(' ')[7];

      peer.addIceCandidate(candidate, function (success) {
        defer('candidate:success', {
          candidate: candidate,
          type: type
        }); 
      }, function (error) {
        defer('candidate:error', {
          candidate: candidate,
          type: type,
          error: error
        }); 
      });
    }
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
  },
  
  parseICEServers: function (constraints) {
    return constraints;
  },
  
  parseSTUNServers: function (constraints) {
    return constraints;
  },

  parseTURNServers: function (constraints) {
    return constraints;
  }
};