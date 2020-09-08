const spicedPg = require('spiced-pg'); // this is our middleman
const db = spicedPg('postgres:postgres:postgres@localhost:5432/petition'); // passing middleman some config info
// localhost:5423 is a standard port for database
// localhost:5432/nameofdatabase
// spicedpg is written by David but based on pg npm module as a way to talk to database

// INSERT when the user signs petition and submits (first, last, signature)
// SELECT to get total number of signers (use *count*)
// SELECT to get first and last names of all who have signed

module.exports.getSignature = (id) => {
    return db.query(
        `
        SELECT sig FROM sigs 
        WHERE id = ($1);`,
        [id]
    );
};

module.exports.addSig = (sig, userId) => {
    return db.query(
        `
        INSERT INTO sigs (sig, user_id)
        VALUES ($1, $2)
        RETURNING id`,
        [sig, userId]
    );
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

module.exports.findUsers = () => {
    return db.query(`SELECT * FROM users;`);
};

module.exports.checkEmail = (email) => {
    return db.query(
        `
    SELECT * FROM users 
    WHERE email = ($1);`,
        [email]
    );
};

/* module.exports.findPassword = (pword) => {
    return db.query(`SELECT pword FROM users WHERE pword = ($1);`, [pword]);
}; */

module.exports.checkSig = (userId) => {
    return db.query(
        `SELECT sig FROM sigs 
        WHERE id = ($1);`,
        [userId]
    );
};

module.exports.createProfile = (age, city, url, user_id) => {
    return db.query(
        `
        INSERT INTO user_profiles (age, city, url, user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING user_id`,
        [age, city, url, user_id]
    );
};

module.exports.updateProfile = () => {
    return db.query(
        `
        SELECT * FROM sigs
        LEFT JOIN users
        ON sigs.user_id = users.id
        LEFT JOIN user_profiles
        ON sigs.user_id = user_profiles.user_id;`
    );
};

module.exports.getSignedUsers = () => {
    return db.query(`SELECT * FROM sigs;`);
};

module.exports.getCity = (city) => {
    return db.query(
        `
    SELECT * FROM users
    INNER JOIN user_profiles
    ON users.id = user_profiles.user_id
    WHERE city = ($1);`,
        [city]
    );
    // add WHERE clause and pass the city
    // WHERE clause in notes
};
