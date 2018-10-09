var express = require("express");
var router = express.Router();
var {MongoClient} = require("mongodb");
var CONN_DB_STR = "mongodb://47.94.9.102:27017/zzx1";
var {waterfall,series,parallel} = require("async");
var {setError,send} = require("../utils/error")
var {dateFormat} = require("../utils/dateFormat");
var {ObjectID} = require("mongodb");  // 处理 _id  
var multiparty = require('multiparty');   // 处理图片请求 
var app = express();
var server = require("http").Server(app);
var io=require("socket.io").listen(server)

const hostname = "0.0.0.0";
const port = 8080;
var app = express();
var server = require("http").Server(app);
var io=require("socket.io").listen(server)


var onLineUser = {};
var i = 0;
var onLineUserCount = 0;
var usernames = [];


io.on("connection",(socket)=>{
    console.log(`...上线了`)
    
    socket.on("login",(username)=>{
        console.log(`${username}上线了`)
        console.log(username);
        usernames.push(username);
        onLineUserCount++;
        socket.name=username;
        socket.emit("loginSuccess");   // emit 只能发送给自己  
        io.sockets.emit("setOnLineCount",onLineUserCount);  //socket 发送消息给所有在线用户  
        io.sockets.emit("system",username);

    });

    socket.on("sendClientMsg",(msg)=>{
        console.log(msg);
        io.sockets.emit("showMsg",socket.name,msg);
    });

   

     // 监听error client
        socket.on("error",(err)=>{
            console.error(err);
        });

        // 监听client 关闭 
        socket.on("disconnect",()=>{
            onLineUserCount--;
            io.sockets.emit("setOnLineCount",onLineUserCount);
            socket.broadcast.emit('showMsg',socket.name,'886,我走了哦...'); // 通知其他的在线用户 
        })
})


router.get('/', function(req, res, next) {
    var username=req.session.username
    var isAdmin=req.session.isAdmin
    if(username){

        res.render("chat",{username,isAdmin})

    }else{
        res.send(`
        <script>alert("session过期，请重新登录！");window.location.href="/login"</script>
        `)
    }
   

})


server.listen(port,hostname,()=>{
    console.log(`socketIo server is running at http://${hostname}:${port}`)
})


module.exports = router;