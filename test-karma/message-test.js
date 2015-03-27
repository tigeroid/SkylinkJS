// Testing attributes
var sw = new Skylink();
var apikey = '5f874168-0079-46fc-ab9d-13931c2baa39';

//sw.setLogLevel(sw.LOG_LEVEL.DEBUG);

console.log('API: Tests the messaging in send message functions');
console.log('===============================================================================================');

describe("Test messaging functionalities", function() {

	before(function(){
		sw.init(apikey, function(){
		  sw.joinRoom();
		});
	})

	it('_sendChannelMessage(): Jamming signaling messages', function(done){
	  this.timeout(101000);

	  var count = 0;

	  sw.on('iceConnectionState', function(state) {
	    if (state === sw.ICE_CONNECTION_STATE.COMPLETED) {
	      for(var i = 0; i < 40; i++){
	        sw.sendMessage('jam' + i);
	      }
	    }
	  });

	  sw.on('incomingMessage', function(message){

	    if (message.content === ('jam' + count) ) {
	      count += 1;
	    }

	    if (count === 40) {
	      sw.off('peerJoined');
	      sw.off('incomingMessage');
	      assert.ok(true, false, 'All messages received');
	      done();
	    }
	  });

	  setTimeout(function(){
	    sw.off('peerJoined');
	    sw.off('incomingMessage');
	  }, 100000);

	});

	it('sendMessage(): Testing signalling message', function (done) {

	  this.timeout(26000);

	  var received = 0;

	  // ice connection state means the peer is connected,
	  // datachannel should be connected by then

	  // Start test signaling message
	  sw.sendMessage('SIG-SEND-PUBLIC');
	  console.log('Sending sig public');

	  setTimeout(function () {
	    sw.sendMessage('SIG-SEND-PRIVATE');
	    console.log('Sending sig private');
	  }, 1000);

	  sw.on('incomingMessage', function (message, peerId, peerInfo, isSelf) {
	    if (!isSelf) {
	      if (message.content === 'SIG-PUBLIC') {
	        if (message.isPrivate === false && message.isDataChannel === false) {
	          assert.ok(true, 'Signaling public message is correctly send and received');
	        } else {
	          assert.fail(false, true, 'Signaling public message sending and receiving failed');
	        }
	        received += 1;
	      }
	      if (message.content === 'SIG-PRIVATE') {
	        if (message.isPrivate === true && message.isDataChannel === false) {
	          assert.ok(true, 'Signaling private message is correctly send and received');
	        } else {
	          assert.fail(false, 'Signaling private message sending and receiving failed');
	        }
	        received += 1;
	        done();
	      }
	    }
	  });

	  setTimeout(function () {
	    if (received === 0) {
	      assert.fail(false, true, 'Signaling public message sending and receiving failed - timeout');
	    }
	    if (received === 1) {
	      assert.fail(false, true, 'Signaling private message sending and receiving failed - timeout');
	    }
	    sw.off('peerJoined');
	    sw.off('incomingMessage');
	    done();
	  }, 25000);

	});

	it('sendP2PMessage(): Testing datachannel message', function (done) {
	  this.timeout(26000);

	  var received = 0;

	  setTimeout(function () {
	    sw.sendP2PMessage('DC-SEND-PUBLIC');
	    console.log('Sending dc public');
	  }, 1000);

	  setTimeout(function () {
	    sw.sendP2PMessage('DC-SEND-PRIVATE');
	    console.log('Sending dc private');
	  }, 2000);

	  sw.on('incomingMessage', function (message, peerId, peerInfo, isSelf) {
	    if (!isSelf) {
	      if (message.content === 'DC-PUBLIC') {
	        if (message.isPrivate === false && message.isDataChannel === true) {
	          assert.ok(true, 'Datachannel public message is correctly send and received');
	        } else {
	          assert.fail(false, true, 'Datachannel public message sending and receiving failed');
	        }
	        received += 1;
	      }
	      if (message.content === 'DC-PRIVATE') {
	        if (message.isPrivate === true && message.isDataChannel === true) {
	          assert.ok(true, 'Datachannel private message is correctly send and received');
	        } else {
	          assert.fail(false, true, 'Datachannel private message sending and receiving failed');
	        }
	        received += 1;
	        done();
	      }
	    }
	  });

	  setTimeout(function () {
	    if (received === 0) {
	      assert.fail(false, true, 'Datachannel public message sending and receiving failed - timeout');
	    }
	    if (received === 1) {
	      assert.fail(false, true, 'Datachannel private message sending and receiving failed - timeout');
	    }
	    sw.off('peerJoined');
	    sw.off('incomingMessage');
	    done();
	  }, 25000);
	});

});







