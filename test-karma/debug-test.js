// Testing attributes
var sw = new Skylink();
var apikey = '5f874168-0079-46fc-ab9d-13931c2baa39';

//sw.setLogLevel(sw.LOG_LEVEL.DEBUG);

console.log('API: Tests the debug mode stack logs');
console.log('===============================================================================================');

describe("Test debug functionalities", function() {

	it('setDebugMode(): Testing to check if logs are saved in setDebugMode options', function() {

	  this.timeout(5000);

	  sw.setDebugMode(true);

	  sw.init(apikey);

	  if (window.SkylinkLogs.getLogs().length > 0) {
	    assert.ok(true, 'SkylinkLogs is not empty when setDebugMode === true');
	  } else {
	    assert.fail(false, true, 'SkylinkLogs is empty when setDebugMode === true');
	  }

	  window.SkylinkLogs.clearAllLogs();

	  sw.setDebugMode(false);

	  sw.init(apikey);

	  if (window.SkylinkLogs.getLogs().length === 0) {
	    assert.ok(true, 'SkylinkLogs is empty when setDebugMode === false')
	  } else {
	    assert.fail(false, true, 'SkylinkLogs is not empty when setDebugMode === true');
	  }

	  window.SkylinkLogs.clearAllLogs();

	  sw.setDebugMode();

	  sw.init(apikey);

	  if (window.SkylinkLogs.getLogs().length > 0) {
	    assert.ok(true, 'SkylinkLogs is not empty when setDebugMode === empty (default: true)');
	  } else {
	    assert.fail(false, true, 'SkylinkLogs is empty when setDebugMode === empty (default: true)');
	  }

	});

	it('SkylinkLogs: Testing if SkylinkLogs stores based on setLogLevel correctly', function() {

	  this.timeout(5000);

	  sw.setDebugMode(true);

	  sw.init(apikey);

	  sw.joinRoom();

	  if (window.SkylinkLogs.getLogs().length > 0) {
	    assert.ok(true, 'SkylinkLogs is not empty');
	  } else {
	    assert.fail('SkylinkLogs is empty');
	  }

	  var logs = window.SkylinkLogs.getLogs(sw.LOG_LEVEL.LOG);

	  var logCount = 0;

	  for (var i = 0; i < logs.length; i++) {
	    if (logs[i][1] === 'log') {
	      logCount += 1;
	    }
	  }

	  if (logs.length === logCount) {
	    assert.ok(true, 'SkylinkLogs logs returns the level correctly');
	  } else {
	    assert.fail(false, true, 'SkylinkLogs logs returns the number incorrectly');
	  }

	  // reason because in real-time, it would probably be still logging.
	  var preLength = window.SkylinkLogs.getLogs().length;

	  window.SkylinkLogs.clearAllLogs();

	  var cuLength = window.SkylinkLogs.getLogs().length;

	  if (preLength > cuLength) {
	    assert.ok(true, 'Previous SkylinkLogs is cleared when clearAllLogs() is called')
	  } else {
	    assert.fail(false, true, 'Previous SkylinkLogs is not cleared when clearAllLogs() is called');
	  }

	  if (typeof window.SkylinkLogs.printAllLogs === 'function') {
	    assert.ok(true, 'SkylinkLogs.printAllLogs is a function');
	  } else {
	    assert.fail(false, true, 'SkylinkLogs.printAllLogs is not a function');
	  }

	});

});







