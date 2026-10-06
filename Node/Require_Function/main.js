const { myRequire } = require('./myRequire.js');

const math = myRequire('./math.js');

console.log(math.add(10, 20));