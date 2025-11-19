# Sambhav Security Lab - Architecture Documentation

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Browser                            │
│                    (User/Attacker Interface)                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ HTTP/HTTPS
                 │
┌────────────────▼────────────────────────────────────────────────┐
│                     Express.js Server                            │
│                    (Node.js v18+, Port 5000)                     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Middleware Stack                            │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • body-parser (JSON/URLencoded)                        │   │
│  │  • cookie-parser (Session cookies)                       │   │
│  │  • express-session (Weak configuration)                  │   │
│  │  • Static files (CSS, JS)                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Route Handlers                           │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  Authentication Routes                                   │   │
│  │  ├─ /login (SQL Injection)                              │   │
│  │  ├─ /register                                            │   │
│  │  └─ /logout                                              │   │
│  │                                                           │   │
│  │  Core Application Routes                                 │   │
│  │  ├─ /dashboard (XSS playground)                         │   │
│  │  ├─ /admin (Broken access control)                      │   │
│  │  ├─ /profile/:id (IDOR)                                 │   │
│  │  └─ /blackbox (Mystery challenges)                      │   │
│  │                                                           │   │
│  │  OWASP Top 10 Challenges                                 │   │
│  │  ├─ /crypto-leak (A02)                                  │   │
│  │  ├─ /transfer (A04)                                     │   │
│  │  ├─ /debug (A05)                                        │   │
│  │  ├─ /legacy-merge (A06)                                 │   │
│  │  ├─ /bypass-2fa (A07)                                   │   │
│  │  ├─ /import-config (A08)                                │   │
│  │  ├─ /report-incident (A09)                              │   │
│  │  └─ /fetch-url (A10)                                    │   │
│  │                                                           │   │
│  │  Advanced Red Team APIs                                  │   │
│  │  ├─ /api/xml-parser (XXE)                               │   │
│  │  ├─ /api/render-template (SSTI)                         │   │
│  │  ├─ /api/auth/jwt-* (JWT manipulation)                  │   │
│  │  ├─ /api/race-withdraw (Race conditions)                │   │
│  │  ├─ /api/nosql-login (NoSQL injection)                  │   │
│  │  ├─ /api/graphql (GraphQL attacks)                      │   │
│  │  ├─ /api/websocket-demo (WebSocket vuln)                │   │
│  │  ├─ /api/smuggle-request (HTTP smuggling)               │   │
│  │  ├─ /api/rate-limit-test (Rate bypass)                  │   │
│  │  └─ /api/user-update (Mass assignment)                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Learning Studio Engine                      │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • Vulnerable code snippets                              │   │
│  │  • Patch validation logic                                │   │
│  │  • Reference implementations                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ SQLite queries (vulnerable)
                 │
┌────────────────▼────────────────────────────────────────────────┐
│                   SQLite Database                                │
│                  (vulnerable_ctf.db)                             │
│                                                                   │
│  Tables:                                                         │
│  ├─ users (credentials, roles)                                  │
│  ├─ posts (content, user_id)                                    │
│  ├─ comments (content, post_id, user_id)                        │
│  ├─ mystery_products (black box data)                           │
│  ├─ mystery_feedback (stored XSS)                               │
│  └─ mystery_notes (IDOR targets)                                │
└──────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Layer

```
┌─────────────────────────────────────────────────────────────┐
│                    EJS Template Engine                       │
│                                                               │
│  Views:                                                       │
│  ├─ index.ejs        → Landing page with challenges          │
│  ├─ login.ejs        → Authentication form                   │
│  ├─ register.ejs     → User registration                     │
│  ├─ dashboard.ejs    → Main app + Learning Studio            │
│  ├─ blackbox.ejs     → Mystery challenge area                │
│  ├─ admin.ejs        → Admin panel                           │
│  ├─ profile.ejs      → User profiles (IDOR)                  │
│  └─ error.ejs        → Error handling                        │
│                                                               │
│  Styles:                                                      │
│  └─ public/css/styles.css → Tri-colour India theme          │
└─────────────────────────────────────────────────────────────┘
```

### Backend Layer

```
┌─────────────────────────────────────────────────────────────┐
│                   Application Core (app.js)                  │
│                                                               │
│  ┌───────────────────────────────────────────────────┐     │
│  │           Configuration Module                     │     │
│  ├───────────────────────────────────────────────────┤     │
│  │  • Express app setup                               │     │
│  │  • Middleware configuration (intentionally weak)   │     │
│  │  • Session management (insecure)                   │     │
│  │  • Cookie settings (no HttpOnly/Secure)            │     │
│  └───────────────────────────────────────────────────┘     │
│                                                               │
│  ┌───────────────────────────────────────────────────┐     │
│  │           Database Module                          │     │
│  ├───────────────────────────────────────────────────┤     │
│  │  • SQLite connection wrapper                       │     │
│  │  • Schema initialization                           │     │
│  │  • Seed data population                            │     │
│  │  • Vulnerable query execution                      │     │
│  └───────────────────────────────────────────────────┘     │
│                                                               │
│  ┌───────────────────────────────────────────────────┐     │
│  │         Authentication Module                      │     │
│  ├───────────────────────────────────────────────────┤     │
│  │  • Password storage (plaintext)                    │     │
│  │  • SQL injection vulnerable login                  │     │
│  │  • No password hashing                             │     │
│  │  • Weak session management                         │     │
│  └───────────────────────────────────────────────────┘     │
│                                                               │
│  ┌───────────────────────────────────────────────────┐     │
│  │        Learning Studio Module                      │     │
│  ├───────────────────────────────────────────────────┤     │
│  │  • Vulnerability scenarios                         │     │
│  │  • Patch evaluation engine                         │     │
│  │  • Reference implementations                       │     │
│  │  • Keyword matching validator                      │     │
│  └───────────────────────────────────────────────────┘     │
│                                                               │
│  ┌───────────────────────────────────────────────────┐     │
│  │        Challenge Management                        │     │
│  ├───────────────────────────────────────────────────┤     │
│  │  • Flag generation                                 │     │
│  │  • Challenge metadata                              │     │
│  │  • Difficulty levels                               │     │
│  │  • Endpoint mapping                                │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Authentication Flow (SQL Injection)

```
User Input
    │
    ├─ username: admin'--
    ├─ password: anything
    │
    ▼
String Concatenation
    │
    ├─ Query: SELECT * FROM users WHERE username = 'admin'--' AND password = 'anything'
    │
    ▼
SQLite Execution
    │
    ├─ Comment (--) removes password check
    ├─ Returns admin user
    │
    ▼
Session Creation
    │
    ├─ req.session.user = adminUser
    ├─ Redirect to /dashboard
    │
    ▼
Authenticated Access
```

#### XSS Attack Flow

```
Attacker Input
    │
    ├─ comment: <script>alert('XSS')</script>
    │
    ▼
Unsanitized Storage
    │
    ├─ INSERT INTO comments (content, ...) VALUES ('<script>alert('XSS')</script>', ...)
    │
    ▼
Database Persistence
    │
    ▼
Dashboard Rendering
    │
    ├─ EJS template renders raw HTML
    ├─ <%= comment.content %>
    │
    ▼
Browser Execution
    │
    └─ JavaScript executes in victim's browser
```

#### IDOR Attack Flow

```
Legitimate Access
    │
    ├─ User alice (ID: 2) logged in
    ├─ Accesses /profile/2
    │
    ▼
Modified Request
    │
    ├─ Attacker changes URL to /profile/1
    │
    ▼
No Authorization Check
    │
    ├─ Query: SELECT * FROM users WHERE id = 1
    ├─ No ownership validation
    │
    ▼
Data Exposure
    │
    └─ Admin profile data returned
```

## Security Architecture (Intentionally Weak)

### Vulnerability Matrix

| Component | Vulnerability | OWASP Category |
|-----------|--------------|----------------|
| Login | SQL Injection | A03: Injection |
| Comments | Stored XSS | A03: Injection |
| Admin Panel | No Access Control | A01: Broken Access |
| Profile | IDOR | A01: Broken Access |
| Cookies | No HttpOnly/Secure | A05: Misconfiguration |
| Sessions | Weak secret | A07: Auth Failures |
| Crypto | Plaintext passwords | A02: Crypto Failures |
| Debug | Info disclosure | A05: Misconfiguration |
| 2FA | Easy bypass | A07: Auth Failures |
| Config | Unsigned imports | A08: Integrity Failures |
| Logging | Missing alerts | A09: Logging Failures |
| SSRF | No URL validation | A10: SSRF |
| JWT | Weak secret, "none" alg | A07: Auth Failures |
| Template | SSTI | Code Execution |
| XML | XXE | File Disclosure |
| Race | No locking | Business Logic |
| NoSQL | Operator injection | A03: Injection |
| GraphQL | No depth limit | DoS |
| Mass Assign | No whitelist | Privilege Escalation |

### Attack Surface

```
┌─────────────────────────────────────────────────────────────┐
│                      Attack Vectors                          │
│                                                               │
│  Network Layer                                                │
│  ├─ HTTP (unencrypted in dev)                               │
│  ├─ No rate limiting                                         │
│  └─ Accepts all origins                                      │
│                                                               │
│  Application Layer                                            │
│  ├─ SQL injection in multiple endpoints                      │
│  ├─ XSS in comments, feedback                                │
│  ├─ SSRF in proxy endpoints                                  │
│  ├─ SSTI in template rendering                               │
│  ├─ XXE in XML parsing                                       │
│  ├─ JWT manipulation                                          │
│  ├─ NoSQL injection                                           │
│  └─ GraphQL introspection                                     │
│                                                               │
│  Business Logic                                               │
│  ├─ Race conditions in withdrawals                           │
│  ├─ Mass assignment                                           │
│  ├─ 2FA bypass                                                │
│  └─ Transfer without approval                                 │
│                                                               │
│  Access Control                                               │
│  ├─ Admin routes accessible to all                           │
│  ├─ IDOR on profiles, notes                                  │
│  └─ No resource ownership checks                             │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

### Local Development

```
┌─────────────────────┐
│   Developer Host    │
│                     │
│  ┌───────────────┐ │
│  │   Node.js     │ │
│  │   Port 5000   │ │
│  └───────────────┘ │
│          │          │
│  ┌───────▼───────┐ │
│  │ vulnerable_   │ │
│  │ ctf.db        │ │
│  └───────────────┘ │
└─────────────────────┘
```

### Docker Deployment

```
┌─────────────────────────────────────┐
│          Docker Host                 │
│                                      │
│  ┌────────────────────────────────┐ │
│  │   sambhav-ctf Container        │ │
│  │                                │ │
│  │  ┌──────────────────────────┐ │ │
│  │  │   Node.js Application    │ │ │
│  │  │   Port 5000              │ │ │
│  │  └──────────────────────────┘ │ │
│  │                                │ │
│  │  ┌──────────────────────────┐ │ │
│  │  │   SQLite Database        │ │ │
│  │  │   (Volume mounted)       │ │ │
│  │  └──────────────────────────┘ │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │   sambhav-network (bridge)     │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Multi-User Lab Setup

```
┌─────────────────────────────────────────────────────────┐
│                    Lab Server                            │
│                                                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ Container  │  │ Container  │  │ Container  │  ...   │
│  │ User 1     │  │ User 2     │  │ User N     │        │
│  │ :5001      │  │ :5002      │  │ :500N      │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │            Isolated Lab Network                  │   │
│  │            (No Internet Access)                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          │ VPN Only
                          │
              ┌───────────▼──────────┐
              │   Management PC      │
              │   Instructor Access  │
              └──────────────────────┘
```

## Testing Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Test Suite                            │
│                                                           │
│  ┌────────────────────────────────────────────────┐    │
│  │          Unit Tests (Future)                    │    │
│  ├────────────────────────────────────────────────┤    │
│  │  • Route handler tests                          │    │
│  │  • Database operation tests                     │    │
│  │  • Helper function tests                        │    │
│  └────────────────────────────────────────────────┘    │
│                                                           │
│  ┌────────────────────────────────────────────────┐    │
│  │       Integration Tests (Current)               │    │
│  ├────────────────────────────────────────────────┤    │
│  │  • Smoke test (basic functionality)             │    │
│  │  • Endpoint availability tests                  │    │
│  │  • Vulnerability verification tests             │    │
│  │  • Flag capture tests                           │    │
│  └────────────────────────────────────────────────┘    │
│                                                           │
│  ┌────────────────────────────────────────────────┐    │
│  │    Exploit Verification (Future)                │    │
│  ├────────────────────────────────────────────────┤    │
│  │  • Automated exploit scripts                    │    │
│  │  • Flag extraction tests                        │    │
│  │  • Impact validation                            │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Data Model

### Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
├─────────────────┤
│ id (PK)         │
│ username        │
│ password        │──┐
│ email           │  │
│ role            │  │
│ created_at      │  │
└─────────────────┘  │
         │           │
         │ 1         │
         │           │
         │ N         │
         ▼           │
┌─────────────────┐  │
│     posts       │  │
├─────────────────┤  │
│ id (PK)         │  │
│ title           │  │
│ content         │  │
│ user_id (FK)    │──┘
│ created_at      │
└─────────────────┘
         │
         │ 1
         │
         │ N
         ▼
┌─────────────────┐
│    comments     │
├─────────────────┤
│ id (PK)         │
│ content         │
│ user_id (FK)    │
│ post_id (FK)    │
│ created_at      │
└─────────────────┘

Black Box Tables:
┌─────────────────────┐
│  mystery_products   │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ description         │
│ category            │
│ price               │
│ inventory_note      │
└─────────────────────┘

┌─────────────────────┐
│  mystery_feedback   │
├─────────────────────┤
│ id (PK)             │
│ email               │
│ message             │
│ created_at          │
└─────────────────────┘

┌─────────────────────┐
│   mystery_notes     │
├─────────────────────┤
│ id (PK)             │
│ title               │
│ body                │
│ classification      │
│ owner               │
└─────────────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Technology Stack                      │
│                                                           │
│  Runtime                                                  │
│  └─ Node.js v18+ (JavaScript runtime)                   │
│                                                           │
│  Web Framework                                            │
│  └─ Express.js v4.18+ (HTTP server)                     │
│                                                           │
│  Database                                                 │
│  └─ SQLite v5.1+ (File-based SQL database)              │
│                                                           │
│  Template Engine                                          │
│  └─ EJS v3.1+ (Embedded JavaScript templates)           │
│                                                           │
│  Middleware                                               │
│  ├─ body-parser v1.20+ (Request parsing)                │
│  ├─ cookie-parser v1.4+ (Cookie handling)               │
│  └─ express-session v1.17+ (Session management)         │
│                                                           │
│  Security Libraries                                       │
│  ├─ jsonwebtoken v9.0+ (JWT handling)                   │
│  └─ lodash v4.17.4 (Intentionally outdated)             │
│                                                           │
│  Containerization                                         │
│  └─ Docker (Container runtime)                           │
└─────────────────────────────────────────────────────────┘
```

## File Structure

```
sambhav/
├── app.js                      # Main application file
├── package.json                # Dependencies & scripts
├── package-lock.json           # Dependency lock file
├── Dockerfile                  # Container image definition
├── docker-compose.yml          # Multi-container orchestration
├── .dockerignore              # Docker build exclusions
├── .gitignore                 # Git exclusions
├── README.md                  # Project overview
│
├── public/                    # Static assets
│   └── css/
│       └── styles.css         # Tri-colour theme
│
├── views/                     # EJS templates
│   ├── index.ejs             # Landing page
│   ├── login.ejs             # Login form
│   ├── register.ejs          # Registration
│   ├── dashboard.ejs         # Main dashboard
│   ├── blackbox.ejs          # Mystery challenges
│   ├── admin.ejs             # Admin panel
│   ├── profile.ejs           # User profiles
│   └── error.ejs             # Error pages
│
├── docs/                      # Documentation
│   ├── CTF_GUIDE.md          # OWASP Top 10 guide
│   ├── ADVANCED_RED_TEAM.md  # Advanced challenges
│   ├── DEPLOYMENT.md         # Deployment guide
│   ├── LAB_EXERCISES.md      # Training worksheets
│   └── ARCHITECTURE.md       # This file
│
├── tests/                     # Test suite
│   ├── smoke.test.js         # Basic smoke tests
│   └── integration.test.js   # Integration tests
│
├── uploads/                   # File upload directory
└── vulnerable_ctf.db         # SQLite database
```

## Performance Characteristics

- **Startup Time**: ~1 second
- **Memory Usage**: ~50-100 MB
- **Concurrent Users**: 100+ (limited by Node.js)
- **Database Size**: ~1 MB (with seed data)
- **Response Time**: <100ms for most endpoints

## Future Architecture Improvements

### Proposed Enhancements

1. **Microservices Architecture** (for advanced training)
   - Separate vulnerability services
   - API gateway pattern
   - Service mesh for complex scenarios

2. **Real-time Features**
   - WebSocket server for live challenges
   - Real-time leaderboard
   - Collaborative hacking sessions

3. **Scoring System**
   - Points tracking database
   - Time-based scoring
   - Difficulty multipliers
   - Team competitions

4. **Extended Monitoring**
   - Attack detection system
   - Real-time dashboards
   - Exploit telemetry

## Security Recommendations (For Real Applications)

This section describes how to secure similar applications:

1. **Input Validation**: Validate and sanitize all user inputs
2. **Parameterized Queries**: Use prepared statements for SQL
3. **Authentication**: Implement bcrypt password hashing
4. **Authorization**: Enforce RBAC on all routes
5. **Session Security**: Use secure session configuration
6. **HTTPS**: Always use TLS in production
7. **Rate Limiting**: Implement per-user/IP rate limits
8. **CSRF Protection**: Add CSRF tokens to forms
9. **CSP Headers**: Implement Content Security Policy
10. **Security Headers**: Add helmet.js middleware

---

**Note**: This architecture is intentionally vulnerable for educational purposes. Never use these patterns in production applications.
