// HTTPS proxy for local dev server — provides HTTPS to iPhone on same WiFi
// Run: node https-proxy.js
// Then iPhone visits: https://10.0.0.3:3443

const https = require('https');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

const TARGET = 'http://localhost:3000';
const HTTPS_PORT = 3443;

// Generate a self-signed cert on the fly
function generateCert() {
  const { execSync } = require('child_process');
  // Write a config for OpenSSL
  const config = `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no
[req_distinguished_name]
CN = 10.0.0.3
[v3_req]
subjectAltName = IP:10.0.0.3
`;
  fs.writeFileSync('/tmp/openssl.cnf', config);
  
  execSync(
    'openssl req -x509 -nodes -days 365 -newkey rsa:2048 ' +
    '-keyout /tmp/localhost.key -out /tmp/localhost.crt ' +
    '-config /tmp/openssl.cnf',
    { stdio: 'pipe' }
  );
  
  return {
    key: fs.readFileSync('/tmp/localhost.key'),
    cert: fs.readFileSync('/tmp/localhost.crt'),
  };
}

const cert = generateCert();
console.log('Generated self-signed cert for 10.0.0.3');

const server = https.createServer(cert, (req, res) => {
  const proxyReq = http.request(TARGET + req.url, { method: req.method, headers: req.headers }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  req.pipe(proxyReq);
  
  proxyReq.on('error', (e) => {
    console.error('Proxy error:', e.message);
    res.writeHead(502);
    res.end('Proxy error: ' + e.message);
  });
});

server.listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`HTTPS proxy running on https://10.0.0.3:${HTTPS_PORT}`);
  console.log('Visit this URL on your iPhone (accept the self-signed cert warning)');
});
