// SERVER
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const bc = require('./bc');
const handlebars = require('express-handlebars');
const cookieSession = require('cookie-session');
const app = express();
const csurf = require('csurf');

// MIDDLEWARE
app.engine('handlebars', handlebars());
app.set('view engine', 'handlebars');
app.use(express.static('./public'));

app.use(
    cookieSession({
        secret: `something secret`,
        maxAge: 1000 * 60 * 60 * 24, // after this amount of time the cookie will expire
    })
);

app.use(bodyParser.urlencoded({ extended: false }));

app.use(csurf()); // the placement of this matters. Must come after express encoded and after cookie expression

app.use(function (req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    res.setHeader('x-frame-options', 'deny');
    next();
});

const requireUnsignedUser = (req, res, next) => {
    if (!req.session.userId && req.url != '/login' && req.url != '/sign-up') {
        res.redirect('/sign-up');
    } else {
        next();
    }
};

const requireLoggedInUser = (req, res, next) => {
    if (req.session.hasLoggedIn) {
        res.redirect('/thanks');
    } else {
        next();
    }
};

const requireLoggedOutUser = (req, res, next) => {
    if (!req.session.hasLoggedIn) {
        res.redirect('/log-in');
    } else {
        next();
    }
};

// ROOT GET REQUEST
app.get('/', requireLoggedInUser, (req, res) => {
    res.redirect('/welcome');
});

// WELCOME PAGE GET REQUEST
app.get('/welcome', requireLoggedInUser, (req, res) => {
    res.render('welcome', {
        layout: 'main',
    });
});

// SIGN-UP PAGE GET REQUEST
app.get('/sign-up', requireLoggedInUser, (req, res) => {
    res.render('registration', {
        layout: 'main',
    });
});

// SIGN-UP PAGE POST REQUEST
app.post('/sign-up', (req, res) => {
    //const errMsg = document.getElementById('error');
    const { firstname, lastname, email, password } = req.body;

    if (firstname === '' || lastname === '' || email === '' || password === '') {
        res.render('registration', {
            layout: 'main',
            title: 'Please sign-up',
            error: 'Please make sure all input fields have been filled.',
            class: '"error"',
        });
    } else {
        // we need to hash directly upon POST request
        // plain text password is never written
        // I currently have a glaring issue in that the text password is stored in the header
        bc.hash(password)
            .then((password) => {
                const pword = password;
                console.log('req body password: ', pword);
                // return example:  $2a$10$zpPuwhpqORBO0pbDTFgxSO0hAIKDsXbn0twuDAZCmNtAEI.iLA5RS
                db.addUser(firstname, lastname, email, pword).then((result) => {
                    req.session.userCreated = true;
                    req.session.hasLoggedIn = true;
                    req.session.userId = result.rows[0].id;
                    console.log('user created');
                    res.redirect('/addprofile');
                });
            })
            .catch((err) => {
                console.log('err in hash: ', err);
            });
    }
});

// PROFILE PAGE GET REQUEST
app.get('/addprofile', requireUnsignedUser, requireLoggedInUser, (req, res) => {
    if (!req.session.userCreated) {
        res.redirect('/sign-up');
    } else {
        res.render('addprofile', {
            layout: 'main',
        });
    }
});

// PROFILE PAGE POST REQUEST
app.post('/addprofile', (req, res) => {
    //const errMsg = document.getElementById('error');
    let { age, city, url, user_id } = req.body;
    user_id = req.session.userId;
    console.log('req.body: ', req.body);

    db.createProfile(age, city, url, user_id)
        .then((profile) => {
            const profId = profile.rows[0].user_id;
            req.session.profId = profId;
            res.redirect('/petition');
        })
        .catch((err) => {
            console.log('err in createProfile: ', err);
        });
});

// LOGIN PAGE GET REQUEST
app.get('/log-in', requireUnsignedUser, requireLoggedInUser, (req, res) => {
    if (!req.session.userCreated) {
        res.redirect('/sign-up');
    } else {
        res.render('login', {
            layout: 'main',
            title: 'Please log-in',
        });
    }
});

// LOGIN PAGE POST REQUEST
app.post('/log-in', (req, res) => {
    const { firstname, lastname, email, password } = req.body;
    //const errMsg = document.getElementById('error');

    if (firstname === '' || lastname === '' || email === '' || password === '') {
        res.render('log-in', {
            layout: 'main',
            title: 'Please log-in',
            error: 'Please make sure all input fields have been filled.',
            class: '"error"',
        });
    } else {
        db.checkEmail(email)
            .then((results) => {
                bc.compare(password, results.rows[0].pword)
                    .then((exists) => {
                        if (exists) {
                            console.log('result is: ', exists);
                            const userId = results.rows[0].id;
                            console.log('userId', userId);
                            //req.session.userExists = true;
                            req.session.hasLoggedIn = true;
                            req.session.userId = userId;
                            res.redirect('/thanks');
                        } else {
                            console.log('result is: ', exists);
                            res.render('log-in', {
                                layout: 'main',
                                title: 'Please log-in',
                                wrongEmail: 'Your email or password are incorrect.',
                                class: '"error"',
                            });
                        }
                    })
                    .catch((err) => {
                        console.log('err in compare: ', err);
                    });
            })
            .catch((err) => {
                console.log('err in checkEmail: ', err);
            });
    }
});

// PETITION PAGE GET REQUEST
app.get('/petition', requireUnsignedUser, requireLoggedOutUser, (req, res) => {
    if (req.session.hasSigned) {
        res.redirect('/thanks');
    } else {
        res.render('petition', {
            layout: 'main',
            title: 'Petition',
            error: 'Please sign your signature.',
        });
    }
});

// PETITION POST REQUEST
app.post('/petition', (req, res) => {
    let { sig, user_id } = req.body;
    user_id = req.session.userId;
    //const errMsg = document.getElementById('error');

    if (sig === '') {
        res.render('petition', {
            layout: 'main',
            title: 'Petition',
            error: 'Please sign your signature.',
            class: '"error"',
        });
        // I don't want to render this page again, I only want the error to appear
        //errMsg.addClass('errVisible');
    } else {
        db.addSig(sig, user_id)
            .then((idNo) => {
                req.session.hasSigned = true;
                req.session.sigIdNumber = idNo.rows[0].id;
                req.session.sigPic = idNo.rows[0].signature;
                res.redirect('/thanks');
            })
            .catch((err) => {
                console.log('err in addSig: ', err);
            });
    }
});

// THANKS GET REQUEST
app.get('/thanks', requireUnsignedUser, requireLoggedOutUser, (req, res) => {
    console.log('req.session.sigIdNumber: ', req.session.sigIdNumber);
    if (!req.session.hasSigned) {
        res.redirect('/petition');
    } else {
        db.getSignature(req.session.sigIdNumber).then((signee) => {
            db.getSignedUsers()
                .then((result) => {
                    const numOfSigs = result.rows.length;
                    console.log('numOfSigs: ', numOfSigs);
                    const userSig = signee.rows[0].sig;
                    // let firstName = userFirst.charAt(0).toUpperCase() + userFirst.slice(1);
                    // let lastName = userLast.charAt(0).toUpperCase() + userLast.slice(1);
                    res.render('thanks', {
                        layout: 'main',
                        title: 'Thank you!',
                        userSig,
                        numOfSigs,
                    });
                })
                .catch((err) => {
                    console.log('err in getSigner: ', err);
                });
        });
    }
});

// THANKS PAGE TO DELETE SIGNATURE POST REQUEST
app.post('/thanks', (req, res) => {
    console.log('req body: ', req.body);
    let { sig } = req.body;
    const user_id = req.session.userId;
    console.log('user_id: ', user_id);
    console.log('hasSigned before delete: ', req.session.hasSigned);

    db.deleteSig(user_id)
        .then((result) => {
            console.log('result: ', result);
            console.log('user_id value after delete: ', user_id);
            req.session.hasSigned = null;
            console.log('req.session.hasSigned after delete: ', req.session.hasSigned);
            res.redirect('/petition');
        })
        .catch((err) => {
            console.log('err in deleteSig: ', err);
        });
});

// CONFIRMATION PAGE TO DELETE PROFILE POST REQUEST
app.post('/thanks', (req, res) => {
    console.log('req body: ', req.body);
    //let { age, city, url, user_id } = req.body;
    //user_id = req.session.userId;
    //console.log('user_id: ', user_id);

    /* db.createProfile(age, city, url, user_id)
        .then((profile) => {
            console.log('profile: ', profile);
            // the user_id is the id from the sign-up?
            const profId = profile.rows[0].user_id;
            req.session.profId = profId;
            res.redirect('/petition');
        })
        .catch((err) => {
            console.log('err in updateProfile: ', err);
        }); */
});

// SIGNERS TEMPLATE GET REQUEST
app.get('/signers', requireUnsignedUser, requireLoggedOutUser, (req, res) => {
    if (!req.session.hasSigned) {
        res.redirect('/petition');
    } else {
        db.popProfile()
            .then((data) => {
                const allSigners = data.rows;
                const numOfSigs = allSigners.length;
                console.log('allSigners: ', allSigners);
                res.render('signers', {
                    layout: 'main',
                    title: 'Like-minded individuals',
                    numOfSigs,
                    allSigners,
                });
            })
            .catch((err) => {
                console.log('err in popProfile signers template: ', err);
            });
    }
});

// SIGNERS BY CITY TEMPLATE GET REQUEST
app.get('/signers/:city', requireUnsignedUser, requireLoggedOutUser, (req, res) => {
    let { city } = req.params;
    console.log('city: ', city);
    if (!req.session.hasSigned) {
        res.redirect('/petition');
    } else {
        db.getCity(city).then((cityData) => {
            console.log('city data: ', cityData.rows);
            const numOfSigs = cityData.rows.length;
            console.log('numOfSigs: ', numOfSigs);
            const allSigners = cityData.rows;
            res.render('signers', {
                layout: 'main',
                title: 'All fellow signers from: ',
                city,
                numOfSigs,
                allSigners,
            });
        });
    }
});

// EDIT PROFILE PAGE GET REQUEST
app.get('/profile/edit', requireUnsignedUser, requireLoggedOutUser, (req, res) => {
    let userId = req.session.userId;
    console.log('user-id: ', userId);

    if (!req.session.userCreated) {
        res.redirect('/sign-up');
    } else {
        db.getUserInfo(userId)
            .then((data) => {
                const userDetails = data.rows[0];
                console.log('userDetails: ', userDetails);
                const { firstname, lastname, email, password, age, city, url } = userDetails;
                res.render('edit', {
                    layout: 'main',
                    title: 'Edit your profile',
                    firstname,
                    lastname,
                    email,
                    password,
                    age,
                    city,
                    url,
                });
            })
            .catch((err) => {
                console.log('err in getUserInfo: ', err);
            });
    }
});

// EDIT PROFILE PAGE POST REQUEST
app.post('/profile/edit', (req, res) => {
    //const errMsg = document.getElementById('error');
    console.log('req body: ', req.body);
    let { firstname, lastname, email, password, age, city, url, user_id } = req.body;
    user_id = req.session.userId;
    console.log('user_id: ', user_id);
    console.log('password: ', password);

    const passwordEmpty = '';

    if (password === passwordEmpty) {
        db.updateUsersTable(user_id, firstname, lastname, email).then(() => {
            console.log('updateUsersTable function running');
            db.updateUserProfileTable(age, city, url, user_id)
                .then(() => {
                    res.render('edit', {
                        layout: 'main',
                        title: 'Edit your profile',
                        firstname,
                        lastname,
                        email,
                        //pword,
                        age,
                        city,
                        url,
                        confirm: 'Your profile has been updated.',
                    });
                })
                .catch((err) => {
                    console.log('err in updateUsersTable: ', err);
                });
        });
    } else {
        bc.hash(password).then((password) => {
            //const password = pword;
            console.log('req body password: ', password);

            db.updatePassword(user_id, firstname, lastname, email, password).then(() => {
                console.log('password update: ', password);
                db.updateUserProfileTable(age, city, url, user_id)
                    .then(() => {
                        res.render('edit', {
                            layout: 'main',
                            title: 'Edit your profile',
                            firstname,
                            lastname,
                            email,
                            //pword,
                            age,
                            city,
                            url,
                            confirm: 'Your profile has been updated.',
                        });
                    })
                    .catch((err) => {
                        console.log('err in updateUsersTable: ', err);
                    });
            });
        });
    }
});

// LOGOUT GET REQUEST
app.get('/signout', (req, res) => {
    req.session.userId = null;
    req.session.hasLoggedIn = null;
    res.redirect('/login');
});

// LISTEN
//app.listen(8080, () => console.log('petition server is running...'));
app.listen(process.env.PORT || 8080, () => console.log('Server Listening'));
