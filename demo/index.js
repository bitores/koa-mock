var Koa = require('koa');
const mockMiddleware = require("@huangzj/koa-mock");
const serve = require("koa-static");

var app = new Koa();

app.use(mockMiddleware())


app.use(serve(__dirname + "/html", {
  extensions: ['html']
}));

const server = app.listen(8018, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("应用实例，访问地址为 http://%s:%s", host, port)

})