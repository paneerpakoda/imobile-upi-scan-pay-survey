const fs = require('fs');
const rules = fs.readFileSync('dist/rules.js', 'utf8').trim() + '\n';
const server = fs.readFileSync('backend/server.js', 'utf8').trim() + '\n';
fs.writeFileSync('backend/Code.gs', rules + server);
console.log('Successfully generated backend/Code.gs');
