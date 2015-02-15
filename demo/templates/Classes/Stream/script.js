var stream = null;

var audioTrackList = document.getElementById('audioTrackList');
var videoTrackList = document.getElementById('videoTrackList');
var output = document.getElementById('output');


function addToOption(element, list) {
  for (var i = 0; i < list.length; i++) {
    element.innerHTML += '<option value="' + list[i].id + '">' +
      list[i].label + '</option>';
  }
}

function stopStream() {
  if (stream) {
    stream.stop();
  }
}

function handler(event, data) {
  console.log(event, data);

  if (event === 'stream:start') {
    output.innerHTML = '<p><b>constraints:</b>' +
      JSON.stringify(stream._constraints) + '</p>' +
      '<p><b>config:</b>' + JSON.stringify(stream.config) + '</p>';

    stream.attachElement(document.getElementById('stream'));
  }
}

function getStream() {
  stopStream();

  var options = {
    audio: true,
    video: true
  };
  if (audioTrackList.value) {
    options.audio = {
      sourceId: audioTrackList.value
    };
  }
  if (videoTrackList.value) {
    options.video = {
      sourceId: videoTrackList.value
    };
  }

  stream = new Stream(null, options, handler);
}

function bindStream() {
  stopStream();

  getUserMedia({
    audio: true,
    video: true
  }, function (data) {
    stream = new Stream(data, {}, handler);
  }, function (error) {
    console.error('exception occurred:', error);
  });
}

function stopAudioTrack() {
  stream.stopAudio();
}

function stopVideoTrack() {
  stream.stopVideo();
}

StreamTrackList.get(function () {
  // Add to list
  addToOption(audioTrackList, StreamTrackList.audio);
  addToOption(videoTrackList, StreamTrackList.video);
});