module.exports = {
	
	config () {

		global.sleep = (milliseconds) => {
		  const date = Date.now();
		  let currentDate = null;
		  do {
		    currentDate = Date.now();
		  } while (currentDate - date < milliseconds);
		}
	}
}