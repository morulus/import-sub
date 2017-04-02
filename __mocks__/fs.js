/* eslint no-undef: 0 */
'use strict';
const path = require('path');
const fs = jest.genMockFromModule('fs');
const root = process.cwd();
let mockFiles = Object.create(null);

/**
* The path of the files must be relative to root (process.cwd())
*/
function __setMockFiles(newMockFiles) {
  mockFiles = Object.create(null);
  newMockFiles.forEach(function(file) {
    file = path.normalize(file);
    const dir = path.dirname(file);
    if (!mockFiles[dir]) {
      mockFiles[dir] = [];
    }
    mockFiles[dir].push(path.basename(file));
  });
}

function stat(file, cb) {
  if (this.existsSync(file)) {
    cb(null, {
      isFile: function() { return true; }
    });
  } else {
    cb(new Error("Not a file "+file), null);
  }
}

fs.__setMockFiles = __setMockFiles;
fs.existsSync = function existsSync(file) {
  file = this._normalize(file);
  const dir = path.dirname(file);
  return Boolean(mockFiles[dir] && mockFiles[dir].includes(path.basename(file)));
};
fs._normalize = function normalize(file) {
  return path.relative(this.root || root, path.normalize(file));
}
fs.stat = stat;
fs.readFile = function(file, cb) { cb('body {}'); }

module.exports = fs;
