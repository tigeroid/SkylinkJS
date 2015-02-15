var StreamHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  data.server = com.server;
  data.port = com.port;
  data.type = com.type;
  data.protocol = com.protocol;

  fn.applyHandler(StreamEventResponseHandler, params, [com, data, listener]);

  listener(event, data);

  log.debug('Stream', 'Responding with event =>', event, data);
};