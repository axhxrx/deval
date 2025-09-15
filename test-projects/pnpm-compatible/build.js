const fs = require('fs');
const path = require('path');

console.log('Building pnpm-compatible project...');

// Create a dist directory
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir))
{
  fs.mkdirSync(distDir);
}

// Copy main file to dist
const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
fs.writeFileSync(path.join(distDir, 'index.js'), source);

console.log('Build complete! Output in dist/');
console.log('Files created:', fs.readdirSync(distDir));
