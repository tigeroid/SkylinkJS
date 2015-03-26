// Testing attributes
var array = [];
var sw = new Skylink();

var pushOneToArray = function(){
  array.push(1);
};
var pushToArrayPlusOne = function(value) {
  array.push(value + 1);
};
var pushToArrayPlusTwo = function(value) {
  array.push(value + 2);
};
var pushToArrayPlusThree = function(value) {
  array.push(value + 3);
};
var pushToArrayPlusFour = function(value) {
  array.push(value + 4);
};
var cancelTrigger = function(value) {
  return false;
};


console.log('HELPER: Tests helper functions');
console.log('===============================================================================================');

describe("Test helper functions", function() {

   beforeEach(function() { 
   	var test_func_before_throttle = function(){
	    sw._throttle(pushOneToArray,3000)();
	  }  

	  //Test if only one function fires among these
	  test_func_before_throttle();
	  test_func_before_throttle();
	  test_func_before_throttle();
	  test_func_before_throttle();
	  test_func_before_throttle();
	  test_func_before_throttle();
	  test_func_before_throttle();
	  test_func_before_throttle();

	  //Test if function can not fire halfway during timeout
	  setTimeout(test_func_before_throttle, 1000);

	  //Test if function can fire after timeout was gone
	  setTimeout(test_func_before_throttle, 5000);
   });

   it('Testing throttle', function(done) { 
   	this.timeout(8000);
   	setTimeout(function(){
	    assert.deepEqual(array, [1,1]);
	    done();
	  }, 6000);
   });
});



