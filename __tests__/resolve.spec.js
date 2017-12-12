/* eslint no-undef: 0 */
/* eslint no-console: 0 */
"use strict";
jest.mock('fs');
const fs = require('fs');
const path = require('path');
const root = process.cwd();
var resolve = require('../resolve.js');
fs.root = '/';
describe('Match by request', function() {
  beforeAll(function() {
    fs.__setMockFiles([
      'xxx/some/directory/testA1.js',
      'xxx/some/directory/testB1.js',
      'xxx/custom/testA1.js',
      'xxx/custom/testB1.js',
      'xxx/components/Button/style.css',
      'xxx/custom/components/Button/style.css',
      'xxx/components/Button/assets/icon.svg',
      'xxx/custom/svgs/icon.svg'
    ]);
  });
  it('Simple request substitution', function() {
    return resolve([
      {
        match: {
          request: /\.\/testA1\.js/
        },
        use: {
          request: './testB1.js'
        }
      }
    ], {
      base: 'some/directory',
      request: './testA1.js',
      root: '/xxx'
    })
    .then(function(result) {
      expect(result[0]).toBe('/xxx/some/directory/testB1.js');
    });
  });

  it('Relative base substitution', function() {
    return resolve([
      {
        match: {
          request: /\.\/testA1\.js/
        },
        use: {
          base: '../../custom'
        }
      }
    ], {
      base: 'some/directory',
      request: './testA1.js',
      root: '/xxx'
    })
    .then(function(result) {
      expect(result[0]).toBe('/xxx/custom/testA1.js');
    });
  });

  it('Absolute base substitution', function() {
    return resolve([
      {
        match: {
          request: /\.\/testA1\.js/
        },
        use: {
          base: '/xxx/custom'
        }
      }
    ], {
      base: 'some/directory',
      request: './testA1.js',
      root: '/xxx'
    })
    .then(function(result) {
      expect(result[0]).toBe('/xxx/custom/testA1.js');
    });
  });

  it('Base and request substitution', function() {
    return resolve([
      {
        match: {
          request: /\.\/testA1\.js/
        },
        use: {
          base: '../../custom',
          request: './testB1.js'
        }
      }
    ], {
      base: 'some/directory',
      request: './testA1.js',
      root: '/xxx'
    })
    .then(function(result) {
      expect(result[0]).toBe('/xxx/custom/testB1.js');
    });
  });

  it('Base and request with placeholders', function() {
    return resolve([
      {
        match: {
          request: /style\.css/
        },
        use: {
          base: '<root>/custom/components/<basename>',
          request: './<id>'
        }
      }
    ], {
      base: 'components/Button',
      request: './style.css',
      root: '/xxx'
    })
    .then(function(result) {
      expect(result[0]).toBe('/xxx/custom/components/Button/style.css');
    });
  });

  it('Relative request', function() {
    return resolve([
      {
        match: {
          request: /assets\/[a-z0-9]*\.svg/i
        },
        use: {
          base: '<root>/custom/svgs',
          request: './<id>'
        }
      }
    ], {
      base: 'components/Button',
      request: './assets/icon.svg',
      root: '/xxx'
    })
    .then(function(result) {
      expect(result[0]).toBe('/xxx/custom/svgs/icon.svg');
    });
  });

  it('Request out of rules', function() {
    return resolve([
      {
        match: {
          request: /\.\/norules\.svg/i
        },
        use: {
          base: '<root>/custom/data',
          request: './<id>'
        }
      }
    ], {
      base: 'components/Button',
      request: './assets/icon.svg',
      root: '/xxx'
    })
    .then(function(result) {
      expect(result[0]).toBe('./assets/icon.svg');
    });
  });

  it('Custom placeholders', function() {
    return resolve([
      {
        match: {
          base: /components\/([\w]*)$/i,
          request: /\.\/([\w]*)\.css/i
        },
        use: {
          base: '<root>/custom/components/<base:1>',
          request: './<request:1>.css'
        }
      }
    ], {
      base: 'components/Button',
      request: './style.css',
      root: '/xxx'
    })
    .then(function(result) {
      expect(result[0]).toBe('/xxx/custom/components/Button/style.css');
    });
  });

  it('Unnormalized paths', function() {
    return resolve([
      {
        match: {
          base: /components\/([\w]*)$/i,
          request: /\.\/([\w]*)\.css/i
        },
        use: {
          base: '<root>/custom/components/<base:1>/',
          request: './<request:1>.css'
        }
      }
    ], {
      base: 'components/Button/',
      request: './style.css',
      root: '/xxx/'
    })
    .then(function(result) {
      expect(result[0]).toBe('/xxx/custom/components/Button/style.css');
    });
  });

  it('Exaplain', function() {
    const logStat = [];
    const explainLog = jest.fn(function relog(message) {
      logStat.push(message);
    });
    return resolve([
      {
        match: {
          base: /components\/([\w]*)$/i,
          request: /\.\/([\w]*)\.css/i
        },
        use: {
          base: '<root>/custom/components/<base:1>/',
          request: './<request:1>.css'
        }
      }
    ], {
      base: 'components/Button/',
      request: './style.css',
      root: '/xxx/',
      explain: explainLog
    })
    .then(function(result) {
      expect(explainLog).toHaveBeenCalled();
      expect(logStat).toMatchObject(["", "Import-sub info:", "~: /xxx/", "<request>: ./style.css", "<root>: /xxx/", "<base>: components/Button", "<id>: style.css", "<basename>: Button", ""]);
    });
  });
});
