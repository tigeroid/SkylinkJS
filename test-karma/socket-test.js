// Testing attributes
var sw = new Skylink();
var apikey = '5f874168-0079-46fc-ab9d-13931c2baa39';

//sw.setLogLevel(sw.LOG_LEVEL.DEBUG);

console.log('API: Tests the socket connection and fallback connections');
console.log('===============================================================================================');

describe("Test peer functionalities", function() {

	it('channelOpen, channelClose: Check socket connection', function(done) {
	  this.timeout(25000);

	  var array = [];

	  sw.on('channelOpen', function () {
	    array.push(1);
	    sw._closeChannel();
	  });

	  sw.on('channelClose', function () {
	    array.push(2);
	  });

	  sw.init({
	  	apiKey: apikey,
	  	socketTimeout: 5000
	  }, function(){
	  	sw._openChannel();
	  });

	  setTimeout(function () {
	    assert.deepEqual(array, [1, 2], 'Channel connection opening and closing');
	    sw.off('readyStateChange');
	    sw.off('channelOpen');
	    sw.off('channelClose');
	    done();
	  }, 21000);
	});

	it('init() - forceSSL: Test socket connection forceSSL', function(done) {
	  this.timeout(20000);

	  function forceSSLTrue () {
	    sw.on('readyStateChange', function (state) {
	      if (state === sw.READY_STATE_CHANGE.COMPLETED) {
	        sw._openChannel();
	      }
	    });

	    sw.on('channelOpen', function () {
	      assert.deepEqual(sw._signalingServerPort, 443, 'ForceSSL port is HTTPS port');
	      assert.deepEqual(sw._signalingServerProtocol, 'https:', 'ForceSSL port is HTTPS protocol');
	      sw._closeChannel();
	    });

	    sw.on('channelClose', function () {
	      //sw._signalingServer = '192.168.123.4';
	      sw._openChannel();
	      // place here because it's fired before channelOpen
	      sw.on('socketError', function (errorCode) {
	        if (errorCode === sw.SOCKET_ERROR.RECONNECTION_ATTEMPT) {
	          assert.deepEqual(sw._signalingServerPort, 3443, 'ForceSSL fallback port is HTTPS port');
	          // start the false check
	          sw.off('readyStateChange');
	          sw.off('channelOpen');
	          sw.off('channelClose');
	          sw.off('socketError');
	          forceSSLFalse();
	        }
	      });
	    });

	    sw.init({
	      apiKey: apikey,
	      forceSSL: true
	    });
	  }

	  function forceSSLFalse () {
	    sw.on('readyStateChange', function (state) {
	      if (state === sw.READY_STATE_CHANGE.COMPLETED) {
	        sw._openChannel();
	      }
	    });

	    sw.on('channelOpen', function () {
	      assert.deepEqual(sw._signalingServerPort,
	        (window.location.protocol === 'https:') ? 443 : 80, 'ForceSSL off is default port');
	      assert.deepEqual(sw._signalingServerProtocol, window.location.protocol,
	        'ForceSSL off is default protocol');
	      sw._closeChannel();
	    });

	    sw.on('channelClose', function () {
	      //sw._signalingServer = '192.168.123.4';
	      sw._openChannel();
	      // place here because it's fired before channelOpen
	      sw.on('socketError', function (errorCode) {
	        if (errorCode === sw.SOCKET_ERROR.RECONNECTION_ATTEMPT) {
	          assert.deepEqual(sw._signalingServerPort,
	            (window.location.protocol === 'https:') ? 3443 : 3000,
	            'ForceSSL fallback port is HTTPS port');
	          // start the false check
	          sw.off('readyStateChange');
	          sw.off('channelOpen');
	          sw.off('channelClose');
	          sw.off('socketError');
	          done();
	        }
	      });
	    });

	    sw.init({
	      apiKey: apikey,
	      forceSSL: false
	    });
	  }

	  // start with this test
	  forceSSLTrue();
	});

	it('channelRetry, socketError: Check socket reconnection fallback ', function(done) {
	  this.timeout(20000);

	    window.TempWebSocket = window.WebSocket;
		window.WebSocket = null;

	    sw.init({
		  apiKey: apikey,
		  socketTimeout: 5000
		});

	  var array_error = [];
	  var array_fallback = [];

	  var fallback_port = (window.location.protocol === 'https:') ?
	    sw.SOCKET_FALLBACK.FALLBACK_PORT_SSL : sw.SOCKET_FALLBACK.FALLBACK_PORT;

	  var fallback_longpolling = (window.location.protocol === 'https:') ?
	    sw.SOCKET_FALLBACK.LONG_POLLING_SSL : sw.SOCKET_FALLBACK.LONG_POLLING;

	  sw.on('socketError', function (errorCode, attempts, fallback) {
	    console.error(errorCode, attempts, fallback);
	    if (fallback === sw.SOCKET_FALLBACK.NON_FALLBACK) {
	      array_error.push(1);
	    }
	    if (fallback === fallback_port) {
	      if (errorCode === sw.SOCKET_ERROR.RECONNECTION_ATTEMPT) {
	        array_error.push(2);
	      }
	      if (errorCode === sw.SOCKET_ERROR.RECONNECTION_ABORTED) {
	        array_error.push(3);
	      }
	    }
	    if (fallback === fallback_longpolling) {
	      if (errorCode === sw.SOCKET_ERROR.RECONNECTION_ATTEMPT) {
	        array_error.push(4);
	      }
	    }
	  });

	  sw.on('channelRetry', function (fallback) {
	    array_fallback.push(fallback);
	  });

	  sw._condition('readyStateChange', function () {
	    sw._openChannel();

	    setTimeout(function () {
	      console.log('->socketStatus');
	      console.log(window.WebSocket === null);
	      assert.deepEqual(array_error, [1, 2, 3, 4], 'Socket error are firing in order');

	      assert.deepEqual(array_fallback, [
	        fallback_port,
	        fallback_longpolling
	      ], 'Socket retries are firing in order');

	      sw.off('readyStateChange');
	      sw.off('socketError');
	      sw._closeChannel();
	      sw._signalingServerPort = (window.location.protocol === 'https:') ? 443 : 80;
	      done();
	    }, 16000);

	  }, function () {
	    return sw._readyState === sw.READY_STATE_CHANGE.COMPLETED;
	  }, function (state) {
	    return state === sw.READY_STATE_CHANGE.COMPLETED;
	  });

	});

});