var Koa = require('koa');
var Router = require('koa-router');
const mockMiddleware = require("../src/index.js");

var app = new Koa();
var router = new Router();

router.use('/index', function (req, res) {
  res.end('index')
})

router.get('/index1', function (req, res) {
  res.end('index')
})

// app.use(router.routes())
console.log(router.routes().router.stack)


app.use(mockMiddleware())

const server = app.listen(8006, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("应用实例，访问地址为 http://%s:%s", host, port)

})