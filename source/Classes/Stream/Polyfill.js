var StreamPolyfill = {

  stop: function (bind) {
    // Allow users to use polystop to polyfill stop and onended for MediaStreamTrack
    bind.polystop = function () {
      bind.stop();

      // NOTE: Should we end the mediastream tracks as well

      if (window.webrtcDetectedBrowser === 'firefox') {
        bind.ended = true;
      }
    };

    // Firefox browsers
    if (window.webrtcDetectedBrowser === 'firefox') {

      // Check if tracks have all ended
      bind.checkTracksEnded = setInterval(function () {
        var i, j;

        var audios = bind.getAudioTracks();
        var videos = bind.getTracks();

        var audioEnded = true;
        var videoEnded = true;

        // Check for all tracks if ended
        for (i = 0; i < audios.length; i += 1) {
          if (audios[i].ended !== true) {
            audioEnded = false;
            break;
          }
        }

        for (i = 0; i < videos.length; i += 1) {
          if (videos[i].ended !== true) {
            videoEnded = false;
            break;
          }
        }

        if (audioEnded && videoEnded) {
          clearInterval(bind.checkTracksEnded);
          bind.ended = true;
        }

      }, 1000);

      // LocalMediaStream
      if (bind.constructor === LocalMediaStream) {
        bind.checkEnded = setInterval(function () {
          // If stream has flag ended because of media tracks being stopped
          if (bind.ended) {
            clearInterval(bind.checkEnded);

            // trigger that it has ended
            if (typeof bind.onended === 'function') {
              bind.onended(bind);
            }
          }

          if (typeof bind.recordedTime === 'undefined') {
            bind.recordedTime = 0;
          }

          if (bind.recordedTime === bind.currentTime) {
            clearInterval(bind.checkEnded);

            bind.ended = true;

            // trigger that it has ended
            if (typeof bind.onended === 'function') {
              bind.onended(bind);
            }

          } else {
            bind.recordedTime = bind.currentTime;
          }
        }, 1000);

      // Remote MediaStream
      } else {

        // Use a video to attach to check if stream has ended
        var video = document.createElement('video');

        video.checkEnded = setInterval(function () {
          if (bind.ended) {
            clearInterval(bind.checkEnded);

            // trigger that it has ended
            if (typeof bind.onended === 'function') {
              bind.onended(bind);
            }
          }

          if (typeof video.mozSrcObject === 'object' &&
              video.mozSrcObject !== null) {

            if (video.mozSrcObject.ended === true) {
              clearInterval(bind.checkEnded);

              bind.ended = true;

              // trigger that it has ended
              if (typeof bind.onended === 'function') {
                bind.onended(bind);
              }
            }
          }
        }, 1000);

        bind.checkingVideo = video;

        window.attachMediaStream(video, bind);
      }
    }
  },

  attachMediaStream: function (video, bind) {
    // Firefox browsers
    if (window.webrtcDetectedBrowser === 'firefox') {
      // If there's an element used for checking stream stop
      // for an instance remote MediaStream for firefox
      // reattachmediastream instead
      if (typeof bind.checkingVideo !== 'undefined' &&
        bind instanceof LocalMediaStream === false) {
        window.reattachMediaStream(element, bind.checkingVideo);

      // LocalMediaStream
      } else {
        window.attachMediaStream(element, bind);
      }

    // Non-firefox browsers
    } else {
      window.attachMediaStream(element, bind);
    }
  },

  track: {

    stop: function (bind) {

      // Allow users to use polystop to polyfill stop and onended for MediaStreamTrack
      bind.polystop = function () {
        bind.stop();

        // Workaround for firefox as it does not have stop events
        if (window.webrtcDetectedBrowser === 'firefox') {

          if (bind.ended !== true) {
            bind.ended = true;

            if (typeof bind.onended === 'function') {
              bind.onended(bind);
            }
          }
        }
      };
    },

    mute: function (bind) {

      // Allow users to use polymute to polyfill muted = true and onmute for MediaStreamTrack
      bind.polymute = function () {
        bind.enabled = false;
        bind.muted = true;

        if (typeof bind.onmute === 'function') {
          bind.onmute(bind);
        }
      };
    },

    unmute: function (bind) {

      // Allow users to use polyunmute to polyfill muted = false and onunmute for MediaStreamTrack
      bind.polyunmute = function () {
        bind.enabled = true;
        bind.muted = false;

        if (typeof bind.onunmute === 'function') {
          bind.onunmute(bind);
        }
      };
    }

  }
};