const fs = require('fs');
const path = './components/AgentDashboard.js';

const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Find ALL occurrences of the landmark comment
const marker = '// Skip the offline queue on web';
const markerLines = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(marker)) markerLines.push(i);
}

console.log('Found', markerLines.length, 'occurrence(s) of the marker.');
console.log('Line numbers (1-indexed):', markerLines.map(i => i + 1));

if (markerLines.length < 2) {
  console.log('ERROR: Expected 2 occurrences, found', markerLines.length);
  process.exit(1);
}

// The FIRST occurrence is inside submitSale (keep it).
// The SECOND occurrence starts the orphaned block (delete from here).
const deleteStart = markerLines[1];

// Find the END of the orphaned block:
// search forward from deleteStart for a line that is exactly '  };' (2 spaces + };)
// This is the closing of the orphaned function scope.
let deleteEnd = -1;
for (let i = deleteStart; i < lines.length; i++) {
  if (lines[i].trim() === '};') {
    deleteEnd = i;
    break;
  }
}

if (deleteEnd === -1) {
  console.log('ERROR: Could not find end of orphaned block.');
  process.exit(1);
}

console.log(`Deleting lines ${deleteStart + 1} through ${deleteEnd + 1} (0-indexed: ${deleteStart}-${deleteEnd})`);
console.log('First line of deleted block:', JSON.stringify(lines[deleteStart]));
console.log('Last line of deleted block:', JSON.stringify(lines[deleteEnd]));

// Delete the orphaned block
const fixed = [...lines.slice(0, deleteStart), ...lines.slice(deleteEnd + 1)];

// Backup original
fs.writeFileSync(path + '.broken-backup', content, 'utf8');

// Write fixed file
fs.writeFileSync(path, fixed.join('\n'), 'utf8');

console.log('✅ Fixed file written. Original backed up to AgentDashboard.js.broken-backup');
console.log('New file has', fixed.length, 'lines (was', lines.length + ')');
