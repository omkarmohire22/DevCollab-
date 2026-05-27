import fs from 'fs';
import path from 'path';

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        searchDir(fullPath, query);
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(query)) {
          console.log(`Found in: ${fullPath}`);
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes(query)) {
              console.log(`  Line ${idx + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  }
}

const root = 'c:\\Users\\omkar\\Downloads\\DevCollabfinal\\frontend\\src';
console.log('Searching for .from("profiles").select...');
searchDir(root, '.from("profiles")');
searchDir(root, ".from('profiles')");
