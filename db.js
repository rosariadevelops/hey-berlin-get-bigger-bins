const spicedPg = require('spiced-pg'); // this is our middleman
const db = spicedPg('postgres:postgres:postgres@localhost:5432/petition'); // passing middleman some config info
// localhost:5423 is a standard port for database
// localhost:5432/nameofdatabase
// spicedpg is written by David but based on pg npm module as a way to talk to database

// INSERT when the user signs petition and submits (first, last, signature)
// SELECT to get total number of signers (use *count*)
// SELECT to get first and last names of all who have signed
module.exports.getSig = () => {
    // ideally name of function should describe what you want to do
    return db.query('SELECT * FROM sigs');
};
module.exports.addSig = (fname, lname, sig) => {
    return db.query(
        `
        INSERT INTO sigs (fname, lname, sig)
        VALUES ($1, $2, $3)
        RETURNING id`,
        [fname, lname, sig]
    );
    // columns in the table, values you are inserting
    // $1, $2, $3 correspond to the values/variables that you are inserting
    // this protects from SQL Injection
    // we have to assume whatever users give us cannot be trusted
};
