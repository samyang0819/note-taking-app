const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const User = require('./models/User');
const Note = require('./models/Note');
const connectDB = require('./config/db');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } 
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({ usernameField: 'email' },
    async (email, password, done) => {
        try {
            const user = await User.findOne({ email });
            if (!user) return done(null, false, { message: 'Incorrect email' });
            const isMatch = await user.comparePassword(password);
            if (!isMatch) return done(null, false, { message: 'Incorrect password' });
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});

// Authentication middleware
function requireAuth(req, res, next) {
    if (!req.isAuthenticated()) return res.redirect('/login');
    next();
}


app.get('/signup', (req, res) => {
    res.render('signup', { username: '', email: '', error: '' });
});

app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        if (!username || !email || !password) {
            return res.render('signup', { error: 'All fields are required', username, email });
        }

        if (password.length < 8) {
            return res.render('signup', { 
                error: 'Password must be at least 8 characters long', 
                username, 
                email 
            });
        }

        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            let message = existingUser.username === username ? 'Username already taken' : 'Email already registered';
            return res.render('signup', { error: message, username, email });
        }

        const user = new User({ username, email, password });
        await user.save();
        req.login(user, (err) => {
            if (err) throw err;
            res.redirect('/notes');
        });
    } catch (err) {
        console.error(err);
        res.render('signup', { error: 'Error signing up', username, email });
    }
});

app.get('/login', (req, res) => {
    res.render('login', { email: '', error: '' });
});

app.post('/login', async (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);

        if (!user) {
            // Send error to template
            return res.render('login', {
                error: info.message || 'Invalid email or password',
                email: req.body.email
            });
        }

        req.logIn(user, (err) => {
            if (err) return next(err);
            return res.redirect('/notes');
        });
    })(req, res, next);
});


app.post('/logout', (req, res) => {
    req.logout(() => res.redirect('/login'));
});

app.get('/notes', requireAuth, async (req, res) => {
    const notes = await Note.find({ user: req.user._id });
    res.render('index', { notes });
});

app.get('/notes/new', requireAuth, (req, res) => {
    res.render('newNote');
});

app.post('/notes', requireAuth, async (req, res) => {
    const { title, content } = req.body;
    try {
        await Note.create({ title, content, user: req.user._id });
        res.redirect('/notes');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating note');
    }
});

app.get('/notes/:id', requireAuth, async (req, res) => {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).send('Note not found');
    res.render('note', { note });
});

app.get('/notes/:id/edit', requireAuth, async (req, res) => {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).send('Note not found');
    res.render('editNote', { note });
});

app.put('/notes/:id', requireAuth, async (req, res) => {
    const { title, content } = req.body;
    try {
        await Note.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { title, content });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating note' });
    }
});

app.delete('/notes/:id', requireAuth, async (req, res) => {
    try {
        await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error deleting note' });
    }
});

app.get('/', (req, res) => res.redirect('/notes'));

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
