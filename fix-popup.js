const fs = require('fs');
const p = './components/AgentDashboard.js';
let c = fs.readFileSync(p, 'utf8');

const oldLine = "    Alert.alert('Saved', `\${validItems.length} item(s) recorded at \${storeInput}.`);";

if (!c.includes(oldLine)) {
  console.log('ERROR: exact line not found');
  process.exit(1);
}

const newBlock = `    if (Platform.OS === 'web') {
      window.alert(\`Saved — \${validItems.length} item(s) recorded at \${storeInput}.\`);
    } else {
      Alert.alert('Saved', \`\${validItems.length} item(s) recorded at \${storeInput}.\`);
    }`;

fs.writeFileSync(p + '.bak3', c);
c = c.replace(oldLine, newBlock);
fs.writeFileSync(p, c);
console.log('✅ Replaced. Backup at .bak3');
