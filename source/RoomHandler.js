var RoomHandler = {
  
  // Handles socket events
  socket: {
    // Handles socket connect event
    'socket:connect': function (com, data) {
      com.socket.send({
        type: 'joinRoom',
        uid: com.self.connectId,
        cid: com.apiConfig.key,
        rid: com.apiConfig.id,
        userCred: com.self.token,
        timeStamp: com.self.timeStamp,
        apiOwner: com.owner,
        roomCred: com.apiConfig.token,
        start: com.apiConfig.startDateTime,
        len: com.apiConfig.duration
      });
    },
    
    // Handles socket disconnect event
    'socket:disconnect': function (com, data) {
    },
    
    // Handles socket message event
    'socket:message': function (com, data) {
    }
  },
  
  // Handles messaging events
  message: {
  },
  
  
  
  
};