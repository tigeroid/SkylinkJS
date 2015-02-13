DataTransferEventResponseHandler = {
	start: function(com, data, listener){
		var dt = new DataTransfer(data.dataChannel, com.id, listener);
		com.datatransfers[data.dataChannel.id] = dt;
	}
};

var DataTransferHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  data.id = com.id;

  fn.applyHandler(DataTransferEventResponseHandler, params, [com, data, listener]);

  listener(event, data);
};