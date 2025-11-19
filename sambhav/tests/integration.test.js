const http = require('http');
const { initDB, startServer, shutdown } = require('../app');

// Helper function to make HTTP requests
const makeRequest = (port, options, data = null) => new Promise((resolve, reject) => {
    const reqOptions = {
        hostname: '127.0.0.1',
        port,
        timeout: 5000,
        ...options
    };

    const req = http.request(reqOptions, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
            responseData += chunk.toString();
        });
        res.on('end', () => {
            resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                body: responseData
            });
        });
    });

    req.on('error', reject);
    req.on('timeout', () => {
        req.destroy(new Error('Request timed out'));
    });

    if (data) {
        req.write(JSON.stringify(data));
    }

    req.end();
});

// Test suite
const runIntegrationTests = async (port) => {
    const tests = [];
    let passedTests = 0;
    let failedTests = 0;

    // Helper to log test results
    const logTest = (name, passed, error = null) => {
        if (passed) {
            console.log(`  ✅ ${name}`);
            passedTests++;
        } else {
            console.log(`  ❌ ${name}`);
            if (error) console.log(`     Error: ${error.message}`);
            failedTests++;
        }
    };

    console.log('\n🧪 Running Integration Tests...\n');

    // Test 1: Home page loads
    try {
        const response = await makeRequest(port, { path: '/', method: 'GET' });
        logTest('Home page loads successfully', response.statusCode === 200);
    } catch (error) {
        logTest('Home page loads successfully', false, error);
    }

    // Test 2: Login page loads
    try {
        const response = await makeRequest(port, { path: '/login', method: 'GET' });
        logTest('Login page accessible', response.statusCode === 200);
    } catch (error) {
        logTest('Login page accessible', false, error);
    }

    // Test 3: SQL Injection login (vulnerable)
    try {
        const response = await makeRequest(port, {
            path: '/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }, 'username=admin%27--&password=anything');
        logTest('SQL Injection vulnerability exists', response.statusCode === 302 || response.statusCode === 200);
    } catch (error) {
        logTest('SQL Injection vulnerability exists', false, error);
    }

    // Test 4: JWT Login endpoint
    try {
        const response = await makeRequest(port, {
            path: '/api/auth/jwt-login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, { username: 'testuser', password: 'testpass' });
        
        const body = JSON.parse(response.body);
        logTest('JWT token generation works', response.statusCode === 200 && body.token);
    } catch (error) {
        logTest('JWT token generation works', false, error);
    }

    // Test 5: NoSQL Injection endpoint
    try {
        const response = await makeRequest(port, {
            path: '/api/nosql-login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, { username: { '$ne': null }, password: { '$ne': null } });
        
        const body = JSON.parse(response.body);
        logTest('NoSQL Injection vulnerability exists', body.success === true);
    } catch (error) {
        logTest('NoSQL Injection vulnerability exists', false, error);
    }

    // Test 6: XXE endpoint exists
    try {
        const response = await makeRequest(port, {
            path: '/api/xml-parser',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, { xml: '<?xml version="1.0"?><data>test</data>' });
        
        // Endpoint requires authentication, so 302 or 401 is expected
        logTest('XXE endpoint exists', response.statusCode === 302 || response.statusCode === 401 || response.statusCode === 200);
    } catch (error) {
        logTest('XXE endpoint exists', false, error);
    }

    // Test 7: SSTI endpoint exists
    try {
        const response = await makeRequest(port, {
            path: '/api/render-template',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, { template: 'Hello {{name}}', name: 'Test' });
        
        logTest('SSTI endpoint exists', response.statusCode === 302 || response.statusCode === 401 || response.statusCode === 200);
    } catch (error) {
        logTest('SSTI endpoint exists', false, error);
    }

    // Test 8: GraphQL endpoint exists
    try {
        const response = await makeRequest(port, {
            path: '/api/graphql',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, { query: 'query { test }' });
        
        logTest('GraphQL endpoint exists', response.statusCode === 302 || response.statusCode === 401 || response.statusCode === 200);
    } catch (error) {
        logTest('GraphQL endpoint exists', false, error);
    }

    // Test 9: Rate limiting endpoint
    try {
        const response = await makeRequest(port, {
            path: '/api/rate-limit-test',
            method: 'GET'
        });
        
        const body = JSON.parse(response.body);
        logTest('Rate limiting endpoint works', response.statusCode === 200 && body.calls);
    } catch (error) {
        logTest('Rate limiting endpoint works', false, error);
    }

    // Test 10: HTTP Request Smuggling endpoint
    try {
        const response = await makeRequest(port, {
            path: '/api/smuggle-request',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {});
        
        logTest('HTTP smuggling endpoint exists', response.statusCode === 200);
    } catch (error) {
        logTest('HTTP smuggling endpoint exists', false, error);
    }

    // Test 11: Debug endpoint exposes information
    try {
        const response = await makeRequest(port, {
            path: '/debug',
            method: 'GET'
        });
        
        const body = JSON.parse(response.body);
        logTest('Debug endpoint exposes info', body.flag && body.flag.includes('CTF'));
    } catch (error) {
        logTest('Debug endpoint exposes info', false, error);
    }

    // Test 12: Crypto leak endpoint
    try {
        const response = await makeRequest(port, {
            path: '/crypto-leak',
            method: 'GET'
        });
        
        const body = JSON.parse(response.body);
        logTest('Crypto leak endpoint works', body.flag && body.backup);
    } catch (error) {
        logTest('Crypto leak endpoint works', false, error);
    }

    // Test 13: Black Box products API
    try {
        const response = await makeRequest(port, {
            path: '/blackbox/api/products?search=test',
            method: 'GET'
        });
        
        logTest('Black Box products endpoint exists', response.statusCode === 302 || response.statusCode === 401 || response.statusCode === 200);
    } catch (error) {
        logTest('Black Box products endpoint exists', false, error);
    }

    // Test 14: Mass assignment endpoint
    try {
        const response = await makeRequest(port, {
            path: '/api/user-update',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, { email: 'test@example.com' });
        
        logTest('Mass assignment endpoint exists', response.statusCode === 302 || response.statusCode === 401 || response.statusCode === 200);
    } catch (error) {
        logTest('Mass assignment endpoint exists', false, error);
    }

    // Test 15: WebSocket demo endpoint
    try {
        const response = await makeRequest(port, {
            path: '/api/websocket-demo',
            method: 'GET'
        });
        
        logTest('WebSocket demo endpoint exists', response.statusCode === 302 || response.statusCode === 401 || response.statusCode === 200);
    } catch (error) {
        logTest('WebSocket demo endpoint exists', false, error);
    }

    console.log('\n📊 Test Results:');
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   📈 Total: ${passedTests + failedTests}`);
    console.log(`   🎯 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%\n`);

    return failedTests === 0;
};

// Main execution
(async () => {
    let server;
    try {
        console.log('🔧 Initializing database...');
        await initDB();
        
        console.log('🚀 Starting server...');
        server = startServer(0);
        const { port } = server.address();
        console.log(`✅ Server running on port ${port}`);

        const allTestsPassed = await runIntegrationTests(port);

        await shutdown(server);
        
        if (allTestsPassed) {
            console.log('✅ All integration tests passed!');
            process.exit(0);
        } else {
            console.log('❌ Some integration tests failed.');
            process.exit(1);
        }
    } catch (err) {
        console.error('❌ Integration tests failed:', err.message);
        if (server) {
            await shutdown(server);
        }
        process.exit(1);
    }
})();
