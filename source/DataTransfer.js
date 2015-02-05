function DataTransfer(channel, peerId, listener) {
  'use strict';

  var com = this;
  
  com.peerId = peerId;

  com.channel = channel;

  com._DC_PROTOCOL_TYPE = {
    WRQ: 'WRQ',
    ACK: 'ACK',
    ERROR: 'ERROR',
    CANCEL: 'CANCEL',
    MESSAGE: 'MESSAGE'
  };
  
  com.dataHandler = function(dataString){
    if (typeof dataString === 'string'){
      var data = {};
      try{
        data = JSON.parse(dataString);
      }
      catch(error){
        listener('datatransfer:binary',{
          id: com.id,
          peerId: com.peerId,
          data: dataString
        });
        com.DATAProtocolHandler(dataString);
        return;
      }

      listener('datatransfer:generic',{
        peerId: com.peerId,
        data: data
      });

      switch(data.type){
        case com._DC_PROTOCOL_TYPE.WRQ:
          com.WRQProtocolHandler(data);
          break;
        case com._DC_PROTOCOL_TYPE.ACK:
          com.ACKProtocolHandler(data);
          break;
        case com._DC_PROTOCOL_TYPE.ERROR:
          com.ERRORProtocolHandler(data);
          break;
        case com._DC_PROTOCOL_TYPE.CANCEL:
          com.CANCELProtocolHandler(data);
          break;
        case com._DC_PROTOCOL_TYPE.MESSAGE:
          com.MESSAGEProtocolHandler(data);
          break;
        default:
          listener('datatransfer:unsupported',{
            peerId: com.peerId,
            data: data
          })
      }
    }
  };

}