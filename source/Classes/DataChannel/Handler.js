var DataChannelHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  data.id = com.id;

  fn.applyHandler(DataChannelEventResponseHandler, params, [com, data, listener]);

  listener(event, data);
};