var UserHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Messaging events
  if (event.indexOf('message:') === 0) {

    fn.applyHandler(UserEventMessageHandler, params, [com, data, listener]);

    log.debug('Stream', 'Received message event', event, data);

  } else {
    // Class events
    if (event.indexOf('user:') === 0) {
      data.id = com.id;

      fn.applyHandler(UserEventResponseHandler, params, [com, data, listener]);

      log.debug('Stream', 'Responding with event', event, data);

    } else {
      data.userId = com.id;

      fn.applyHandler(UserEventReceivedHandler, params, [com, data, listener]);

      log.debug('Stream', 'Received sub-class event', event, data);
    }

    listener(event, data);
  }
};