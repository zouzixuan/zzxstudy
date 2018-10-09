

exports.dateFormat = function(date){
 
    var time = new Date(date);
    var year = time.getFullYear();
    var month = time.getMonth()+1;
    var day = time.getDate();
    var hour = time.getHours();
    var min = time.getMinutes();
    var sec = time.getSeconds();

    return `${year}-${month}-${day} ${hour}:${min}:${sec}`
}