/**
 * Handles the Peer connections.
 * @class Peer
 * @for Skylink
 * @since 0.6.0
 */
function Peer(config, listener) {
  'use strict';

  // Reference of instance
  var com = this;

  /**
   * The peer id.
   * @attribute id
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.id = config.id || null;

  /**
   * The PeerConnection constraints.
   * @attribute constraints
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.constraints = config.constraints;

  /**
   * The DataChannel connected to PeerConnection.
   * @attribute datachannel
   * @type Peer
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.datachannel = null;
  
  /**
   * Stores the list DataTransfers.
   * @attribute datatransfers
   * @type Peer
   * @private
   * @for Connection
   * @since 0.6.0
   */
  com.datatransfers = {};

  /**
   * Stores the list of stream object.
   * @attribute streams
   * @type JSON
   * @param {Stream} [n..] The stream object.
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.streams = {};

  /**
   * Stores the list of the connections.
   * @attribute connections
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.connections = {};
  
  /**
   * Stores the user data.
   * @attribute data
   * @type JSON
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com.data = {};

  /**
   * Starts a DataTransfer.
   * @method transfer
   * @trigger peerJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.transfer = function (data) {
    var transfer = new DataTransfer(null, data, function (event, data) {
      listener(event, data);
    });
  };

  /**
   * Starts a peer connection with the stream.
   * @method disconnect
   * @trigger peerJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.connect = function (stream, bandwidth) {
    var connection = com.UserPeer(stream, bandwidth);
    
    com.connections[connection.id] = connection;
  };
  
  /**
   * Starts another peer connection to send a stream
   * @method sendStream
   * @trigger peerJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.sendStream = function (stream, bandwidth) {
    var connection = com.StreamPeer(stream, bandwidth);
    
    com.connections[connection.id] = connection;
  };
  
  /**
   * Starts the main streamming peer connection.
   * @method UserPeer
   * @trigger peerJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.UserPeer = function (stream, bandwith) {
    var connection = new Connection(stream || null, {
      type: 'user',
      constraints: constraints,
      dataChannel: globals.dataChannel,
      bandwidth: bandwidth
    
    }, function (event, data) {
      if (event.indexOf('datachannel') > 0) {
        com.bindDataChannel(connection, event);
      }
      if (event.indexOf('stream') > 0) {
        com.bindStream(connection, event);
      }
    });
    
    return connection;
  };
  
  /**
   * Starts an additional streamming peer connection.
   * @method StreamPeer
   * @trigger peerJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.StreamPeer = function (stream, bandwith) {
    var connection = new Connection(stream, {
      type: 'stream',
      constraints: constraints,
      dataChannel: false,
      bandwidth: bandwidth
  
    }, function (event, data) {
      if (event.indexOf('stream') > 0) {
        com.bindStream(connection, event);
      }
    });
    
    return connection;
  };
  
  /**
   * Binds all the events and handles the datachannels.
   * @method bindDataChannel
   * @trigger peerJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.bindDataChannel = function (connection, event) {
    var channel = event.data;

    if (channel.label.indexOf('main')) {
      com.datachannel = new DataChannel(channel, listener);
    
    } else {
      com.datatransfers[channel.label] = new DataTransfer(channel, listener);
    }
  };
  
  /**
   * Binds all the events and handles the streams.
   * @method bindStream
   * @trigger peerJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.bindStream = function (connection, event) {
    var stream = event.data;
  
    com.streams[stream.id] = new Stream(stream, {}, function (event, data) {
      
    });
  };

  /**
   * Stops all peer connections.
   * @method disconnect
   * @trigger peerJoined, mediaAccessRequired
   * @for Peer
   * @since 0.6.0
   */
  com.disconnect = function (peerId) {
    for (var key in com.connections) {
      com.connections.disconnect();
    }
  };
  
  // Throw an error if adapterjs is not loaded
  if (!window.RTCPeerConnection) {
    throw new Error('Required dependency adapterjs not found');
  }
}