-- using database called petition
-- uses a table called signatures
-- timestamp could be helpful

DROP TABLE IF EXISTS sigs;

CREATE TABLE sigs (
    id SERIAL PRIMARY KEY,
    fname VARCHAR NOT NULL CHECK (fname != ''),
    lname VARCHAR NOT NULL CHECK (lname != ''),
    sig VARCHAR NOT NULL CHECK (sig != '')
);