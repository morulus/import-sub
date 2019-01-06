Import substitution
==

The async function that calculates path redirection according to the specified rules.

This is an auxiliary function for writing plugins, loaders, and other paths resolve mechanisms.

Used in packages:
- [postcss-redirect-import](https://www.npmjs.com/package/postcss-redirect-import)
- [webpack-import-sub-plugin](https://www.npmjs.com/package/webpack-import-sub-plugin)

Usage
--

The resolver accepts rules and options. The rules describe the cases in which user requests should be replaced and to what exactly values they should be replaced. The options describe the detail of a custom query.

```js
const rules = {
  // Describes match case
  match: {
    // Match user request
    request: /\.\/bar\.js$/,
    // Match base directory
    base: /src\/foo$/
  },
  // What we should fo if request has matched
  use: {
    // Keep original request
    // But to substitute base directory
    base: '<root>/src/custom/foo'
  },
}

resolve(rules, {
  // The directory from which the request was made
  base: 'src/foo',
  // Original request
  request: './bar.js',
  // Project root
  root: '/'
})
.then(function(request) {
  // As result, we have substituted a segment
  // between the application root
  // and the user request.
  console.log(request)
  // Log: src/custom/foo/bar.js
})
```

All names used in the rules and the options refer to the specific detail of request.

First of all you need to learn that сonventional names to better understand the contents of the properties.

## Сonventional names

### `request`
Is the string that user specified in quotation marks. For example:
```js
import './bar.js';
```
Where `./bar.js` is our **request**.

It can be matched by regular expression `\/bar\.js$/`.

---

### `base`
The directory from which the request is made. For example:

*The file `src/foo/index.js` requires `./bar.js`.*

Where `src/foo` is our **base**.

It can be strict matched by regular expression `src\/foo`;

---

### `basename` (placeholder)
if `src/foo` is **base**, then `foo` is **basename**.

---

### `root` (placeholder)
The root directory of the project. In typical cases `root` is `process.cwd()`, but can be specified in options.

---

### `id` (placeholder)
Requested filename. If `request` is `./bar.js`, then `id` is `bar.js`.

## Rules

The rule contains at least two properties - `match` and `use`.
The `match` contains instructions for which the request should be matched. The `use` property describes how to substitute a user request.

Both of them can include properties `request` and `base`, where _request_ is a original user request, and `base` is a directory from which request performed.

Each property (request, base) in the `match` section can be either a string or a regular expression.

```js
{
  match: {
    request: 'foo.js',
    base: /bar/
  },
  use: {
    request: 'bar.js',
    base: 'foo'
  }
}
```

And both the `request` and the `base` may be subject to matching and can be substituted.

By matching two values (`request` and `base`) you can determine exactly what file is requested and where from, and the concrete case of the customization.

In `use` section you describes what property of the request should be substituted. You may substitute `request` or `base`, or both of them.

In the simplest view, this works as aliases. But when using regular expressions and placeholders, usage becomes a lot more flexible.

## Options

Options define the values that will be involved in resolving a particular request.

### `root`
The project root. By the default it is `process.cwd()`.

### `request`*

User request (for example, what exactly taped in the `import` statement).

### `base`*

The directory from which the request is made.

### `resolve`

Alternate resolver, which will be called if the current request does not match the rules.

### `originalResolve`

Is the function, which accepts current `request` and `base` and resolve file in original way.

By the default, it is:

```js
function defaultResolver(id, base) {
  return path.resolve(base, id);
}
```

But, if you are use _importSub_ for customizing another resolve function, which already have own resolve logic, you may wish to pre-resolve request, and is this case you should specify this option.

For example, if _importSub_ used with postcss-import `originalResolve` should be imported from `postcss-import/lib/resolve-id.js`.

### `explain` _(function)_

Allows you to specify log function, which will be accept all verbose explanation.

```
explain: console.log
```

## `strict` _(bool)_

If _true_ throws an error if path, returned by redirection, does not exist.

### Placeholders

When you describes the rules you may use a special placeholders in section `use`.

Placeholders are wrapped with characters `<>` and contains values selected from user options or resolved relative it.

All placeholders names correspond to [Сonventional names](#Сonventional-names).

```js
{
  "request": request,
  "root": root,
  "base": base,
  "id": path.parse(request).base,
  "basename": basename,
}
```

Placeholders usage example:

```js
{
  match: {
    request: /\.\/bar\.js$/,
    base: /src\/[^\/]$/
  },
  use: {
    request: '<root>/custom/<basename>/bar.js',
  },
}
```

### Custom placeholders

For more flexible compilation of the path, you can determine the placeholders by yourself. To do that use round brackets in regular expression.

```js
{
  match: {
    request: /\.\/([\w])\.js$/i
  },
  ...
}
```

Then the custom placeholder will get the hash `<request:1>`. If there were more groups, then they would be hashed with the index number `<request:2>`, `<request:3>`, etc.

```js
{
  ...,
  use: {
    request: './<request:0>.jsx'
  }
}
```

You probably already guessed that such capturing groups in the `base` will create the placeholders `<base:1>`, `<base:2>`, etc.

#### Use function

You are allowed to define property `use` as a function. In this case, you may implement the custom logic of path generation.

```js
{
  match: {
    request: /theme\.css$/i
  },
  use: (data) => {
    return path.join(data.base, 'themes/default.css')
  },
}
```

The function accepts an object with comprehensive information about the requested file.

```js
{
  use: ({
    root, // Project root
    base, // Base path
    request, // Use request
    id, // id
    basename, // Name of folder, file required from
  }) => {
    return `custom/path/to/${id}`
  }
}
```

As second argument it accepts internally replace function, which can handle a pattern string with placeholders.

Examples
--

We need to substitute required file `./bar.js` from `src/foo` to `../../custom/foo/bar.js`.

```js
{
  match: {
    request: /\.\/bar\.js$/,
    base: /src\/foo$/
  },
  use: {
    request: '../../custom/foo/bar.js'
  },
}
```

Another way. Using custom `base`.

```js
{
  match: {
    request: /\.\/bar\.js$/,
    base: /src\/foo$/
  },
  use: {
    base: '<root>/custom/foo'
  },
}
```
---

Same situation, but for all modules in `src` folder.

```js
{
  match: {
    request: /\.\/bar\.js$/,
    base: /src\/[^\/]$/
  },
  use: {
    request: '../../custom/<basename>/bar.js',
  },
}
```
Here we use the placeholder `<basename>`, which in this case will have value `foo`.

---

# License

MIT, Vladimir Kalmykov <vladimirmorulus@gmail.com>
