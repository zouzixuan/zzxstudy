


exports.setError = function(db,msg){
    db.json({code:"-1",msg});
    db.close()
}


exports.send =  function(username,res,callback){
    if(username){
        callback();
    }else{
        res.send("<script>alert('你还没有登录,请先登录!');window.location.href='/login'</script>")
    }
}