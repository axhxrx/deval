const _ = require('lodash');

console.log('PNPM Compatible Project');
console.log('Random number:', _.random(1, 100));

const users = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
  { name: 'Charlie', age: 35 },
];

const sorted = _.sortBy(users, 'age');
console.log('Users sorted by age:', sorted);

module.exports = { users, sorted };
