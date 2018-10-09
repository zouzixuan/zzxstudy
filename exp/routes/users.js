var express = require('express');
var router = express.Router();
var {MongoClient} = require("mongodb");
var CONN_DB_STR = "mongodb://47.94.9.102:27017/zzx1";
var {waterfall,series} = require("async");
//加密解密
var {keys , aesEncrypt} = require("../utils/aes");
var {dateFormat} = require("../utils/dateFormat")
var {ObjectID} = require("mongodb");
/* GET users listing. */

router.get('/', function(req, res, next) {
  var username=req.session.username
  var isAdmin=req.session.isAdmin
  if(username){

var query =  req.query;
var key=query.key 
var text=new RegExp(key)
var searchobj={}
if(key){
  searchobj.username=text
}
console.log(searchobj)

var filed = query.filed;
var sort = query.sort;
var obj = {isAdmin:-1};
if(filed&&sort){
  obj={}
  obj[filed] = sort*1 ;   // obj = {year:1}
}
console.log(obj);

  var count = 0;  // 总条数 
  var totalPage = 0 ;   // 总页数 
  var pageSize = 7;   // 每页显示的条数 
  var pageNo = req.query['pageNo'] * 1   ||  0;   // 当前激活的页数  
//分页

  var findData = function(db,callback){
    var userinfo = db.collection("userinfo");
    series([
        function(callback){
          userinfo.find({},{}).toArray((err,result)=>{
                if(err) throw err;
                count = result.length;
                if(count>0){
                    totalPage = Math.ceil(count/pageSize);
                    console.log(totalPage);
                    pageNo = pageNo <= 1 ? 1 :pageNo;
                    pageNo = pageNo >=totalPage ? totalPage :pageNo;
                    callback(null,true);
                }else{
                  callback(null,false)
                }
            })
        },
        function(callback){
          userinfo.find(searchobj,{}).sort(obj).skip((pageNo-1)*pageSize).limit(pageSize).toArray((err,result)=>{
                if(err) throw err;
                console.log("查询当前页面数据成功 ");
                callback(null,result);
            })
        }
    ],function(err,result){
        if(err) throw err;    
        callback(result)
    })
  }

  MongoClient.connect(CONN_DB_STR,(err,db)=>{
    try{
      console.log("数据库连接成功！")
      findData(db,(result)=>{
        // console.log(result[1])
        result[1].map(function(item){
          item.enterTime=dateFormat(item.enterTime)
        })
        res.render('userslist',{username,result:result[1],count:count,
          totalPage,
          pageNo,
          pageSize,isAdmin,query})
      })
    }catch(err){
      if(err) throw err
    }
  })





  }else{
    res.send(`
    <script>alert("session过期，请重新登录！");window.location.href="/login"</script>
    `)
  }
});
//注册

router.post('/register',function(req,res){
  var body = req.body;
  console.log(body);

  var insertData = function(db,callback){
    var userinfo = db.collection("userinfo");
    waterfall([
      function(callback){
        userinfo.findOne({username:body.username},(err,result)=>{
          if(err) throw err;
          if(result){
            callback(null,false)  //已经被注册了
          }else{
            callback(null,true)   //可以注册哦！
          }
        })
      },function(arg,callback){
        if(arg){
          body.enterTime = new Date();
          body.isAdmin=0
          userinfo.insert(body,(err,result)=>{
            if(err) throw err;
            callback(null,{code:1,msg:"注册成功"})
          })
        }else{
          callback(null,{code:0,msg:"用户名已经存在！"})
        }
      }
    ],function(err,result){
      if(err) throw err;
        callback(result);
    }
    )
  }

  MongoClient.connect(CONN_DB_STR,(err,db)=>{
      try{
        console.log("注册数据库连接成功")
        insertData(db,(result)=>{
          console.log(result)
          if(result.code=="1"){
            res.redirect("/login?username="+aesEncrypt(body.username,keys));
          }else{
            res.send("<script>alert('用户名已经被注册,请重新注册');window.location.href='/register'</script>")
          }
        })
      }catch(err){
        if(err) throw err
      }
  })
})

//登录  
router.post("/login",function(req,res){
  var body = req.body;
  console.log(body);

  var loginData=function(db,callback){
    var userinfo=db.collection("userinfo")

    series([
      function(callback){
        userinfo.update(body,{
          $set:{
            enterTime:new Date()
          }
        },(err,result)=>{
          if(err) throw err
          callback(null,result)
        })
      },
      function(callback){
        userinfo.findOne(body,(err,result)=>{
          if(err) throw err;
          callback(null,result);
        })
      },function(callback){
        userinfo.findOne(body,(err,result)=>{
          if(err) throw err;
          if(result){
          callback(null,result.isAdmin);
        }else{
          callback(null,false)
        }
        })
      }
    ],
      function(err,result){
        if(err) throw err
        callback(result)
      }
    )
    
  }
  MongoClient.connect(CONN_DB_STR,(err,db)=>{
    console.log("登录连接数据库成功！")
    try{
      loginData(db,(result)=>{
        console.log(result[1]) 
        if(result[1]){
          req.session.username = body.username;
          // console.log(result[2])
          req.session.isAdmin = result[2]
          res.redirect("/")
        }else{
          res.send(`<script>alert('登录失败,请重新登录');window.location.href='/login?username=${aesEncrypt(body.username,keys)}' </script>"`)
        }
      })
    }catch(err){
      if(err) throw err
    }
  })
})

router.get("/delete",(req,res)=>{
  var username=req.session.username
  var isAdmin=req.session.isAdmin
  if(username){
    var id = req.query.id;
    var obj={}
    obj._id = ObjectID.createFromHexString(id); 
    MongoClient.connect(CONN_DB_STR,(err,db)=>{
      try{
          db.collection("userinfo").remove(obj,(err,result)=>{
              
              if(err) throw err;
              
              res.send({msg:"删除成功！",code:2});
          })
      }catch(err){
          setError(db,err);
      }
    })
  }else{
    res.send(`
    <script>alert("session过期，请重新登录！");window.location.href="/login"</script>
    `)
  }
})

//用户详情界面，包含 我的评论   我的借阅  如果是自己的就多个修改密码框


//修改密码
router.post("/changeUserpwd",(req,res)=>{
  var username=req.session.username
  var body=req.body
  console.log(body)
  if(username){


    var changePwdData = function(db,callback){
      var userinfo = db.collection("userinfo");
      waterfall([
        function(callback){
          userinfo.findOne({userpwd:body.userpwd},(err,result)=>{
            if(err) throw err;
            if(result){
              callback(null,true)  //找到了，说明原来密码对了，可以改密码
            }else{
              callback(null,false)   //没找到，返回原密码错误
            }
          })
        },function(arg,callback){
          if(arg){
            userinfo.updateOne({username:username},{
              $set:{userpwd:body.newuserpwd}
            },function(err,result){
              callback(null,{code:1,msg:"密码修改成功！"})
            })


          }else{
            callback(null,{code:0,msg:"原密码错误！"})
          }
        }
      ],function(err,result){
        if(err) throw err;
          callback(result);
      }
      )
    }


    if(body.userpwd&&body.newuserpwd){
      MongoClient.connect(CONN_DB_STR,(err,db)=>{
        try{
          //先判断原密码对不对，对的话，update密码（类似注册）
          console.log("数据库连接成功")
          changePwdData(db,(result)=>{
            console.log(result)
            if(result.code==0){
              res.send(`
    <script>alert("原密码错误！");window.location.href="/userdetail?username=${username}"</script>
    `)
            }else{
              res.send(`
              <script>alert("密码修改成功！");window.location.href="/userdetail?username=${username}"</script>
              `)
            }
            // if(result.code=="1"){
            //   res.redirect("/login?username="+aesEncrypt(body.username,keys));
            // }else{
            //   res.send("<script>alert('用户名已经被注册,请重新注册');window.location.href='/register'</script>")
            // }
          })
        }catch(err){
          if(err) throw err
        }
      })
    }else{
      res.send(`
    <script>alert("请输入密码");window.location.href="/userdetail?username=${username}"</script>
    `)
    }
  }else{
    res.send(`
    <script>alert("session过期，请重新登录！");window.location.href="/login"</script>
    `)
  }
})
module.exports = router;