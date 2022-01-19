const Koa = require('koa');
const koaStaticCache = require('koa-static-cache');
const KoaRouter = require('koa-router');
const koaBody = require('koa-body');
const nunjucks = require('nunjucks');
const fs = require('fs');
const mysql = require('mysql2/promise');

nunjucks.configure('templates',{
  autoescape:true,
  noCache:true,
  watch:true
})

let connection = null;


const app = new Koa();

app.use(koaStaticCache({
  prefix:'/public',
  dir:'./public',
  dynamic:true,
  gzip:true
}));

app.use(async (ctx,next)=>{
  if (!connection) {
    connection = await mysql.createConnection({
      host:'localhost',
      user:'root',
      password:'123456',
      database:'test-db'
    })
  }
  
  await next();

})

const router = new KoaRouter();
router.get('/users',async (ctx,next)=>{
  let{gender,age,page} = ctx.request.query;
  let where = "";
  let prepared = [];
  if (gender) {
    where = " where `gender`= ?";
    prepared.push(gender);
  }
  if (age) {
    age = Number(age);
    where += where? 'and `age`< ?':' where `age`< ?';
    prepared.push(age);
  }
  
  let limit = 2;
  page = page || 1;
  let offset = (page - 1) * limit;
  //let sql = "SELECT `id`,`username`,`age`,`gender` FROM users" + where + " order by age asc, id desc";
  // let sql = "SELECT `id`,`username`,`age`,`gender` FROM users limit 2 offset 1";
  //let sql = "SELECT `id`,`username`,`age`,`gender` FROM users limit 1,2";//与上一句等价，但第一个参数代表offset，第二个参数代表limit
  let sqlCount = "select count(`id`) as `count` from `users`";
  let [[{count}]] = await connection.query(sqlCount);
  let pages = Math.ceil(count/limit);

  let sql = "SELECT `id`,`username`,`age`,`gender` FROM users limit ? offset ?";
  prepared = [limit,offset];
  let [users] = await connection.query(sql,prepared);
  ctx.body = nunjucks.render('users.html',{
    users,
    page,
    pages,
    limit,
    offset});

});

router.get('/add',async (ctx,next)=>{
  ctx.body = nunjucks.render('add.html')
});

router.post('/add',koaBody(),async (ctx,next)=>{
  let {username,age,gender} = ctx.request.body;
  //向数据库中添加数据
  /**
   * 如果query执行的是insert into ，那么返回值是一个数组
   * 数组中的第一个值是一个对象（ResultSetHeader）
   * affectedRows：插入的数据条数
   * insertId：插入的数据当前的自增ID
   */
  let {affectedRows,insertId} = await connection.query(
    "insert into `users` (`username`,`age`,`gender`) values (?,?,?)",
    //下面的数组中的每一个值对应替换sql与剧中的每一个?
    [username,age,gender]
  )

  ctx.set('Content-Type','text/html;charset=utf-8');
  ctx.body = '添加成功 <br> <a href="/add">继续添加</a> <br> <a href="/users">返回用户列表</a>';
});

router.get('/edit',koaBody(),async (ctx,next)=>{
  let {id} = ctx.request.query;
  let [[user]] = await connection.query('SELECT `id`,`username`,`age`,`gender` FROM users where `id` = ? ',[id]);
  console.log(user)
  ctx.body = nunjucks.render('edit.html',{user})
});

router.post('/edit',koaBody(),async (ctx,next)=>{
  let {id} = ctx.request.query;
  let {username,age,gender} = ctx.request.body;
  let {affectedRows,insertId} = await connection.query(
    "update `users` set `username`=?,`age`=?,`gender`=? where `id` = ?",
    //下面的数组中的每一个值对应替换sql与剧中的每一个?
    [username,age,gender,id]
  );
  ctx.set('Content-Type','text/html;charset=utf-8');
  ctx.body = `编辑成功 <br> <a href="/edit?id=${id}">继续编辑</a> <br> <a href="/users">返回用户列表</a>`;
});

router.get('/delete',async (ctx,next)=>{
  let {id} = ctx.request.query;
  let sql = "delete from `users` where `id`=?";
  let res = await connection.query(sql,[id]);
  console.log(res)
  ctx.set('Content-Type','text/html;charset=utf-8');
  ctx.body = `删除成功 <br> <a href="/users">返回用户列表</a>`
})
app.use(router.routes());

app.listen(8888)