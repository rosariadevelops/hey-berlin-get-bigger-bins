const spicedPg = require('spiced-pg'); // this is our middleman
const db = spicedPg('postgres:postgres:postgres@localhost:5432/petition'); // passing middleman some config info
// localhost:5423 is a standard port for database
// localhost:5432/nameofdatabase
// spicedpg is written by David but based on pg npm module as a way to talk to database

// INSERT when the user signs petition and submits (first, last, signature)
// SELECT to get total number of signers (use *count*)
// SELECT to get first and last names of all who have signed
module.exports.getSigners = () => {
    return db.query(`SELECT * FROM sigs;`);
    // select all from sigs where id equals user id
};

module.exports.getSignature = (id) => {
    return db.query(
        `
        SELECT sig FROM sigs 
        WHERE id = ($1);`,
        [id]
    );
};

module.exports.addSig = (fname, lname, sig, userId) => {
    return db.query(
        `
        INSERT INTO sigs (fname, lname, sig, user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id`,
        [fname, lname, sig, userId]
    );
    // columns in the table, values you are inserting
    // $1, $2, $3 correspond to the values/variables that you are inserting
    // this protects from SQL Injection
    // we have to assume whatever users give us cannot be trusted
};

module.exports.addUser = (firstname, lastname, email, pword) => {
    return db.query(
        `
        INSERT INTO users (firstname, lastname, email, pword)
        VALUES ($1, $2, $3, $4)
        RETURNING id`,
        [firstname, lastname, email, pword]
    );
};

module.exports.findUser = () => {
    return db.query(`SELECT * FROM users;`);
};

module.exports.checkSig = (userId) => {
    return db.query(
        `SELECT sig FROM sigs 
        WHERE id = ($1);`,
        [userId]
    );
};
