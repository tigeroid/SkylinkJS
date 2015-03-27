// Testing attributes
var sw = new Skylink();
var apikey = '5f874168-0079-46fc-ab9d-13931c2baa39';

//sw.setLogLevel(sw.LOG_LEVEL.DEBUG);

console.log('API: Tests the sendBlobData() transfers and dataTransferState events');
console.log('===============================================================================================');

describe("Test peer functionalities", function() {

	before(function(){
		sw.init(apikey, function(){
			sw.joinRoom();
		})
	});

	it('Testing receiving file', function (done) {
	  this.timeout(12000);

	  var array = [];

	  var data = new Blob(['<a id="a"><b id="b">PEER2</b></a>']);

	  sw.on('dataChannelState', function (state) {
	    if (state === sw.DATA_CHANNEL_STATE.OPEN) {
	      sw.sendP2PMessage('RECEIVE-BLOB');
	      console.log('Sending "RECEIVE-BLOB"');
	    }
	  });

	  sw.on('dataTransferState', function (state, transferId, peerId, transferInfo) {
	    array.push(state);

	    if (state === sw.DATA_TRANSFER_STATE.UPLOAD_REQUEST) {
	      sw.respondBlobRequest(peerId, true);
	      console.log('Received blob upload request');
	    }
	    if (state === sw.DATA_TRANSFER_STATE.DOWNLOAD_COMPLETED) {
	      console.log('Received blob download completed');
	      // check if matches
	      assert.deepEqual(transferInfo.data, data, 'Received data is the same as sent data');
	    }
	  });

	  setTimeout(function () {
	    assert.deepEqual(array, [
	      sw.DATA_TRANSFER_STATE.UPLOAD_REQUEST,
	      sw.DATA_TRANSFER_STATE.DOWNLOAD_STARTED,
	      //sw.DATA_TRANSFER_STATE.DOWNLOADING, // not huge file
	      sw.DATA_TRANSFER_STATE.DOWNLOAD_COMPLETED
	    ], 'Received data states are triggered in order');
	    done();
	  }, 8000);
	});

	it('Testing sending file', function (done) {
	  this.timeout(12000);

	  var array = [];

	  var received = false;

	  var data = new Blob(['<a id="a"><b id="b">PEER1</b></a>']);

	  sw.on('dataTransferState', function (state, transferId, peerId, transferInfo) {
	    array.push(state);
	  });

	  sw.on('incomingMessage', function (message) {
	    if (message.content === 'SEND-BLOB-SUCCESS') {
	      received = true;
	      console.log('Received "SEND-BLOB-SUCCESS"');
	    }
	    if (message.content === 'SEND-BLOB-FAILURE') {
	      console.log('Received "SEND-BLOB-FAILURE"');
	    }
	  });

	  sw.sendBlobData(data, {
	    name: 'Test2',
	    size: data.size
	  });

	  console.log('Sending "Test2" blob');

	  setTimeout(function () {
	    assert.deepEqual(array, [
	      sw.DATA_TRANSFER_STATE.UPLOAD_STARTED,
	      sw.DATA_TRANSFER_STATE.UPLOADING,
	      sw.DATA_TRANSFER_STATE.UPLOAD_COMPLETED
	    ], 'Sent data states are triggered in order');

	    if (received) {
	      assert.ok(true, 'Peer received blob sent');
	    } else {
	      assert.fail(false, true, 'Peer failed receiving blob sent');
	    }
	    done();
	  }, 8000);
	});

});







