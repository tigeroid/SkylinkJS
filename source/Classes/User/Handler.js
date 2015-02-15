var UserHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Messaging events
  if (event.indexOf('message:') === 0) {
    
    fn.applyHandler(UserEventMessageHandler, params, [com, data, listener]);
  
  } else {
    // Class events
    if (event.indexOf('user:') === 0) {
      data.id = com.id;

      fn.applyHandler(UserEventResponseHandler, params, [com, data, listener]);

    } else {
      data.peerId = com.id;

      fn.applyHandler(UserEventReceivedHandler, params, [com, data, listener]);
    }
    
    listener(event, data);
  }
  
  //log.debug('PeerHandler', event, data);
};