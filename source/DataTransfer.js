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

  com.DATA_TRANSFER_DATA_TYPE = {
    BINARY_STRING: 'binaryString',
    ARRAY_BUFFER: 'arrayBuffer',
    BLOB: 'blob'
  };

  com._uploadDataTransfers = [];

  com._uploadDataSessions = [];

  com._downloadDataTransfers = [];

  com._downloadDataSessions = [];

  com._dataTransfersTimeout = [];
  
  /*//Overwrite previous handler
  com.bind = function (bindChannel) {
    bindChannel.onmessage = function (event) {
      com.onMessage(bindChannel, event.data);
    };
  }; 

  com.onMessage = function(bindChannel, data){
    com._dataChannelProtocolHandler(data);
  }*/

  com.channel.RTCDataChannel.onmessage = function(event){
    console.log('binding');
    com._dataChannelProtocolHandler(event.data);
  }

  console.log(com.channel.RTCDataChannel.onmessage);

  com._dataChannelProtocolHandler = function(dataString) {
    // PROTOCOL ESTABLISHMENT
    if (typeof dataString === 'string') {
      var data = {};
      try {
        data = JSON.parse(dataString);
      } catch (error) {
        com._DATAProtocolHandler(dataString,
          com.DATA_TRANSFER_DATA_TYPE.BINARY_STRING);
        return;
      }
      switch (data.type) {
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
      case com._DC_PROTOCOL_TYPE.MESSAGE: // Not considered a protocol actually?
        com.MESSAGEProtocolHandler(data);
        break;
      default:
        console.error('Unsupported type: '+data.type);
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
    console.log('wrq here');
    listener('datatransfer:uploadrequest',{
      peerId: com.peerId,
      transferId: transferId,
      name: name,
      size: binarySize,
      expectedSize: expectedSize,
      timeout: timeout,
      dataTransfer: com
    });
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
          com.channel.send(base64BinaryString);
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
    console.log(com.peerId);
    console.log(com._uploadDataSessions);
    var transferId = (isUploader) ? com._uploadDataSessions[com.peerId].transferId :
      com._downloadDataSessions[com.peerId].transferId;
    listener('datatransfer:error',{
      peerId: com.peerId,
      data: data,
      transferType: ((isUploader) ? com.DATA_TRANSFER_TYPE.UPLOAD :
        com.DATA_TRANSFER_TYPE.DOWNLOAD)
    });
  };

  com._CANCELProtocolHandler = function(data) {
    var isUpload = !!com._uploadDataSessions[com.peerId];
    var isDownload = !!com._downloadDataSessions[com.peerId];

    var transferId = (isUpload) ? com._uploadDataSessions[com.peerId].transferId :
      com._downloadDataSessions[com.peerId].transferId;

    com._clearDataChannelTimeout(isUploader);

    listener('datatransfer:cancel',{
      peerId: com.peerId,
      transferId: transferId,
      name: data.name,
      content: data.content,
      senderPeerId: data.sender,
      transferType: ((isUpload) ? com.DATA_TRANSFER_TYPE.UPLOAD :
        com.DATA_TRANSFER_TYPE.DOWNLOAD)
    });

    try {
      if (isUpload) {
        delete com._uploadDataSessions[com.peerId];
        delete com._uploadDataTransfers[com.peerId];
      } else {
        delete com._downloadDataSessions[peerId];
        delete com._downloadDataTransfers[peerId];
      }

      listener('datatransfer:cancel',{
        peerId: com.peerId,
        transferId: transferId,
        name: data.name,
        content: data.content,
        senderPeerId: data.sender,
        transferType: ((isUpload) ? com.DATA_TRANSFER_TYPE.UPLOAD :
          com.DATA_TRANSFER_TYPE.DOWNLOAD)
      });

    } catch (error) {
      listener('datatransfer:error',{
        message: 'Failed cancelling data request from peer',
        transferType: ((isUpload) ? com.DATA_TRANSFER_TYPE.UPLOAD :
          com.DATA_TRANSFER_TYPE.DOWNLOAD)
      });
    }
  };

  com._DATAProtocolHandler = function(dataString, dataType) {
    var chunk, error = '';
    var transferStatus = com._downloadDataSessions[com.peerId];

    var transferId = transferStatus.transferId;

    com._clearDataChannelTimeout(false);

    if (dataType === com.DATA_TRANSFER_DATA_TYPE.BINARY_STRING) {
      chunk = DataProcess.unchunk(dataString);
    } else if (dataType === com.DATA_TRANSFER_DATA_TYPE.ARRAY_BUFFER) {
      chunk = new Blob(dataString);
    } else if (dataType === com.DATA_TRANSFER_DATA_TYPE.BLOB) {
      chunk = dataString;
    } else {
      error = 'Unhandled data exception: ' + dataType;

      listener('datatransfer:error',{
        peerId: com.peerId,
        transferId: transferId,
        message: error,
        transferType: com.DATA_TRANSFER_TYPE.DOWNLOAD
      });

      return;
    }
    var receivedSize = (chunk.size * (4 / 3));

    if (transferStatus.chunkSize >= receivedSize) {
      com._downloadDataTransfers[com.peerId].push(chunk);
      transferStatus.ackN += 1;
      transferStatus.receivedSize += receivedSize;
      var totalReceivedSize = transferStatus.receivedSize;
      var percentage = ((totalReceivedSize / transferStatus.size) * 100).toFixed();

      com.channel.send({
        type: com._DC_PROTOCOL_TYPE.ACK,
        sender: null,
        ackN: transferStatus.ackN
      });

      if (transferStatus.chunkSize === receivedSize) {

        listener('datatransfer:downloading',{
          peerId: com.peerId,
          transferId: transferId,
          percentage: percentage
        }); 

        com._setDataChannelTimeout(transferStatus.timeout, false);
        com._downloadDataTransfers[com.peerId].info = transferStatus;
      } else {
        var blob = new Blob(com._downloadDataTransfers[com.peerId]);

        listener('datatransfer:downloadcompleted',{
          peerId: com.peerId,
          transferId: transferId,
          data: blob
        });

        delete com._downloadDataTransfers[com.peerId];
        delete com._downloadDataSessions[com.peerId];
      }
    } else {
      error = 'Packet not match - [Received]' + receivedSize +
        ' / [Expected]' + transferStatus.chunkSize;
      listener('datatransfer:error',{
        peerId: com.peerId,
        transferId: transferId,
        message: error,
        transferType: com.DATA_TRANSFER_TYPE.DOWNLOAD
      });
    }
  };

  com.sendBlobData = function(data, dataInfo) {
    dataInfo.timeout = dataInfo.timeout || 60;
    dataInfo.transferId = com.DATA_TRANSFER_TYPE.UPLOAD +
      (((new Date()).toISOString().replace(/-/g, '').replace(/:/g, ''))).replace('.', '');
    console.log('Sending blob data');
    com.sendBlobDataToPeer(data, dataInfo, true);

    listener('datatransfer:uploadstarted',{
      peerId: com.peerId,
      transferId: dataInfo.transferId,
      name: dataInfo.name,
      size: dataInfo.size,
      timeout: dataInfo.timeout || 60,
      data: data
    });

  };

  com.sendBlobDataToPeer = function(data, dataInfo, isPrivate) {

    var ongoingTransfer = null;
    var binarySize = parseInt((dataInfo.size * (4 / 3)).toFixed(), 10);
    var chunkSize = parseInt((DataProcess.chunkSize * (4 / 3)).toFixed(), 10);

    if (window.webrtcDetectedBrowser === 'firefox' &&
      window.webrtcDetectedVersion < 30) {
      chunkSize = DataProcess.mozChunkSize;
    }
    console.log('Chunk size of data: '+chunkSize);

    if (com._uploadDataSessions[com.peerId]) {
      ongoingTransfer = com.DATA_TRANSFER_TYPE.UPLOAD;
    } else if (com._downloadDataSessions[com.peerId]) {
      ongoingTransfer = com.DATA_TRANSFER_TYPE.DOWNLOAD;
    }

    if (ongoingTransfer) {
      console.error('User have ongoing ' + ongoingTransfer + ' ' +
        'transfer session with peer. Unable to send data '+ dataInfo);
      listener('datatransfer:error',{
        peerId: peerId,
        transferId: dataInfo.transferId,
        name: dataInfo.name,
        message: dataInfo.content,
        transferType: ongoingTransfer
      });
      return;
    }
    com._uploadDataTransfers[com.peerId] = DataProcess.chunk(data, dataInfo.size);
    com._uploadDataSessions[com.peerId] = {
      name: dataInfo.name,
      size: binarySize,
      transferId: dataInfo.transferId,
      timeout: dataInfo.timeout
    };
    console.log(com.channel);
    com.channel.send({
      type: com._DC_PROTOCOL_TYPE.WRQ,
      //sender: this._user.sid,
      agent: window.webrtcDetectedBrowser,
      name: dataInfo.name,
      size: binarySize,
      chunkSize: chunkSize,
      timeout: dataInfo.timeout,
      target: com.peerId,
      isPrivate: !!isPrivate
    });
    com._setDataChannelTimeout(dataInfo.timeout, true);
  };

  com.respondBlobRequest = function (accept) {
    if (accept) {
      console.log('User accepted peer request');
      com._downloadDataTransfers[com.peerId] = [];
      var data = com._downloadDataSessions[com.peerId];
      com.channel.send({
        type: com._DC_PROTOCOL_TYPE.ACK,
        //sender: this._user.sid,
        ackN: 0,
        agent: window.webrtcDetectedBrowser
      });

      listener('datatransfer:downloadstarted',{
        peerId: com.peerId,
        name: data.name,
        size: data.size,
        transferId: data.transferId
      });

    } else {
      console.log('User rejected peer request');
      com.channel.send({
        type: this._DC_PROTOCOL_TYPE.ACK,
        //sender: this._user.sid,
        ackN: -1
      });
      delete com._downloadDataSessions[com.peerId];
    }
  };

  com.cancelBlobTransfer = function (transferType) {
    var data;

    // cancel upload
    if (transferType === com.DATA_TRANSFER_TYPE.UPLOAD && !transferType) {
      data = com._uploadDataSessions[com.peerId];

      if (data) {
        delete com._uploadDataSessions[com.peerId];
        delete com._uploadDataTransfers[com.peerId];

        com.channel.send({
          type: com._DC_PROTOCOL_TYPE.CANCEL,
          //sender: this._user.sid,
          name: data.name,
          content: 'Peer cancelled upload transfer'
        });
      } else {
        listener('datatransfer:error',{
          peerId: com.peerId,
          transferId: dataInfo.transferId,
          name: dataInfo.name,
          message: 'Unable to cancel upload transfer. There is ' +
            'not ongoing upload sessions with the peer',
          transferType: com.DATA_TRANSFER_TYPE.UPLOAD
        });

        if (!!transferType) {
          return;
        }
      }
    }
    if (transferType === com.DATA_TRANSFER_TYPE.DOWNLOAD) {
      data = com._downloadDataSessions[peerId];

      if (data) {
        delete com._downloadDataSessions[com.peerId];
        delete com._downloadDataTransfers[com.peerId];

        com.channel.send({
          type: com._DC_PROTOCOL_TYPE.CANCEL,
          //sender: this._user.sid,
          name: data.name,
          content: 'Peer cancelled download transfer'
        });
      } else {
        listener('datatransfer:error',{
          peerId: com.peerId,
          transferId: dataInfo.transferId,
          name: dataInfo.name,
          message: 'Unable to cancel download transfer. There is ' +
            'not ongoing download sessions with the peer',
          transferType: com.DATA_TRANSFER_TYPE.DOWNLOAD
        });
      }
    }
  };
}






