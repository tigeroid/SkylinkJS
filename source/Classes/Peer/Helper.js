/**
 * Helper functions to handle differences in cross-browser responses.
 * @attribute PeerHelper
 * @type JSON
 * @private
 * @for Peer
 * @since 0.6.0
 */
var PeerHelper = {

  /* ICE helper functions */
  ICE: {

    /**
     * Parses the received ICE connection state and updates to a new version
     *   to handle the differences received from cross-browsers.
     * Use <code>pc.onnewiceconnectionstatechange</code> instead of
     *   <code>pc.oniceconnectionstatechange</code>.
     * Use <code>pc.newiceConnectionState</code> for the updated ICE connection state.
     * State should go from <code>checking > connected > completed</code>.
     * @method ICE.state
     * @param {Object} peer The RTCPeerConnection object.
     * @private
     * @example
     *   PeerHelper.ICE.state(pc);
     *   pc.onnewiceconnectionstatechange = function () {
     *     // here's my new state.
     *     var state = pc.newiceConnectionState;
     *   };
     * @for Peer
     * @since 0.6.0
     */
    state: function (peer) {
      var updatedStateList = {
        starting : 'starting',
        checking : 'checking',
        connected : 'connected',
        completed : 'connected',
        done : 'completed',
        disconnected : 'disconnected',
        failed : 'failed',
        closed : 'closed'
      };

      peer.oniceconnectionstatechange = function () {
        var state = peer.iceConnectionState;
        var checkState = updatedStateList[state];

        // Check if state is new or has been disconnected / failed / closed
        if (!peer.iceConnectionFiredStates || checkState === 'disconnected' ||
            checkState === 'failed' || checkState === 'closed') {
          peer.iceConnectionFiredStates = [];
        }

        // Display updated state
        var newState = updatedStateList[state];

        if (peer.iceConnectionFiredStates.indexOf(newState) < 0) {
          peer.iceConnectionFiredStates.push(newState);

          if (newState === 'connected') {
            setTimeout(function () {
              peer.iceConnectionFiredStates.push('done');

              peer.newiceConnectionState = 'completed';

              // Set using a new attached function instead to prevent
              // overriding the original one
              peer.oniceconnectionnewstatechange(peer);
            }, 1000);
          }
          peer.newiceConnectionState = newState;
          peer.onnewiceconnectionstatechange(peer);
        }
      };
    },

    

  }

  /**
   * The revised versions of ICE connection states to handle
   *   the differences cross-browsers of different states. This was to
   *   feedback to various users the completion state of the ICE connection.
   * @attribute newIceConnectionStates
   * @type JSON
   * @param {String} starting The ICE connection has just started.
   * @param {String} checking The ICE connection is in checking state.
   * @param {String} connected The ICE connection is established.
   * @param {String} completed The ICE connection is established.
   * @param {String} done The ICE connection is in complete state.
   * @param {String} disconnected The ICE connection has been disconnected.
   * @param {String} failed The ICE connection has failed.
   * @param {String} closed The ICE connection has closed.
   * @private
   * @for ICE
   * @since 0.6.0
   */
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

  /**
   * Queues ICE candidates that is received before <var>setRemoteDescription</var> is called.
   * It stores in the <var>queueCandidate</var> property array in the peer connection object.
   * @method queueCandidate
   * @param {Object} peer The RTCPeerConnection object.
   * @param {Object} candidate The RTCIceCandidate object.
   * @private
   * @for ICE
   * @since 0.6.0
   */
  queueCandidate: function (peer, candidate) {
    peer.queueCandidate = peer.queueCandidate || [];
    peer.queueCandidate.push(candidate);
  },

  /**
   * Adds all ICE candidates that is received before <var>setRemoteDescription</var> is called.
   * It retrieves candidates from the <var>queueCandidate</var> property array in the peer connection object.
   * @method popCandidate
   * @param {Object} peer The RTCPeerConnection object.
   * @param {Function} defer The defer function that is fired when an ICE candidate is added.
   * @private
   * @for ICE
   * @since 0.6.0
   */
  popCandidate: function (peer, defer) {
    peer.queueCandidate = peer.queueCandidate || [];

    // To pass jshint errors
    var addCandidateFn = function (candidate, type) {
      peer.addIceCandidate(candidate, function () {
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
    };

    var i;

    for (i = 0; i < peer.queueCandidate.length; i += 1) {
      var candidate = peer.queueCandidate[i];
      var type = candidate.candidate.split(' ')[7];

      addCandidateFn(candidate, type);
    }
    peer.queueCandidate = [];
  },

  /**
   * Adds the ICE candidate or queues the candidate if it is received before
   *   <var>setRemoteDescription</var> is called.
   * @method addCandidate
   * @param {Object} peer The RTCPeerConnection object.
   * @param {Object} candidate The RTCIceCandidate object.
   * @param {Function} defer The defer function that is fired when an ICE candidate is added.
   * @private
   * @for ICE
   * @since 0.6.0
   */
  addCandidate: function (peer, candidate, defer) {
    if (fn.isEmpty(candidate.candidate)) {
      return;
    }

    if (!fn.isSafe(function () { return !!peer.remoteDescription.sdp; })) {
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

  /**
   * Parses the received ICE connection state and updates to a new version
   *   to handle the differences received from cross-browsers.
   * State should go from <code>checking > connected > completed</code>.
   * @method parseIceConnectionState
   * @param {Object} peer The RTCPeerConnection object.
   * @private
   * @for ICE
   * @since 0.6.0
   */
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

  /**
   * Handles the ICE servers received based on the options set by user and parses
   * the differences for iceServer format for cross-browsers.
   * <br>Format of an ICE server:
   * - <code>STUN</code> is structured like <code>{ url: 'stun:hosturl' }</code>.
   * - <code>TURN</code> is structured like
   *    <code>{ url: 'turn:username@hosturl', credential: 'xxx' }</code> and
   *    <code>{ url: 'turn:hosturl', username: 'username', credential: 'xxx' }</code> for
   *    Firefox browsers.
   * @method parseICEServers
   * @param {Array} iceServers The list of ICE servers.
   * @param {JSON} iceServers.(#index) The ICE server.
   * @param {String} iceServers.(#index).credential The ICE server credential (password).
   * @param {String} iceServers.(#index).url The ICE server url. For TURN server,
   *   the format may vary depending on the support of the TURN url format.
   * @returns {Array} The updated ICE servers list.
   * - <code>(#index)</code> <var>: <b>type</b> JSON</var><br>
   *   The ICE server.
   * - <code>(#index).credential</code> <var>: <b>type</b> String</var><br>
   *   The ICE server credential (password). Only used in TURN servers.
   * - <code>(#index).url</code> <var>: <b>type</b> String</var><br>
   *   The ICE server url. For TURN server, the format may vary depending on the support of
   *   the TURN url format.
   * - <code>(#index).username</code> <var>: <b>type</b> String</var><br>
   *   The ICE server username. Only used in TURN servers for Firefox browsers.
   * @private
   * @for ICE
   * @since 0.6.0
   */
  parseICEServers: function (iceServers) {
    var newIceServers = [];
    var i;

    console.info('globals TURN', globals.TURNServer);
    console.info('globals STUN', globals.STUNServer);

    for (i = 0; i < iceServers.length; i += 1) {
      var iceServer = iceServers[i];
      var urlParts = iceServer.url.split(':');
      var serverType = urlParts[0];

      if (serverType === 'turn') {
        // Add TURN if needed
        if (globals.TURNServer === true) {
          // Firefox doesn't support turn:username@hosturl
          if (window.webrtcDetectedBrowser === 'firefox') {
            var subUrlParts = urlParts[1].split('@');
            var username = subUrlParts[0];
            var url = subUrlParts[1];

            urlParts[1] = url;

            iceServer.username = username;
            iceServer.url = urlParts.join(':');
          }
          // Add it to array
          newIceServers.push(iceServer);
        }

      } else {
        // Add STUN if needed
        if (globals.STUNServer === true) {
          // Add it to array
          newIceServers.push(iceServer);
        }
      }
    }

    return newIceServers;
  }
};