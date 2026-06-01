const http = require('http');
const path = require('path');

const BASE_URL = 'http://localhost:8080';

function req(method, urlPath) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 8080, path: urlPath, method };
    const reqObj = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    reqObj.on('error', reject);
    reqObj.end();
  });
}

async function run() {
  console.log('--- /health ---');
  const health = await req('GET', '/health');
  console.log(health);

  console.log('--- /metrics (before ingest) ---');
  const metricsBefore = await req('GET', '/metrics');
  console.log(metricsBefore);

  console.log('--- /ingest?id=4500 ---');
  const ingest = await req('GET', '/ingest?id=4500');
  console.log(ingest);

  // Wait for IPC + SQLite
  console.log('--- waiting 2s for IPC+SQLite ---');
  await new Promise((r) => setTimeout(r, 2000));

  console.log('--- /metrics (after ingest) ---');
  const metricsAfter = await req('GET', '/metrics');
  console.log(metricsAfter);

  // Multiple ingests
  console.log('--- Sending 3 more ingests ---');
  const ids = [1, 2, 3];
  for (const id of ids) {
    const r = await req('GET', `/ingest?id=${id}`);
    console.log('ingest', id, 'status', r.status);
  }
  await new Promise((r) => setTimeout(r, 3000));

  console.log('--- /metrics (after 4 ingests) ---');
  const metricsFinal = await req('GET', '/metrics');
  console.log(metricsFinal);

  console.log('--- DONE ---');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
