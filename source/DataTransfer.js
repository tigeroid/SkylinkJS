function DataTransfer(channel, config, listener) {
  'use strict';

  // Reference of instance
  var com = this;

  /**
   * The connection id.
   * @attribute id
   * @type String
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.id = config.id || null;
  
  /**
   * The peer id.
   * @attribute peerId
   * @type String
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.peerId = config.peerId || null;
  
  /**
   * The peer type.
   * @attribute type
   * @type String
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.type = config.type || 'stream';

  /**
   * The PeerConnection constraints.
   * @attribute constraints
   * @type String
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.constraints = config.constraints;

  /**
   * The PeerConnection configuration.
   * @attribute config
   * @type String
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.config = config.config || {
    optional: [{
      DtlsSrtpKeyAgreement: true
    }]
  };
  
  /**
   * The list of DataChannels connected to Peer.
   * @attribute datachannels
   * @param {DataChannel} main The main DataChannel for sending chats.
   * @param {JSON} transfers The list of datachannel(s) for transfers.
   * @param {DataChannel} [transfers.n=*] The DataChannel for sending data.
   * @type Stream
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.datachannels = {
    main: null,
    transfers: {}
  };

  /**
   * The stream object.
   * @attribute stream
   * @type Stream
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.stream = null;

  /**
   * The PeerConnection object.
   * @attribute RTCPeerConnection
   * @type JSON
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.RTCPeerConnection = null;

  /**
   * Binds events to RTCPeerConnection object.
   * @method bind
   * @trigger StreamJoined, mediaAccessRequired
   * @for Connection
   * @since 0.6.0
   */
  com.bind = function (bindPeer) {
    bindPeer.queueCandidate = [];
    bindPeer.iceConnectionFiredStates = [];
    bindPeer.newSignalingState = 'new';
    bindPeer.newIceConnectionState = 'checking';

    bindPeer.ondatachannel = function (event) {
      //var dc = event.channel || event;
      com.onDataChannel(event);
    };

    bindPeer.onaddstream = function (event) {
      com.onAddStream(event);
    };

    bindPeer.onicecandidate = function (event) {
      com.onIceCandidate(event, bindPeer);
    };

    bindPeer.oniceconnectionstatechange = function (event) {
      ICE.parseIceConnectionState(bindPeer);
    };

    bindPeer.oniceconnectionnewstatechange = function (event) {
      com.onIceConnectionStateChange(bindPeer);
    };

    // bindPeer.onremovestream = function (event) {};

    bindPeer.onsignalingstatechange = function (event) {
      bindPeer.newSignalingState = bindPeer.signalingState;
      com.onSignalingStateChange(event);
    };

    bindPeer.onicegatheringstatechange = function () {
      com.onIceGatheringStateChange(event);
    };
  };

  /**
   * Handles the event when a datachannel is received.
   * @method onDataChannel
   * @trigger StreamJoined, mediaAccessRequired
   * @for Connection
   * @since 0.6.0
   */
  com.onDataChannel = function (event) {
    var received = event.channel || event;

    var channel = new DataChannel(received, null, function (event, data) {
      listener(event, data);
    });

    if (channel.label === 'main') {
      com.datachannels.main = channel;
    } else {
      com.datachannels.transfers[channel.label] = channel;
    }
  };

  com.RTCPeerConnection = new window.RTCPeerConnection(com.config, com.constraints);
  
  if (!fn.isEmpty(stream)) {
    com.RTCPeerConnection.addStream(stream);
  }
  
  if (config.dataChannel) {
    com.datachannels.main = new DataChannel(com.RTCPeerConnection, {
      id: com.id,
    }, function(event, data) {
      listener(event, data);
    });
  } 
}