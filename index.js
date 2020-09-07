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
        maxAge: 1000 * 60 * 60 * 24 * 14, // after this amount of time the cookie will expire
        // 1 sec x 60 is a minute x 60 is an hour x 24 which is day x 14 is two weeks
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
    //const password = req.body.pword;
    //console.log('req body: ', req.body);

    // console.log('req body: ', req.body);

    //const errMsg = document.getElementById('error');

    /* f (firstname === '' || lastname === '' || email === '' || pword === '') {
        res.render('registration', {
            layout: 'main',
            title: 'Please sign-up',
            error: 'Please make sure all input fields have been filled.',
            class: '"error"',
        });
    } else { */
    // we need to hash directly upon POST request
    // plain text password is never written
    const { firstname, lastname, email, password } = req.body;
    bc.hash(password)
        .then((password) => {
            const pword = password;
            console.log('req body password: ', pword);
            // return example:  $2a$10$zpPuwhpqORBO0pbDTFgxSO0hAIKDsXbn0twuDAZCmNtAEI.iLA5RS
            db.addUser(firstname, lastname, email, pword);
        })
        .then(() => {
            req.session.userCreated = true;
            console.log('user created');
            res.redirect('/petition');
        })
        .catch((err) => {
            console.log('err in hash: ', err);
        });
    //}
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
    const { firstname, lastname, email, pword } = req.body;
    //const errMsg = document.getElementById('error');

    if (firstname === '' || lastname === '' || email === '' || pword === '') {
        res.render('log-in', {
            layout: 'main',
            title: 'Please log-in',
            error: 'Please make sure all input fields have been filled.',
            class: '"error"',
        });
    } else {
        db.findUser()
            .then((idNum) => {
                console.log('idNum: ', idNum);
                req.session.userCreated = true;
                res.redirect('/thanks');
            })
            .catch((err) => {
                console.log('err in addUser: ', err);
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
    const { fname, lname, sig } = req.body;
    //const errMsg = document.getElementById('error');

    if (fname === '' || lname === '' || sig === '') {
        res.render('petition', {
            layout: 'main',
            title: 'Petition',
            error: 'Please enter your first and last name and sign your signature.',
            class: '"error"',
        });
        // I don't want to render this page again, I only want the error to appear
        //errMsg.addClass('errVisible');
    } else {
        db.addSig(fname, lname, sig)
            .then((idNo) => {
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
            db.getSigners()
                .then((result) => {
                    //console.log('getSigner working');
                    //console.log('user: ', user);
                    //console.log('result: ', result);
                    const numOfSigs = result.rows.length;
                    console.log('numOfSigs: ', numOfSigs);
                    const userSig = signee.rows[0].sig;
                    console.log('userSig: ', userSig);
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
        db.getSigners().then((data) => {
            // console.log('data: ', data);
            const numOfSigs = data.rows.length;
            const signers = data.rows;

            res.render('signers', {
                layout: 'main',
                title: 'Like-minded individuals',
                numOfSigs,
                signers,
            });
        });
    }
});

// LISTEN
app.listen(8080, () => console.log('petition server is running...'));
