const { execSync } = require('child_process');
try {
  const output = execSync('git diff HEAD', { encoding: 'utf-8' });
  console.log(output);
} catch (error) {
  console.error(error.message);
}
