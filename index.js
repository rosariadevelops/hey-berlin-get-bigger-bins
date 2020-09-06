// SERVER

const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
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
    res.redirect('/petition');
});

// PETITION PAGE GET REQUEST
app.get('/petition', (req, res) => {
    if (req.session.hasSigned) {
        res.redirect('/thanks');
    } else {
        res.render('petition', {
            layout: 'main',
            title: 'Petition',
        });
    }
    //console.log('req.session after: ', req.session);
});

// PETITION POST REQUEST
app.post('/petition', (req, res) => {
    const { fname, lname, sig } = req.body;

    if (fname === '' || lname === '' || sig === '') {
        res.render('petition', {
            layout: 'main',
            title: 'Petition',
            error: 'something went wrong',
            color: 'red',
        });
    } else {
        db.addSig(fname, lname, sig)
            .then((idNo) => {
                req.session.hasSigned = true;
                req.session.sigIdNumber = idNo.rows[0].id;
                console.log('req.session.sigIdNumber: ', req.session.sigIdNumber);
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
        db.getSignature(req.session.sigIdNumber).then((user) => {
            db.getSigners()
                .then((result) => {
                    console.log('getSigner working');
                    //console.log('user: ', user);
                    //console.log('result: ', result);
                    const numOfSigs = result.rows.length;
                    console.log('numOfSigs: ', numOfSigs);
                    const userSig = user.rows[0].sig;
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

app.get('/signers', (req, res) => {
    if (!req.session.hasSigned) {
        res.redirect('/petition');
    } else {
        db.getSigners().then((data) => {
            //console.log('data: ', data);
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
    // retrieves list of signers from database and passes them to signers template
});

app.listen(8080, () => console.log('petition server is running...'));
