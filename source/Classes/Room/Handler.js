var RoomHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Messaging events
  if (event.indexOf('message:') === 0) {
    
    fn.applyHandler(RoomEventMessageHandler, params, [com, data, listener]);
  
    log.debug('Room', 'Received message event =>', event, data);
  
  } else {
    // Class events
    if (event.indexOf('room:') === 0) {
      data.name = com.name;

      fn.applyHandler(RoomEventResponseHandler, params, [com, data, listener]);
      
      log.debug('Room', 'Responding with event =>', event, data);

    } else {
      data.roomName = com.name;

      fn.applyHandler(RoomEventReceivedHandler, params, [com, data, listener]);
    
      log.debug('Room', 'Received sub-class event =>', event, data);
    }
  
    listener(event, data);
  }
};