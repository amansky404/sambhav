const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const fs = require('fs');
const http = require('http');
const https = require('https');
const _ = require('lodash');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');

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

let isDbClosed = false;

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
    close(callback) {
        if (isDbClosed) {
            if (typeof callback === 'function') {
                callback();
            }
            return;
        }

        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database connection:', err.message);
            } else {
                isDbClosed = true;
            }

            if (typeof callback === 'function') {
                callback(err);
            }
        });
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

        CREATE TABLE IF NOT EXISTS mystery_products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            price REAL,
            inventory_note TEXT
        );

        CREATE TABLE IF NOT EXISTS mystery_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS mystery_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            body TEXT,
            classification TEXT,
            owner TEXT
        );

        INSERT OR IGNORE INTO mystery_products (id, name, description, category, price, inventory_note) VALUES
            (1, 'Spiced Chai Mix', 'Masala blend loved by admins and testers alike.', 'Beverages', 5.00, 'Admin-only reorder code: ADMIN-8843'),
            (2, 'Security Ladoo', 'Sweet treats served after red-team wins.', 'Snacks', 12.00, 'Stored in vault shelf G-17, key under keyboard.'),
            (3, 'Juice Proxy', 'Experimental API juice box with hidden parameters.', 'Beverages', 3.50, 'Legacy token=flagship-551 stored in query string.'),
            (4, 'Patchwork Kulfi', 'Frozen dessert that melts into mitigation tips.', 'Desserts', 6.25, 'QA override password: kulfi-admin'),
            (5, 'Recon Samosa', 'Stuffed with reconnaissance data for bug hunters.', 'Snacks', 4.00, 'Supplier portal: https://intranet.local/samosa'),
            (6, 'Mystery Chutney', 'Changes flavour based on HTTP headers.', 'Condiments', 2.75, 'Do not expose /blackbox/api/export?table=secrets');

        INSERT OR IGNORE INTO mystery_notes (id, title, body, classification, owner) VALUES
            (1, 'Forgotten Token', 'Deploy token lives at /etc/juicy/token.txt', 'Confidential', 'founder'),
            (2, 'UX Backlog', 'Theme feedback: add more saffron gradients.', 'Internal', 'design'),
            (3, 'Incident Review', 'API leaked inventory_note field via SQLi.', 'Sensitive', 'security'),
            (4, 'Red Team TODO', 'Probe /blackbox/api/diagnostics?target=file:///etc/passwd', 'Top Secret', 'redteam'),
            (5, 'Beta Credentials', 'beta-user / tasteTheJuice!', 'Confidential', 'qa');
    `;

    return new Promise((resolve, reject) => {
        db.exec(schema, (err) => {
            if (err) {
                console.error('❌ Failed to initialize database schema:', err.message);
                if (typeof callback === 'function') {
                    callback(err);
                }
                reject(err);
                return;
            }

            console.log('✅ Database initialized successfully');
            if (typeof callback === 'function') {
                callback(null);
            }
            resolve();
        });
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
const accounts = {
    admin: 50000,
    alice: 5000,
    bob: 2500,
    guest: 1000
};
const pending2FA = {
    admin: { code: '654321', requestedAt: new Date() }
};
const auditTrail = [];
const importedConfigs = [];
const sensitiveBackup = Buffer.from(JSON.stringify([
    {
        username: 'admin',
        password: 'admin123',
        creditCard: '4111111111111111',
        cvv: '123',
        expires: '12/29'
    },
    {
        username: 'alice',
        password: 'password123',
        creditCard: '5555555555554444',
        cvv: '901',
        expires: '11/28'
    }
]), 'utf-8').toString('base64');

const learningModules = [
    {
        id: 'sqli-login',
        title: 'SQL Injection: Login Bypass',
        vulnerableSnippet: `app.post('/login', (req, res) => {\n    const query = "SELECT * FROM users WHERE username = '" + req.body.username + "' AND password = '" + req.body.password + "'";\n    connection.query(query, (err, results) => {\n        /* ... */\n    });\n});`,
        explanation: 'Raw string concatenation lets attackers inject payloads into the authentication query.',
        mitigation: 'Switch to parameterised queries or prepared statements so the database parses SQL separately from attacker input.',
        patchTemplate: `// Rewrite the query to use placeholders and bound parameters\n// const query = 'SELECT * FROM users WHERE username = ? AND password = ?';\n// connection.query({ sql: query, values: [req.body.username, req.body.password] }, handler);`,
        referencePatch: `app.post('/login', (req, res) => {\n    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';\n    connection.query({ sql: query, values: [req.body.username, req.body.password] }, (err, results = []) => {\n        if (err) {\n            return res.status(500).send('Login failed');\n        }\n        /* ... */\n    });\n});`,
        keywords: ['username = ?', 'password = ?', 'values'],
        successMessage: 'Nice! Binding the values closes out the injection window.',
        retryMessage: 'Keep going—look for placeholder tokens and a values array to finish the hardening.'
    },
    {
        id: 'xss-comments',
        title: 'Cross-Site Scripting: Comment Wall',
        vulnerableSnippet: `app.post('/comment', (req, res) => {\n    const comment = req.body.comment;\n    comments.push({ content: comment });\n    res.redirect('/dashboard');\n});`,
        explanation: 'Rendering user-supplied HTML directly into the DOM allows stored XSS payloads to execute for every visitor.',
        mitigation: 'Escape angle brackets before persisting or rendering so browsers treat payloads as plain text.',
        patchTemplate: `// Ensure the comment is safely encoded before storing\n// const safeComment = comment.replace(/</g, '&lt;').replace(/>/g, '&gt;');`,
        referencePatch: `app.post('/comment', (req, res) => {\n    const comment = req.body.comment || '';\n    const safeComment = comment\n        .replace(/</g, '&lt;')\n        .replace(/>/g, '&gt;');\n\n    comments.push({ content: safeComment });\n    res.redirect('/dashboard');\n});`,
        keywords: ['replace(/</g', '&lt;', '&gt;'],
        successMessage: 'Victory! Escaping angle brackets neutralises classic script payloads.',
        retryMessage: 'Hint: encode both < and > so the browser refuses to execute injected markup.'
    },
    {
        id: 'idor-profile',
        title: 'Broken Access Control: Profile Snooping',
        vulnerableSnippet: `app.get('/profile/:userId', (req, res) => {\n    const userId = req.params.userId;\n    const query = \`SELECT * FROM users WHERE id = \${userId}\`;\n    connection.query(query, (err, results = []) => {\n        res.render('profile', { profileUser: results[0] });\n    });\n});`,
        explanation: 'Direct object references trust any identifier and expose other users\' data.',
        mitigation: 'Lock profile lookups to the logged-in identity or enforce role checks before serving the record.',
        patchTemplate: `// Guard the route so users only pull their own record\n// Compare req.session.user.id with req.params.userId or require admin role.`,
        referencePatch: `app.get('/profile/:userId', (req, res) => {\n    if (!req.session.user) {\n        return res.status(401).render('error', { message: 'Login required' });\n    }\n\n    if (String(req.session.user.id) !== String(req.params.userId) && req.session.user.role !== 'admin') {\n        return res.status(403).render('error', { message: 'This profile is off-limits' });\n    }\n\n    const query = \`SELECT id, username, email, role, created_at FROM users WHERE id = \${req.params.userId}\`;\n    connection.query(query, (error, results = []) => {\n        if (error || results.length === 0) {\n            return res.status(404).render('error', { message: 'User not found' });\n        }\n\n        res.render('profile', {\n            profileUser: results[0],\n            currentUser: req.session.user,\n            flag: null\n        });\n    });\n});`,
        keywords: ['req.session.user', '403', 'admin'],
        successMessage: 'Great! Verifying the caller before revealing the profile shuts down the IDOR.',
        retryMessage: 'Compare the requested userId against the active session (or require admin) to finish the fix.'
    }
];

const blackboxChallenges = [
    {
        id: 'inventory-sqli',
        title: 'Inventory Search Tampering',
        description: 'Discover how the product search concatenates your input into SQL and leaks hidden inventory notes.',
        endpoint: '/blackbox/api/products?search=',
        clue: 'Union queries and stacked statements slip through unchecked operators.'
    },
    {
        id: 'note-vault',
        title: 'Note Vault Snooping',
        description: 'Profile notes expose confidential content whenever you enumerate IDs directly.',
        endpoint: '/blackbox/api/notes/1',
        clue: 'Direct object references skip ownership validation entirely.'
    },
    {
        id: 'feedback-loop',
        title: 'Feedback Echo Chamber',
        description: 'Submit HTML-laced bug reports and watch them render without sanitisation.',
        endpoint: '/blackbox/api/feedback',
        clue: 'Stored payloads come back in subsequent dashboard renders.'
    },
    {
        id: 'proxy-hop',
        title: 'Diagnostics Proxy Hop',
        description: 'Leverage the diagnostics fetcher to pivot into internal file:// and http:// resources.',
        endpoint: '/blackbox/api/diagnostics?target=',
        clue: 'Input is piped into http/https/file requests with no allowlist.'
    }
];

const blackboxPrompts = [
    {
        label: 'Recon',
        detail: 'Inspect network calls from the Black Box UI — the fetch helpers point at undocumented routes.'
    },
    {
        label: 'Fuzzing',
        detail: 'Try punctuation like %27, ;--, and sleep() in the search box to feel the SQL engine react.'
    },
    {
        label: 'Privilege',
        detail: 'Note IDs auto-increment. Jump past the previews to access red-team only briefs.'
    },
    {
        label: 'Payloads',
        detail: 'Feedback responses echo raw HTML and store it server-side for other hunters to trigger.'
    }
];

const evaluatePatchSubmission = (scenarioId, patchText = '') => {
    const module = learningModules.find((entry) => entry.id === scenarioId);

    if (!module) {
        return { module: null, success: false, message: 'Unknown learning module.' };
    }

    const normalized = patchText.toLowerCase().replace(/\s+/g, ' ');
    const passed = module.keywords.every((keyword) => normalized.includes(keyword.toLowerCase()));

    return {
        module,
        success: passed,
        message: passed ? module.successMessage : module.retryMessage
    };
};

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
                    flag: req.session.user.role === 'admin' ? null : 'CTF{D4shb04rd_Acc3ss}',
                    learningModules
                });
            });
        });
    });
});

app.get('/blackbox', isAuthenticated, (req, res) => {
    const productsQuery = 'SELECT id, name, category, price FROM mystery_products ORDER BY id LIMIT 6';
    const notesQuery = "SELECT id, title, classification FROM mystery_notes ORDER BY id LIMIT 5";

    connection.query(productsQuery, (productError, products = []) => {
        connection.query(notesQuery, (noteError, notes = []) => {
            res.render('blackbox', {
                user: req.session.user,
                productPreview: Array.isArray(products) ? products : [],
                notePreview: Array.isArray(notes) ? notes : [],
                blackboxChallenges,
                blackboxPrompts
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

app.get('/blackbox/api/products', isAuthenticated, (req, res) => {
    const search = req.query.search || '';
    const query = `SELECT id, name, description, category, price, inventory_note FROM mystery_products WHERE name LIKE '%${search}%' OR description LIKE '%${search}%' OR category LIKE '%${search}%' ORDER BY price`;

    connection.query(query, (error, results = []) => {
        if (error) {
            return res.status(500).json({ error: 'Mystery inventory lookup failed', details: error.message });
        }

        const suspicious = /('|--|;|union|select|sleep|0x)/i.test(search || '');

        res.json({
            success: true,
            products: Array.isArray(results) ? results : [],
            flag: suspicious ? 'CTF{Bl4ckB0x_Inv3nt0ry}' : null
        });
    });
});

app.get('/blackbox/api/notes/:noteId', isAuthenticated, (req, res) => {
    const noteId = req.params.noteId;

    if (!noteId) {
        return res.status(400).json({ error: 'Note ID required' });
    }

    const query = `SELECT id, title, body, classification, owner FROM mystery_notes WHERE id = ${noteId}`;

    connection.query(query, (error, results = []) => {
        if (error || results.length === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const note = results[0];
        const flag = (note.classification || '').toLowerCase().includes('confidential') || (note.classification || '').toLowerCase().includes('top secret')
            ? 'CTF{Bl4ckB0x_ID0R}'
            : null;

        res.json({
            success: true,
            note,
            flag
        });
    });
});

app.post('/blackbox/api/feedback', isAuthenticated, (req, res) => {
    const { email = 'anonymous@lab', message = '' } = req.body || {};

    const insertQuery = `INSERT INTO mystery_feedback (email, message) VALUES ('${email}', '${message}')`;

    connection.query(insertQuery, (error) => {
        if (error) {
            return res.status(500).json({ error: 'Feedback submission failed', details: error.message });
        }

        res.json({
            success: true,
            echo: `<p class="feedback-entry"><strong>${email}</strong>: ${message}</p>`,
            flag: /<script/i.test(message) ? 'CTF{Bl4ckB0x_XSS}' : null
        });
    });
});

app.get('/blackbox/api/diagnostics', isAuthenticated, (req, res) => {
    const target = req.query.target;

    if (!target) {
        return res.status(400).json({ error: 'Target query parameter required' });
    }

    let parsed;
    try {
        parsed = new URL(target);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid target URL', details: error.message });
    }

    if (parsed.protocol === 'file:') {
        try {
            const filePath = path.normalize(parsed.pathname);
            const data = fs.readFileSync(filePath, 'utf-8');
            return res.json({
                success: true,
                data,
                flag: /token|passwd|secret/i.test(data) ? 'CTF{Bl4ckB0x_Pr0xy}' : null
            });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to read local resource', details: error.message });
        }
    }

    const client = parsed.protocol === 'https:' ? https : http;

    const request = client.get(parsed, (response) => {
        let payload = '';
        response.on('data', (chunk) => {
            payload += chunk.toString();
        });
        response.on('end', () => {
            res.json({
                success: true,
                status: response.statusCode,
                headers: response.headers,
                data: payload,
                flag: parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' ? 'CTF{Bl4ckB0x_Pr0xy}' : null
            });
        });
    });

    request.on('error', (error) => {
        if (!res.headersSent) {
            res.status(500).json({ error: 'Diagnostics request failed', details: error.message });
        }
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
            username: req.session.user.username,
            flag: comment.includes('<script') ? 'CTF{XSS_C00k13_Th13f}' : null
        });
    });
});

app.post('/learn/patch-check', isAuthenticated, (req, res) => {
    const { scenarioId, patch } = req.body || {};

    if (!scenarioId || typeof patch !== 'string') {
        return res.status(400).json({ success: false, message: 'Scenario and patch text are required.' });
    }

    const evaluation = evaluatePatchSubmission(scenarioId, patch);

    if (!evaluation.module) {
        return res.status(404).json({ success: false, message: evaluation.message });
    }

    res.json({
        success: evaluation.success,
        message: evaluation.message,
        referencePatch: evaluation.module.referencePatch
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

app.get('/crypto-leak', (req, res) => {
    res.json({
        message: 'Leaked database backup without encryption or key rotation',
        backup: sensitiveBackup,
        note: 'Data at rest must be encrypted. This backup is simply base64 encoded.',
        flag: 'CTF{CrYpt0_F41lur3}'
    });
});

app.post('/transfer', isAuthenticated, (req, res) => {
    const { fromAccount = req.session.user.username, toAccount, amount } = req.body;

    if (!toAccount || !amount) {
        return res.status(400).json({ error: 'Destination and amount required' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return res.status(400).json({ error: 'Amount must be numeric' });
    }

    const sender = fromAccount;
    if (!accounts[sender]) {
        accounts[sender] = 0;
    }
    if (!accounts[toAccount]) {
        accounts[toAccount] = 0;
    }

    // Intentionally allow negative balances and missing authorization checks
    accounts[sender] -= numericAmount;
    accounts[toAccount] += numericAmount;

    res.json({
        success: true,
        message: `Transfer scheduled from ${sender} to ${toAccount} without secondary approval`,
        balances: accounts,
        flag: numericAmount >= 1337 ? 'CTF{Insecure_Design_Blu3pr1nt}' : null
    });
});

app.post('/legacy-merge', (req, res) => {
    const payload = req.body.payload || '{}';

    try {
        const parsed = JSON.parse(payload);
        const target = { hardened: false };
        _.merge(target, parsed);

        const polluted = {}.flag;

        res.json({
            success: true,
            merged: target,
            prototypeFlag: polluted || null,
            message: 'Legacy lodash merge executed without patching prototype pollution vulnerability.',
            flag: polluted ? 'CTF{0utd4t3d_C0mp0n3nt_Str1ke}' : null
        });
    } catch (error) {
        res.status(400).json({ error: 'Invalid JSON payload', details: error.message });
    }
});

app.post('/bypass-2fa', (req, res) => {
    const { username, otp, rememberDevice } = req.body;

    if (!username || !otp) {
        return res.status(400).json({ error: 'Username and OTP required' });
    }

    const record = pending2FA[username];
    if (!record) {
        return res.status(404).json({ error: 'No pending 2FA request found' });
    }

    if (otp === record.code || otp === '0000' || rememberDevice === 'on') {
        res.json({
            success: true,
            message: '2FA bypassed via master code / remember device flag',
            flag: 'CTF{2FA_BYP4SS_M4ST3R}'
        });
    } else {
        res.status(401).json({ error: 'Invalid OTP' });
    }
});

app.post('/import-config', (req, res) => {
    const { config, signature } = req.body;

    if (!config) {
        return res.status(400).json({ error: 'Config payload required' });
    }

    try {
        const decoded = Buffer.from(config, 'base64').toString('utf-8');
        importedConfigs.push({
            decoded,
            signature: signature || null,
            importedAt: new Date()
        });

        const parsed = JSON.parse(decoded);
        const flagCandidate = parsed.flag || parsed.releaseFlag || null;

        res.json({
            success: true,
            message: 'Config applied without verifying integrity or signature.',
            storedConfig: parsed,
            signatureChecked: false,
            flag: flagCandidate ? 'CTF{UntrusTed_P1p3l1n3}' : null
        });
    } catch (error) {
        res.status(400).json({ error: 'Malformed configuration', details: error.message });
    }
});

app.post('/report-incident', (req, res) => {
    const { event, severity } = req.body;

    if (!event) {
        return res.status(400).json({ error: 'Event description required' });
    }

    // Intentionally skip logging high severity alerts to simulate monitoring failure
    if (severity && severity.toLowerCase() === 'critical') {
        return res.json({
            success: true,
            message: 'Incident ignored due to disabled alerting.',
            flag: 'CTF{M0n1t0r1ng_Bl1nd_Sp0t}'
        });
    }

    auditTrail.push({
        event,
        severity: severity || 'info',
        createdAt: new Date()
    });

    res.json({ success: true, message: 'Event stored without correlation.' });
});

app.get('/audit-log', (req, res) => {
    res.json({
        storedEvents: auditTrail,
        monitoring: 'Real-time alerting disabled for performance reasons',
        flag: auditTrail.length === 0 ? 'CTF{L0gg1ng_G4p_Revealed}' : null
    });
});

app.post('/fetch-url', (req, res) => {
    const { target } = req.body;

    if (!target) {
        return res.status(400).json({ error: 'Target URL required' });
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(target);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid URL', details: error.message });
    }

    const respond = (status, payload) => {
        if (!res.headersSent) {
            res.status(status).json(payload);
        }
    };

    if (parsedUrl.protocol === 'file:') {
        const localPath = path.normalize(parsedUrl.pathname);
        try {
            const data = fs.readFileSync(localPath, 'utf-8');
            respond(200, {
                success: true,
                data,
                flag: localPath.includes('passwd') ? 'CTF{SSRF_Fi1e_R3tr13v4l}' : null
            });
        } catch (error) {
            respond(500, { error: 'Failed to read local file', details: error.message });
        }
        return;
    }

    const client = parsedUrl.protocol === 'https:' ? https : http;

    const request = client.get(parsedUrl, (response) => {
        let data = '';
        response.on('data', (chunk) => {
            data += chunk.toString();
        });
        response.on('end', () => {
            respond(200, {
                success: true,
                data,
                flag: parsedUrl.hostname === 'localhost' ? 'CTF{SSRF_L00pB4ck}' : null
            });
        });
    });

    request.on('error', (error) => {
        respond(500, { error: 'Failed to fetch target', details: error.message });
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

// ===============================
// ADVANCED RED TEAM CHALLENGES
// ===============================

// A11: XML External Entity (XXE) Attack
app.post('/api/xml-parser', isAuthenticated, (req, res) => {
    const xmlData = req.body.xml || '';
    
    if (!xmlData) {
        return res.status(400).json({ error: 'XML data required' });
    }

    // Vulnerable XML parsing that allows XXE
    try {
        // Simulating vulnerable XML parser behavior
        const hasExternalEntity = /<!ENTITY/.test(xmlData) && /SYSTEM/.test(xmlData);
        const hasFileRead = /file:\/\//.test(xmlData);
        
        if (hasExternalEntity && hasFileRead) {
            return res.json({
                success: true,
                message: 'XML parsed successfully with external entities',
                flag: 'CTF{XXE_F1l3_R34d_Succ3ss}',
                data: 'Simulated external entity data loaded'
            });
        }

        res.json({
            success: true,
            message: 'XML parsed',
            data: xmlData
        });
    } catch (error) {
        res.status(500).json({ error: 'XML parsing failed', details: error.message });
    }
});

// A12: Server-Side Template Injection (SSTI)
app.post('/api/render-template', isAuthenticated, (req, res) => {
    const { template, name = 'User' } = req.body;
    
    if (!template) {
        return res.status(400).json({ error: 'Template string required' });
    }

    try {
        // Vulnerable template rendering - evaluates user input
        const dangerousPatterns = ['eval', 'require', 'process', 'child_process'];
        const containsDangerous = dangerousPatterns.some(pattern => template.includes(pattern));
        
        if (containsDangerous) {
            return res.json({
                success: true,
                rendered: 'Template contains code execution patterns',
                flag: 'CTF{SSTI_C0d3_Ex3cut10n}',
                warning: 'Template injection detected'
            });
        }

        // Simple template replacement (still shows concept)
        const rendered = template.replace(/{{name}}/g, name);
        res.json({ success: true, rendered });
    } catch (error) {
        res.status(500).json({ error: 'Template rendering failed', details: error.message });
    }
});

// A13: JWT Token Manipulation
const JWT_SECRET = 'weak_secret_key';

app.post('/api/auth/jwt-login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Credentials required' });
    }

    // Vulnerable JWT implementation with weak secret
    const token = jwt.sign({ username, role: 'user', admin: false }, JWT_SECRET);
    
    res.json({
        success: true,
        token,
        message: 'JWT token generated with weak secret',
        hint: 'Try modifying the token claims or cracking the secret'
    });
});

app.get('/api/auth/jwt-verify', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Token required' });
    }

    try {
        // Vulnerable: accepts "none" algorithm
        const decoded = jwt.decode(token, { complete: true });
        
        if (decoded.header.alg === 'none' || decoded.payload.admin === true) {
            return res.json({
                success: true,
                message: 'Admin access granted!',
                flag: 'CTF{JWT_T0k3n_M4n1pul4t10n}',
                user: decoded.payload
            });
        }

        const verified = jwt.verify(token, JWT_SECRET);
        res.json({ success: true, user: verified });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token', details: error.message });
    }
});

// A14: Race Condition Vulnerability
const raceConditionBalances = { player: 1000 };

app.post('/api/race-withdraw', isAuthenticated, (req, res) => {
    const { amount = 100 } = req.body;
    const username = req.session.user.username;
    
    if (!raceConditionBalances[username]) {
        raceConditionBalances[username] = 1000;
    }

    // Vulnerable: no atomic operation or locking
    setTimeout(() => {
        if (raceConditionBalances[username] >= amount) {
            raceConditionBalances[username] -= amount;
            
            const flag = raceConditionBalances[username] < 0 ? 'CTF{R4c3_C0nd1t10n_Expl01t}' : null;
            
            res.json({
                success: true,
                withdrawn: amount,
                balance: raceConditionBalances[username],
                flag
            });
        } else {
            res.status(400).json({ error: 'Insufficient balance' });
        }
    }, 100);
});

// A15: NoSQL Injection (MongoDB simulation)
app.post('/api/nosql-login', (req, res) => {
    const { username, password } = req.body;
    
    // Vulnerable: accepts objects that bypass authentication
    if (typeof username === 'object' || typeof password === 'object') {
        return res.json({
            success: true,
            message: 'NoSQL injection successful - authentication bypassed',
            flag: 'CTF{N0SQL_1nj3ct10n_Byp4ss}',
            user: { username: 'admin', role: 'admin' }
        });
    }

    res.status(401).json({ error: 'Invalid credentials' });
});

// A16: GraphQL Introspection & Query Depth Attack
app.post('/api/graphql', isAuthenticated, (req, res) => {
    const { query } = req.body;
    
    if (!query) {
        return res.status(400).json({ error: 'GraphQL query required' });
    }

    // Detect introspection query
    if (query.includes('__schema') || query.includes('__type')) {
        return res.json({
            success: true,
            message: 'GraphQL introspection exposed',
            flag: 'CTF{Gr4phQL_Intr0sp3ct10n}',
            schema: {
                types: ['User', 'Post', 'Secret'],
                queries: ['users', 'posts', 'secrets']
            }
        });
    }

    // Detect deeply nested query (DoS)
    const depth = (query.match(/{/g) || []).length;
    if (depth > 10) {
        return res.json({
            success: true,
            message: 'Deep query detected - potential DoS',
            flag: 'CTF{Gr4phQL_D3pth_Att4ck}',
            depth
        });
    }

    res.json({ success: true, data: 'Query executed' });
});

// A17: WebSocket Message Injection
app.get('/api/websocket-demo', isAuthenticated, (req, res) => {
    res.json({
        success: true,
        endpoint: 'ws://localhost:5000/ws',
        message: 'WebSocket endpoint available',
        hint: 'Send malicious payloads without proper validation',
        flag: 'CTF{W3bS0ck3t_1nj3ct10n}'
    });
});

// A18: HTTP Request Smuggling
app.post('/api/smuggle-request', (req, res) => {
    const contentLength = req.headers['content-length'];
    const transferEncoding = req.headers['transfer-encoding'];
    
    // Detect conflicting headers
    if (contentLength && transferEncoding) {
        return res.json({
            success: true,
            message: 'Request smuggling detected - conflicting headers',
            flag: 'CTF{HTTP_R3qu3st_Smuggl1ng}',
            headers: { contentLength, transferEncoding }
        });
    }

    res.json({ success: true, message: 'Request processed' });
});

// A19: API Rate Limiting Bypass
const apiCallCounts = {};

app.get('/api/rate-limit-test', (req, res) => {
    const clientId = req.headers['x-client-id'] || req.ip;
    
    if (!apiCallCounts[clientId]) {
        apiCallCounts[clientId] = 0;
    }

    apiCallCounts[clientId]++;

    // Vulnerable: can be bypassed by changing X-Client-Id header
    if (apiCallCounts[clientId] > 100 && req.headers['x-client-id']) {
        return res.json({
            success: true,
            message: 'Rate limiting bypassed with custom header',
            flag: 'CTF{R4t3_L1m1t_Byp4ss}',
            calls: apiCallCounts[clientId]
        });
    }

    res.json({ success: true, calls: apiCallCounts[clientId] });
});

// A20: Mass Assignment Vulnerability
app.post('/api/user-update', isAuthenticated, (req, res) => {
    const updates = req.body;
    
    // Vulnerable: accepts any field without validation
    if (updates.role === 'admin' || updates.isAdmin === true) {
        return res.json({
            success: true,
            message: 'Mass assignment exploit - role escalation achieved',
            flag: 'CTF{M4ss_Ass1gnm3nt_R0l3_Esc}',
            user: { ...req.session.user, ...updates }
        });
    }

    res.json({ success: true, message: 'User updated', updates });
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
            name: 'Broken Access Control',
            vulnerability: 'A01: Broken Access Control',
            difficulty: 'Easy',
            description: 'Sneak into the admin console or enumerate other profiles (IDOR).',
            endpoint: '/admin',
            flag: 'CTF{Br0k3n_Acc3ss_C0ntr0l}',
            solved: false
        },
        {
            id: 2,
            name: 'Cryptographic Failure',
            vulnerability: 'A02: Cryptographic Failures',
            difficulty: 'Easy',
            description: 'Recover clear-text secrets from the leaked database backup.',
            endpoint: '/crypto-leak',
            flag: 'CTF{CrYpt0_F41lur3}',
            solved: false
        },
        {
            id: 3,
            name: 'Injection Lab',
            vulnerability: 'A03: Injection',
            difficulty: 'Medium',
            description: 'Chain SQL injection at login with stored XSS inside dashboard comments.',
            endpoint: '/login',
            flag: 'CTF{SQL1_1nj3ct10n_MAST3R}',
            solved: false
        },
        {
            id: 4,
            name: 'Insecure Design Transfer',
            vulnerability: 'A04: Insecure Design',
            difficulty: 'Medium',
            description: 'Exploit the trust-on-first-use money transfer workflow.',
            endpoint: '/transfer',
            flag: 'CTF{Insecure_Design_Blu3pr1nt}',
            solved: false
        },
        {
            id: 5,
            name: 'Security Misconfiguration',
            vulnerability: 'A05: Security Misconfiguration',
            difficulty: 'Easy',
            description: 'Harvest juicy intel from the exposed debug endpoint.',
            endpoint: '/debug',
            flag: 'CTF{D3bug_3ndp01nt_3xp0s3d}',
            solved: false
        },
        {
            id: 6,
            name: 'Outdated Component Exploit',
            vulnerability: 'A06: Vulnerable and Outdated Components',
            difficulty: 'Hard',
            description: 'Poison lodash merge to pollute application prototypes.',
            endpoint: '/legacy-merge',
            flag: 'CTF{0utd4t3d_C0mp0n3nt_Str1ke}',
            solved: false
        },
        {
            id: 7,
            name: '2FA Bypass',
            vulnerability: 'A07: Identification and Authentication Failures',
            difficulty: 'Medium',
            description: 'Abuse weak OTP verification with shared master secrets.',
            endpoint: '/bypass-2fa',
            flag: 'CTF{2FA_BYP4SS_M4ST3R}',
            solved: false
        },
        {
            id: 8,
            name: 'Supply Chain Tampering',
            vulnerability: 'A08: Software and Data Integrity Failures',
            difficulty: 'Medium',
            description: 'Inject malicious configuration into the unsigned pipeline.',
            endpoint: '/import-config',
            flag: 'CTF{UntrusTed_P1p3l1n3}',
            solved: false
        },
        {
            id: 9,
            name: 'Monitoring Blind Spot',
            vulnerability: 'A09: Security Logging and Monitoring Failures',
            difficulty: 'Easy',
            description: 'Trigger ignored critical alerts within the SOC tooling.',
            endpoint: '/report-incident',
            flag: 'CTF{M0n1t0r1ng_Bl1nd_Sp0t}',
            solved: false
        },
        {
            id: 10,
            name: 'Server-Side Request Forgery',
            vulnerability: 'A10: Server-Side Request Forgery',
            difficulty: 'Medium',
            description: 'Coax the proxy endpoint into fetching internal resources.',
            endpoint: '/fetch-url',
            flag: 'CTF{SSRF_L00pB4ck}',
            solved: false
        },
        {
            id: 11,
            name: 'Black Box Grounds',
            vulnerability: 'Mystery Multi-Vector',
            difficulty: 'Hard',
            description: 'Recon the hidden Juice Shop-style area and capture all Black Box flags.',
            endpoint: '/blackbox',
            flag: 'CTF{Bl4ckB0x_Exp10r3r}',
            solved: false
        },
        {
            id: 12,
            name: 'XML External Entity (XXE)',
            vulnerability: 'A11: XML External Entity',
            difficulty: 'Medium',
            description: 'Exploit XXE to read local files through XML parsing.',
            endpoint: '/api/xml-parser',
            flag: 'CTF{XXE_F1l3_R34d_Succ3ss}',
            solved: false
        },
        {
            id: 13,
            name: 'Server-Side Template Injection',
            vulnerability: 'A12: SSTI',
            difficulty: 'Hard',
            description: 'Inject code into server-side templates for remote code execution.',
            endpoint: '/api/render-template',
            flag: 'CTF{SSTI_C0d3_Ex3cut10n}',
            solved: false
        },
        {
            id: 14,
            name: 'JWT Token Manipulation',
            vulnerability: 'A13: JWT Vulnerabilities',
            difficulty: 'Medium',
            description: 'Manipulate JWT tokens to gain admin access through weak secrets.',
            endpoint: '/api/auth/jwt-login',
            flag: 'CTF{JWT_T0k3n_M4n1pul4t10n}',
            solved: false
        },
        {
            id: 15,
            name: 'Race Condition Attack',
            vulnerability: 'A14: Race Conditions',
            difficulty: 'Hard',
            description: 'Exploit race conditions to withdraw more than available balance.',
            endpoint: '/api/race-withdraw',
            flag: 'CTF{R4c3_C0nd1t10n_Expl01t}',
            solved: false
        },
        {
            id: 16,
            name: 'NoSQL Injection',
            vulnerability: 'A15: NoSQL Injection',
            difficulty: 'Medium',
            description: 'Bypass authentication using NoSQL injection techniques.',
            endpoint: '/api/nosql-login',
            flag: 'CTF{N0SQL_1nj3ct10n_Byp4ss}',
            solved: false
        },
        {
            id: 17,
            name: 'GraphQL Introspection',
            vulnerability: 'A16: GraphQL Attacks',
            difficulty: 'Medium',
            description: 'Exploit GraphQL introspection and query depth attacks.',
            endpoint: '/api/graphql',
            flag: 'CTF{Gr4phQL_Intr0sp3ct10n}',
            solved: false
        },
        {
            id: 18,
            name: 'WebSocket Injection',
            vulnerability: 'A17: WebSocket Vulnerabilities',
            difficulty: 'Medium',
            description: 'Exploit unvalidated WebSocket messages for injection attacks.',
            endpoint: '/api/websocket-demo',
            flag: 'CTF{W3bS0ck3t_1nj3ct10n}',
            solved: false
        },
        {
            id: 19,
            name: 'HTTP Request Smuggling',
            vulnerability: 'A18: Request Smuggling',
            difficulty: 'Hard',
            description: 'Exploit HTTP request smuggling with conflicting headers.',
            endpoint: '/api/smuggle-request',
            flag: 'CTF{HTTP_R3qu3st_Smuggl1ng}',
            solved: false
        },
        {
            id: 20,
            name: 'Rate Limiting Bypass',
            vulnerability: 'A19: Rate Limit Bypass',
            difficulty: 'Easy',
            description: 'Bypass API rate limiting using custom headers.',
            endpoint: '/api/rate-limit-test',
            flag: 'CTF{R4t3_L1m1t_Byp4ss}',
            solved: false
        },
        {
            id: 21,
            name: 'Mass Assignment Exploit',
            vulnerability: 'A20: Mass Assignment',
            difficulty: 'Medium',
            description: 'Exploit mass assignment to escalate privileges.',
            endpoint: '/api/user-update',
            flag: 'CTF{M4ss_Ass1gnm3nt_R0l3_Esc}',
            solved: false
        }
    ];
}

// ===============================
// SERVER INITIALIZATION
// ===============================
const startServer = (port = process.env.PORT || 5000) => {
    if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads');
    }

    const server = app.listen(port, () => {
        const actualPort = server.address().port;
        console.log(`
🎯 Vulnerable CTF Application - FULLY FUNCTIONAL
📍 Server running on: http://localhost:${actualPort}

📋 Available Routes:
   ✅ GET  /                 - Home page with CTF challenges
   ✅ GET  /login            - Login form
   ✅ POST /login            - Login (SQL Injection vulnerable)
   ✅ GET  /register         - Registration form
   ✅ POST /register         - Register user
   ✅ GET  /dashboard        - User dashboard (XSS playground)
   ✅ GET  /blackbox         - Black Box bounty grounds
   ✅ GET  /admin            - Admin panel (Broken Access Control)
   ✅ GET  /profile/:id      - User profiles (IDOR vulnerable)
   ✅ POST /comment          - Add comments (Stored XSS)
   ✅ GET  /search?q=        - Search (SQL Injection)
   ✅ GET  /crypto-leak      - Download plaintext backup (Crypto failure)
   ✅ POST /transfer         - Funds transfer (Insecure design)
   ✅ POST /legacy-merge     - Lodash merge (Outdated component)
   ✅ POST /bypass-2fa       - OTP validation (Auth failure)
   ✅ POST /import-config    - Unsigned config deployment
   ✅ POST /report-incident  - Logging bypass
   ✅ GET  /audit-log        - Monitoring blind spot
   ✅ POST /fetch-url        - SSRF proxy
   ✅ GET  /blackbox/api/products?search=
                            - Mystery inventory SQLi
   ✅ GET  /blackbox/api/notes/:id
                            - Note vault IDOR
   ✅ POST /blackbox/api/feedback
                            - Stored XSS echo chamber
   ✅ GET  /blackbox/api/diagnostics?target=
                            - SSRF-style diagnostics proxy
   ✅ POST /upload           - File upload (Path Traversal)
   ✅ POST /reset-password   - Password reset (Weak authentication)
   ✅ GET  /debug            - Debug info (Information Exposure)
   ✅ GET  /logout           - Logout

🚀 Advanced Red Team Challenges:
   ✅ POST /api/xml-parser          - XXE Attack Lab
   ✅ POST /api/render-template     - SSTI Exploitation
   ✅ POST /api/auth/jwt-login      - JWT Token Generation
   ✅ GET  /api/auth/jwt-verify     - JWT Manipulation Lab
   ✅ POST /api/race-withdraw       - Race Condition Exploit
   ✅ POST /api/nosql-login         - NoSQL Injection
   ✅ POST /api/graphql             - GraphQL Attack Surface
   ✅ GET  /api/websocket-demo      - WebSocket Vulnerabilities
   ✅ POST /api/smuggle-request     - HTTP Request Smuggling
   ✅ GET  /api/rate-limit-test     - Rate Limiting Bypass
   ✅ POST /api/user-update         - Mass Assignment Exploit

🔐 Default Credentials:
   👑 Admin: admin / admin123
   👤 User:  alice / password123

⚠️  SECURITY WARNING: This app contains INTENTIONAL vulnerabilities
    For educational use only in isolated environments!
        `);
    });

    return server;
};

const shutdown = (server) => new Promise((resolve) => {
    const finalize = () => {
        connection.close(() => resolve());
    };

    if (server && typeof server.close === 'function') {
        server.close(() => finalize());
    } else {
        finalize();
    }
});

const bootstrap = () => initDB().then(() => {
    const server = startServer();

    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down server...');
        shutdown(server).then(() => process.exit(0));
    });

    return server;
});

if (require.main === module) {
    bootstrap().catch(() => {
        connection.close(() => process.exit(1));
    });
}

module.exports = {
    app,
    initDB,
    startServer,
    shutdown,
    bootstrap,
    connection
};

module.exports.default = app;
