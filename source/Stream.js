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
   * The MediaStream object.
   * @attribute MediaStream
   * @type Object
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.MediaStream = null;

  /**
   * Starts a MediaStream object connection with getUserMedia.
   * @method start
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.start = function () {
    window.getUserMedia(com.constraints, com.bind, function (error) {
      listener('stream:error', error);
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

    // Bind track events
    com.bindTracks(bindStream.getAudioTracks());
    com.bindTracks(bindStream.getVideoTracks());

    com.MediaStream = bindStream;
 
    listener('stream:start', {
      id: com.id,
      label: bindStream.label,
      constraints: com.constraints
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
    for (var i = 0; i < bindTracks.length; i++) {
      var track = bindTracks[i];
      track.newId = track.id || fn.generateUID();

      // Bind events to MediaStreamTrack
      // bindTracks[i].onstarted = com.onStarted;
      track.onended = function (event) {
        com.onTrackEnded(track);
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
      
      bindTracks[i].enabled = isEnabled;

      listener('stream:track:start', {
        streamId: com.id,
        id: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled
      });
    }
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
    // Firefox browsers
    if (window.webrtcDetectedBrowser === 'firefox') {
      // LocalMediaStream
      if (bindStream.constructor === LocalMediaStream) {
        return setInterval(function () {
          if (typeof bindStream.recordedTime === 'undefined') {
            bindStream.recordedTime = 0;
          }

          if (bindStream.recordedTime === bindStream.currentTime) {
            clearInterval(bindStream.onended);
            // trigger that it has ended
            com.onStreamEnded(bindStream, null);

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
            if (!fn.isEmpty(video.mozSrcObject)) {
              if (video.mozSrcObject.ended === true) {
                clearInterval(video.onstreamended);
                com.onStreamEnded(bindStream, null);
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
    return com.onStreamEnded;
  };

  /**
   * Handles the event when the stream has ended successfully.
   * @method onStreamEnded
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.onStreamEnded = function (event) {
    var stream = event.target || event;

    listener('stream:stop', {
      id: com.id,
      label: stream.label,
      constraints: com.constraints
    });
  };

  /**
   * Handles the event when the stream track has ended successfully.
   * @method onTrackEnded
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.onTrackEnded = function (track) {
    listener('stream:track:stop', {
      streamId: com.id,
      id: track.newId,
      kind: track.kind,
      label: track.label,
      enabled: track.enabled
    });
  };

  /**
   * Handles the event when the stream track has been muted.
   * @method onTrackMute
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.onTrackMute = function (track) {
    listener('stream:track:mute', {
      streamId: com.id,
      id: track.newId,
      kind: track.kind,
      label: track.label,
      enabled: track.enabled
    });
  };

  /**
   * Handles the event when the stream track has been unmuted.
   * @method onTrackMute
   * @trigger StreamJoined, mediaAccessRequired
   * @for Stream
   * @since 0.6.0
   */
  com.onTrackUnmute = function (track) {
    listener('stream:track:unmute', {
      streamId: com.id,
      id: track.newId,
      kind: track.kind,
      label: track.label,
      enabled: track.enabled
    });
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

    for (var i = 0; i < tracks.length; i++) {
      tracks[i].enabled = false;
      com.onTrackMute(tracks[i]);
    }
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

    for (var i = 0; i < tracks.length; i++) {
      tracks[i].enabled = true;
      com.onTrackUnmute(tracks[i]);
    }
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

    for (var i = 0; i < tracks.length; i++) {
      tracks[i].stop();

      // Workaround for firefox as it does not have stop events
      if (window.webrtcDetectedBrowser === 'firefox') {
        tracks[i].onended(tracks[i]);
      }
    }
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

    for (var i = 0; i < tracks.length; i++) {
      tracks[i].enabled = false;
      com.onTrackMute(tracks[i]);
    }
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

    for (var i = 0; i < tracks.length; i++) {
      tracks[i].enabled = true;
      com.onTrackUnmute(tracks[i]);
    }
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

    for (var i = 0; i < tracks.length; i++) {
      tracks[i].stop();

      // Workaround for firefox as it does not have stop events
      if (window.webrtcDetectedBrowser === 'firefox') {
        tracks[i].onended(tracks[i]);
      }
    }
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