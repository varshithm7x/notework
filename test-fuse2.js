var __importDefault = function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const fuse_js_1 = __importDefault(require("fuse.js"));
console.log(typeof fuse_js_1.default);
try {
  let f = new fuse_js_1.default([], {});
  console.log('Success with default');
} catch (e) {
  console.log('Error 1:', e.message);
}
