const { spawnSync } = require('child_process');
const fs = require('fs');
const result = spawnSync('git', ['diff'], { shell: false, encoding: 'utf8' });
if (result.error) {
    console.error(result.error);
} else {
    fs.writeFileSync('diff.txt', result.stdout);
    console.log("Diff written to diff.txt");
}
