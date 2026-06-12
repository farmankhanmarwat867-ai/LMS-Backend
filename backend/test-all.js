const { execSync } = require('child_process');

const tests = [
  'test-phase16.js',
  'test-phase17.js',
  'test-phase18.js',
  'test-phase19.js',
  'test-phase21.js',
  'test-phase22.js',
  'test-phase23.js',
  'test-phase24.js',
  'test-phase26.js'
];

let failedTests = [];

console.log('── Running Full Project API Suite ─────────────────────────\n');

for (const test of tests) {
  try {
    console.log(`Executing ${test}...`);
    // suppress env loading logs but keep actual test output
    execSync(`node ${test}`, { stdio: 'inherit', env: { ...process.env, DOTENV_KEY: '' } });
  } catch (error) {
    console.error(`\n❌ ${test} FAILED.`);
    failedTests.push(test);
  }
}

console.log('\n── Test Suite Summary ─────────────────────────────────────\n');
if (failedTests.length === 0) {
  console.log('🎉 ALL PROJECT APIs ARE WORKING PERFECTLY! (0 Fails)');
} else {
  console.log(`❌ Some APIs are failing: ${failedTests.join(', ')}`);
}
