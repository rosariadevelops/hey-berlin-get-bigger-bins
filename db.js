const spicedPg = require('spiced-pg'); // this is our middleman
//const db = spicedPg('postgres:postgres:postgres@localhost:5432/petition'); // passing middleman some config info
const db = spicedPg(process.env.DATABASE_URL || 'postgres:postgres:postgres@localhost:5432/petition');

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

module.exports.getUserInfo = (userId) => {
    return db.query(
        `
        SELECT * FROM users
        INNER JOIN user_profiles
        ON users.id = user_profiles.user_id
        WHERE user_id = ($1);`,
        [userId]
    );
};

module.exports.checkEmail = (email) => {
    return db.query(
        `
    SELECT * FROM users 
    WHERE email = ($1);`,
        [email]
    );
};

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
        [age || null, city || null, url || null, user_id]
    );
};

module.exports.popProfile = () => {
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
    JOIN sigs
    ON users.id = sigs.user_id
    JOIN user_profiles
    ON sigs.user_id = user_profiles.user_id
    WHERE city = ($1);`,
        [city]
    );
    // add WHERE clause and pass the city
    // WHERE clause in notes
};

module.exports.updateUsersTable = (id, firstname, lastname, email) => {
    return db.query(
        `
        UPDATE users
        SET firstname = ($2), lastname = ($3), email = ($4)
        WHERE id = ($1);`,
        [id, firstname, lastname, email]
    );
};

module.exports.updateUserProfileTable = (age, city, url, user_id) => {
    return db.query(
        `
        INSERT INTO user_profiles (age, city, url, user_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id)
        DO UPDATE SET age = $1, city = $2, url = $3, user_id = $4;`,
        [age, city, url, user_id]
    );
};

module.exports.updatePassword = (id, firstname, lastname, email, pword) => {
    return db.query(
        `
        UPDATE users
        SET firstname = ($2), lastname = ($3), email = ($4), pword = ($5)
        WHERE id = ($1);`,
        [id, firstname, lastname, email, pword]
    );
};

module.exports.deleteSig = (user_id) => {
    return db.query(
        `
        DELETE FROM sigs
        WHERE user_id = ($1);`,
        [user_id]
    );
};
