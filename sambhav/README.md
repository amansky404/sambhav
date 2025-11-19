# Vulnerable CTF Application 🇮🇳

An intentionally vulnerable OWASP Top 10 training lab inspired by DVWA and themed with India's tricolour. The application combines a Node.js/Express backend, SQLite datastore, and EJS frontend templates to provide end-to-end scenarios for red-team style education.

> **Warning:** This project is purposefully insecure. Run it only inside controlled lab environments and never expose it to the public internet.

## Features

- 🎯 **21 Comprehensive Challenges** - Complete OWASP Top 10 + 11 advanced red team challenges
- 🚀 **Modern Web Vulnerabilities** - XXE, SSTI, JWT manipulation, race conditions, NoSQL injection, GraphQL attacks, and more
- 🔐 **Advanced API Security** - WebSocket vulnerabilities, HTTP request smuggling, rate limiting bypass, mass assignment
- 🌐 Complete frontend experience with tri-colour theme across login, dashboard, admin, and profile flows
- ⚔️ Built-in OWASP-aligned challenges covering the entire 2021 Top 10 (Broken Access Control through SSRF) with India-themed missions
- 📚 Comprehensive guides with exploitation walkthroughs, secure coding principles, and mitigation steps
- 🧑‍🏫 Interactive learning studio on the dashboard with vulnerable snippets, secure coding callouts, and a patch validator playground
- 🕵️ Black Box bounty grounds with Juice Shop-style hidden APIs, IDORs, SQLi, and SSRF labs for open-ended bug hunting

## Quick Start

```bash
npm install
npm start
```

### Run smoke tests

```bash
npm test
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
app.js                       # Express application with intentionally vulnerable routes
public/css/styles.css        # Tri-colour themed styles shared across templates
views/                       # EJS views for auth, dashboard, admin, and profile screens
docs/CTF_GUIDE.md           # Full offensive/defensive walkthrough and mitigation guide
docs/ADVANCED_RED_TEAM.md   # Advanced red team challenges and modern web vulnerabilities
tests/smoke.test.js         # Basic smoke tests for application
```

## Challenge Categories

### OWASP Top 10 (2021)
1. **A01: Broken Access Control** - Admin panel bypass, IDOR vulnerabilities
2. **A02: Cryptographic Failures** - Plaintext data exposure, weak encryption
3. **A03: Injection** - SQL injection, XSS attacks
4. **A04: Insecure Design** - Flawed business logic, trust-on-first-use
5. **A05: Security Misconfiguration** - Debug endpoints, information disclosure
6. **A06: Vulnerable Components** - Outdated dependencies, prototype pollution
7. **A07: Auth Failures** - 2FA bypass, weak credentials
8. **A08: Data Integrity Failures** - Unsigned configs, supply chain attacks
9. **A09: Logging Failures** - Monitoring blind spots, missing alerts
10. **A10: SSRF** - Internal resource access, file disclosure

### Advanced Red Team Challenges
11. **A11: XML External Entity (XXE)** - File read through XML parsing
12. **A12: Server-Side Template Injection** - Remote code execution via templates
13. **A13: JWT Manipulation** - Token forgery, algorithm confusion
14. **A14: Race Conditions** - TOCTOU vulnerabilities, concurrent exploits
15. **A15: NoSQL Injection** - Authentication bypass, operator injection
16. **A16: GraphQL Attacks** - Introspection abuse, query depth DoS
17. **A17: WebSocket Vulnerabilities** - Unvalidated message injection
18. **A18: HTTP Request Smuggling** - Header confusion attacks
19. **A19: Rate Limiting Bypass** - Header manipulation, throttle evasion
20. **A20: Mass Assignment** - Privilege escalation through field injection
21. **Black Box Mystery** - Multi-vector exploitation area

## Repository Layout

```
app.js                # Express application with intentionally vulnerable routes
public/css/styles.css # Tri-colour themed styles shared across templates
views/                # EJS views for auth, dashboard, admin, and profile screens
docs/CTF_GUIDE.md     # Full offensive/defensive walkthrough and mitigation guide
```

## Educational Flow

1. Launch the application and explore `/` to review available challenges and flags for all OWASP Top 10 categories.
2. Use the [CTF guide](docs/CTF_GUIDE.md) to reproduce each exploit path and understand the root cause.
3. Dive into `/blackbox` when you want a Juice Shop-style mystery area with minimal hints.
4. Open the in-app Learning Studio to review code snippets, attempt a fix, and verify your patch before revealing the sample answer.
5. Compare the vulnerable implementation with the documented mitigations to design secure countermeasures.
6. Iterate by hardening routes, adding tests, and measuring coverage with static/dynamic tooling.

## Learning Studio Highlights

- Each module focuses on a Top 10 category (SQLi, XSS, Broken Access Control) and pairs a vulnerable snippet with reasoning and mitigation tips.
- Learners can edit or paste their secure fix into the patch textarea and run an automated check that looks for the core hardening techniques.
- Reference patches remain available via collapsible panels so facilitators can demo secure patterns after students attempt their own solution.

## Secure Coding Principles Highlighted

- **Input validation & output encoding:** Prevent injection and XSS by sanitizing data at trust boundaries.
- **Least privilege:** Enforce RBAC on administrative or sensitive operations.
- **Session integrity:** Mark cookies `HttpOnly`, `Secure`, and rotate on privilege escalation.
- **Error handling:** Limit diagnostic leakage in production builds; centralize logging for incident response.
- **Configuration management:** Disable debug endpoints, enforce TLS, and pin/patch dependencies to avoid vulnerable components.

## Next Steps for Learners

- Implement parameterized queries or ORM-based data access to eliminate SQL injection vectors.
- Add authorization middleware to protect admin routes and enforce ownership checks on profiles.
- Introduce CSRF protection, CSP headers, and stricter cookie policies to reduce client-side risk.
- Write automated unit/integration tests that validate both vulnerable and patched states for continuous learning.

## Documentation & Support

- **OWASP Top 10 Guide**: [docs/CTF_GUIDE.md](docs/CTF_GUIDE.md)
- **Advanced Red Team Guide**: [docs/ADVANCED_RED_TEAM.md](docs/ADVANCED_RED_TEAM.md)
- Black Box reconnaissance briefing: visit `/blackbox` for hidden hunts
- OWASP Top 10 reference: <https://owasp.org/www-project-top-ten/>
- For lab usage questions or improvements, open an issue or submit a pull request

## API Endpoints

### Core Endpoints
- `GET /` - Home page with all challenges
- `GET /login`, `POST /login` - Authentication (SQLi vulnerable)
- `GET /dashboard` - Main dashboard with learning studio
- `GET /blackbox` - Mystery challenge area
- `GET /admin` - Admin panel (access control issues)
- `GET /profile/:id` - User profiles (IDOR)

### Advanced Red Team APIs
- `POST /api/xml-parser` - XXE attack surface
- `POST /api/render-template` - SSTI exploitation
- `POST /api/auth/jwt-login` - JWT generation
- `GET /api/auth/jwt-verify` - JWT validation
- `POST /api/race-withdraw` - Race condition testing
- `POST /api/nosql-login` - NoSQL injection
- `POST /api/graphql` - GraphQL introspection
- `GET /api/websocket-demo` - WebSocket vulnerabilities
- `POST /api/smuggle-request` - HTTP smuggling
- `GET /api/rate-limit-test` - Rate limiting bypass
- `POST /api/user-update` - Mass assignment

## Documentation & Support

- Detailed exploitation + mitigation guide: [docs/CTF_GUIDE.md](docs/CTF_GUIDE.md)
- Black Box reconnaissance briefing: visit `/blackbox` for hidden hunts documented in the CTF guide.
- OWASP Top 10 reference: <https://owasp.org/www-project-top-ten/>
- For lab usage questions or improvements, open an issue or submit a pull request.

Happy hacking and responsible disclosure! 🇮🇳
