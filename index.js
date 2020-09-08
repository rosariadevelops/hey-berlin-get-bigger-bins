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
        //keys: '',
        maxAge: 1000 * 60 * 60 * 24, // after this amount of time the cookie will expire
        // 1 sec x 60 is a minute x 60 is an hour x 24 which is day
    })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(csurf()); // the placement of this matters. Must come after express encoded and after cookie expression
app.use(function (req, res, next) {
    // gives my templates the csrfToken
    res.locals.csrfToken = req.csrfToken();
    // prevents clickjacking
    res.setHeader('x-frame-options', 'deny');
    next();
});

// ROOT GET REQUEST
app.get('/', (req, res) => {
    res.redirect('/sign-up');
});

// SIGN-UP PAGE GET REQUEST
app.get('/sign-up', (req, res) => {
    res.render('registration', {
        layout: 'main',
        title: 'Please sign-up',
    });
});

// SIGN-UP PAGE POST REQUEST
app.post('/sign-up', (req, res) => {
    //const errMsg = document.getElementById('error');
    console.log('req body: ', req.body);
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
                    //console.log('result: ', result);
                    req.session.userCreated = true;
                    req.session.userId = result.rows[0].id;
                    console.log('user created');
                    res.redirect('/profile');
                });
            })
            .catch((err) => {
                console.log('err in hash: ', err);
            });
    }
});

// PROFILE PAGE GET REQUEST
app.get('/profile', (req, res) => {
    if (!req.session.userCreated) {
        res.redirect('/sign-up');
    } else {
        res.render('profile', {
            layout: 'main',
            title: 'Add more information',
        });
    }
});

// PROFILE PAGE POST REQUEST
app.post('/profile', (req, res) => {
    //const errMsg = document.getElementById('error');
    console.log('req body: ', req.body);
    let { age, city, url, user_id } = req.body;
    user_id = req.session.userId;
    console.log('user_id: ', user_id);

    db.createProfile(age, city, url, user_id)
        .then((profile) => {
            console.log('profile: ', profile);
            // the user_id is the id from the sign-up?
            const profId = profile.rows[0].user_id;
            req.session.profId = profId;
            res.redirect('/petition');
        })
        .catch((err) => {
            console.log('err in updateProfile: ', err);
        });
});

// LOGIN PAGE GET REQUEST
app.get('/log-in', (req, res) => {
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
    console.log('req body: ', req.body);
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
        db.checkEmail(email) // pass the email to the function where we select all from column email
            .then((results) => {
                console.log('results: ', results); // returns an object with the users details
                console.log('req email: ', email); // is what the user entered
                console.log('results.rows.email: ', results.rows[0].email); // is the email that is stored
                bc.compare(password, results.rows[0].pword)
                    .then((exists) => {
                        // compares the two, then passes a boolean result. If true then user exists
                        console.log('what is the result of the compare?');
                        if (exists) {
                            // if true then set cookie and redirect to thanks
                            console.log('result is: ', exists);
                            const userId = results.rows[0].id;
                            console.log('userId', userId);
                            req.session.userExists = true;
                            req.session.userId = userId;
                            res.redirect('/thanks');
                        } else {
                            // if false then render page with error
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
app.get('/petition', (req, res) => {
    if (req.session.hasSigned) {
        res.redirect('/thanks');
    } else {
        res.render('petition', {
            layout: 'main',
            title: 'Petition',
            error: 'Please enter your first and last name and sign your signature.',
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
                // console.log('idNo: ', idNo);
                req.session.hasSigned = true;
                req.session.sigIdNumber = idNo.rows[0].id;
                req.session.sigPic = idNo.rows[0].signature;

                //console.log('req.session.sigIdNumber: ', req.session.sigIdNumber);
                //console.log('req.session.sigPic: ', req.session.sigPic);
                res.redirect('/thanks');
            })
            .catch((err) => {
                console.log('err in addSig: ', err);
            });
    }
});

// THANKS GET REQUEST
app.get('/thanks', (req, res) => {
    //console.log('get request to /thanks has happened');
    if (!req.session.hasSigned) {
        res.redirect('/petition');
    } else {
        db.getSignature(req.session.sigIdNumber).then((signee) => {
            db.getSignedUsers()
                .then((result) => {
                    //console.log('getSigner working');
                    //console.log('user: ', user);
                    //console.log('result: ', result);
                    const numOfSigs = result.rows.length;
                    console.log('numOfSigs: ', numOfSigs);
                    const userSig = signee.rows[0].sig;
                    //console.log('userSig: ', userSig);
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

// SIGNERS TEMPLATE GET REQUEST
// retrieves list of signers from database and passes them to signers template
app.get('/signers', (req, res) => {
    if (!req.session.hasSigned) {
        res.redirect('/petition');
    } else {
        db.updateProfile().then((data) => {
            const allSigners = data.rows;
            const numOfSigs = allSigners.length;
            console.log('allSigners: ', allSigners);
            res.render('signers', {
                layout: 'main',
                title: 'Like-minded individuals',
                numOfSigs,
                allSigners,
            });
        });
    }
});

// SIGNERS BY CITY TEMPLATE GET REQUEST
app.get('/signers/:city', (req, res) => {
    let { city } = req.params;
    console.log('city: ', city);
    // const activeCity = cities.find((item) => item.directory === city); Pulled from portfolio, not sure if need
    if (!req.session.hasSigned) {
        res.redirect('/petition');
    } else {
        db.getCity(city).then((cityData) => {
            console.log('city data: ', cityData.rows);
            const numOfSigs = cityData.rows.length;
            console.log('numOfSigs: ', numOfSigs);
            res.render('signers', {
                layout: 'main',
                title: 'All fellow signers from: ',
                city,
                numOfSigs,
            });
        });
    }
});

// LISTEN
app.listen(8080, () => console.log('petition server is running...'));
