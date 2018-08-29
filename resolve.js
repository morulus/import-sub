var fs = require('fs');
var path = require('path');
var resolve = require('resolve');
var path = require('path');

const defaultExpr = /.*/i;
/**
* Kick empty sufix
*/
function kickEmptySufix(segment, index, all) {
  return index !== all.length - 1 || segment;
}
/**
 * Check Array
 */
function isArray(arrayLike) {
  return typeof arrayLike === 'object'
    && arrayLike instanceof Array
}
/**
 * Flatten Array
 */
function flatten(array) {
  const result = [];
  for (let i = 0; i < array.length; i++) {
    if (isArray(array[i])) {
      for (let q = 0; q < array[i].length; q++) {
        result.push(array[i][q]);
      }
    } else {
      result.push(array[i]);
    }
  }
  return result
}
/**
* - Replace slashes to unix style
* - Remove trailing slash.
*/
function sepToUnix(p) {
  return p
  .split(path.sep)
  .filter(kickEmptySufix)
  .join('/');
}
/**
* Test is file exists
*/
function testFileExists(filename) {
  return fs.existsSync(filename[0]);
}
/**
* Make path with dot if it hasnt. This function assumes in advance that you giving to it a relative path.
*/
function forceRelative(p) {
  if (p.charAt(0) !== '.') {
    return p.charAt(0) === '/' ? p : './'+p;
  }
  return p;
}
/**
* Simple replace string with key:value in placeholders
*/
function replace(pattern, placeholders) {
  /* Support function pattern */
  if (typeof pattern === 'function') {
    return pattern(placeholders)
  }
  for (let prop in placeholders) {
    if (placeholders.hasOwnProperty(prop)) {
      pattern = pattern.replace(prop, placeholders[prop]);
    }
  }
  return pattern;
}
/**
* Resolve path the same way ans postcss-import
*
* @return {Promise}
*/
function resolveAsync(p, base, root) {
  if (!path.isAbsolute(p)) {
    return new Promise(function(r, j) {
      resolve(forceRelative(p), {
        basedir: path.resolve(root, base)
      }, function(err, res) {
        if (err) {
          j(err);
        } else {
          r(res);
        }
      });
    });

  } else {

    return Promise.resolve(p);
  }
}
/**
* Simple resolve path (usign path.resolve)
*/
function resolveSync(p, base, root) {
  if (!path.isAbsolute(p)) {
    p = path.resolve(path.resolve(root, base), p);
  }
  return p;
}
/**
* Object fn surrogate
*/
function object(pairs) {
  let obj = {};
  for (let i = 0;i<pairs.length;++i) {
    obj[pairs[i][0]] = pairs[i][1];
  }
  return obj;
}
/**
* Transform regExpr exec result to hashmap with tagged keys
*/
function matchToHolders(match, tag) {
  return object(match.map(function(val, index) {
    return [tag+":"+index, val];
  }));
}
/**
* Filter rules with `use` prop
*/
function filterValidRule(rule) {
  return (rule.hasOwnProperty('match')&&typeof rule.match === "object")
  && (rule.hasOwnProperty('use') && (
    typeof rule.use === "object"
    || typeof rule.use === "function"
  ))
  && (
    (rule.match.hasOwnProperty('request'))
    || (rule.match.hasOwnProperty('base'))
  )
}
/**
* Merge with defaults
*/
function mapDefaults(rule) {
  return Object.assign({}, rule, {
    match: Object.assign({
      request: defaultExpr,
      base: defaultExpr,
      module: defaultExpr
    }, rule.match),
    use: rule.use,
  });
}
/**
 * Wrap placeholders with scobes
 */
function wrapPlaceholders(placeholders) {
  const keys = Object.keys(placeholders);
  const wrappedPlaceholders = {};

  for (let i = 0; i < keys.length; i++) {
    wrappedPlaceholders['<'+keys[i]+'>'] = placeholders[keys[i]];
  }

  return wrappedPlaceholders;
}

/**
* Select only rules witj extend property
*/
function ruleCheckAppend(rule) {
  return Object.prototype.hasOwnProperty.call(rule, 'append')&&rule.append;
}
/**
* Search module in rules existing
*/
function isRequiresEarlyResolve(rules) {
  for (let i = 0; i < rules.length; ++i) {
    if (
      Object.prototype.hasOwnProperty.call(rules[i], 'module') ||
      (Object.prototype.hasOwnProperty.call(rules[i], 'append') && rules[i].append)
    ) {
      return true;
    }
  }
  return false;
}
/**
* Pick first value from Array<Array>
*/
function pickFirst(item) {
  return item[0];
}
/**
* Pick second value from Array<Array>
*/
function pickSecond(item) {
  return item[1];
}

/**
 * Resolve id with simplify logic
 */
function defaultResolver(id, base) {
  return path.resolve(base, id);
}
/**
 * Resolve substituter
 *
 * @param  {array|object} rules
 * @param  {type} options
 */
module.exports = function resolveSub(rules, options) {
  if (typeof rules !== 'object') {
    throw new TypeError('PostCss redirect import expects rules to be array or object')
  }

  /* Rules must be an array always */
  rules = isArray(rules)
    ? rules
    : [rules];
  /**
   * Explanation
   */
  const explain = typeof options.explain === 'function'
    ? options.explain : false;
  /**
   * Log
   */
  const log = options.log || console.log;
  /**
   * `importOptions`
   * Backward compatibility with postcss-import
   */
  const importOptions = options.importOptions || {};
  /**
   * `isModuleRequired`
   * If `match` contains property `module` or `append` option is enabled,
   * then no matter what we have to resolve path before.
   */
  const isModuleRequired = isRequiresEarlyResolve(rules);
  /**
   * `originalResolve`
   * Options can accept original resolve function (which used by engine).
   */
  const originalResolve = typeof options.originalResolve === 'function' ? options.originalResolve : defaultResolver;
  /**
   * `root`
   */
  const root = options.root || process.cwd();
  /**
   * `request`
   */
  const request = options.request;
  /**
   * `Base`
   *
   * Transforms:
   * - Replace window separate style to unix
   * - Remove trailing slash
   */
  const base = sepToUnix(options.base);
  /**
   * `userResolve`
   * Custom user resolve function.
   */
  const userResolve = options.resolve;
  /**
   * `basename`
   */
  const basename = path.parse(base).base.split('/').pop();
  /**
   * Placeholders
   */
  const placeholders = {
    "request": request,
    "root": root,
    "base": base,
    "id": path.parse(request).base,
    "basename": basename,
  };
  /* Exaplanation */
  if (explain) {
    explain('');
    explain('Import redirect:');
    Object.keys(placeholders).forEach(function(key) {
      explain(key + ': '+ placeholders[key]);
    })
    explain('');
  }
  /**
   * For best performance resolve module right now (only if needed)
   */
  return (isModuleRequired
      ? originalResolve(request, base, importOptions)
      : Promise.resolve('')
  )
  .then(function(module) {
    /**
     * Flow rules
     */
    return [rules
    /**
     * We want only rules with `to` or `path` prop.
     */
    .filter(filterValidRule)
    /**
    * Merge with default expressions (id, base, module)
    */
    .map(mapDefaults)
    /*
    * Test each expression
    */
    .filter(function(rule) {
      return rule.match.request.test(request)
      && rule.match.base.test(base)
      && rule.match.module.test(module);
    }), module];
  })
  .then(function(parcle) {
    return Promise.all(parcle[0].map(function(rule) {
      let resolver;
      /**
       * Match id
       */
      let matchRequest = rule.match.request.exec(request);
      if (matchRequest) {
        Object.assign(placeholders, matchToHolders(matchRequest, 'request'));
      }
      /**
       * Match base
       */
      let matchBase = rule.match.base.exec(base);
      if (matchBase) {
        Object.assign(placeholders, matchToHolders(matchBase, 'base'));
      }
      /**
       * Match module (optional)
       */
      if (isModuleRequired) {
        let matchModule = rule.match.module.exec(parcle[1]);
        if (matchModule) {
          Object.assign(placeholders, matchToHolders(matchModule, 'module'));
        }
      }

      /* Prepare placeholders to use with pattern */
      const wrappedPlaceholders = Object.assign(
        {
          ['~']: root,
        },
        wrapPlaceholders(placeholders)
      )

      if (typeof rule.use === 'function') {
        const customPath = rule.use(placeholders, replace);

        /* Convert into an array */
        const customPaths = isArray(customPath)
          ? customPath
          : [customPath];

        return Promise.all(customPaths.map(function (cp) {
          return resolveAsync(
            cp,
            base,
            root
          ).then(function(file) {
            return [file, rule];
          })
        }));
      } else if (typeof rule.use === 'object') {
        /**
         * Parse aliases and resolve final path
         */
        const customRequest = rule.use.request
          ? replace(rule.use.request, wrappedPlaceholders)
          : request;
        const customBase = rule.use.base
          ? replace(rule.use.base, wrappedPlaceholders)
          : base;
        return resolveAsync(
          customRequest,
          customBase !== base ? resolveSync(customBase, base, root) : customBase,
          root
        ).then(function(file) {
          return [[file, rule]];
        });
      } else {
        throw new TypeError('import-sub expects property `use` to be an object or a function')
      }
    }))
    .then(function(files) {
      return [flatten(files), parcle[1]];
    });
  })
  .then(function(parcle) {
    const files = parcle[0];
    const module = parcle[1];
    const existsFiles = files.filter(testFileExists);
    /**
    * If at least one of file exists, we returns them
    */
    if (existsFiles.length>0) {
      const isAppendModule = (
        existsFiles
        .map(pickSecond)
        .filter(ruleCheckAppend).length>0
      );
      return (isAppendModule ? [module] : []).concat(existsFiles.map(pickFirst));
    } else {
      if (options.strict) {
        console.log('options', options)
        throw new Error('Redirected2 path is not found');
      }
    }
    /**
    * On fail we must check for use resolve function to execute it
    */
    if (userResolve) {
      const userResult = userResolve(request, base, importOptions);
      return userResult instanceof Array
        ? userResult : [userResult];
    }
    /**
    * On total fail just returns id, original engine will decide what to do.
    */
    return [request];
  })
  .catch(function(e) {
    console.warn(e);
    return [request];
  });
}
