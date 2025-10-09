const http = require('http');
const { initDB, startServer, shutdown } = require('../app');

const requestHome = (port) => new Promise((resolve, reject) => {
    const req = http.get({
        hostname: '127.0.0.1',
        port,
        path: '/',
        timeout: 5000
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk.toString();
        });
        res.on('end', () => {
            if (res.statusCode !== 200) {
                reject(new Error(`Expected 200 response, got ${res.statusCode}`));
                return;
            }

            if (!data.includes('Sambhav Security Lab')) {
                reject(new Error('Home page did not render expected content.'));
                return;
            }

            resolve();
        });
    });

    req.on('error', reject);
    req.on('timeout', () => {
        req.destroy(new Error('Request to home page timed out.'));
    });
});

(async () => {
    try {
        await initDB();
        const server = startServer(0);
        const { port } = server.address();

        await requestHome(port);

        await shutdown(server);
        console.log('✅ Smoke test passed: server responded to GET /.');
    } catch (err) {
        console.error('❌ Smoke test failed:', err.message);
        process.exit(1);
    }
})();
