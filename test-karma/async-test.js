// Testing attributes
var sw = new Skylink();
var apikey = '5f874168-0079-46fc-ab9d-13931c2baa39';

console.log('Async: Tests the callbacks');
console.log('===============================================================================================');

describe("A test suite", function() {

   before(function() {  

	  sw.init(apikey,function(){
	    sw.joinRoom({userData: 'PEER1'});
	  });

   });

   it('Testing async', function(done) { 
   	this.timeout(10000);
   	setTimeout(function(){
   		var stream_callback = function(error,success){
		    if (error){
		      assert.fail(false,true,'Send stream callback - fail');
   			  done();
		    }
		    else{
		      assert.ok(true, true, 'Send stream callback - success');
		      done();
		    }
		  };

	    sw.sendStream({
	      audio: true,
	      video: true
	    },stream_callback);
	  }, 4000);
   });
});



