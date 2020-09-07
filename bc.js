// this file promisified the functions we need for login and registration

const bcryptjs = require('bcryptjs');

// generate salt
// generate hash
// 3 diff functions of bcrypt that we will import
let { genSalt, hash, compare } = bcryptjs;
// genSalt is an npm package bcrypt function (not a core node module)
// compare compares a plain text with hash
// all are asynchronous and work with callbacks - or Promises
// we're going to promisify all 3
const { promisify } = require('util');
// a node-style callback is just a callback that has an error as a first

genSalt = promisify(genSalt);
// making it the promisified version of what it was before
hash = promisify(hash);
compare = promisify(compare);

module.exports.compare = compare;
// make the hash function a function that generates salt and then hashes the password
module.exports.hash = (plainTextPasswordFromUser) => genSalt().then((salt) => hash(plainTextPasswordFromUser, salt));
// read documentation of bcrypt
// we need compare for login
// we need hash for registration
