'use strict';
const Koa = require('koa');
const path = require('path');
const cors = require('kcors');
const Pug = require('koa-pug');
const i18n = require('koa-i18n');
const views = require('koa-views');
const koaBody = require('koa-body');
const serve = require('koa-static');
const locale = require('koa-locale');
const helmet = require('koa-helmet');
const logger = require('koa-logger');
const router = require('koa-router')();
const parameter = require('koa-parameter');
const enforceHttps = require('koa-sslify');
const config = require('./config.js');
const app = new Koa();

locale(app);

if (process.env.NODE_ENV === 'production') {
  app.use(enforceHttps({ trustProtoHeader: true, trustAzureHeader: true }));  // Automatically redirects to an HTTPS address
}

app
  //  It provides important security headers to make your app more secure by default.
  .use(helmet({ noCache: true, referrerPolicy: true }))
  // Enable ALL CORS Requests
  .use(cors({
    origin: '*',
    maxAge: 24 * 60 * 60,
    methods: [ 'GET', 'PUT', 'DELETE', 'POST', 'PATCH', 'OPTIONS' ],
    allowedHeaders: [ 'Content-Type' ]
  }))
  .use(logger())
  .use(koaBody())
  .use(views(__dirname, { extension: 'pug' }))
  .use(serve(path.join(__dirname, 'public')))
  .use(router.routes())
  .use(router.allowedMethods({ throw: true }))
  .use(parameter(app))
  .use(i18n(app, {
    locales: [ 'us' ],
    extension: '.json',
    modes: [
      'query',                //  optional detect querystring - `/?locale=en-US`
      'header',               //  optional detect header      - `Accept-Language: zh-CN,zh;q=0.5`
      'url'                   //  optional detect url         - `/en`
    ]
  }));

const pug = new Pug({
  viewPath: './views',
  debug: process.env.NODE_ENV === 'development'
});
pug.use(app);

const index = require('./routes/index.js');
const user = require('./routes/user.js');
index(router);
user(router);

app.on('error', (err, ctx) => {
  try {
    const statusCode = ctx.status || 500;
    if (statusCode === 500) {
      console.error(err.stack || err);
    }
    ctx.response.status = statusCode;

    // 預設不輸出異常詳情
    let error = {};
    ctx.response.body = {
      extra: error,
      status: ctx.response.status,
      level: 'error',
      message: 'unexpected error'
    };
  } catch (error) {
    console.error('Error handle fail :', error);
  }
});

const PORT = config ? config.port : 3000;
app.listen(PORT, () => {
  console.info('===========================================');
  console.info(`===== Server is running at port: ${PORT} =====`);
  console.info('===========================================');

  // 註冊全域未捕獲異常的處理器
  process.on('uncaughtException', (err) => {
    console.error('Caught exception: ', err.stack);
  });
  process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at: Promise ', p, ' reason: ', reason.stack);
  });
});
