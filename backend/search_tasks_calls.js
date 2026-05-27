import fs from 'fs';

const content = fs.readFileSync('c:\\Users\\omkar\\Downloads\\DevCollabfinal\\frontend\\src\\pages\\KanbanPage.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('.from("tasks")') || line.includes(".from('tasks')")) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
    // print 5 lines before and after
    console.log('--- Context ---');
    for (let i = Math.max(0, idx - 5); i < Math.min(lines.length, idx + 10); i++) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
    console.log('================');
  }
});
