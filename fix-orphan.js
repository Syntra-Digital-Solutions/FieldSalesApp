const fs = require('fs');
const path = './components/AgentDashboard.js';
const lines = fs.readFileSync(path, 'utf8').split('\n');

// Find every occurrence of the marker
const marker = '// Skip the offline queue on web';
const markerIdx = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(marker)) markerIdx.push(i);
}
console.log('Marker occurrences at lines (0-indexed):', markerIdx);

// Find every line that is exactly '  };' (a function-scope close)
// The orphaned block starts at the SECOND marker and ends at the FIRST '  };' after it.
if (markerIdx.length < 2) {
  console.log('ERROR: Expected 2 marker occurrences, found', markerIdx.length);
  console.log('This means the file has already been fixed, OR the marker is missing.');
  process.exit(1);
}

const deleteStart = markerIdx[1];
let deleteEnd = -1;
for (let i = deleteStart; i < lines.length; i++) {
  if (lines[i] === '  };') { deleteEnd = i; break; }
}

if (deleteEnd === -1) {
  console.log('ERROR: Could not find closing }; for orphaned block.');
  process.exit(1);
}

console.log(`Deleting lines ${deleteStart + 1} through ${deleteEnd + 1}`);
console.log('  Start:', JSON.stringify(lines[deleteStart]));
console.log('  End:  ', JSON.stringify(lines[deleteEnd]));

fs.writeFileSync(path + '.bak2', lines.join('\n'), 'utf8');
const fixed = [...lines.slice(0, deleteStart), ...lines.slice(deleteEnd + 1)];
fs.writeFileSync(path, fixed.join('\n'), 'utf8');
console.log('✅ Deleted', deleteEnd - deleteStart + 1, 'lines. Backup saved to .bak2');
