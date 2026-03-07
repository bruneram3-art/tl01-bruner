const fs = require('fs');
const http = require('http');

const data = fs.readFileSync('C:/Users/40000398/OneDrive - ArcelorMittal/Desktop/n8n/update_n8n_full.json');

const options = {
    hostname: '127.0.0.1',
    port: 5678,
    path: '/api/v1/workflows/E3Gaewry5V6jxWUW',
    method: 'PUT',
    headers: {
        'X-N8N-API-KEY': 'n8n_api_9f5cb88f72d5cfaeeb437ea81ff8f8287756f70ac005b768e7af5598fbef84d7204fc728d8ed2a0ff9f928e07897da22',
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    let responseBody = '';
    res.on('data', (chunk) => {
        responseBody += chunk;
    });
    res.on('end', () => {
        console.log(responseBody);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
