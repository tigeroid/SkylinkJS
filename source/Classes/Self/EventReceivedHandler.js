var SelfEventReceivedHandler = {

  stream: {
    stop: function (com, data, listener) {
      // Trigger the event
      var peerId = com.findStreamConnectionId(data.id);

      com.respond('self:removestreamconnection', {
        streamId: data.id,
        peerId: key
      });
    }
  }
};