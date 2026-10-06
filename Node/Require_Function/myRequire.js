const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const cache = {};

function myRequire(filename) {
  // 1. Convert relative path to absolute path
  const absolutePath = path.resolve(filename);

  // 2. Check cache
  if (cache[absolutePath]) {
    return cache[absolutePath].exports;
  }

  // 3. Read the JavaScript file
  const code = fs.readFileSync(absolutePath, 'utf-8');

  // 4. Create module object
  const module = {
    exports: {}
  };

  // 5. Wrap the module code
  const wrappedCode = `
    (function(exports, module, require) {
      ${code}
    })
  `;

  // 6. Convert string into a function
  const script = new vm.Script(wrappedCode);

  const wrapperFunction = script.runInThisContext();

  // 7. Cache module before executing
  cache[absolutePath] = module;

  // 8. Execute module
  wrapperFunction(
    module.exports,
    module,
    myRequire
  );

  // 9. Return exports
  return module.exports;
}

module.exports = {
  myRequire
};