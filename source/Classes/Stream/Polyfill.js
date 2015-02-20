/**
 * Polyfills un-implemented MediaStream APIs.
 * Note that when the local MediaStream ends, it might not be reflected
 *  in the remote MediaStream. You will require to send a signaling message
 *  to inform and reflect the changes.
 * @attribute StreamPolyfill
 * @type JSON
 * @private
 * @for Stream
 * @since 0.6.0
 */
var StreamPolyfill = {

  /* MediaStream polyfills */
  /**
   * Handles the polyfill stop() function for MediaStream to trigger un-implemented
   *   MediaStream.onended in Firefox.
   * @method StreamPolyfill.stop
   * @param {Object} bind The MediaStream object.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  stop: function (bind) {
    // End MediaStreamTracks as well for non-Webkit browsers
    if (window.webrtcDetectedType !== 'webkit') {
      var audioTracks = bind.getAudioTracks();
      var videoTracks = bind.getVideoTracks();

      var i, j;
      var track = null;
      var fn = function () {};

      for (i = 0; i < audioTracks.length; i += 1) {
        track = audioTracks[i];

        if (window.webrtcDetectedBrowser === 'firefox') {
          this.track.stop(track);

        // Polyfill temporarily for Safari / IE plugin-enabled browsers to trigger onended event
        } else {
          fn = this.track.getFn(track, bind.id, 'onended');
          fn(track);
        }
      }

      for (j = 0; j < videoTracks.length; j += 1) {
        track = videoTracks[j];

        if (window.webrtcDetectedBrowser === 'firefox') {
          this.track.stop(track);

        // Polyfill temporarily for Safari / IE plugin-enabled browsers to trigger onended event
        } else {
          fn = this.track.getFn(track, bind.id, 'onended');
          fn(track);
        }
      }
    }

    // Allow users to use polystop to polyfill stop and onended for MediaStreamTrack
    if (window.webrtcDetectedBrowser === 'firefox' ? bind instanceof LocalMediaStream : true) {
      bind.stop();
    }

    if (window.webrtcDetectedType === 'safari' || window.webrtcDetectedBrowser === 'IE') {
      delete this.track.fns[bind.id];
    }

    if (window.webrtcDetectedBrowser === 'firefox') {
      bind.ended = true;
    }
  },

  /**
   * Handles the un-implemented MediaStream.onended events. Use this to set a checker
   *   for Firefox MediaStreams when ended. It will trigger onended when stream has ended.
   * @method StreamPolyfill.checkEnded
   * @param {Object} bind The MediaStream object.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  checkEnded: function (bind) {
    // Firefox browsers
    if (window.webrtcDetectedBrowser === 'firefox') {

      // Check if tracks have all ended
      bind.checkTracksEnded = setInterval(function () {
        var i, j;

        var audios = bind.getAudioTracks();
        var videos = bind.getVideoTracks();

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
          // If stream has flag ended because of media tracks being stopped
          if (bind.ended) {
            clearInterval(bind.checkEnded);

            // trigger that it has ended
            if (typeof bind.onended === 'function') {
              bind.onended(bind);
            }
          }

          // Check if mozSrcObject is not empty
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

        // Bind the video element to MediaStream object
        bind.checkingVideo = video;

        window.attachMediaStream(video, bind);
      }
    }
  },

  /**
   * Handles the attachMediaStream function due to stop polyfill code
   *   attaching the stream to the video element, hence attachMediaStream
   *   has to be reattachMediaStream.
   * @method StreamPolyfill.attachMediaStream
   * @param {DOM} element The video element object.
   * @param {Object} bind The MediaStream object.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  attachMediaStream: function (element, bind) {
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

  /* MediaStreamTrack polyfills */
  track: {
    /**
     * Stores the list of subscription events to prevent over-bloating the MediaStream object
     *   for Safari / IE (plugin-enabled) browsers.
     * @attribute StreamPolyfill.track.fns
     * @type JSON
     * @param {JSON} (#streamId) The stream id of the parent MediaStream.
     * @param {JSON} (#streamId).(#trackId) The track id that holds the functions.
     * @param {Function} [(#streamId).(#trackId).onended] The track's onended function.
     * @param {Function} [(#streamId).(#trackId).onmute] The track's onmute function.
     * @param {Function} [(#streamId).(#trackId).onunmute] The track's onunmute function.
     * @private
     * @support Safari, IE
     * @for Stream
     * @since 0.6.0
     */
    fns: {},

    /**
     * Gets the track.onsomething event subscribed.
     * @method StreamPolyfill.track.getFn
     * @param {Object} bindTrack The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @param {String} fnName The onsomething event name.
     * @param {Function} [fn] The subscription function. If not provided, it
     *   returns the subscription function.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    getFn: function (bindTrack, mediaStreamId, fnName, fn) {
      // Prevent undefined error
      this.fns[mediaStreamId] = this.fns[mediaStreamId] || {
        audio: {},
        video: {}
      };
      this.fns[mediaStreamId][bindTrack.kind] = this.fns[mediaStreamId][bindTrack.kind] || {};
      this.fns[mediaStreamId][bindTrack.kind][bindTrack.id] = this.fns[mediaStreamId][bindTrack.kind][bindTrack.id] || {};

      if (typeof fn === 'function') {
        this.fns[mediaStreamId][bindTrack.kind][bindTrack.id][fnName] = fn || function () {};

      } else {
        return this.fns[mediaStreamId][bindTrack.kind][bindTrack.id][fnName] || function () {};
      }
    },

    /**
     * Handles the polyfill stop() function for MediaStreamTrack to trigger
     *   un-implemented MediaStreamTrack.onended event for Firefox.
     * @method StreamPolyfill.track.stop
     * @param {Object} bind The MediaStreamTrack object.
     * @support Firefox, Chrome, Opera
     * @private
     * @for Stream
     * @since 0.6.0
     */
    stop: function (bind) {

      // Allow users to use polystop to polyfill stop and onended for MediaStreamTrack
      // Tell users that stop() is not implemented in plugin browsers for MediaStreamTrack
      //    due to certain issues with the feature
      if (window.webrtcDetectedBrowser === 'safari' || window.webrtcDetectedBrowser === 'IE') {
        log.warn('StreamPolyfill', window.webrtcDetectedBrowser.toUpperCase() + ' (plugin-enabled) browser ' +
          'does not support MediaStreamTrack.stop() due to issues with the feature');
        return;
      }

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
    },

    /**
     * Handles the un-implemented MediaStream.onended events. Use this to set a checker
     *   for plugin-enabled browsers MediaStreams when ended. It will trigger onended when
     *   stream has ended.
     * @method StreamPolyfill.track.checkEnded
     * @param {Object} bind The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    checkEnded: function (bind, mediaStreamId) {
      if (window.webrtcDetectedBrowser === 'safari' ||
        window.webrtcDetectedBrowser === 'IE') {
        this.getFn(bind, mediaStreamId, 'onended', bind.onended);
      }
    },

    /**
     * Handles the un-implemented MediaStream.onmute events. Use this to set a checker
     *   for plugin-enabled browsers MediaStreams when muted. It will trigger onm,ute when
     *   stream has been muted.
     * @method StreamPolyfill.track.checkMute
     * @param {Object} bind The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    checkMute: function (bind, mediaStreamId) {
      if (window.webrtcDetectedBrowser === 'safari' ||
        window.webrtcDetectedBrowser === 'IE') {
        this.getFn(bind, mediaStreamId, 'onmute', bind.onmute);
      }
    },

    /**
     * Handles the un-implemented MediaStream.onunmute events. Use this to set a checker
     *   for plugin-enabled browsers MediaStreams when unmuted. It will trigger onunmuted when
     *   stream has unmuted.
     * @method StreamPolyfill.track.checkUnmute
     * @param {Object} bind The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    checkUnmute: function (bind, mediaStreamId) {
      if (window.webrtcDetectedBrowser === 'safari' ||
        window.webrtcDetectedBrowser === 'IE') {
        this.getFn(bind, mediaStreamId, 'onunmute', bind.onunmute);
      }
    },

    /**
     * Handles the polyfill muted attribute and sets it to <code>true</code> for
     *   MediaStreamTrack to trigger un-implemented MediaStreamTrack.onmute event.
     * This uses the enabled attribute and sets it to <code>false</code>.
     * @method StreamPolyfill.track.mute
     * @param {Object} bind The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    mute: function (bind, mediaStreamId) {

      // Allow users to use polymute to polyfill muted = true and onmute for MediaStreamTrack
      bind.enabled = false;
      bind.muted = true;

      // Workaround for Safari / IE users
      if (window.webrtcDetectedBrowser === 'safari' || window.webrtcDetectedBrowser === 'IE') {
        var fn = this.getFn(bind, mediaStreamId, 'onmute');
        fn(bind);

      } else {
        if (typeof bind.onmute === 'function') {
          bind.onmute(bind);
        }
      }
    },

    /**
     * Handles the polyfill muted attribute and sets it to <code>false</code> for
     *   MediaStreamTrack to trigger un-implemented MediaStreamTrack.onunmute event.
     * This uses the enabled attribute and sets it to <code>true</code>.
     * @method StreamPolyfill.track.unmute
     * @param {Object} bind The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    unmute: function (bind, mediaStreamId) {

      // Allow users to use polyunmute to polyfill muted = false and onunmute for MediaStreamTrack
      bind.enabled = true;
      bind.muted = false;

      // Workaround for Safari / IE users
      if (window.webrtcDetectedBrowser === 'safari' || window.webrtcDetectedBrowser === 'IE') {
        var fn = this.getFn(bind, mediaStreamId, 'onunmute');
        fn(bind);

      } else {
        if (typeof bind.onunmute === 'function') {
          bind.onunmute(bind);
        }
      }
    }

  }
};