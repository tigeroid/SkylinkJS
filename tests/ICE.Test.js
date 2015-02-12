var loadScript = function (url, callback) {
  console.log('=== Loading ===');
  console.log('Script: Loading script', url);

  // Adding the script tag to the head as suggested before
  var head = document.getElementsByTagName('head')[0];
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;

  // Then bind the event to the callback function.
  // There are several events for cross browser compatibility.
  script.onreadystatechange = function () {
    console.debug('Script: Loaded script', url);
    callback();
  };
  script.onload = function () {
    console.debug('Script: Loaded script', url);
    callback();
  };

  // Fire the loading
  head.appendChild(script);
};

/**
 * @module Test
 * @istestdocumentation true
 */
/**
 * Tests the ICE module.
 * @class ICE_Test
 * @test ICE
 * @constructor
 * @example
 *   sh test.sh test ice
 * @submodule Test
 * @since 0.6.0
 */
var ICE_TEST = function () {

  'use strict';

  // Dependencies
  var test = require('tape');
  var adapter = require('./../node_modules/adapterjs/publish/adapter.debug.js');

  /**
   * Function that throws an exception and ends test.
   * @attribute throwErrorFn
   * @type Function
   * @param {Object} error The error object.
   * @example
   *    throwErrorFn(error, t);
   * @for ICE_Test
   * @since 0.6.0
   */
  var throwErrorFn = function (error, t) {
    t.fail('Test failed with exception');
    t.end();
    throw error;
  };


  /**
   * Tests the addCandidate and parseIceConnectionState function.
   * @param {Plan} 1 Checks if candidates are buffered.
   * @param {Plan} 2 Checks if ice connection state is parsed correctly.
   * @param {Plan} 3 Checks if candidates are buffered correctly.
   * @method test1
   * @plan 3
   * @example
   *   test: addCandidate(), parseIceConnectionState()
   *   plan: addCandidate(): Candidates are buffererd
   *   plan: parseIceConnectionState() : Parsed correctly
   *   plan: addCandidate() : Candidates are buffered and received correctly
   * @for ICE_Test
   * @since 0.6.0
   */
  test('addCandidate(), parseIceConnectionState()', {
    timeout: 10000

  }, function (t) {
    t.plan(3);

    // Initialize
    console.log('=== Initiailize ===');

    // Buffer count
    var buffer1 = [];
    var receive1 = [];
    var buffer2 = [];
    var receive2 = [];

    // Ice states
    var states = [];

    var peer1 = new window.RTCPeerConnection();
    var peer2 = new window.RTCPeerConnection();

    // Tests the ICE candidate state
    peer1.onicecandidate = function (event) {
      var candidate = event.candidate || event;

      console.debug('P2: Adding candidate');

      if (!fn.isEmpty(candidate.candidate)) {
        ICE.addCandidate(peer2, candidate, function (event, data) {
          receive1.push(candidate);

          console.debug('P2: Added candidate', event, data);
        });

        buffer1.push(candidate);

      } else {
        console.debug('P1: Gathered all candidates');
      }
    };

    peer2.onicecandidate = function (event) {
      var candidate = event.candidate || event;

      console.debug('P1: Adding candidate');

      if (!fn.isEmpty(candidate.candidate)) {
        ICE.addCandidate(peer1, candidate, function (event, data) {
          receive2.push(candidate);

          console.debug('P1: Added candidate', event, data);
        });

        buffer2.push(candidate);

      } else {
        console.debug('P2: Gathered all candidates');
      }
    };

    peer1.oniceconnectionstatechange = function () {
      ICE.parseIceConnectionState(peer1);
    };

    peer1.oniceconnectionnewstatechange = function () {
      states.push(peer1.newIceConnectionState);

      if (peer1.newIceConnectionState === 'completed') {
        t.deepEqual(states, [
          'checking',
          'connected',
          'completed'
        ], 'parseIceConnectionState() : Parsed correctly');
      }
    };

    peer2.oniceconnectionstatechange = function () {
      ICE.parseIceConnectionState(peer2);
    };

    peer2.oniceconnectionnewstatechange = function () {
      if (peer2.newIceConnectionState === 'completed') {
        t.deepEqual([buffer1.length, buffer2.length], [receive1.length, receive2.length],
          'addCandidate() : Candidates are buffered and received correctly');

        console.log('=== Completed ===');

        t.end();
      }
    };


    // Start the test
    console.log('=== Start ===');

    window.getUserMedia({
      audio: true,
      video: true
    }, function (stream) {

      // Invoke candidate generation
      peer1.addStream(stream);
      peer2.addStream(stream);

      // Create offer
      console.debug('P1: Creating offer');
      peer1.createOffer(function (offer) {

        console.debug('P1: Setting local offer');
        peer1.setLocalDescription(offer, function () {

          setTimeout(function () {
            if (peer2.queueCandidate.length > 0) {
              t.pass('addCandidate(): Candidates are buffererd');

            } else {
              t.fail('addCandidate(): Candidates are buffererd');
            }

            console.debug('P2: Setting remote offer');
            peer2.setRemoteDescription(offer, function () {
              console.debug('P2: Creating answer');

              ICE.popCandidate(peer2, function (event, data) {
                receive1.push(data.candidate);

                console.debug('P2: Added queued candidate', event, data);
              });

              console.debug('P2: Creating answer');
              peer2.createAnswer(function (answer) {
                console.debug('P2: Setting local answer');

                peer2.setLocalDescription(answer, function () {
                  console.debug('Completed');

                }, function () {
                  console.error('P2: Failed setting local answer');
                  throwErrorFn(error, t);
                });

                console.debug('P1: Setting remote answer');
                peer1.setRemoteDescription(answer, function () {
                  ICE.popCandidate(peer1, function (event, data) {
                    receive2.push(data.candidate);

                    console.debug('P1: Added queued candidate', event, data);
                  });

                }, function () {
                  console.error('P1: Failed setting remote answer');
                  throwErrorFn(error, t);
                });

              }, function (error) {
                console.error('P2: Failed creating answer');
                throwErrorFn(error, t);
              });

            }, function (error) {
              console.error('P2: Failed setting remote offer');
              throwErrorFn(error, t);
            });

          }, 1000);

        }, function (error) {
          console.error('P1: Failed setting local offer');
          throwErrorFn(error, t);
        });

      }, function (error) {
        console.error('P1: Failed creating offer');
        throwErrorFn(error, t);
      });

    }, function (error) {
      throwErrorFn(error, t);
    });
  });

  /**
   * Tests the parseICEServers function.
   * @method test2
   * @param {Plan} 1 Test if TURN servers are parsed correctly for Firefox and Chrome.
   * @param {Plan} 2 Test when TURN is disabled to not return TURN servers.
   * @param {Plan} 3 Test when TURN is enabled to return TURN servers.
   * @param {Plan} 4 Test when STUN is disabled to not return STUN servers.
   * @param {Plan} 5 Test when STUN is enabled to return STUN servers.
   * @example
   *   test: parseICEServers()
   *   plan: parseICEServers() : TURN is disabled
   *   plan: parseICEServers() : TURN is enabled
   *   plan: parseICEServers() : STUN is disabled
   *   plan: parseICEServers() : STUN is enabled
   * @for ICE_Test
   * @since 0.6.0
   */
  test('parseICEServers()', {
    timeout: 10000

  }, function (t) {
    t.plan(5);

    var getIceServers = function () {
      return [{
        "url": "turn:GST1dc3dqjz7_1423743859@turn.temasys.com.sg",
        "credential": "wP0ckGWVX3ZjL+kgwclC6K5DkwQ="
      }, {
        "url": "stun:stun.l.google.com:19302"
      }, {
        "url": "stun:stun3.l.google.com:19302"
      }, {
        "url": "stun:stun4.l.google.com:19302"
      }, {
        "url": "stun:stun.schlund.de"
      }, {
        "url": "stun:stun.iptel.org"
      }, {
        "url": "stun:stun.ideasip.com"
      }, {
        "url": "stun:stun.ekiga.net"
      }, {
        "url": "turn:GST1dc3dqjz7_1423743859@turnsg.temasys.com.sg",
        "credential": "wP0ckGWVX3ZjL+kgwclC6K5DkwQ="
      }];
    };

    // Start the test
    console.log('=== Start ===');

    console.log('Parsing TURN servers for Chrome');
    window.webrtcDetectedBrowser = 'chrome';

    var newIceServers1 = ICE.parseICEServers(getIceServers());


    var chrome = false;
    var firefox = false;

    var i;

    for (i = 0; i < newIceServers1.length; i += 1) {
      var iceServer = newIceServers1[i];

      if (iceServer.url.indexOf('turn') === 0) {
        if (iceServer.url.indexOf('@') > 0) {
          console.debug('Checked Chrome. Passed');
          chrome = true;
        } else {
          console.error('Checked Chrome. Failed');
        }
        console.log('please break');
        break;
      }
    }

    window.webrtcDetectedBrowser = 'firefox';

    var newIceServers2 = ICE.parseICEServers(getIceServers());

    var j;

    console.log('Checking parsed TURN servers for Firefox');

    for (j = 0; i < newIceServers2.length; j += 1) {
      var iceServer = newIceServers2[j];

      if (iceServer.url.indexOf('turn') === 0) {
        if (iceServer.url.indexOf('@') === -1 &&
          !!iceServer.username) {
          console.debug('Checked Firefox. Passed');
          firefox = true;
        } else {
          console.error('Checked Firefox. Failed');
        }
        break;
      }
    }

    t.deepEqual([chrome, firefox], [true, true], 'parseICEServers() : Parsed correctly for both firefox and chrome');

    console.log('Disabling TURN servers');

    globals.TURNServer = false;

    var newIceServers3 = ICE.parseICEServers(getIceServers());

    var hasTURN = false;
    var k;

    for (k = 0; k < newIceServers3.length; k += 1) {
      if (newIceServers3[k].url.indexOf('turn') === 0) {
        hasTURN = true;
      }
    }

    t.deepEqual(hasTURN, false, 'parseICEServers() : TURN is disabled');

    console.log('Enabling TURN servers');

    globals.TURNServer = true;

    var newIceServers4 = ICE.parseICEServers(getIceServers());

    hasTURN = false;
    var l;

    for (l = 0; l < newIceServers4.length; l += 1) {
      if (newIceServers4[l].url.indexOf('turn') === 0) {
        hasTURN = true;
      }
    }

    t.deepEqual(hasTURN, true, 'parseICEServers() : TURN is enabled');

    console.log('Disabling STUN servers');

    globals.STUNServer = false;

    var newIceServers5 = ICE.parseICEServers(getIceServers());

    var hasSTUN = false;
    var m;

    for (m = 0; m < newIceServers5.length; m += 1) {
      if (newIceServers5[m].url.indexOf('stun') === 0) {
        hasSTUN = true;
      }
    }

    t.deepEqual(hasSTUN, false, 'parseICEServers() : STUN is disabled');

    console.log('Enabling STUN servers');

    globals.STUNServer = true;

    var newIceServers6 = ICE.parseICEServers(getIceServers());

    hasSTUN = false;
    var n;

    for (n = 0; n < newIceServers6.length; n += 1) {
      if (newIceServers6[n].url.indexOf('stun') === 0) {
        hasSTUN = true;
      }
    }

    t.deepEqual(hasSTUN, true, 'parseICEServers() : STUN is enabled');

  });
};

// Load scripts
loadScript('./source/Globals.js', function () {
  loadScript('./source/ICE.js', ICE_TEST);
});