// Testing attributes
var sw = new Skylink();
var apikey = '5f874168-0079-46fc-ab9d-13931c2baa39';

//sw.setLogLevel(sw.LOG_LEVEL.DEBUG);

console.log('Async: Tests the callbacks');
console.log('===============================================================================================');

describe("Test callbacks", function() {

   it('getUserMedia() - callback: Testing callback', function(done) { 

   	var media_callback = function(error,success){
		if (error){
			console.log('error');
	    	assert.fail(false, true, 'Get user media callback - failure');
	    	done();
	    }
	    else{
	    	console.log('success');
	    	assert.ok(success, 'Get user media callback - success');
	    	done();
	    }
	  }

	sw.init(apikey,function(){
		sw.getUserMedia({
	    	audio: true,
	    	video: true
	    },media_callback);
	});

   });

   it('sendStream() - callback: Testing callback', function(done) { 

   	this.timeout(10000);

   	var stream_callback = function(error,success){
		if (error){
	 		assert.fail(false,true,'Send stream callback - fail');
		    done();
	    }
	    else{
	        assert.ok(true, 'Send stream callback - success');
	        done();
	    }
	};

   	sw.init(apikey,function(){
		sw.joinRoom({userData: 'PEER1'});
	});

	setTimeout(function(){
		sw.sendStream({
	      audio: true,
	      video: true
	    },stream_callback);	
	}, 4000);

   });

   it('Test init callback', function(done){

   	  this.timeout(6000);

   	  var array=[];
	  var init_callback = function(error,success){
	    if (error){
	      array.push(-1);
	    }
	    else{
	      array.push(1);
	    }
	  }

	  sw.init(init_callback);
	  sw.init(apikey,init_callback);

	  setTimeout(function () {
	    assert.deepEqual(array, [-1,1], 'Test init callback');
	    done();
	  }, 4000); 	

   });

   it('sendBlobData() - callback: Testing success callback', function(done){
	  
   	  this.timeout(15000);

	  var array=[];
	  var data = new Blob(['<a id="a"><b id="b">PEER1</b></a>']);
	  var file_callback = function(error, success){
	    if (error){
	  	  console.log('error');
	      array.push(-1);
	    }
	    else{
	      console.log('success');
	      array.push(1);
	    }
	  }

	  sw.init(apikey,function(){
	    sw.joinRoom({userData: 'self'});
	  });

	  setTimeout(function(){
	    sw.sendBlobData(data, {
	      name: 'accept',
	      size: data.size,
	    },file_callback);
	  },5000);

	  setTimeout(function () {
	    assert.deepEqual(array, [1], 'Test sendBlobData callback');
	    sw.leaveRoom();
	    done();
	  }, 12000);
	});

   	it('sendBlobData() - callback: Testing failure callback', function(done){
	  
   	  this.timeout(22000);

	  var array=[];
	  var data = new Blob(['<a id="a"><b id="b">PEER1</b></a>']);
	  var file_callback = function(error, success){
	    if (error){
	      array.push(-1);
	    }
	    else{
	      array.push(1);
	    }
	  }

	  setTimeout(function(){
	    sw.sendBlobData(data, {
	      name: 'reject',
	      size: data.size,
	    },file_callback);
	  },5000);

	  sw.init(apikey,function(){
	    sw.joinRoom({userData: 'self'});
	  });

	  setTimeout(function () {
	    assert.deepEqual(array, [-1], 'Test sendBlobData callback rejected');
	    sw.leaveRoom();
	    done();
	  }, 20000);
	});

   	it('joinRoom() - callback: Testing callback', function(done){
	  this.timeout(10000);

	  var array = [];
	  var count = 0;
	  var join_callback = function(error, success){
	    if (error){
	      array.push('error');
	    }
	    else{
	      array.push(count);
	      count++;
	    }
	  }

	  sw.init(apikey,function(){
	    sw.joinRoom(function(){
	      join_callback();
	      sw.joinRoom(join_callback);
	    });
	  });

	  setTimeout(function () {
	    assert.deepEqual(array, [0,1], 'Test joinRoom callback');
	    done();
	  }, 8000);
	});

	it.only('leaveRoom() - callback: Testing callback (in joinRoom() callback)', function(done){
	  this.timeout(7000);
	  var array = [];
	  var leave_callback = function(error, success){
	    if (error){
	      array.push('leave_error');
	      console.log(JSON.stringify(error));
	    }
	    else{
	      array.push('leave_success');
	    }
	  }

	  var join_callback = function(error, success){
	    if (error){
	      array.push('join_error');
	    }
	    else{
	      array.push('join_success');
	      sw.leaveRoom(leave_callback);
	    }
	  }

	  sw.init(apikey,function(){
	    sw.joinRoom(join_callback);
	  });

	  setTimeout(function () {
	    assert.deepEqual(array, ['join_success','leave_success'], 'Success callback called');
	    sw.leaveRoom();
	    done();
	  }, 5000);
	});

});















