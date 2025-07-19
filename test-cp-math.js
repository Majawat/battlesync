// Quick test to verify command point calculation fix
const { CommandPointService } = require('./dist/services/commandPointService');

console.log('=== Command Point Math Verification ===');
console.log('Testing with 2520 point army (should be 8 CP with Fixed method)');
console.log('');

// Test the specific case mentioned
const result = CommandPointService.calculateCommandPoints(2520, 'fixed');
console.log('Result:', result);
console.log('');
console.log('Expected: 8 CP');
console.log('Actual:', result.totalCommandPoints, 'CP');
console.log('✅ Correct:', result.totalCommandPoints === 8 ? 'YES' : 'NO');
console.log('');

// Test other point values
const testCases = [
  { points: 1000, expected: 4, method: 'fixed' },
  { points: 1500, expected: 4, method: 'fixed' },
  { points: 2000, expected: 8, method: 'fixed' },
  { points: 2999, expected: 8, method: 'fixed' },
  { points: 3000, expected: 12, method: 'fixed' },
  { points: 1000, expected: 1, method: 'growing' },
  { points: 2000, expected: 2, method: 'growing' }
];

console.log('=== Additional Test Cases ===');
testCases.forEach(test => {
  const result = CommandPointService.calculateCommandPoints(test.points, test.method);
  const correct = result.totalCommandPoints === test.expected;
  console.log(`${test.points}pts (${test.method}): Expected ${test.expected}, Got ${result.totalCommandPoints} ${correct ? '✅' : '❌'}`);
});