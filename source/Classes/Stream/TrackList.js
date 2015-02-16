/**
 * Handles the <code>MediaStreamTrack.getSources</code> list of tracks.
 * This is to prevent the empty <code>.label</code> strings in
 *   the information provided.
 * This is not supported in Firefox yet, but you can select the tracklist
 *   in Firefox when mozGetUserMedia is invoked.
 * In Safari / IE (plugin-enabled) browsers, using this may not be required
 *   as the available options of track list is selectable when getUserMedia
 *   is invoked.
 * @method StreamGetSources
 * @returns {JSON} Returns an array of audio and video tracks.
 * - <code>audio</code> <var>: <b>type</b> Array</var><br>
 *   The audio track list.
 * - <code>audio.(#index)</code> <var>: <b>type</b> JSON</var><br>
 *   The audio track information.
 * - <code>audio.(#index).label</code> <var>: <b>type</b> String</var><br>
 *   The audio track label.
 * - <code>audio.(#index).id</code> <var>: <b>type</b> String</var><br>
 *   The audio track id.
 * - <code>audio.(#index).kind</code> <var>: <b>type</b> String</var><br>
 *   The audio track kind. Type is <code>"audio"</code>
 * - <code>audio.(#index).facing</code> <var>: <b>type</b> String</var><br>
 *   The audio track facing environment.
 * - <code>video</code> <var>: <b>type</b> Array</var><br>
 *   The video track list.
 * - <code>video.(#index)</code> <var>: <b>type</b> JSON</var><br>
 *   The video track information.
 * - <code>video.(#index).label</code> <var>: <b>type</b> String</var><br>
 *   The video track label.
 * - <code>video.(#index).id</code> <var>: <b>type</b> String</var><br>
 *   The video track id.
 * - <code>video.(#index).kind</code> <var>: <b>type</b> String</var><br>
 *   The video track kind. Type is <code>"audio"</code>
 * - <code>video.(#index).facing</code> <var>: <b>type</b> String</var><br>
 *   The video track facing environment.
 * @example
 *   GetStreamTrackList(function (sources) {
 *      var audioTrackList = sources.audio;
 *      var videoTrackList = sources.video;
 *   });
 * @global true
 * @for Stream
 * @since 0.6.0
 */
var StreamGetSources = function (defer) {
  // Firefox does not support MediaStreamTrack.getSources yet
  // Chrome / Plugin / Opera supports MediaStreamTrack.getSources
  if (window.webrtcDetectedBrowser !== 'firefox') {
    var audioList = [];
    var videoList = [];

    // Retrieve list
    MediaStreamTrack.getSources(function (trackList) {
      var i;

      for (i = 0; i < trackList.length; i += 1) {
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
          audioList.push(data);
        } else {
          videoList.push(data);
        }
      }

      defer({
        audio: audioList,
        video: videoList
      });
    });
  }
};