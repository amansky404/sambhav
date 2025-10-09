# Vulnerable CTF Application 🇮🇳

An intentionally vulnerable OWASP Top 10 training lab inspired by DVWA and themed with India's tricolour. The application combines a Node.js/Express backend, SQLite datastore, and EJS frontend templates to provide end-to-end scenarios for red-team style education.

> **Warning:** This project is purposefully insecure. Run it only inside controlled lab environments and never expose it to the public internet.

## Features

- 🎯 Pre-seeded SQLite database with vulnerable user, post, and comment data.
- 🌐 Complete frontend experience with tri-colour theme across login, dashboard, admin, and profile flows.
- ⚔️ Built-in OWASP-aligned challenges covering SQLi, XSS, Broken Access Control, IDOR, Path Traversal, Password Reset abuse, and Information Disclosure.
- 📚 Comprehensive guide with exploitation walkthroughs, secure coding principles, and mitigation steps (`docs/CTF_GUIDE.md`).

## Quick Start

```bash
npm install
npm start
```

The server boots on [http://localhost:5000](http://localhost:5000) by default and automatically initializes the SQLite database (`vulnerable_ctf.db`).

### Default Accounts

| Role  | Username | Password     |
|-------|----------|--------------|
| Admin | admin    | admin123     |
| User  | alice    | password123  |
| User  | bob      | password456  |

## Repository Layout

```
app.js                # Express application with intentionally vulnerable routes
public/css/styles.css # Tri-colour themed styles shared across templates
views/                # EJS views for auth, dashboard, admin, and profile screens
docs/CTF_GUIDE.md     # Full offensive/defensive walkthrough and mitigation guide
```

## Educational Flow

1. Launch the application and explore `/` to review available challenges and flags.
2. Use the [CTF guide](docs/CTF_GUIDE.md) to reproduce each exploit path and understand the root cause.
3. Compare the vulnerable implementation with the documented mitigations to design secure countermeasures.
4. Iterate by hardening routes, adding tests, and measuring coverage with static/dynamic tooling.

## Secure Coding Principles Highlighted

- **Input validation & output encoding:** Prevent injection and XSS by sanitizing data at trust boundaries.
- **Least privilege:** Enforce RBAC on administrative or sensitive operations.
- **Session integrity:** Mark cookies `HttpOnly`, `Secure`, and rotate on privilege escalation.
- **Error handling:** Limit diagnostic leakage in production builds; centralize logging for incident response.
- **Configuration management:** Disable debug endpoints, enforce TLS, and pin dependency versions.

## Next Steps for Learners

- Implement parameterized queries or ORM-based data access to eliminate SQL injection vectors.
- Add authorization middleware to protect admin routes and enforce ownership checks on profiles.
- Introduce CSRF protection, CSP headers, and stricter cookie policies to reduce client-side risk.
- Write automated unit/integration tests that validate both vulnerable and patched states for continuous learning.

## Documentation & Support

- Detailed exploitation + mitigation guide: [docs/CTF_GUIDE.md](docs/CTF_GUIDE.md)
- OWASP Top 10 reference: <https://owasp.org/www-project-top-ten/>
- For lab usage questions or improvements, open an issue or submit a pull request.

Happy hacking and responsible disclosure! 🇮🇳
