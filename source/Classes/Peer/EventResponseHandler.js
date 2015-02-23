var PeerEventResponseHandler = {

  /**
   * Event fired when peer connection has started.
   * This happens when RTCPeerConnection object has just
   *   been initialized and local MediaStream has been added.
   * @event peer:ready
   * @private
   * @for Peer
   * @since 0.6.0
   */
  ready: function (com, data, listener) {
    /*// Start the health timer connection
    com.healthTimer = setTimeout(function () {
      if (!fn.isEmpty(com.healthTimer)) {
        log.debug('Peer', com.id, 'Restarting negotiation as timer has expired');

        clearInterval(com.healthTimer);

        com.reconnect();
      }
    }, com.iceTrickle ? 10000 : 50000);*/

    if (typeof com.onready === 'function') {
      com.onready(com.id);
    }
  },

  /**
   * Event fired when peer connection is established and connected.
   * This happens when RTCPeerConnection ICE connection state is
   *  connected and completed.
   * @event peer:connect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect(com.id);
    }
  },

  /**
   * Event fired when peer connection is reconnecting.
   * This happens when RTCPeerConnection object is
   *   re-initialized and the ICE connection restarts again.
   * It adds the re-updated local MediaStream.
   * @event peer:reconnect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  reconnect: function (com, data, listener) {
    if (typeof com.onreconnect === 'function') {
      com.onreconnect();
    }
  },

  /**
   * Event fired when peer connection has been disconnected.
   * This happens when RTCPeerConnection close is invoked and
   *  connection stops.
   * @event peer:disconnect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect();
    }
  },

  /**
   * Event fired when peer connection adds or receives a stream object.
   * This happens when user sends a local MediaStream to peer or receives
   *   a remote MediaStream from onaddstream event.
   * @event peer:disconnect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  stream: function (com, data, listener) {
    data.stream.sourceType = data.sourceType;

    if (data.sourceType === 'remote') {
      com.stream = data.stream;
    }

    if (typeof com.onaddstream === 'function') {
      com.onaddstream(data.stream);
    }
  },

  /**
   * Event fired when peer connection ICE connection state has changed.
   * @property iceconnectionstate
   * @type Function
   * @private
   * @since 0.6.0
   */
  iceconnectionstate: function (com, data, listener) {
    if (typeof com.oniceconnectionstatechange === 'function') {
      com.oniceconnectionstatechange(data.state);
    }
  },

  /**
   * Event fired when peer connection ICE gathering state has changed.
   * @property icegatheringstate
   * @type Function
   * @private
   * @since 0.6.0
   */
  icegatheringstate: function (com, data, listener) {
    if (typeof com.onicegatheringstatechange === 'function') {
      com.onicegatheringstatechange(data.state);
    }
  },

  /**
   * Event fired when peer connection ICE candidate is received.
   * @property icecandidate
   * @type Function
   * @private
   * @since 0.6.0
   */
  icecandidate: function (com, data, listener) {},

  /**
   * Event fired when peer connection signaling state changes.
   * This happens when RTCPeerConnection receives local or remote offer.
   * @property signalingstate
   * @type Function
   * @private
   * @since 0.6.0
   */
  signalingstate: function (com, data, listener) {
    if (typeof com.onsignalingstatechange === 'function') {
      com.onsignalingstatechange(data.state);
    }
  },

  /**
   * Event fired when peer connection datachannel is received.
   * This happens when RTCPeerConnection receives a local or remote RTCDataChannel.
   * @property datachannel
   * @type Function
   * @private
   * @since 0.6.0
   */
  datachannel: function (com, data, listener) {
    data.channel.sourceType = data.sourceType;

    com.datachannels[data.channel.id] = data.channel;

    if (typeof com.ondatachannel === 'function') {
      com.ondatachannel(data.channel);
    }
  }
};