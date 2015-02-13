DataTransferEventResponseHandler = {
	start: function(com, data, listener){
		if (!com.datatransfers[data.dataChannel.id]){
			com.datatransfers[data.dataChannel.id] = new DataTransfer(data.dataChannel, com.id, listener);
		}
	}
};

var DataTransferHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  data.id = com.id;

  fn.applyHandler(DataTransferEventResponseHandler, params, [com, data, listener]);

  listener(event, data);
};