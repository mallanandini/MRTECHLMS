import fs from 'fs';
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.match(/app\.(get|post|put|delete)\(['"]\/api/)) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
});
