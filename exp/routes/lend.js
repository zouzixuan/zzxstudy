var express = require("express");
var router = express.Router();
var {MongoClient} = require("mongodb");
var CONN_DB_STR = "mongodb://47.94.9.102:27017/zzx1";
var {waterfall,series,parallel} = require("async");
var {setError,send} = require("../utils/error")
var {dateFormat} = require("../utils/dateFormat");
var {ObjectID} = require("mongodb");  // 处理 _id  
var multiparty = require('multiparty');   // 处理图片请求 

router.get("/",(req,res)=>{
    var username=req.session.username
    var isAdmin=req.session.isAdmin
    if(username){
        
        var query =  req.query;
        var key=query.key 
        var text=new RegExp(key)
        var searchobj={}
        if(key){
          searchobj.title=text
        }
    if(query.my){
        searchobj["username"]=username
    }
    MongoClient.connect(CONN_DB_STR,(err,db)=>{
        try{
            console.log("数据库连接成功！")
            db.collection("books").find(searchobj,{}).sort({outTime:-1,inTime:-1}).toArray(function(err,result){
                result.map(function(item){
                    if(item.outTime){
                        item.outTime=dateFormat(item.outTime)
                    }
                    if(item.inTime){
                        item.inTime=dateFormat(item.inTime)
                    }
                    
                })
                res.render("lendlist",{isAdmin,username,result})
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
//借书逻辑，更新状态，status改1  username输入  outTime输入  intime清空
//还：status改0 username清空  outTime清空  intime输入
router.get("/borrow",(req,res)=>{
    var username=req.session.username
    var isAdmin=req.session.isAdmin
    if(username){
        var id=ObjectID.createFromHexString(req.query.id)
        console.log(id)
        MongoClient.connect(CONN_DB_STR,(err,db)=>{
            try{
                db.collection("books").updateOne({_id:id},{
                    $set:{
                        status:1,
                        username:username,
                        outTime:new Date(),
                        inTime:""
                    }
                },function(err,result){
                    if(err) throw err
                    res.redirect("/lend")
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

router.get("/return",(req,res)=>{
    var username=req.session.username
    var isAdmin=req.session.isAdmin
    if(username){
        var go=req.query.go
        var username2=req.query.username2
        var id=ObjectID.createFromHexString(req.query.id)
        console.log(id)
        MongoClient.connect(CONN_DB_STR,(err,db)=>{
            try{
                db.collection("books").updateOne({_id:id},{
                    $set:{
                        status:0,
                        username:"",
                        inTime:new Date(),
                        outTime:""
                        
                    }
                },function(err,result){
                    if(err) throw err
                    if(go==1){
                        res.redirect("/userdetail?username="+username2)
                    }else{
                        res.redirect("/lend")
                    }
                    
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

//新增图书逻辑
router.post("/insert",(req,res)=>{
    var username=req.session.username
    var isAdmin=req.session.isAdmin
    if(username){
      if(isAdmin==0){
        res.send(`
    <script>alert("您没有权限添加！");window.location.href="/bookslist"</script>
    `)
      }else{

        var body = req.body;
        
        if(body.title&&body.price&&body.author&&body.publisher&&body.average){
            body["status"]=0
            body["username"]=""
            body["outTime"]=""
            body["inTime"]=""
            body["rating"]={average:body.average}
            console.log(body)
        MongoClient.connect(CONN_DB_STR,(err,db)=>{
          try{
            console.log("数据库连接成功！")
            db.collection("books").insertOne(body,(err,result)=>{
                if(err) throw err
                res.send(`
    <script>alert("添加成功！");window.location.href="/bookslist"</script>
    `)
            })
          }catch(err){
            if(err) throw err
          }
        })
      }else{
        res.send(`
    <script>alert("请填写完整书籍信息，四个框都要填哦！");window.location.href="/bookslist"</script>
    `)
      }
      }
    }else{
      res.send(`
    <script>alert("session过期，请重新登录！");window.location.href="/login"</script>
    `)
    }
  })
module.exports = router;