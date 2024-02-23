const Koa = require('koa');
const Router = require('@koa/router');
const { koaBody } = require('koa-body');
const koaStatic = require('koa-static');
const path = require('path');

const app = new Koa();
const router = new Router();

app
  .use(koaStatic(path.join(__dirname, '../static')))
  .use(koaBody())
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(3000, () => {
  console.log('server is started: http://localhost:3000')
});

module.exports = app;
