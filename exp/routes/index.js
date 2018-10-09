var express = require('express');
var router = express.Router();
var {keys,aesDecrypt} = require("../utils/aes");
var {MongoClient} = require("mongodb");
var async = require("async");
var {waterfall,parallel,series} = require("async");
var CONN_DB_STR = "mongodb://47.94.9.102:27017/zzx1";
var {dateFormat} = require("../utils/dateFormat")
var {ObjectID} = require("mongodb");

/* GET home page. */
router.get('/', function(req, res, next) {
  var username=req.session.username
  if(username){
    //获取所有的图书量，所有的user人数，所有的评论数，前7个登录用户，前5条评论
    MongoClient.connect(CONN_DB_STR,(err,db)=>{
      var userinfo=db.collection("userinfo")
      var books=db.collection("books")
      var comments=db.collection("comments")
      try{
        console.log("数据库连接成功！")
      parallel({
        userCount:function(callback){
          // callback(null,userinfo.find().count())
          userinfo.find({},{}).toArray(function(err,result){
            callback(null,result.length)
          })
        },
        booksCount:function(callback){
          books.find({},{}).toArray(function(err,result){
            callback(null,result.length)
          })
        },
        commentsCount:function(callback){
          comments.find({},{}).toArray(function(err,result){
            callback(null,result.length)
          })
        },
        userList:function(callback){
          // db.movie.find({},{year:1,title:1,_id:0}).sort({year:1})
            userinfo.find({},{}).sort({enterTime:-1}).limit(7).toArray(function(err,result){
              //这里处理时间转格式
              result.map(function(item){
                item.enterTime = dateFormat(item.enterTime);
              })
              callback(null,result)
            })
        },
        commentsList:function(callback){
          comments.find({},{}).sort({enterTime:-1}).limit(5).toArray(function(err,result){
            //这里处理时间转格式
            result.map(function(item){
              item.enterTime = dateFormat(item.enterTime);
            })
            callback(null,result)
          })
        }
      },function(err,results){
          if(err) throw err
          console.log(results)
          res.render('index', {username,results});
      }
      )
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
//注销
router.get("/loginout",(req,res)=>{
  req.session.username = "" ;
  res.redirect("/")
});


router.get('/register',function(req,res){
  res.render('register',{title:"注册"})
})
router.get('/login',function(req,res){
  console.log(req.query);
  var username;
  if(req.query.username){
    username = aesDecrypt(req.query.username,keys);
  }
  console.log(username);
  res.render("login",{username:username});
})


//全部图书列表
router.get("/bookslist",function(req,res){
  var username=req.session.username
  var isAdmin=req.session.isAdmin

//选择
if(username){
var query =  req.query;
console.log(query)
var key=query.key 
var text=new RegExp(key)
var searchobj={}
if(key){
  searchobj.title=text
}
console.log(searchobj)

var filed = query.filed;
var sort = query.sort;
var obj = {};
if(filed&&sort){
  obj[filed] = sort*1 ;   // obj = {year:1}
}else{
  obj["_id"]=-1
}
console.log(obj);

  var count = 0;  // 总条数 
  var totalPage = 0 ;   // 总页数 
  var pageSize = 7;   // 每页显示的条数 
  var pageNo = req.query['pageNo'] * 1   ||  0;   // 当前激活的页数  
//分页

  var findData = function(db,callback){
    var books = db.collection("books");
    series([
        function(callback){
          books.find({},{}).toArray((err,result)=>{
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
          books.find(searchobj,{}).sort(obj).skip((pageNo-1)*pageSize).limit(pageSize).toArray((err,result)=>{
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
          item.price=item.price.replace("元","")
        })
        res.render('bookslist',{username,result:result[1],count:count,
          totalPage,
          pageNo,
          pageSize,query})
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
  
})


//删除
router.get("/delete",(req,res)=>{
  var username=req.session.username
  var isAdmin=req.session.isAdmin
if(username){
  console.log(isAdmin)
  if(isAdmin==0){
    res.send({msg:"您没有权限删除！",code:0})
  }else if(isAdmin==1){
    var id = req.query.id;
    console.log(id);
    var obj = {};
      if(id!=="-1"){
        obj._id = ObjectID.createFromHexString(id); 
        MongoClient.connect(CONN_DB_STR,(err,db)=>{
          try{
              db.collection("books").remove(obj,(err,result)=>{
                  if(err) throw err;
                  res.send({msg:"删除成功！",code:2});
              })
          }catch(err){
              setError(db,err);
          }
        })
    }else{
      res.send({msg:"只有超级管理员可以删除全部！",code:1})
    }       
  }else if(isAdmin==2){
    var id = req.query.id;
    console.log(id);
    var obj = {};
      if(id!=="-1"){
        obj._id = ObjectID.createFromHexString(id);     
    }
    MongoClient.connect(CONN_DB_STR,(err,db)=>{
      try{
          db.collection("books").remove(obj,(err,result)=>{
              if(err) throw err;
              res.send({msg:"删除成功！",code:2});
          })
      }catch(err){
          setError(db,err);
      }
    })
  }
}else{
  res.send(`
  <script>alert("session过期，请重新登录！");window.location.href="/login"</script>
  `)
}
})

//更新。，编辑
router.get("/update",(req,res)=>{
  var username=req.session.username
  var isAdmin=req.session.isAdmin
  if(username){
    if(isAdmin==0){
      res.send({msg:"您没有权限修改！",code:0})
    }else{
      var query = req.query;
      if(query.title){
      var uid=ObjectID.createFromHexString(query.uid); 
      console.log(query)
      console.log(uid)
      MongoClient.connect(CONN_DB_STR,(err,db)=>{
        try{
          db.collection("books").update(
            {
              _id:uid
            },{
              $set:{
                title:query.title,
                price:query.price,
                author:query.author,
                publisher:query.publisher
            }
            },function(err,result){
              if(err) throw err
              res.send({msg:"更新成功！",code:1})
            }
          )
        }catch(err){
          if(err) throw err
        }
      })
    }else{
      res.send({msg:"至少填个书名吧！",code:2})
    }
    }
  }else{
    res.send(`
  <script>alert("session过期，请重新登录！");window.location.href="/login"</script>
  `)
  }
})

//细节+评论页面,要什么：书的result信息，comments信息，等下再写个post？用waterfall？
//评论表需要什么？username ，bookid ，评论content ， enterTime，booktitle
router.get("/bookdetail",(req,res)=>{
  var username=req.session.username
  var id=ObjectID.createFromHexString(req.query.id)
  if(username){
  MongoClient.connect(CONN_DB_STR,(err,db)=>{
    var books=db.collection("books")
    var comments=db.collection("comments")
    try{
      console.log("detail页面连接数据库成功！")
      series([
        function(callback){
          books.findOne({_id:id},{},function(err,result){
            console.log(result)
            callback(null,result)
          }) 
        },function(callback){
          comments.find({bookid:id},{}).toArray(function(err,result2){
            if(err) throw err
            console.log(result2)
            callback(null,result2)
          })
        }
      ],
        function(err,[result1,result2]){
          if(err) throw err
          console.log(result2)
          result2.map(function(item){
            item.enterTime = dateFormat(item.enterTime);
          })
          res.render("bookdetail",{username,id,bookresult:result1,commentsresult:result2})
        }
      )
    }catch(err){
      if(err) throw err
    }

  })



}else{
  res.send(`
  <script>alert("session过期，请重新登录！");window.location.href="/login"</script>
  `)
}  
})

//评论列表页面
router.get("/commentslist",(req,res)=>{
  var username=req.session.username
  var isAdmin=req.session.isAdmin
  if(username){
    
        var count = 0;  // 总条数 
        var totalPage = 0 ;   // 总页数 
        var pageSize =8;   // 每页显示的条数 
        var pageNo = req.query['pageNo'] * 1   ||  1;   // 当前激活的页数  
        console.log(pageNo);
        var query=req.query
        var obj={}
        if(query.my){
          obj["username"]=username
          pageNo=1
        }
        var findData = function(db,callback){
            var comments = db.collection("comments");
            series([
                function(callback){
                    comments.find(obj,{}).toArray((err,result)=>{
                        if(err) throw err;
                        count = result.length;
                        if(count>0){
                            totalPage = Math.ceil(count/pageSize);
                            console.log(totalPage);
                            pageNo = pageNo <= 1 ? 1 :pageNo;
                            pageNo = pageNo >=totalPage ? totalPage :pageNo;
                            callback(null,true);
                        }else{
                            callback(null,false);
                        }
                    })
                },
                function(callback){
                    comments.find(obj,{}).sort({_id:-1}).skip((pageNo-1)*pageSize).limit(pageSize).toArray((err,result)=>{
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
                findData(db,(result)=>{
                    // console.log(result);
                    var data  = result[1].map((item,index)=>{
                        item.enterTime = dateFormat(item.enterTime);
                        return item;
                    })

                    res.render("commentslist",{
                        result:data,
                        count:count,
                        totalPage,
                        pageNo,
                        pageSize,
                        username,
                        isAdmin,
                    });
                    db.close();
                })

            }catch(err){
                setError(db,"数据库错误");
            }
        })


    // res.render("commentslist",{username})
  }else{
    res.send(`
    <script>alert("session过期，请重新登录！");window.location.href="/login"</script>
    `)
  }
  
})


router.get("/userdetail",(req,res)=>{
  var username=req.session.username
  var isAdmin=req.session.isAdmin
  if(username){
    var username2=req.query.username
    
    var obj={}
    obj["username"]=username2
    console.log(obj)
    MongoClient.connect(CONN_DB_STR,(err,db)=>{
      var userinfo=db.collection("userinfo")
      var books=db.collection("books")
      var comments=db.collection("comments")
      try{
        console.log("数据库连接成功！")
        parallel({
          one:function(callback){
            books.find(obj,{}).toArray(function(err,result){
              console.log(result)
              result.map(function(item){
                item.outTime=dateFormat(item.outTime)
              })
              callback(null,result)
            })
          },
          two:function(callback){
            comments.find(obj,{}).toArray(function(err,result){
              console.log(result)
              result.map(function(item){
                item.enterTime=dateFormat(item.enterTime)
              })
              callback(null,result)
            })
          }
        },function(err,results){
          console.log(isAdmin,username,username2)
          res.render("userdetail",{isAdmin,username,username2,results})
        })
      }catch(err){
        if(err) throw err
      }
    }) 


//mark
    
  }else{
    res.send(`
    <script>alert("session过期，请重新登录！");window.location.href="/login"</script>
    `)
  }
 
})

router.get("/changeAdmin",(req,res)=>{
  var username=req.session.username
  var isAdmin=req.session.isAdmin
  if(username){
    if(isAdmin==2){

      res.render("changeAdmin",{username,msg:"本功能尚未开放……"})
    }else{
      
      res.render("changeAdmin",{username,msg:"仅超级管理员可操作"})
    }  
  }else{
    res.send(`
    <script>alert("session过期，请重新登录！");window.location.href="/login"</script>
    `)
  }
})

//公告栏
router.get("/notice",(req,res)=>{
  var username=req.session.username
  var isAdmin=req.session.isAdmin
  if(username){
    MongoClient.connect(CONN_DB_STR,(err,db)=>{
      try{
        console.log("数据库连接成功！")
        db.collection("notice").find({},{}).sort({_id:-1}).toArray((err,result)=>{
          if(err) throw err
          // result.enterTime=dateFormat(result.enterTime)
          result.map(function(item){
            item.enterTime=dateFormat(item.enterTime)
          })
          res.render("notice",{username,isAdmin,result:result[0]})
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
})




module.exports = router;

