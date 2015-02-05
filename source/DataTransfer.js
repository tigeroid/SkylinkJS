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

  com.DATA_TRANSFER_TYPE = {
    UPLOAD: 'upload',
    DOWNLOAD: 'download'
  };

  com.DATA_TRANSFER_STATE = {
    UPLOAD_REQUEST: 'request',
    UPLOAD_STARTED: 'uploadStarted',
    DOWNLOAD_STARTED: 'downloadStarted',
    REJECTED: 'rejected',
    CANCEL: 'cancel',
    ERROR: 'error',
    UPLOADING: 'uploading',
    DOWNLOADING: 'downloading',
    UPLOAD_COMPLETED: 'uploadCompleted',
    DOWNLOAD_COMPLETED: 'downloadCompleted'
  };

  com._uploadDataTransfers = [];

  com._uploadDataSessions = [];

  com._downloadDataTransfers = [];

  com._downloadDataSessions = [];

  com._dataTransfersTimeout = [];
  
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

  com._setDataChannelTimeout = function(timeout, isSender) {
    if (!com._dataTransfersTimeout[com.peerId]) {
      com._dataTransfersTimeout[com.peerId] = [];
    }
    var type = (isSender) ? com.DATA_TRANSFER_TYPE.UPLOAD :
      com.DATA_TRANSFER_TYPE.DOWNLOAD;
    com._dataTransfersTimeout[com.peerId][type] = setTimeout(function() {
      var name;
      if (com._dataTransfersTimeout[com.peerId][type]) {
        if (isSender) {
          name = com._uploadDataSessions[com.peerId].name;
          delete com._uploadDataTransfers[com.peerId];
          delete com._uploadDataSessions[com.peerId];
        } else {
          name = com._downloadDataSessions[com.peerId].name;
          delete com._downloadDataTransfers[com.peerId];
          delete com._downloadDataSessions[com.peerId];
        }

        com.channel.send({
          type: com._DC_PROTOCOL_TYPE.ERROR,
          //sender: self._user.sid,
          name: name,
          content: 'Connection Timeout. Longer than ' + timeout +
            ' seconds. Connection is abolished.',
          isUploadError: isSender
        });
        
        com._clearDataChannelTimeout(isSender);
      }
    }, 1000 * timeout);
  };

  com._clearDataChannelTimeout = function(isSender) {
    if (com._dataTransfersTimeout[com.peerId]) {
      var type = (isSender) ? com.DATA_TRANSFER_TYPE.UPLOAD :
        com.DATA_TRANSFER_TYPE.DOWNLOAD;
      clearTimeout(com._dataTransfersTimeout[com.peerId][type]);
      delete com._dataTransfersTimeout[com.peerId][type];
    }
  };

  com.WRQProtocolHandler = function(data){
    var transferId = com.peerId + com.DATA_TRANSFER_TYPE.DOWNLOAD +
      (((new Date()).toISOString().replace(/-/g, '').replace(/:/g, ''))).replace('.', '');

    listener('datatransfer:wrq',{
      transferId: transferId,
      peerId: com.peerId,
      data: data
    });

    var name = data.name;
    var binarySize = data.size;
    var expectedSize = data.chunkSize;
    var timeout = data.timeout;
    com._downloadDataSessions[com.peerId] = {
      transferId: transferId,
      name: name,
      size: binarySize,
      ackN: 0,
      receivedSize: 0,
      chunkSize: expectedSize,
      timeout: timeout
    };
  };

  com.ACKProtocolHandler = function(data){
    var ackN = data.ackN;
    com.peerId = (com.peerId === 'MCU') ? data.sender : com.peerId;

    var chunksLength = com._uploadDataTransfers[com.peerId].length;
    var uploadedDetails = com._uploadDataSessions[com.peerId];
    var transferId = uploadedDetails.transferId;
    var timeout = uploadedDetails.timeout;

    com._clearDataChannelTimeout(true);

    if (ackN > -1) {
      // Still uploading
      if (ackN < chunksLength) {
        var fileReader = new FileReader();
        fileReader.onload = function() {
          // Load Blob as dataurl base64 string
          var base64BinaryString = fileReader.result.split(',')[1];
          //com._sendDataChannelMessage(com.peerId, base64BinaryString);
          com._setDataChannelTimeout(timeout, true);

          listener('datatransfer:uploading',{
            peerId: com.peerId,
            transferId: transferId,
            percentage: (((ackN + 1) / chunksLength) * 100).toFixed()
          });
        };
        fileReader.readAsDataURL(com._uploadDataTransfers[com.peerId][ackN]);
      } else if (ackN === chunksLength) {
        
        listener('datatransfer:uploadcompleted',{
          peerId: com.peerId,
          transferId: transferId,
          name: uploadedDetails.name
        });
        delete com._uploadDataTransfers[com.peerId];
        delete com._uploadDataSessions[com.peerId];
      }
    } else {
      listener('datatransfer:rejected',{
        peerId: com.peerId,
        transferId: transferId,
        name: com._uploadDataSessions[com.peerId].name,
        size: com._uploadDataSessions[com.peerId].size
      });
      delete com._uploadDataTransfers[com.peerId];
      delete com._uploadDataSessions[com.peerId];
    }
  };

  com.MESSAGEProtocolHandler = function(data){
    listener('datatransfer:message',{
      peerId: com.peerId,
      data: data
    });
  };

  com.ERRORProtocolHandler = function(data){
    var isUploader = data.isUploadError;
    var transferId = (isUploader) ? com._uploadDataSessions[com.peerId].transferId :
      com._downloadDataSessions[com.peerId].transferId;
    listener('datatransfer:error',{
      peerId: com.peerId,
      data: data,
      transferType: ((isUploader) ? com.DATA_TRANSFER_TYPE.UPLOAD :
        com.DATA_TRANSFER_TYPE.DOWNLOAD)
    });
  };

}






