var Messaging = {
  handle : function (room) {
    // User is in the Room
    room.socket.when('inRoom', function (data) {
      room.self.userId = data.sid;
      room.socket.send({
        type: 'enter',
        mid: room.self.id,
        rid: room.id,
        agent: window.webrtcDetectedBrowser,
        version: window.webrtcDetectedVersion,
        userInfo: room.self.getData()
      });
    });
    
    // Peer has joined the Room
    room.socket.when('enter', function (data) {
      var weight = Connection.generatePriority(room);
      room.socket.send({
        type: 'welcome',
        mid: room.self.id,
        rid: room.id,
        agent: window.webrtcDetectedBrowser,
        version: window.webrtcDetectedVersion,
        userInfo: room.self.getData(),
        target: data.mid,
        weight: weight
      });
    });
    
    // Peer handshaking
    room.socket.when('welcome', function (data) {
      room.addUser(data);
    });
    
    // Peer handshaking
    room.socket.when('offer', function (data) {
      room.self.handleOffer(data);
    });
    
    // Peer handshaking
    room.socket.when('answer', function (data) {
      room.self.handleAnswer(data);
    });
    
    // Peer connecting
    room.socket.when('candidate', function (data) {
      room.self.handleCandidate(data);
    });
    
    // Peer connecting
    room.socket.when('bye', function (data) {
      room.removeUser(data);
    }); 
    
  },
  
  start : function (room) {
    room.socket.send({
      type: 'joinRoom',
      uid: room.self.connectId,
      cid: room.apiConfig.key,
      rid: room.apiConfig.id,
      userCred: room.self.token,
      timeStamp: room.self.timeStamp,
      apiOwner: room.owner,
      roomCred: room.apiConfig.token,
      start: room.apiConfig.startDateTime,
      len: room.apiConfig.duration
    });
  }
  
  
}