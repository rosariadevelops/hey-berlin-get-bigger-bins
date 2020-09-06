// this is our server

const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
// const js = require('./public/js/script.js');
const handlebars = require('express-handlebars');
const cookieSession = require('cookie-session');
const app = express();
//const signatures = require('./signatures');
const csurf = require('csurf');

app.engine('handlebars', handlebars());
app.set('view engine', 'handlebars');
app.use(express.static('./public'));

// const cookieParser = require('cookie-parser');
//app.use(cp());

/* app.use(
    cookieSession({
        secret: req.cookies.formSigned,
        //secret: dataURL,
        maxAge: 1000 * 60 * 60 * 24 * 14, // after this amount of time the cookie will expire
        // 1 sec x 60 is a minute x 60 is an hour x 24 which is day x 14 is two weeks
    })
);
 */
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

// redirect to petition url
// renders petition template
// redirects to /thanks if user has already signed the petition
// this is done by checking for a cookie
//console.log('req.session: ', req.session);
app.get('/', (req, res) => {
    res.redirect('/petition');
    //req.session.cumin = 'Hello!';
    //console.log('req.session after: ', req.session);
});

// petition landing page
app.get('/petition', (req, res) => {
    res.render('petition', {
        layout: 'main',
        title: 'Petition',
    });
    //console.log('req.session: ', req.session);
    //req.session.cumin = 'Hello!';
    //console.log('req.session after: ', req.session);
});

// POST REQUEST
// runs whenever the user signs the petition and clicks submit
// inserts all data submitted to the database
// if there's an error, render the petition template with an err message
// if there's no error, set a cookie and redirect user to /thanks

app.post('/petition', (req, res) => {
    // need to get the input values into the req.body
    let fname = req.body.fname;
    let lname = req.body.lname;
    let sig = req.body.sig;
    //let sigId = req.body.id;
    //const { submitted } = req.body;
    //console.log('body: ', req.body);
    // && req.url !== '/favicon.ico'
    //console.log('fname: ', fname);
    //console.log('lname: ', lname);

    if (req.session.hasSigned) {
        res.redirect('/thanks');
    } else if (fname === '' || lname === '' || sig === '') {
        res.render('petition', {
            layout: 'main',
            title: 'Petition',
            error: 'something went wrong',
            color: 'red',
        });
    } else {
        db.addSig(fname, lname, sig)
            .then(() => {
                //const data = [fname, lname, sig];
                console.log('fname: ', fname);
                console.log('lname: ', lname);
                req.session.hasSigned = true;
                //req.session.sigIdNumber = sigId;
                console.log('req.session.sigIdNumber: ', req.session.sigIdNumber);
                res.redirect('/thanks');
            })
            .catch((err) => {
                console.log('err in addSig: ', err);
            });
    }
});

// thank you page
// renders thanks template
// checks for cookie
// if no cookie, redirect user to /petition
app.get('/thanks', (req, res) => {
    //console.log('get request to /thanks has happened');

    db.getSig()
        .then((result) => {
            console.log('getSig working');
            const userId = result[0].id;
            const userFirst = result[0].fname;
            const userLast = result[0].lname;
            const userSig = result[0].sig;
            const firstName = userFirst.charAt(0).toUpperCase() + userFirst.slice(1);
            const lastName = userLast.charAt(0).toUpperCase() + userLast.slice(1);
            console.log('result id: ', userId);
            console.log('result first name: ', firstName);
            console.log('result last name: ', lastName);
            console.log('result sigSrc: ', userSig);
            res.render('thanks', {
                layout: 'main',
                title: 'Thank you!',
                userId,
                firstName,
                lastName,
                userSig,
                //signatures,
            });
        })
        .catch((err) => {
            console.log('err in addCity: ', err);
        });
});

app.get('/signers', (req, res) => {
    // renders signers template
    // checks for cookie
    // if no cookie, redirect user to /petition
    // retrieves list of signers from database and passes them to signers template
    console.log('get request to /signers has happened');
    res.render('signers', {
        layout: 'main',
        title: 'Like-minded individuals',
    });
});

app.listen(8080, () => console.log('petition server is running...'));
