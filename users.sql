-- using database called petition
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firstname VARCHAR NOT NULL,
    lastname VARCHAR NOT NULL,
    email VARCHAR NOT NULL UNIQUE,
    pword VARCHAR NOT NULL
);


DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    age INT,
    city VARCHAR(255),
    url VARCHAR(255),
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
);


DROP TABLE IF EXISTS sigs;

CREATE TABLE sigs (
    id SERIAL PRIMARY KEY,
    sig VARCHAR NOT NULL CHECK (sig != ''),
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);