/**
 * Handles the XMLHttpStream and API function calls.
 * @class Stream
 * @for Skylink
 * @since 0.6.0
 */
function Stream(stream, config, listener) {
  'use strict';

  // Reference of instance
  var com = this;

  /**
   * The stream id.
   * @attribute id
   * @type String
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.id = null;

  /**
   * The getUserMedia constraints.
   * @attribute constraints
   * @type JSON
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.constraints = null;

  /**
   * The streaming configuration.
   * @attribute config
   * @type JSON
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.config = config;
  
  /**
   * The stream source type.
   * @attribute sourceType
   * @type String
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.sourceType = 'local';

  /**
   * The MediaStream object.
   * @attribute MediaStream
   * @type Object
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.MediaStream = null;

  /**
   * The parent handler that redirects the stream object messages to.
   * @attribute MediaStream
   * @type Object
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.parentHandler = function () {};

  /**
   * The handler that manages all triggers or relaying events.
   * @attribute handler
   * @type Function
   * @private
   * @for User
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    listener(event, data);
    
    //log.debug('StreamHandler', event, data); 

    if (typeof com.parentHandler === 'function') {
      com.parentHandler(event, data);
    }
  };

  
  /**
   * Function to subscribe to when stream has ended.
   * @method onstreamended
   * @for Stream
   * @since 0.6.0
   */
  com.onstreamended = function () { };
  
  /**
   * Function to subscribe to when stream track has been ended.
   * @method ontrackended
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackended = function () { };
  
  /**
   * Function to subscribe to when stream track has been muted.
   * @method ontrackmute
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackmute = function () { };

  /**
   * Function to subscribe to when stream track has been unmuted.
   * @method ontrackunmute
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackunmute = function () { };
  

  /**
   * Starts a MediaStream object connection with getUserMedia.
   * @method start
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.start = function () {
    window.getUserMedia(com.constraints, com.bind, function (error) {
      com.handler('stream:error', {
        id: com.id,
        error: error,
        sourceType: com.sourceType
      });
    });
  };

  /**
   * Binds events to MediaStream object.
   * @method bind
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.bind = function (bindStream) {
    // Set a MediaStream id if Firefox or Chrome doesn't
    com.id = bindStream.id || fn.generateUID();

    // Bind events to MediaStream
    // bindStream.onaddtrack = com.onAddTrack;
    // bindStream.onremovetrack = com.onRemoveTrack;
    bindStream.onended = com.bindOnStreamEnded(bindStream);
    bindStream.newId = com.id;

    // Bind track events
    com.bindTracks(bindStream.getAudioTracks());
    com.bindTracks(bindStream.getVideoTracks());

    com.MediaStream = bindStream;
 
    com.handler('stream:start', {
      id: com.id,
      label: bindStream.label,
      constraints: com.constraints,
      sourceType: com.sourceType
    });
  };

  /**
   * Binds events to MediaStreamTrack object.
   * @method bind
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.bindTracks = function (bindTracks) {
    fn.forEach(bindTracks, function (track, i) {
      track.newId = track.id || fn.generateUID();

      // Bind events to MediaStreamTrack
      // bindTracks[i].onstarted = com.onStarted;
      track.onended = function () {
        com.handler('stream:track:stop', {
          streamId: com.id,
          id: track.newId,
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          sourceType: com.sourceType
        });

        if (typeof com.ontrackended === 'function') {
          com.ontrackended(track);
        }
      };

      // Un-implemented events functions
      //track.onmute = function(event) {};
      //track.onunmute = function(event) {};
      // track.onoverconstrained = function(event) {};

      // Set the mute status
      var isEnabled = true;

      if (track.kind === 'audio') {
        isEnabled = (typeof com.config.audio === 'object') ?
          !!!com.config.status.audioMuted : !!com.config.audio;
      } else {
        isEnabled = (typeof com.config.video === 'object') ?
          !!!com.config.status.videoMuted : !!com.config.video;
      }
      
      track.enabled = isEnabled;

      com.handler('stream:track:start', {
        streamId: com.id,
        id: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
      });
    });
  };

  /**
   * Attaches the Stream object to a video element.
   * @method attachElement
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.attachElement = function (element) {
    if (window.webrtcDetectedBrowser === 'firefox' &&
      (com.MediaStream instanceof LocalMediaStream) === false) {
      window.reattachMediaStream(element, com.MediaStream.checkingVideo);
    
    } else {
      window.attachMediaStream(element, com.MediaStream);
    }
  };

  /**
   * Handles the non-implemented firefox onended event for stream.
   * @method bindOnStreamEnded
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.bindOnStreamEnded = function (bindStream) {
    var fn = function () {
      com.handler('stream:stop', {
        id: com.id,
        label: stream.label,
        constraints: com.constraints,
        sourceType: com.sourceType
      });
      
      if (typeof com.onended === 'function') {
        com.onended(bindStream);
      }
    };
    
    // Firefox browsers
    if (window.webrtcDetectedBrowser === 'firefox') {
      // LocalMediaStream
      if (bindStream.constructor === LocalMediaStream) {
        return setInterval(function () {
          if (bindStream.hasEnded) {
            clearInterval(bindStream.onended);
            // trigger that it has ended
            fn();
          }
  
          if (typeof bindStream.recordedTime === 'undefined') {
            bindStream.recordedTime = 0;
          }

          if (bindStream.recordedTime === bindStream.currentTime) {
            clearInterval(bindStream.onended);
            // trigger that it has ended
            fn();

          } else {
            bindStream.recordedTime = bindStream.currentTime;
          }
        }, 1000);

        // Remote MediaStream
      } else {
        return (function () {
          // Use a video to attach to check if stream has ended
          var video = document.createElement('video');
          video.onstreamended = setInterval(function () {
            if (bindStream.hasEnded) {
              clearInterval(video.onstreamended);
              fn();
            }
            
            if (!fn.isEmpty(video.mozSrcObject)) {
              if (video.mozSrcObject.ended === true) {
                clearInterval(video.onstreamended);
                fn();
              }
            }
          }, 1000);
          
          bindStream.checkingVideo = video;
  
          window.attachMediaStream(video, bindStream);
          return video;
        })();
      }
    }
    // Non-firefox browsers
    return fn;
  };

  /**
   * Mutes all audio MediaStreamTracks.
   * @method muteAudio
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.muteAudio = function () {
    var tracks = com.MediaStream.getAudioTracks();
    
    fn.forEach(tracks, function (track, i) {
      track.enabled = false;
      
      com.handler('stream:track:mute', {
        streamId: com.id,
        id: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
      });

      if (typeof com.ontrackmute === 'function') {
        com.ontrackmute(track);
      }
    });
  };

  /**
   * Unmutes all audio MediaStreamTracks.
   * @method unmuteAudio
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.unmuteAudio = function () {
    var tracks = com.MediaStream.getAudioTracks();

    fn.forEach(tracks, function (track, i) {
      track.enabled = true;
      
      com.handler('stream:track:unmute', {
        streamId: com.id,
        id: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
      });

      if (typeof com.ontrackunmute === 'function') {
        com.ontrackunmute(track);
      }
    });
  };

  /**
   * Stops all audio MediaStreamTracks streaming.
   * @method stopAudio
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.stopAudio = function () {
    var tracks = com.MediaStream.getAudioTracks();

    fn.forEach(tracks, function (track, i) {
      track.stop();

      // Workaround for firefox as it does not have stop events
      if (window.webrtcDetectedBrowser === 'firefox') {
        if (track.hasEnded !== true) {
          track.onended(track);
          track.hasEnded = true;
        }
      }
    
    }, function () {
      // Workaround for firefox as it does not have stop stream when all track ends
      if (window.webrtcDetectedBrowser === 'firefox') {
        if (com.MediaStream.videoEnded === true) {
          com.MediaStream.hasEnded = true;
        }
        com.MediaStream.audioEnded = true;
      }
    });
  };

  /**
   * Mutes all video MediaStreamTracks.
   * @method muteVideo
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.muteVideo = function () {
    var tracks = com.MediaStream.getVideoTracks();

    fn.forEach(tracks, function (track, i) {
      track.enabled = false;
      
      com.handler('stream:track:mute', {
        streamId: com.id,
        id: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
      });

      if (typeof com.ontrackmute === 'function') {
        com.ontrackmute(track);
      }
    });
  };

  /**
   * Unmutes all video MediaStreamTracks.
   * @method unmuteVideo
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.unmuteVideo = function () {
    var tracks = com.MediaStream.getVideoTracks();

    fn.forEach(tracks, function (track, i) {
      track.enabled = true;
      
      com.handler('stream:track:unmute', {
        streamId: com.id,
        id: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
      });

      if (typeof com.ontrackunmute === 'function') {
        com.ontrackunmute(track);
      }
    });
  };

  /**
   * Stops all video MediaStreamTracks streaming.
   * @method stopVideo
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.stopVideo = function () {
    var tracks = com.MediaStream.getVideoTracks();

    fn.forEach(tracks, function (track, i) {
      track.stop();

      // Workaround for firefox as it does not have stop events
      if (window.webrtcDetectedBrowser === 'firefox') {
        if (track.hasEnded !== true) {
          track.onended(tracks[i]);
          track.hasEnded = true;
        }
      }
    
    }, function () {
      // Workaround for firefox as it does not have stop stream when all track ends
      if (window.webrtcDetectedBrowser === 'firefox') {
        if (com.MediaStream.audioEnded === true) {
          com.MediaStream.hasEnded = true;
        }
        com.MediaStream.videoEnded = true;
      }
    });
  };

  com.stop = function () {
    // Stop MediaStream tracks
    com.stopVideo();
    com.stopAudio();
    // Stop MediaStream
    com.MediaStream.stop();
  };
  
  // Throw an error if adapterjs is not loaded
  if (!window.attachMediaStream) {
    throw new Error('Required dependency adapterjs not found');
  }

  // Bind or start MediaStream
  if (fn.isEmpty(stream)) {
    var audioSettings = StreamParser.parseAudioConfig(config.audio);
    var videoSettings = StreamParser.parseVideoConfig(config.video);
    var statusSettings = StreamParser.parseMutedConfig(config);

    com.constraints = {
      audio: audioSettings.userMedia,
      video: videoSettings.userMedia
    };

    com.config = {
      audio: audioSettings.settings,
      video: audioSettings.settings,
      status: statusSettings
    };

    com.start();

  } else {
    // Allow javascript to return object before code execution
    fn.runSync(function () {
      com.config = {
        audio: fn.isSafe(function () { return stream.getAudioTracks().length > 0; }),
        video: fn.isSafe(function () { return stream.getVideoTracks().length > 0; })
      };
      com.bind(stream);
    });
  }
}