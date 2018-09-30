const {
  existsSync,
  realpathSync
} = require('fs');
const {
  resolve
} = require('path');
const url = require('url');
const assert = require('assert');
const chokidar = require('chokidar');
const chalk = require('chalk');
const proxy = require('koa-proxies')

var Router = require('koa-router');
var router = new Router();



const debug = require('debug')('koa:mock');

const appDirectory = realpathSync(process.cwd());


let error = null;
const configFile = resolveApp('.mock.js');
const mockDir = resolveApp('./mock/');

function resolveApp(relativePath) {
  return resolve(appDirectory, relativePath);
}

function getConfig() {
  if (existsSync(configFile)) {
    // disable require cache
    Object.keys(require.cache).forEach(file => {
      if (file === configFile || file.indexOf(mockDir) > -1) {
        debug(`delete cache ${file}`);
        delete require.cache[file];
      }
    });
    return require(configFile);
  } else {
    return {};
  }
}

function createMockHandler(method, path, value) {
  const fn = function (...args) {

    const ctx = args[0];
    if (typeof value === 'function') {
      value(...args);
    } else {
      ctx.body = value;
    }
  };
  return fn;
}

function createProxy(method, pathPattern, target) {

  const parsedUrl = url.parse(target);
  const realTarget = [parsedUrl.protocol, parsedUrl.host].join('//');
  const targetPath = parsedUrl.path;

  return (ctx, next) => {
    return proxy(pathPattern, {
      target: realTarget,
      changeOrigin: true,
      rewrite: path => {
        let matchPath = ctx.originalUrl;
        const matches = matchPath.match(pathPattern);

        if (matches.length > 1) {
          matchPath = matches[1];
        }

        return path.replace(ctx.originalUrl.replace(matchPath, ''), targetPath);
      }
    })(ctx, next);
  };
}

function startMock() {
  try {
    realApplyMock();
    error = null;
  } catch (e) {
    console.log(e);
    error = e;

    outputError();

    const watcher = chokidar.watch([configFile, mockDir], {
      ignored: /node_modules/,
      ignoreInitial: true,
    });
    watcher.on('change', path => {
      console.log(
        chalk.green('CHANGED'),
        path.replace(appDirectory, '.'),
      );
      watcher.close();
      startMock();
    });
  }
}

function realApplyMock() {
  const config = getConfig();

  const proxyRules = [];
  const mockRules = [];


  Object.keys(config).forEach(key => {
    const keyParsed = parseKey(key);
    assert(!!router[keyParsed.method], `method of ${key} is not valid`);
    assert(
      typeof config[key] === 'function' ||
      typeof config[key] === 'object' ||
      typeof config[key] === 'string',
      `mock value of ${key} should be function or object or string, but got ${typeof config[
        key
      ]}`,
    );
    if (typeof config[key] === 'string') {
      let {
        path
      } = keyParsed;
      if (/\(.+\)/.test(path)) {
        path = new RegExp(`^${path}$`);
      }
      proxyRules.push({
        path,
        method: keyParsed.method,
        target: config[key],
      });
    } else {
      mockRules.push({
        path: keyParsed.path,
        method: keyParsed.method,
        target: config[key],
      });
    }

  });

  proxyRules.forEach(proxy => {
    router[proxy.method]('koaMockMiddleware', proxy.path, createProxy(proxy.method, proxy.path, proxy.target))
  });

  mockRules.forEach(mock => {
    router[mock.method]('koaMockMiddleware', mock.path, createMockHandler(mock.method, mock.path, mock.target))
  });

  const watcher = chokidar.watch([configFile, mockDir], {
    ignored: /node_modules/,
    persistent: true,
  });
  watcher.on('change', path => {
    console.log(chalk.green('CHANGED'), path.replace(appDirectory, '.'));
    watcher.close();

    // 删除旧的 mock api
    // 调整 stack，把 historyApiFallback 放到最后
    const historyApiStack = [];
    router.routes().router.stack.forEach((item, index) => {
      if (item.name !== 'koaMockMiddleware') {
        historyApiStack.push(item)
      }
    });

    router.routes().router.stack = [].concat(historyApiStack);

    startMock();
  });
}

function parseKey(key) {
  let method = 'get';
  let path = key;

  if (key.indexOf(' ') > -1) {
    const splited = key.split(' ');
    method = splited[0].toLowerCase();
    path = splited[1];
  }

  return {
    method,
    path
  };
}

function outputError() {
  if (!error) return;

  const filePath = error.message.split(': ')[0];
  const relativeFilePath = filePath.replace(appDirectory, '.');
  const errors = error.stack
    .split('\n')
    .filter(line => line.trim().indexOf('at ') !== 0)
    .map(line => line.replace(`${filePath}: `, ''));
  errors.splice(1, 0, ['']);

  console.log(chalk.red('Failed to parse mock config.'));
  console.log();
  console.log(`Error in ${relativeFilePath}`);
  console.log(errors.join('\n'));
  console.log();
}

module.exports = function (req, res) {
  startMock();

  return router.routes();
}