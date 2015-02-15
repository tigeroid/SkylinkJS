var SelfHandler = function (com, event, data, listener) {
  var params = event.split(':');
  data = data || {};

  // Messaging events
  if (event.indexOf('message:') === 0) {

    fn.applyHandler(SelfEventMessageHandler, params, [com, data, listener]);

  } else {
    // Class events
    if (event.indexOf('self:') === 0) {
      data.id = com.id;

      fn.applyHandler(SelfEventResponseHandler, params, [com, data, listener]);

    } else {
      data.selfId = com.selfId;

      fn.applyHandler(SelfEventReceivedHandler, params, [com, data, listener]);
    }

    listener(event, data);
  }
};
