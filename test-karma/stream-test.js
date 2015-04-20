// Testing attributes
var sw = new Skylink();
var apikey = 'fa152f2f-ad7a-46d1-a3be-cb0dffc617b5';

//sw.setLogLevel(sw.LOG_LEVEL.DEBUG);

console.log('API: Tests the getUserMedia() and sendStream() information');
console.log('===============================================================================================');

describe("Test stream functionalities", function() {
	//this.slow(5000);

	before(function(done){
		this.timeout(20000);

		AdapterJS.onwebrtcready = function(isUsingPlugin){
			console.log('isUsingPlugin: '+isUsingPlugin);
			done();
		};
	});

	it('joinRoom(): Test all passed bandwidth constraints', function (done) {
	  this.timeout(15000);

	  sw.leaveRoom();

	  var settings = {
	    audio: {
	      stereo: true,
	      mute: true
	    },
	    video: {
	      resolution: {
	        width: 1280,
	        height: 720
	      },
	      frameRate: 55
	    },
	    bandwidth: {
	      audio: 1234,
	      video: 56733,
	      data: 1232443
	    }
	  };

	  sw.on('incomingStream', function (peerId, stream, isSelf) {

	  	console.log(peerId, stream, isSelf);
	  	window.test = stream;

	    if (isSelf) {
	      assert.deepEqual([
	        stream.getAudioTracks().length,
	        stream.getVideoTracks().length,
	        stream.getAudioTracks()[0].enabled,
	        stream.getVideoTracks()[0].enabled
	      ], [1, 1, false, true], 'Stream tracks retrieved in joinRoom is correct');

	      // remove reference
	      delete settings.audio.mute;

	      assert.deepEqual(sw._streamSettings, settings,
	        'Stream settings set in joinRoom is correct');

	      // check the set stream settings
	      assert.deepEqual(sw._getUserMediaSettings.audio, true,
	        'Set audio in joinRoom is correct');

	      console.log(window.webrtcDetectedBrowser);

	      if (window.webrtcDetectedBrowser !== 'IE' && window.webrtcDetectedBrowser !== 'safari') {

	      	assert.deepEqual(sw._getUserMediaSettings.video, {
		        mandatory: {
		          //minWidth: settings.video.resolution.width,
		          //minHeight: settings.video.resolution.height,
		          maxWidth: settings.video.resolution.width,
		          maxHeight: settings.video.resolution.height,
		          //minFrameRate: settings.video.frameRate,
		          maxFrameRate: settings.video.frameRate
		        },
		        optional: []
		      }, 'Set video in joinRoom is correct');
	      }

	      // turn off all events
	      sw.off('incomingStream');
	      sw.off('mediaAccessError');

	      done();

	    }
	  });

	  sw.on('mediaAccessError', function (error) {
	    assert.fail(false, true, 'Failed to get user media and parse stream settings');

	    // turn off all events
	    sw.off('incomingStream');
	    sw.off('mediaAccessError');

	    done();
	  });

	  console.log(': Test user set settings');
	  console.log('> Requesting audio and video');

	  sw.init(apikey, function(){
	  	console.log('Initiated. Joining room now');
	    sw.joinRoom(settings);
	  });

	  /*setTimeout(function () {
	    // turn off all events
	    sw.off('incomingStream');
	    sw.off('mediaAccessError');

	    t.end();
	  }, 25000);*/
	});

	it('joinRoom(): Testing all passed media constraints', function (done) {

	  this.timeout(15000);

	  var audio_array = [];
	  var video_array = [];

	  sw.leaveRoom();

	  sw.on('incomingStream', function (peerId, stream, isSelf) {
	    if (isSelf) {
	      // check stream retrieval options
	      // check stream retrieval options
	      if (stream.getAudioTracks().length > 0) {
	        audio_array.push(1);
	      }
	      if (stream.getVideoTracks().length > 0) {
	        video_array.push(1);
	      }
	      // check the set stream settings
	      if (typeof sw._streamSettings.audio === 'object' &&
	        sw._streamSettings.audio.stereo === false) {
	        audio_array.push(2);
	      }
	      if (sw._streamSettings.video === false) {
	        video_array.push(2);
	      }
	      // check the set getUserMedia settings
	      if (sw._getUserMediaSettings.audio === true) {
	        audio_array.push(3);
	      }
	      if (sw._getUserMediaSettings.video === false) {
	        video_array.push(3);
	      }

	      assert.deepEqual(audio_array, [1, 2, 3], 'Set audio settings correct (settings=userset)');
	      assert.deepEqual(video_array, [2, 3], 'Set video settings correct (settings=userset)');

	      // turn off all events
	      sw.off('incomingStream');
	      sw.off('mediaAccessError');
	      done();

	    }
	  });

	  sw.on('mediaAccessError', function () {
	    assert.fail(false, true, 'Failed getting user media');

	    // turn off all events
	    sw.off('incomingStream');
	    sw.off('mediaAccessError');
	    done();
	  });

	  console.log(': Test joinRoom with audio only');
	  console.log('> Requesting audio only');

	  sw.init(apikey,function(){
	    sw.joinRoom({
	      audio: true
	    });
	  });

	  /*setTimeout(function () {
	    // turn off all events
	    sw.off('incomingStream');
	    sw.off('mediaAccessError');

	    done();
	  }, 10000);*/
	});

	it('joinRoom(): Testing passed "false" constraints', function (done) {
	  this.timeout(15000);

	  sw.leaveRoom();

	  var getUserMediaCalled = false;

	  sw.on('mediaAccessSuccess', function () {
	    getUserMediaCalled = true;
	  });

	  sw.on('mediaAccessError', function () {
	    getUserMediaCalled = true;
	  });

	  console.log(': Test joinRoom with no audio and video');

	  sw.init(apikey, function(){
	    sw.joinRoom({
	      audio: false,
	      video: false
	    }, function () {
	      assert.deepEqual(getUserMediaCalled, false, 'Get user media is not called');
	      assert.deepEqual({
	        audio: sw._streamSettings.audio,
	        video: sw._streamSettings.video
	      }, {
	        video: false,
	        audio: false
	      }, 'Stream settings are false');

	      // turn off all events
	      sw.off('mediaAccessSuccess');
	      sw.off('mediaAccessError');
	      sw.off('peerJoined');
	      done();
	    });
	  });

	});

	// join room media constraints test
	it('joinRoom(): Testing parsed default constraints', function(done) {
	  this.timeout(15000);

	  sw.leaveRoom();

	  var getUserMediaCalled = false;

	  sw.on('mediaAccessSuccess', function () {
	    getUserMediaCalled = true;
	  });

	  sw.on('mediaAccessError', function () {
	    getUserMediaCalled = true;
	  });

	  console.log(': Test joinRoom with no settings');
	  sw.init(apikey, function () {
	    sw.joinRoom(function () {
	      assert.deepEqual(getUserMediaCalled, false, 'Get user media is not called');

	      // turn off all events
	      sw.off('mediaAccessSuccess');
	      sw.off('mediaAccessError');
	      done();
	    });
	  });
	});

	it('getUserMedia(): Test parsed video resolutions', function (done) {
	  this.timeout(15000);

	  sw.leaveRoom();

	  var settings = {
	    audio: {
	      stereo: true,
	      mute: false
	    },
	    video: {
	      resolution: {
	        width: 1500,
	        height: 800
	      },
	      frameRate: 55,
	      mute: true
	    }
	  };

	  sw.on('mediaAccessSuccess', function (stream) {
	    // remove reference
	    delete settings.audio.mute;
	    delete settings.video.mute;

	    assert.deepEqual({
	      audio: sw._streamSettings.audio,
	      video: sw._streamSettings.video,
	      mediaStatus: sw._mediaStreamsStatus
	    }, {
	      audio: settings.audio,
	      video: settings.video,
	      mediaStatus: {
	        audioMuted: false,
	        videoMuted: true
	      }
	    }, 'Stream settings set in getUserMedia is correct');

	    // check stream retrieval options
	    assert.deepEqual([
	      stream.getAudioTracks().length,
	      stream.getVideoTracks().length
	    ], [1, 1], 'Stream audio and video tracks retrieved');

	    // check the set stream settings
	    assert.deepEqual(sw._getUserMediaSettings.audio, true, 'Set audio getUserMedia is correct');
	    assert.deepEqual(sw._getUserMediaSettings.video, {
	      mandatory: {
	        //minWidth: settings.video.resolution.width,
	        //minHeight: settings.video.resolution.height,
	        maxWidth: settings.video.resolution.width,
	        maxHeight: settings.video.resolution.height,
	        //minFrameRate: settings.video.frameRate,
	        maxFrameRate: settings.video.frameRate
	      },
	      optional: []
	    }, 'Set video getUserMedia is correct');

	    // turn off all events
	    sw.off('mediaAccessSuccess');
	    sw.off('mediaAccessError');

	    done();

	  });

	  sw.on('mediaAccessError', function (error) {
	    assert.fail(false, true, 'Failed to get user media and parse stream settings');

	    // turn off all events
	    sw.off('mediaAccessSuccess');
	    sw.off('mediaAccessError');

	    done();

	  });

	  console.log(': Test user set settings');
	  console.log('> Requesting audio and video');

	  sw.getUserMedia(settings);
	});

	it('getUserMedia(): Test that it should not be called if all settings is false', function (done){
	  this.timeout(15000);

	  sw.leaveRoom();

	  var getUserMediaCalled = false;

	  sw.on('mediaAccessSuccess', function (stream) {
	    getUserMediaCalled = true;
	    assert.fail(false, true, 'Get user media is called');
	    done();
	  });

	  sw.on('mediaAccessError', function (error) {
	    getUserMediaCalled = true;
	    assert.fail(false, true, 'Get user media is called');
	    done();
	  });

	  console.log(': Test false settings');
	  console.log('> Requesting no audio or video');

	  sw.getUserMedia({
	    audio: false,
	    video: false
	  });

	  setTimeout(function () {
	    assert.deepEqual(sw._streamSettings.audio, false, 'Set audio settings is false');
	    assert.deepEqual(sw._streamSettings.video, false, 'Set video settings is false');
	    assert.deepEqual(getUserMediaCalled, false, 'Get user media is not called');

	    // turn off all events
	    sw.off('mediaAccessSuccess');
	    sw.off('mediaAccessError');

	    done();

	  }, 2500);
	});

	it('getUserMedia(): Test the default settings and making sure it\'s called before init', function(done) {
	  this.timeout(15000);

	  sw.leaveRoom();

	  var audio_array = [];
	  var video_array = [];

	  sw.on('mediaAccessSuccess', function (stream) {
	    assert.ok(true, 'Get user media success without calling before init');

	    // check stream retrieval options
	    if (stream.getAudioTracks().length > 0) {
	      audio_array.push(1);
	    }
	    if (stream.getVideoTracks().length > 0) {
	      video_array.push(1);
	    }
	    // check the set stream settings
	    if (typeof sw._streamSettings.audio === 'object' &&
	      sw._streamSettings.audio.stereo === false) {
	      audio_array.push(2);
	    }
	    if (typeof sw._streamSettings.video === 'boolean' ||
	      typeof sw._streamSettings.video === 'object') {
	      video_array.push(2);
	    }
	    // check the set getUserMedia settings
	    if (typeof sw._getUserMediaSettings.audio === 'boolean') {
	      audio_array.push(3);
	    }
	    if (typeof sw._getUserMediaSettings.video === 'object') {
	      video_array.push(3);
	    }
	    assert.deepEqual(audio_array, [1, 2, 3], 'Set audio settings correct (settings=default)');
	    assert.deepEqual(video_array, [1, 2, 3], 'Set video settings correct (settings=default)');

	    // turn off all events
	    sw.off('mediaAccessSuccess');
	    sw.off('mediaAccessError');

	    done();
	  });

	  sw.on('mediaAccessError', function (error) {
	    assert.fail(false, true, 'Get user media failed');
	    assert.fail(false, true, 'Set audio settings failed to parse');
	    assert.fail(false, true, 'Set video settings failed to parse');

	    // turn off all events
	    sw.off('mediaAccessSuccess');
	    sw.off('mediaAccessError');
	    done();
	  });

	  console.log(': Test default settings');
	  console.log('> Requesting audio and video');

	  sw.getUserMedia();
	});

	it('sendStream(): Test default settings and making sure it\'s called before init', function(done) {
	  this.timeout(15000);

	  sw.leaveRoom();

	  var array = [];

	  // call the first test
	  sw.on('iceConnectionState', function (state, peerId) {
	    if (state === sw.ICE_CONNECTION_STATE.COMPLETED) {
	      // turn off all events
	      sw.off('iceConnectionState');

	      console.log('Sending "RESTART-PEER-DEFAULT"');
	      sw.sendMessage('RESTART-PEER-DEFAULT');
	    }
	  });

	  sw.on('peerRestart', function (peerId, peerInfo) {
	    // check the set stream settings
	    if (typeof peerInfo.settings.audio === 'object' &&
	      peerInfo.settings.audio.stereo === false) {
	      array.push(1);
	    }
	    if (typeof peerInfo.settings.video === 'boolean' ||
	      typeof peerInfo.settings.video === 'object') {
	      array.push(2);
	    }
	    assert.deepEqual(array, [1, 2],
	      'Set audio and video settings correct (settings=default)');
	    // turn off all events
	    sw.off('peerRestart');
	    done();

	  });

	  // join the room
	  console.log('Peer "PEER1" is joining the room');

	  sw.init(apikey, function(){
	    sw.joinRoom(function () {
	      console.log('Peer "PEER1" is joined the room');
	    });
	  });

	});

	it('sendStream(): Test getUserMedia should not be called if all settings is false', function (done) {
	  this.timeout(15000);

	  sw.leaveRoom();

	  sw.on('peerRestart', function (peerId, peerInfo) {
	    // check the set stream settings
	    assert.deepEqual([
	      peerInfo.settings.audio,
	      peerInfo.settings.video
	    ], [false, false], 'Set audio and video settings correct (settings=false)');

	    // turn off all events
	    sw.off('peerRestart');
	    sw.off('peerRestart');
	    done();
	  });

	  sw.init(apikey, function(){
	    sw.joinRoom(function(){
	      console.log('Sending "RESTART-PEER-FALSE"');
	      sw.sendMessage('RESTART-PEER-FALSE');
	    });
	  });

	});


	it('sendStream(): Test parsed video resolutions', function (done) {
	  this.timeout(15000);

	  sw.leaveRoom();

	  sw.on('peerRestart', function (peerId, peerInfo) {
	    // check the set stream settings
	    assert.deepEqual({
	      audio: { stereo: true },
	      video: {
	        resolution: {
	          width: 1000,
	          height: 500
	        },
	        frameRate: 55
	      },
	      mediaStatus: {
	        audioMuted: true,
	        videoMuted: false
	      }
	    }, {
	      audio: peerInfo.settings.audio,
	      video: peerInfo.settings.video,
	      mediaStatus: peerInfo.mediaStatus
	    }, 'Set audio and video settings correct (settings=userset)');
	    // turn off all events
	    sw.off('peerRestart');
	    done();

	  });

	  sw.init(apikey, function(){
	    sw.joinRoom(function(){
	      console.log('Sending "RESTART-PEER-SETTINGS"');
	      sw.sendMessage('RESTART-PEER-SETTINGS');
	    });
	  });

	});

	it('Media access stopped', function(done) {
	  this.timeout(10000);

	  sw.leaveRoom();

	  sw.on('incomingStream', function () {
	    sw.leaveRoom();
	  });

	  sw.on('mediaAccessStopped', function () {
	    assert.ok(true, 'Triggers mediaAccessStopped after media access stopped');

	    sw.off('mediaAccessStopped');
	    sw.off('incomingStream');
	    sw.off('mediaAccessError');

	    done();

	  });

	  sw.on('mediaAccessError', function (error) {
	    assert.fail(false, true, 'Failed retriving stream');

	    sw.off('mediaAccessStopped');
	    sw.off('incomingStream');
	    sw.off('mediaAccessError');

	    done();
	    
	  });

	  console.log(': Test joinRoom with audio and video');

	  sw.init(apikey, function(){
	    sw.joinRoom({
	      audio: true,
	      video: true
	    });
	  });

	});

	it('muteStream(): Testing mute stream settings', function(done) {
	  this.timeout(5000);

	  sw.leaveRoom();

	  var current_state = 0;

	  sw.on('mediaAccessSuccess', function (stream) {
	    if (current_state === 1) {
	      assert.deepEqual([
	        stream.getAudioTracks().length > 0,
	        stream.getVideoTracks().length > 0

	      ], [true, true], 'Retrieves correct empty stream');

	      current_state = 2;

	      sw.off('mediaAccessSuccess');
	    }
	  });

	  sw.on('incomingStream', function (peerId, stream, isSelf, peerInfo) {
	    if (isSelf) {
	      if (current_state === 0) {
	        sw.muteStream({
	          audioMuted: true
	        });
	      }
	      if (current_state === 2) {
	        sw.off('incomingStream');
	        //t.end();
	      }
	    }
	  });

	  sw.on('peerUpdated', function (peerId, peerInfo, isSelf) {
	    if (isSelf) {
	      if (current_state === 0) {
	        assert.deepEqual(peerInfo.mediaStatus.audioMuted, true,
	          'Is audio muted and updated');

	        console.log('> Requesting video');

	        sw.muteStream({
	          audioMuted: true,
	          videoMuted: false,
	          getEmptyStream: true
	        });

	        current_state = 1;
	      }
	      if (current_state === 1) {
	        assert.deepEqual(peerInfo.mediaStatus.videoMuted, false,
	          'Is video unmuted and updated');

	        // turn off all events
	        sw.off('peerUpdated');
	        done();
	      }
	    }
	  });

	  // join the room
	  console.log('Peer "PEER1" is joining the room');
	  console.log('> Requesting audio');

	  sw.init(apikey, function(){
	    sw.joinRoom({
	      audio: true
	    });
	  });

	});

	/*it.only('joinRoom() - manualGetUserMedia: Testing manual getUserMedia', function(done) {
	  this.timeout(65000);

	  sw.leaveRoom();

	  sw.on('mediaAccessRequired', function () {
	  	console.log('1st assert passed');
	    assert.ok(true, 'Triggers mediaAccessRequired');
	  });

	  sw.on('mediaAccessSuccess', function () {
	  	console.log('2nd assert failed');
	    assert.fail(false, true, 'Triggers getUserMedia without user retriving it it\'s own');
	    sw.off('mediaAccessRequired');
	    sw.off('mediaAccessSuccess');
	    sw.off('mediaAccessError');
	    done();
	  });

	  sw.on('mediaAccessError', function (error) {
	  	console.log('3rd assert coming');
	  	console.log(error);
	    if (error === 'Waiting for stream timeout') {
	      assert.ok('Triggers mediaAccessError after 30 seconds');
	      done();
	    }
	    sw.off('mediaAccessRequired');
	    sw.off('mediaAccessSuccess');
	    sw.off('mediaAccessError');
	  });

	  console.log(': Test joinRoom with no audio and video.');
	  console.log('  Please wait for 30 seconds');

	  sw.init(apikey, function(){
	    sw.joinRoom({
	      manualGetUserMedia: true,
	      audio: true,
	      video: true
	    });
	  })

	});*/

});







