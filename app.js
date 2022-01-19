const Koa = require('koa');
const koaStaticCache = require('koa-static-cache');
const KoaRouter = require('koa-router');
const koaBody = require('koa-body');
const nunjucks = require('nunjucks');
const fs = require('fs');

nunjucks.configure('templates',{
  autoescape:true,
  noCache:true,
  watch:true
})

// let userId = 2;
// let users = [
//   {
//     "userId":1,
//     "userName":"xiaoming"
//   },
//   {
//     "userId":2,
//     "userName":"xiaoli"
//   }
// ]

//nodejs中用require读取json文件会自动转成对象
let users = require('./data/users.json');
let userId = 0;
if (users.length > 0) {
  userId = users[users.length - 1].userId;
}
const app = new Koa();

app.use(koaStaticCache({
  prefix:'/public',
  dir:'./public',
  dynamic:true,
  gzip:true
}));

const router = new KoaRouter();
router.get('/users',async (ctx,next)=>{
  ctx.body = nunjucks.render('users.html',{users});

});

router.get('/add',async (ctx,next)=>{
  ctx.body = nunjucks.render('add.html')
});

router.post('/add',koaBody(),async (ctx,next)=>{
  let {userName} = ctx.request.body;

  users.push({
    userId:++userId,
    userName:userName
  });

  fs.writeFileSync('./data/users.json',JSON.stringify(users));
  ctx.body = '添加成功';
});
app.use(router.routes());

app.listen(8888)