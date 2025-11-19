# Sambhav - Advanced Web Security Training Lab 🇮🇳

[![Security Lab](https://img.shields.io/badge/Type-Security%20Lab-red)](https://github.com/amansky404/sambhav)
[![OWASP Top 10](https://img.shields.io/badge/OWASP-Top%2010-blue)](https://owasp.org/www-project-top-ten/)
[![Challenges](https://img.shields.io/badge/Challenges-21-green)](sambhav/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Educational-yellow)](LICENSE)

A comprehensive, professional-grade security training platform featuring **21 intentionally vulnerable challenges** covering OWASP Top 10 and advanced red teaming techniques. Inspired by DVWA and themed with India's vibrant tri-colour design.

> **⚠️ Security Warning**: This application contains intentional vulnerabilities for educational purposes. **NEVER** deploy to production or expose to the public internet.

## 🎯 Features

- **21 Security Challenges**: Complete OWASP Top 10 (2021) + 10 advanced red team scenarios
- **Modern Vulnerabilities**: XXE, SSTI, JWT manipulation, race conditions, NoSQL injection, GraphQL attacks, and more
- **Interactive Learning Studio**: Built-in code vulnerability viewer with patch validation
- **Black Box Mystery Area**: Juice Shop-style hidden challenges for reconnaissance training
- **Professional Documentation**: 2,000+ lines of comprehensive guides, exercises, and deployment instructions
- **Docker Support**: One-command deployment with Docker Compose
- **Comprehensive Testing**: 16 automated tests ensuring platform reliability
- **Multi-Cloud Ready**: Deployment guides for AWS, GCP, Azure, and Kubernetes

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/amansky404/sambhav.git
cd sambhav/sambhav

# Install dependencies
npm install

# Start the application
npm start
```

The application will be available at `http://localhost:5000`

### Docker Deployment

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or using Docker directly
docker build -t sambhav-ctf .
docker run -p 5000:5000 sambhav-ctf
```

### Run Tests

```bash
# Run smoke tests
npm test

# Run integration tests
npm run test:integration

# Run all tests
npm run test:all
```

## 📚 Documentation

Comprehensive documentation is available in the `sambhav/docs/` directory:

- **[CTF_GUIDE.md](sambhav/docs/CTF_GUIDE.md)** - Complete OWASP Top 10 exploitation guide
- **[ADVANCED_RED_TEAM.md](sambhav/docs/ADVANCED_RED_TEAM.md)** - Modern web vulnerabilities and advanced attacks
- **[LAB_EXERCISES.md](sambhav/docs/LAB_EXERCISES.md)** - 17 structured exercises from beginner to expert
- **[DEPLOYMENT.md](sambhav/docs/DEPLOYMENT.md)** - Deployment options (Docker, AWS, GCP, Azure, K8s)
- **[ARCHITECTURE.md](sambhav/docs/ARCHITECTURE.md)** - System architecture and design documentation

## 🎓 Challenge Categories

### OWASP Top 10 (2021)

1. **A01: Broken Access Control** - Admin panel bypass, IDOR vulnerabilities
2. **A02: Cryptographic Failures** - Plaintext data exposure, weak encryption
3. **A03: Injection** - SQL injection, XSS attacks
4. **A04: Insecure Design** - Flawed business logic
5. **A05: Security Misconfiguration** - Debug endpoints, information disclosure
6. **A06: Vulnerable Components** - Outdated dependencies, prototype pollution
7. **A07: Authentication Failures** - 2FA bypass, weak credentials
8. **A08: Data Integrity Failures** - Unsigned configs, supply chain attacks
9. **A09: Logging Failures** - Monitoring blind spots
10. **A10: Server-Side Request Forgery** - Internal resource access

### Advanced Red Team Challenges

11. **XML External Entity (XXE)** - File read through XML parsing
12. **Server-Side Template Injection (SSTI)** - Remote code execution
13. **JWT Token Manipulation** - Token forgery, algorithm confusion
14. **Race Conditions** - TOCTOU vulnerabilities
15. **NoSQL Injection** - Authentication bypass
16. **GraphQL Attacks** - Introspection abuse, query depth DoS
17. **WebSocket Vulnerabilities** - Unvalidated message injection
18. **HTTP Request Smuggling** - Header confusion attacks
19. **Rate Limiting Bypass** - Header manipulation
20. **Mass Assignment** - Privilege escalation
21. **Black Box Mystery** - Multi-vector exploitation area

## 🔐 Default Credentials

| Role  | Username | Password     |
|-------|----------|--------------|
| Admin | admin    | admin123     |
| User  | alice    | password123  |
| User  | bob      | password456  |

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18+
- **Database**: SQLite 5.1+
- **Template Engine**: EJS 3.1+
- **Authentication**: JWT, express-session
- **Containerization**: Docker, Docker Compose

## 📊 Project Statistics

- **Total Challenges**: 21
- **Documentation**: 2,000+ lines across 5 guides
- **Test Coverage**: 16 automated tests (100% pass rate)
- **Code Lines**: 1,400+ lines of intentionally vulnerable code
- **API Endpoints**: 30+ vulnerable endpoints

## 🎯 Learning Path

### For Beginners
1. Start with [LAB_EXERCISES.md](sambhav/docs/LAB_EXERCISES.md) - Beginner section
2. Complete SQL Injection and Access Control challenges
3. Move to XSS and IDOR exercises

### For Intermediate
1. Explore OWASP Top 10 challenges
2. Complete [CTF_GUIDE.md](sambhav/docs/CTF_GUIDE.md) walkthroughs
3. Practice with Learning Studio

### For Advanced
1. Tackle [ADVANCED_RED_TEAM.md](sambhav/docs/ADVANCED_RED_TEAM.md) challenges
2. Explore Black Box mystery area
3. Complete full exploitation chains

## 🏆 Capture the Flag

Track your progress by capturing flags from all 21 challenges:

- **Easy Challenges** (5): 100 points each
- **Medium Challenges** (7): 200 points each
- **Hard Challenges** (5): 300 points each
- **Expert Challenges** (4): 400-500 points each

**Total Available Points**: 3,700

## 🤝 Contributing

This is an educational project. Contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Add new challenges or improve documentation
4. Submit a pull request

## 📖 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)
- [DVWA - Damn Vulnerable Web Application](https://github.com/digininja/DVWA)
- [OWASP Juice Shop](https://github.com/juice-shop/juice-shop)

## ⚖️ Legal Disclaimer

This project is intended solely for educational purposes. Users must:

- Only use in controlled lab environments
- Never attack systems without authorization
- Follow responsible disclosure practices
- Comply with all applicable laws and regulations

The authors assume no liability for misuse of this software.

## 📧 Support

For questions or issues:
- Open an [issue](https://github.com/amansky404/sambhav/issues)
- Review the [documentation](sambhav/docs/)
- Check existing issues for solutions

## 🙏 Acknowledgments

- OWASP Foundation for security resources
- DVWA and Juice Shop for inspiration
- Security community for vulnerability research
- All contributors and testers

---

**Built with ❤️ for security education | Made in India 🇮🇳**

**Happy Ethical Hacking! 🎯🔒**

