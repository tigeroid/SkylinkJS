/**
 * Helper functions to handle differences in cross-browser responses.
 * @attribute PeerHelper
 * @type JSON
 * @private
 * @for Peer
 * @since 0.6.0
 */
var PeerHelper = {
  /* RTCPeerConnection polyfills */
  /**
   * Handles the addStream polyfill for RTCPeerConnection object.
   * If onnegotiationneeded event is not supported, fire if a stream has been added.
   * This polyfills the missing onnegotiationneeded event handler.
   * Support are for multi-stream sending only.
   * @method PeerHelper.addStream
   * @param {Object} peer The RTCPeerConnection object.
   * @param {Object} stream The MediaStream object.
   * @private
   * @support Chrome, Opera
   * @for Peer
   * @since 0.6.0
   */
  addStream: function (peer, stream) {
    if (window.webrtcDetectedBrowser !== 'chrome' && window.webrtcDetectedBrowser !== 'opera') {
      peer.addStream(stream);

    // Firefox and Safari / IE (plugin-enabled) browsers don't enable multi-stream
    // Firefox and Safari / IE (plugin-enabled) browsers does not support onnegotiationneeded
    } else {
      if (peer.getLocalStream().length > 0) {
        log.warn('StreamPolyfill', 'You cannot add more than 1 stream. Multi-stream is not supported in ' +
          window.webrtcDetectedBrowser.toUpperCase() +  (window.webrtcDetectedType === 'plugin' ? ' (plugin-enabled)' :
          '') + ' browser');
        return;
      }

      // Add stream once
      peer.addStream(stream);

      if (typeof peer.onnegotiationneeded === 'function') {
        peer.onnegotiationneeded(peer);
      }
    }
  },

  /**
   * Handles the removeStream polyfill for RTCPeerConnection object.
   * For non-supported browsers, the peer connection will be re-initialized
   *   without adding any stream.
   * @method PeerHelper.removeStream
   * @param {Object} peer The RTCPeerConnection object.
   * @param {Object} stream The MediaStream object.
   * @private
   * @support Chrome, Opera
   * @for Peer
   * @since 0.6.0
   */
  removeStream: function (peer, stream) {
    if (window.webrtcDetectedBrowser !== 'chrome' && window.webrtcDetectedBrowser !== 'opera') {
      peer.removeStream(stream);

    // Firefox and Safari / IE (plugin-enabled) browsers don't enable multi-stream
    // Firefox and Safari / IE (plugin-enabled) browsers does not support onnegotiationneeded
    } else {
      if (peer.getLocalStream().length > 0) {
        log.warn('StreamPolyfill', 'You cannot add more than 1 stream. Multi-stream is not supported in ' +
          window.webrtcDetectedBrowser.toUpperCase() +  (window.webrtcDetectedType === 'plugin' ? ' (plugin-enabled)' :
          '') + ' browser');

        var constraints = null;
        var optional;

        // Restart the negotiation
        if (typeof peer.constraints === 'object') {
          constraints = peer.constraints;
          optional = peer.optional;
        }

        var peer2 = this.create(constraints, optional);

        // Recopy all the functions again.
        var key;

        var unwantedKeys = [
          'signalingState',
          'iceConnectionState',
          'iceGatheringState',
          'localDescription',
          'remoteDescription',
          'createDataChannel',
          'updateIce',
          'addIceCandidate',
          'addStream',
          'removeStream',
          'getStats',
          'getStreamById',
          'createDataChannel',
          'createDTMFSender',
          'createOffer',
          'createAnswer',
          'setLocalDescription',
          'setRemoteDescription',
          'getSenders',
          'getReceivers',
          'addTrack',
          'removeTrack'
        ];

        for (key in peer) {
          if (peer.hasOwnProperty(key)) {
            if (unwantedKeys.indexof(key) === -1) {
              try {
                peer2[key] = peer[key];

              } catch (error) {
                log.warn('Not supported to replace "' + key + '" key');
              }
            }
          }
        }

        // If subscribed to our event
        if (!!peer.newiceConnectionState) {
          this.ICE.state(peer2);
        }

        // Re-invoke negotiation needed
        peer.onnegotiationneeded(peer2);
      }
    }
  },

  /* ICE helper functions */
  ICE: {

    /**
     * Parses the received ICE connection state and updates to a new version
     *   to handle the differences received from cross-browsers.
     * Use <code>pc.onnewiceconnectionstatechange</code> instead of
     *   <code>pc.oniceconnectionstatechange</code>.
     * Use <code>pc.newiceConnectionState</code> for the updated ICE connection state.
     * State should go from <code>checking > connected > completed</code>.
     * @method PeerHelper.ICE.state
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

      peer.newiceConnectionState = peer.iceConnectionState || 'new';

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

    /**
     * Adds ICE candidate to the RTCPeerConnection object and buffers
     *   candidates if remote description has not yet be set.
     * Use a common success and failure defer.
     * Once remote description is set, the buffered ICE candidates will be
     *   added to the RTCPeerConnection object.
     * @method PeerHelper.ICE.addCandidate
     * @param {Object} peer The RTCPeerConnection object.
     * @param {Object} candidate The RTCIceCandidate object.
     * @param {Function} successDefer The defer fired once ICE candidate is
     *   added successfully.
     * @param {Function} failureDefer The defer fired once ICE candidate has
     *   an exception adding it.
     * @private
     * @example
     *   PeerHelper.ICE.addCandidate(peer, candidate, function () {
     *     console.log('Successfully added candidate');
     *   }, function (error) {
     *     console.error('Failed adding candidate. Exception occurred:', error)
     *   });
     * @for Peer
     * @since 0.6.0
     */
    addCandidate: function (peer, candidate, successDefer, failureDefer) {
      if (!!peer.remoteDescription) {
        // Add the candidates
        peer.addIceCandidate(candidate, successDefer, failureDefer);

      } else {
        // Buffer the candidates
        peer.bufferCandidates = peer.bufferCandidates || [];
        peer.bufferCandidates.push(candidate);

        // If peer has a steady connection, do not add. If peer does not has an interval
        //   create
        if (!!peer.waitForBuffer && (peer.newiceConnectionState !== 'connected' ||
          peer.newiceConnectionState !== 'completed')) {
          // Do a buffer to check
          peer.waitForBuffer = setInterval(function () {
            if (!!peer.remoteDescription) {
              console.log('Adding buffered candidates');

              // Clear interval
              clearInterval(peer.waitForBuffer);

              var i;

              // Loop and add all bufferred candidates
              for (i = 0; i < peer.bufferCandidates.length; i += 1) {
                peer.addIceCandidate(peer.bufferCandidates[i], successDefer, failureDefer);
              }

              // Remove reference
              delete peer.waitForBuffer;
            }
          }, 100);
        }
      }
    },

    /**
     * Parses TURN url format for cross-browser interopability.
     * For an example, Firefox does not support <code>username@turnserver.com</code>,
     *   whereas Chrome supports it.
     * @method PeerHelper.ICE.configureTURN
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
     * @example
     *   var updateIceServers = PeerHelper.ICE.configureTURN(iceServers);
     * @for Peer
     * @since 0.6.0
     */
    configureTURN: function (iceServers) {
      var newConfig = [];
      var i;

      for (i = 0; i < iceServers.length; i += 1) {
        // The new ice server object
        var iceServer = {
          url: iceServers[i].url
        };

        // If there is credential, add it.
        if (!!iceServers[i].credential) {
          iceServer.credential = iceServers[i].credential;
        }

        // If there is username, add it.
        if (!!iceServers[i].username) {
          iceServer.username = iceServers[i].username;
        }

        // For Firefox only
        if (window.webrtcDetectedBrowser === 'firefox') {
          // If it's a TURN server
          if (iceServer.url.indexOf('turn') === 0 && indexOf) {
            // Check if the url is username@turn.com
            if (iceServer.url.indexOf('@')) {
              var iceParts = iceServer.url.split(':');
              var subIceParts = iceParts[1].split('@'); // user '@' url

              iceServer.url = subIceParts[1];
              iceServer.username = subIceParts[0];
            }
          }
        }
        newConfig.push(iceServer);
      }
      // Return the new data
      return newConfig;
    }

  }
};