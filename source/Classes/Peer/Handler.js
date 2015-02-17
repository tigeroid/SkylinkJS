var PeerHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Messaging events
  if (event.indexOf('message:') === 0) {

    fn.applyHandler(PeerEventMessageHandler, params, [com, data, listener]);

  } else {
    // Class events
    if (event.indexOf('peer:') === 0) {
      data.id = com.id;

      fn.applyHandler(PeerEventResponseHandler, params, [com, data, listener]);

    } else {
      data.peerId = com.id;

      fn.applyHandler(PeerEventReceivedHandler, params, [com, data, listener]);
    }

    listener(event, data);
  }

  //log.debug('PeerHandler', event, data);
};