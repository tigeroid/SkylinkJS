var StreamHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  data.id = com.id;

  fn.applyHandler(StreamEventResponseHandler, params, [com, data, listener]);

  listener(event, data);

  log.debug('Stream', 'Responding with event =>', event, data);
};