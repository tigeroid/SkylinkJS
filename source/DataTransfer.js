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

    //self._clearDataChannelTimeout(peerId, true);

    if (ackN > -1) {
      // Still uploading
      if (ackN < chunksLength) {
        var fileReader = new FileReader();
        fileReader.onload = function() {
          // Load Blob as dataurl base64 string
          var base64BinaryString = fileReader.result.split(',')[1];
          com._sendDataChannelMessage(com.peerId, base64BinaryString);
          com._setDataChannelTimeout(com.peerId, timeout, true);

          /*self._trigger('dataTransferState', self.DATA_TRANSFER_STATE.UPLOADING,
            transferId, peerId, {
            percentage: (((ackN + 1) / chunksLength) * 100).toFixed()
          });*/

        };
        fileReader.readAsDataURL(com._uploadDataTransfers[com.peerId][ackN]);
      } else if (ackN === chunksLength) {
        /*self._trigger('dataTransferState',
          self.DATA_TRANSFER_STATE.UPLOAD_COMPLETED, transferId, peerId, {
          name: uploadedDetails.name
        });*/
        delete com._uploadDataTransfers[com.peerId];
        delete com._uploadDataSessions[com.peerId];
      }
    } else {
      /*self._trigger('dataTransferState', self.DATA_TRANSFER_STATE.REJECTED,
        transferId, peerId, {
          name: self._uploadDataSessions[peerId].name,
          size: self._uploadDataSessions[peerId].size
        });*/
      delete com._uploadDataTransfers[com.peerId];
      delete com._uploadDataSessions[com.peerId];
    }
  };

}






