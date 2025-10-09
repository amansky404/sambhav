const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// ===============================
// DATABASE CONFIGURATION (SQLite)
// ===============================
const databasePath = path.join(__dirname, 'vulnerable_ctf.db');
const db = new sqlite3.Database(databasePath, (err) => {
    if (err) {
        console.error('❌ Database initialization failed:', err.message);
        process.exit(1);
    }
});

const connection = {
    query(sql, callback) {
        const trimmed = sql.trim().toLowerCase();

        if (trimmed.startsWith('select')) {
            db.all(sql, (err, rows) => {
                callback(err, rows || []);
            });
            return;
        }

        db.run(sql, function (err) {
            const result = {
                insertId: this && typeof this.lastID !== 'undefined' ? this.lastID : null,
                affectedRows: this && typeof this.changes !== 'undefined' ? this.changes : 0
            };
            callback(err, result);
        });
    },
    close() {
        db.close();
    }
};

// Initialize database schema and seed data
const initDB = (callback) => {
    const schema = `
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT,
            user_id INTEGER,
            post_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (post_id) REFERENCES posts(id)
        );

        INSERT OR IGNORE INTO users (id, username, password, email, role) VALUES
            (1, 'admin', 'admin123', 'admin@vulnerable-app.com', 'admin'),
            (2, 'alice', 'password123', 'alice@example.com', 'user'),
            (3, 'bob', 'password456', 'bob@example.com', 'user');

        INSERT OR IGNORE INTO posts (id, title, content, user_id) VALUES
            (1, 'Welcome to Vulnerable App', 'This is a test post with <script>alert("XSS")</script>', 1),
            (2, 'Security Training', 'Learn about OWASP Top 10 vulnerabilities', 1);
    `;

    db.exec(schema, (err) => {
        if (err) {
            console.error('❌ Failed to initialize database schema:', err.message);
        } else {
            console.log('✅ Database initialized successfully');
        }
        callback(err);
    });
};

// ===============================
// VULNERABLE CONFIGURATION
// ===============================
app.disable('x-powered-by');
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cookieParser());

app.use(session({
    secret: 'weak_secret_key_123',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: false,
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage
const fileUploads = [];
const userSessions = {};

// ===============================
// MIDDLEWARE
// ===============================
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
};

// ===============================
// ROUTES
// ===============================

app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('login', {
        error: req.query.error,
        message: req.query.message
    });
});

app.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('register', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('login', { error: 'Username and password required' });
    }

    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

    console.log(`[VULNERABLE] Executing: ${query}`);

    connection.query(query, (error, results) => {
        if (error) {
            console.error('SQL Error:', error);
            return res.render('login', { error: 'Database error occurred' });
        }

        if (results.length > 0) {
            req.session.user = results[0];
            userSessions[req.sessionID] = results[0];

            console.log(`[LOGIN SUCCESS] User: ${username}`);
            res.redirect('/dashboard');
        } else {
            res.render('login', { error: 'Invalid credentials' });
        }
    });
});

app.post('/register', (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.render('register', { error: 'All fields are required' });
    }

    const checkQuery = `SELECT * FROM users WHERE username = '${username}' OR email = '${email}'`;

    connection.query(checkQuery, (error, results) => {
        if (error) {
            return res.render('register', { error: 'Database error' });
        }

        if (results.length > 0) {
            return res.render('register', { error: 'Username or email already exists' });
        }

        const insertQuery = `INSERT INTO users (username, password, email, role) VALUES ('${username}', '${password}', '${email}', 'user')`;

        connection.query(insertQuery, (insertError) => {
            if (insertError) {
                console.error('Registration error:', insertError);
                return res.render('register', { error: 'Registration failed' });
            }

            console.log(`[REGISTER] New user: ${username}`);
            res.redirect('/login?message=Registration successful. Please login.');
        });
    });
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    const usersQuery = 'SELECT id, username, email, role FROM users';
    const postsQuery = 'SELECT p.*, u.username as author FROM posts p LEFT JOIN users u ON p.user_id = u.id';
    const commentsQuery = 'SELECT c.*, u.username as author FROM comments c LEFT JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC';

    connection.query(usersQuery, (userError, users = []) => {
        connection.query(postsQuery, (postError, posts = []) => {
            connection.query(commentsQuery, (commentError, comments = []) => {
                res.render('dashboard', {
                    user: req.session.user,
                    allUsers: Array.isArray(users) ? users : [],
                    posts: Array.isArray(posts) ? posts : [],
                    comments: Array.isArray(comments) ? comments : [],
                    flag: req.session.user.role === 'admin' ? null : 'CTF{D4shb04rd_Acc3ss}'
                });
            });
        });
    });
});

app.get('/admin', isAuthenticated, (req, res) => {
    const usersQuery = 'SELECT * FROM users';

    connection.query(usersQuery, (error, users = []) => {
        res.render('admin', {
            user: req.session.user,
            allUsers: Array.isArray(users) ? users : [],
            flag: req.session.user.role === 'admin' ? 'CTF{4dm1n_P4n3l_4cc3ss}' : 'CTF{Br0k3n_Acc3ss_C0ntr0l}'
        });
    });
});

app.get('/logout', (req, res) => {
    delete userSessions[req.sessionID];
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.get('/profile/:userId', (req, res) => {
    const userId = req.params.userId;

    if (!userId || isNaN(userId)) {
        return res.status(400).render('error', { message: 'Invalid user ID' });
    }

    const query = `SELECT id, username, email, role, created_at FROM users WHERE id = ${userId}`;

    connection.query(query, (error, results = []) => {
        if (error || results.length === 0) {
            return res.status(404).render('error', { message: 'User not found' });
        }

        res.render('profile', {
            profileUser: results[0],
            currentUser: req.session.user,
            flag: userId !== String(req.session.user?.id || '') ? 'CTF{1D0R_Pr0bl3m}' : null
        });
    });
});

app.get('/search', (req, res) => {
    const searchTerm = req.query.q;

    if (!searchTerm) {
        return res.json([]);
    }

    const query = `SELECT p.*, u.username as author FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE p.title LIKE '%${searchTerm}%' OR p.content LIKE '%${searchTerm}%'`;

    connection.query(query, (error, results = []) => {
        if (error) {
            return res.status(500).json({ error: 'Search failed' });
        }
        res.json(results);
    });
});

app.post('/comment', isAuthenticated, (req, res) => {
    const { comment, postId = 1 } = req.body;

    if (!comment || comment.trim() === '') {
        return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    const query = `INSERT INTO comments (content, user_id, post_id) VALUES ('${comment}', ${req.session.user.id}, ${postId})`;

    connection.query(query, (error, results = {}) => {
        if (error) {
            console.error('Comment error:', error);
            return res.status(500).json({ error: 'Failed to post comment' });
        }

        res.json({
            success: true,
            comment: comment,
            id: results.insertId,
            username: req.session.user.username
        });
    });
});

app.post('/upload', isAuthenticated, (req, res) => {
    const { filename, content } = req.body;

    if (!filename || !content) {
        return res.status(400).json({ error: 'Filename and content required' });
    }

    try {
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }

        const filePath = path.join(__dirname, 'uploads', filename);
        fs.writeFileSync(filePath, content);

        fileUploads.push({
            filename,
            path: filePath,
            user: req.session.user.username,
            uploadedAt: new Date()
        });

        res.json({
            success: true,
            message: 'File uploaded successfully',
            flag: filename.includes('../') ? 'CTF{P4th_Tr4v3rs4l_F0und}' : null
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'File upload failed' });
    }
});

app.post('/reset-password', (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).send('Email and new password required');
    }

    const query = `UPDATE users SET password = '${newPassword}' WHERE email = '${email}'`;

    connection.query(query, (error, results = {}) => {
        if (error) {
            console.error('Password reset error:', error);
            return res.status(500).send('Password reset failed');
        }

        if (results.affectedRows > 0) {
            console.log(`[PASSWORD_RESET] Password changed for ${email}`);
            res.send('Password reset successfully');
        } else {
            res.status(400).send('User not found');
        }
    });
});

app.get('/debug', (req, res) => {
    res.json({
        sessions: userSessions,
        fileUploads: fileUploads,
        totalUsers: Object.keys(userSessions).length,
        serverTime: new Date(),
        flag: 'CTF{D3bug_3ndp01nt_3xp0s3d}'
    });
});

app.get('/', (req, res) => {
    res.render('index', {
        user: req.session.user,
        challenges: getCTFChallenges()
    });
});

// ===============================
// UTILITY FUNCTIONS
// ===============================
function getCTFChallenges() {
    return [
        {
            id: 1,
            name: 'SQL Injection',
            vulnerability: 'A03: Injection',
            difficulty: 'Easy',
            description: 'Bypass login authentication using SQL Injection',
            endpoint: '/login',
            flag: 'CTF{SQL1_1nj3ct10n_MAST3R}',
            solved: false
        },
        {
            id: 2,
            name: 'Cross-Site Scripting (XSS)',
            vulnerability: 'A03: Injection',
            difficulty: 'Medium',
            description: 'Steal session cookies via comment section',
            endpoint: '/dashboard',
            flag: 'CTF{XSS_C00k13_Th13f}',
            solved: false
        },
        {
            id: 3,
            name: 'Broken Access Control',
            vulnerability: 'A01: Broken Access Control',
            difficulty: 'Easy',
            description: 'Access admin panel as regular user',
            endpoint: '/admin',
            flag: 'CTF{Br0k3n_Acc3ss_C0ntr0l}',
            solved: false
        },
        {
            id: 4,
            name: 'Insecure Direct Object Reference',
            vulnerability: 'A01: Broken Access Control',
            difficulty: 'Medium',
            description: 'Access other users private profiles',
            endpoint: '/profile/',
            flag: 'CTF{1D0R_Pr0bl3m}',
            solved: false
        },
        {
            id: 5,
            name: 'Security Misconfiguration',
            vulnerability: 'A05: Security Misconfiguration',
            difficulty: 'Easy',
            description: 'Find exposed debug information',
            endpoint: '/debug',
            flag: 'CTF{D3bug_3ndp01nt_3xp0s3d}',
            solved: false
        }
    ];
}

// ===============================
// SERVER INITIALIZATION
// ===============================
const startServer = () => {
    if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads');
    }

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(`
🎯 Vulnerable CTF Application - FULLY FUNCTIONAL
📍 Server running on: http://localhost:${PORT}

📋 Available Routes:
   ✅ GET  /                 - Home page with CTF challenges
   ✅ GET  /login            - Login form
   ✅ POST /login            - Login (SQL Injection vulnerable)
   ✅ GET  /register         - Registration form
   ✅ POST /register         - Register user
   ✅ GET  /dashboard        - User dashboard (XSS vulnerable)
   ✅ GET  /admin            - Admin panel (Broken Access Control)
   ✅ GET  /profile/:id      - User profiles (IDOR vulnerable)
   ✅ POST /comment          - Add comments (XSS vulnerable)
   ✅ GET  /search?q=        - Search (SQL Injection vulnerable)
   ✅ POST /upload           - File upload (Path Traversal)
   ✅ POST /reset-password   - Password reset (Weak authentication)
   ✅ GET  /debug            - Debug info (Information Exposure)
   ✅ GET  /logout           - Logout

🔐 Default Credentials:
   👑 Admin: admin / admin123
   👤 User:  alice / password123

⚠️  SECURITY WARNING: This app contains INTENTIONAL vulnerabilities
    For educational use only in isolated environments!
        `);
    });
};

initDB(() => {
    startServer();
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    connection.close();
    process.exit(0);
});

module.exports = app;
