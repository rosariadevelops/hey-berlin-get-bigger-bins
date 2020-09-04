// this is our server

const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const handlebars = require('express-handlebars');
const cookieSession = require('cookie-session');
const app = express();

app.engine('handlebars', handlebars());
app.set('view engine', 'handlebars');
app.use(express.static('./public'));
app.use(bodyParser.urlencoded({ extended: false }));
// const cookieParser = require('cookie-parser');
//app.use(cp());

app.use(
    cookieSession({
        secret: `I'm always angry.`,
        maxAge: 1000 * 60 * 60 * 24 * 14, // after this amount of time the cookie will expire
        // 1 sec x 60 is a minute x 60 is an hour x 24 which is day x 14 is two weeks
    })
);

app.get('/', (req, res) => {
    // redirect to petition url
    // renders petition template
    // redirects to /thanks if user has already signed the petition
    // this is done by checking for a cookie
    console.log('//////////////////////////////////////');
    console.log('req.session: ', req.session);
    res.redirect('/petition');
    req.session.cumin = 'Hello!';
    console.log('req.session after: ', req.session);

    console.log('//////////////////////////////////////');
});

app.get('/petition', (req, res) => {
    // petition landing page
    res.render('petition', {
        layout: 'main',
        title: 'Petition',
    });
    console.log('/////////////////PETITION/////////////////////');
    console.log('req.session: ', req.session);
    req.session.cumin = 'Hello!';
    console.log('req.session after: ', req.session);
    console.log('//////////////////PETITION////////////////////');
});

app.post('/petition', (req, res) => {
    // POST REQUEST
    // runs whenever the user signs the petition and clicks submit
    // inserts all data submitted to the database
    // if there's an error, render the petition template with an err message
    // if there's no error, set a cookie and redirect user to /thanks

    ////////
    const { buttonSubmitted } = req.body;

    if (buttonSubmitted) {
        res.cookie('formSigned', true);
        res.redirect('/thanks');
    } else {
        res.send(`I think this is where the error message on form handlebars goes`);
    }
    /////////
    /* db.addSig('Berlin', 4000000, 'Germany')
        .then(() => {
            //console.log('results: ', results);
            console.log('yay that worked');
        })
        .catch((err) => {
            console.log('err in addCity: ', err);
        }); */
});

app.get('/thanks', (req, res) => {
    // thank you page
    // renders thanks template
    // checks for cookie
    // if no cookie, redirect user to /petition
    console.log('get request to /thanks has happened');
    res.render('thanks', {
        layout: 'main',
        title: 'Thank you!',
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
