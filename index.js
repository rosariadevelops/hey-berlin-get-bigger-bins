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

const requireLoggedOutUser = (req, res, next) => {
    if (!req.session.userId && req.url != '/sign-in' && req.url != '/sign-up') {
        res.redirect('/sign-up');
    } else {
        next();
    }
};

const requireLoggedInUser = (req, res, next) => {
    if (req.session.userId) {
        res.redirect('/thanks');
    } else {
        next();
    }
};

const requireHasSigned = (req, res, next) => {
    if (req.session.hasSigned) {
        res.redirect('/thanks');
    } else {
        next();
    }
};

const requireHasNotSigned = (req, res, next) => {
    if (!req.session.hasSigned) {
        res.redirect('/petition');
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
        bc.hash(password)
            .then((password) => {
                const pword = password;
                console.log('req body password: ', pword);
                db.addUser(firstname, lastname, email, pword).then((result) => {
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
app.get('/addprofile', (req, res) => {
    res.render('addprofile', {
        layout: 'main',
    });
});

// PROFILE PAGE POST REQUEST
app.post('/addprofile', (req, res) => {
    let { age, city, url, user_id } = req.body;
    user_id = req.session.userId;
    console.log('req.body: ', req.body);

    function checkURL(url) {
        if (url.startsWith('http://') || url.startsWith('https://') || url.includes(';')) {
            console.log('url input is valid: ', url);
            res.redirect('/petition');
        } else {
            console.log('url input is invalid');
            res.render('addprofile', {
                layout: 'main',
                error: 'Please make sure the URL input is a valid website.',
            });
        }
    }

    db.createProfile(age, city, url, user_id)
        .then((profile) => {
            checkURL(url);
            console.log('profile: ', profile);
            req.session.hasSigned = false;
        })
        .catch((err) => {
            console.log('err in createProfile: ', err);
        });
});

// LOGIN PAGE GET REQUEST
app.get('/sign-in', requireLoggedInUser, (req, res) => {
    res.render('login', {
        layout: 'main',
    });
});

// LOGIN PAGE POST REQUEST
app.post('/sign-in', (req, res) => {
    const { email, password } = req.body;

    if (email === '' || password === '') {
        res.render('login', {
            layout: 'main',
            emptyerror: 'Please fill all fields to proceed',
        });
    } else {
        db.checkEmail(email)
            .then((results) => {
                console.log('results: ', results.rows);
                // if results.rows.length === 0
                if (results.rows.length === 0) {
                    console.log('result does not match any existing account');
                    res.render('login', {
                        layout: 'main',
                        wrongCreds: 'The entered email or password are incorrect. Please try again',
                    });
                } else {
                    bc.compare(password, results.rows[0].pword)
                        .then((result) => {
                            if (result) {
                                console.log('result:', result);
                                console.log('user account found');
                                const userId = results.rows[0].id;
                                console.log('userId', userId);
                                req.session.userId = userId;
                                res.redirect('/thanks');
                            } else {
                                res.render('login', {
                                    layout: 'main',
                                    wrongCreds: 'The entered email or password are incorrect. Please try again',
                                });
                            }
                        })
                        .catch((err) => {
                            console.log('err in compare: ', err);
                        });
                }
            })
            .catch((err) => {
                console.log('err in checkEmail: ', err);
            });
    }
});

// PETITION PAGE GET REQUEST
app.get('/petition', requireLoggedOutUser, requireHasSigned, (req, res) => {
    res.render('petition', {
        layout: 'main',
    });
});

// PETITION POST REQUEST
app.post('/petition', (req, res) => {
    let { sig, user_id } = req.body;
    user_id = req.session.userId;

    if (sig === '') {
        res.render('petition', {
            layout: 'main',
            sigerror: 'Please sign your signature.',
        });
    } else {
        db.addSig(sig, user_id)
            .then((idNo) => {
                console.log('idNo: ', idNo);
                req.session.hasSigned = true;
                req.session.sigIdNumber = idNo.rows[0].id;
                res.redirect('/thanks');
            })
            .catch((err) => {
                console.log('err in addSig: ', err);
            });
    }
});

// THANKS GET REQUEST
app.get('/thanks', requireLoggedOutUser, requireHasNotSigned, (req, res) => {
    let userSigId = req.session.sigIdNumber;
    let userId = req.session.userId;

    db.getSignedUsers().then((rowResult) => {
        //console.log('row count: ', rowResult);
        const sigCount = rowResult.rows[0].count;
        console.log('row count: ', sigCount);
        db.getSignature(userSigId)
            .then((result) => {
                //console.log('result.rows: ', result.rows);
                const userSig = result.rows[0].sig;
                // let firstName = userFirst.charAt(0).toUpperCase() + userFirst.slice(1);
                // let lastName = userLast.charAt(0).toUpperCase() + userLast.slice(1);

                db.getUserInfo(userId).then((data) => {
                    const userDetails = data.rows[0];
                    console.log('userDetails: ', userDetails);
                    const { firstname, lastname } = userDetails;

                    res.render('thanks', {
                        layout: 'main',
                        userSig,
                        sigCount,
                        firstname,
                        lastname,
                    });
                });
            })
            .catch((err) => {
                console.log('err in getSignature: ', err);
            });
    });
});

// THANKS PAGE TO DELETE SIGNATURE POST REQUEST
app.post('/thanks', (req, res) => {
    console.log('req body: ', req.body);
    //let { sig } = req.body;
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

// SIGNERS TEMPLATE GET REQUEST
app.get('/signers', requireLoggedOutUser, requireHasNotSigned, (req, res) => {
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
                linkTocCity: true,
            });
        })
        .catch((err) => {
            console.log('err in popProfile signers template: ', err);
        });
});

// SIGNERS BY CITY TEMPLATE GET REQUEST
app.get('/signers/:city', requireLoggedOutUser, requireHasNotSigned, (req, res) => {
    let { city } = req.params;

    db.getCity(city).then((cityData) => {
        console.log('city data: ', cityData.rows);
        const numOfSigs = cityData.rows.length;
        console.log('numOfSigs: ', numOfSigs);
        console.log('city: ', city);
        const allSigners = cityData.rows;
        res.render('signers', {
            layout: 'main',
            title: 'All fellow signers from: ',
            city,
            cityPage: city,
            numOfSigs,
            allSigners,
        });
    });
});

// PROFILE PAGE GET REQUEST
app.get('/profile', requireLoggedOutUser, requireHasNotSigned, (req, res) => {
    let userId = req.session.userId;
    let userSigId = req.session.sigIdNumber;
    console.log('userId: ', req.session.userId);
    console.log('profile page');

    db.getSignedUsers().then(() => {
        db.getSignature(userSigId)
            .then((result) => {
                console.log('result.rows: ', result.rows);
                const numOfSigs = result.rows.length;
                console.log('numOfSigs: ', numOfSigs);
                const userSig = result.rows[0].sig;
                // let firstName = userFirst.charAt(0).toUpperCase() + userFirst.slice(1);
                // let lastName = userLast.charAt(0).toUpperCase() + userLast.slice(1);

                db.getUserInfo(userId).then((data) => {
                    const userDetails = data.rows[0];
                    console.log('userDetails: ', userDetails);
                    const { firstname, lastname, email, password, age, city, url } = userDetails;

                    res.render('profile', {
                        layout: 'main',
                        firstname,
                        lastname,
                        email,
                        password,
                        age,
                        city,
                        url,
                        userSig,
                    });
                });
            })
            .catch((err) => {
                console.log('err in getSignature: ', err);
            });
    });
});

// EDIT PROFILE PAGE GET REQUEST
app.get('/profile/edit', requireLoggedOutUser, (req, res) => {
    let userId = req.session.userId;
    console.log('user-id: ', userId);

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
});

// EDIT PROFILE PAGE POST REQUEST
app.post('/profile/edit', (req, res) => {
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

// CONFIRMATION PAGE TO DELETE PROFILE GET REQUEST
app.get('/profile/delete', requireLoggedOutUser, requireHasNotSigned, (req, res) => {
    res.render('deleteprofile', {
        layout: 'main',
    });
});

// CONFIRMATION PAGE TO DELETE PROFILE POST REQUEST
app.post('/profile/delete', (req, res) => {
    console.log('req body: ', req.body);
    //let { user_id } = req.body;
    let userId = req.session.userId;
    console.log('user_id value before delete: ', userId);
    //console.log('user_id: ', user_id);
    // db.getUserRow(userId)
    //     .then((result) => {
    //         console.log('result: ', result);
    db.deleteUser(userId)
        .then((data) => {
            console.log('data: ', data);
            console.log('user_id value after delete: ', userId);
            req.session.hasSigned = null;
            req.session.userId = null;
            console.log('user has been deleted');
            res.redirect('/sign-up');
            //});
        })
        .catch((err) => {
            console.log('err in deleteUser: ', err);
        });
});

// LOGOUT GET REQUEST
app.get('/signout', (req, res) => {
    req.session.userId = null;
    req.session.hasLoggedIn = null;
    console.log('req.session.userId: ', req.session.userId);
    console.log('req.session.hasLoggedIn: ', req.session.hasLoggedIn);
    res.redirect('/sign-in');
});

// LISTEN
//app.listen(8080, () => console.log('petition server is running...'));
app.listen(process.env.PORT || 8080, () => console.log('Server Listening'));
