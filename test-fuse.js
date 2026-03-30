const Fuse = require('fuse.js');
console.log(typeof Fuse);
console.log(typeof Fuse.default);
try {
  new Fuse([], {});
  console.log('Success');
} catch (e) {
  console.log('Error:', e.message);
}
