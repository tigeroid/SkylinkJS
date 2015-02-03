/**
 * Stores the list of available StreamTrackList.
 * - This is not supported in Firefox yet, but you can select the tracklist
 *   in Firefox when getUserMedia is invoked.
 * @attribute StreamTrackList
 * @returns {JSON} Returns an array of audio and video tracks.
 * - audio: The audio track list.
 * - video: The video track list.
 * @for Skylink
 * @since 0.6.0
 */
var StreamTrackList = {
  readyState: 'new',
  audio: [],
  video: [],
  onready: function () {}
};

// Firefox does not support MediaStreamTrack.getSources yet
if (window.webrtcDetectedBrowser === 'firefox') {
  StreamTrackList.readyState = 'done';

// Chrome / Plugin / Opera supports MediaStreamTrack.getSources
} else {
  // Retrieve list
  MediaStreamTrack.getSources(function (trackList) {
    for (var i =0; i < trackList.length; i++) {
      var track = trackList[i];
      var data = {};

      // MediaStreamTrack label - FaceHD Camera
      data.label = track.label || (track.kind + '_' + (i + 1));
      // MediaStreamTrack kind - audio / video
      data.kind = track.kind;
      // MediaStreamTrack id - The identifier
      data.id = track.id;
      // The facing environment
      data.facing = track.facing;

      if (track.kind === 'audio') {
        StreamTrackList.audio.push(data);
      } else {
        StreamTrackList.video.push(data);
      }
    }
    StreamTrackList.readyState = 'done';
    
    if (typeof StreamTrackList.onReady === 'function') {
      StreamTrackList.onready(StreamTrackList);
    }
  });
}