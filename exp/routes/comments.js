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
    res.send("反正就是一个模块，很捉急")
})

router.post("/pinglun",(req,res)=>{
    var username=req.session.username
    var content=req.body.content
    var id=req.query.id
    var bookid=ObjectID.createFromHexString(req.query.id)
    //写评论了。进comment表插入新增,先用这个id查出来书名……
    MongoClient.connect(CONN_DB_STR,(err,db)=>{
        try{
            waterfall([
                function(callback){
                    db.collection("books").find({_id:bookid},{}).toArray(function(err,result){
                        if(err) throw err
                        console.log(result)
                        callback(null,result[0].title)
                    })
                },
                function(arg,callback){
                    var data={username,bookid,content,booktitle:arg,enterTime:new Date()}
                    console.log(data)
                    db.collection("comments").insert(data,function(err,result){
                        if(err) throw err
                        callback(null,result)
                    })
                }
            ],function(err,result){
                if(err) throw err
                res.redirect("/bookdetail?id="+id)
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
        if(id!=="-1"){
            obj._id = ObjectID.createFromHexString(id); 
            MongoClient.connect(CONN_DB_STR,(err,db)=>{
              try{
                  db.collection("comments").remove(obj,(err,result)=>{
                      if(err) throw err;
                      res.send({msg:"删除成功！",code:2});
                  })
              }catch(err){
                  setError(db,err);
              }
            })
        }else if(id=="2"){
            MongoClient.connect(CONN_DB_STR,(err,db)=>{
                try{
                    db.collection("comments").remove(obj,(err,result)=>{
                        if(err) throw err;
                        res.send({msg:"删除全部！",code:3});
                    })
                }catch(err){
                    setError(db,err);
                }
              })
        }else{
      res.send({msg:"只有超级管理员可以删除全部！",code:1})
    }   
    }else{
        res.send(`
  <script>alert("session过期，请重新登录！");window.location.href="/login"</script>
  `)
    }
})


router.get("/update",(req,res)=>{
    var username=req.session.username
    if(username){
        var query = req.query;
        if(query.content){
        var uid=ObjectID.createFromHexString(query.uid); 
        console.log(query)
        console.log(uid)
        MongoClient.connect(CONN_DB_STR,(err,db)=>{
          try{
            db.collection("comments").update(
              {
                _id:uid
              },{
                $set:{
                  content:query.content
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
        res.send({msg:"至少写个字吧！",code:2})
      }
      
    }else{
      res.send(`
    <script>alert("session过期，请重新登录！");window.location.href="/login"</script>
    `)
    }
  })

  var fs = require("fs");

  // 图片上传的 路由  服务器  
  router.post("/updateImg",(req,res)=>{
      console.log("上传图片")
  
      var form = new multiparty.Form();
      // 设置编码
      form.encoding = "UTF-8";
      // 设置文件的临时存储路径
      form.uploadDir = "./uploadtemp";
      // 设置图片的大小限制  
      form.maxFilesSize = 2 * 1024  * 1024 ;  // 2M 
  
      form.parse(req,function(err,fields,files){
          if(err) throw err;
          // fields 文件域
          // files  对应的文件 
          console.log(fields);
          console.log(files);
          var uploadUrl = "/images/upload/" ;  // 文件的真实路径 
          file = files['filedata'];  // 富文本编辑的对象  
          originalFilename = file[0].originalFilename ; // 文件名  ele.png  
          tempath = file[0].path   // 文件的临时路径  uploadtemp
          console.log(tempath)
  
          var timestamp = new Date().getTime();  // 当前的时间戳 1314567
          uploadUrl += timestamp +  originalFilename ;   // /images/upload/1314567ele.png
          newPath = "./public" +  uploadUrl;
  
          // 通过文件流 pipe  读写数据  
          var fileReadStream = fs.createReadStream(tempath);   // 临时路径  读 
          var fileWriteStream  = fs.createWriteStream(newPath); //  写的路径  
  
          fileReadStream.pipe(fileWriteStream);
  
          // 监听文件上传   监听关闭   on('pipe')
          fileWriteStream.on("close",()=>{
              // 删除临时文件夹里面的文件
              fs.unlinkSync(tempath);
              res.send('{"err":"","msg":"'+uploadUrl+'"}');
          })
      })
  });


 //公告模块
 router.get("/notice",(req,res)=>{
     var username=req.session.username
     if(username){
         var query=req.query
         query["enterTime"]=new Date()
         if(query.checked=="true"){
            query["username"]="匿名"
         }else{
            query["username"]=username
         }
         
        
MongoClient.connect(CONN_DB_STR,(err,db)=>{
    try{
        
        db.collection("notice").insert(query,function(err,result){
            if(err) throw err
            res.send({code:0,msg:"公告更新成功！"}) 
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