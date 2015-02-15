var PeerEventReceivedHandler = {
  
  // Handles the stream events */
  stream: {
    // Handles the stream stop event */
    stop: function (com, data, listener) {
      // When receiving stream stops and it is not the main peer connection, it means
      // that connection has stopped
      // If stream is not the main, disconnect the peer connection.
      if (com.id !== 'main') {
        com.disconnect();
      }
    }
  }
  
};