var mongoclient=require("mongodb").MongoClient;
var dburl="mongodb://localhost:27017/album";
var ejs=require("ejs");
var formidable=require("formidable");
var form=new formidable.IncomingForm();
var bodyparser=require("body-parser");
var urlencodedParser=bodyparser.urlencoded({extended:false});
var express=require("express");
var fs=require("fs");
var path=require("path");
var app=express();

var http=require("http")

app.set("view engine","ejs");

//静态服务托管
app.use(express.static("public"));

//抽象读取文件夹并渲染模板
function getfolder(req,res){
    fs.readdir("./public/img",function(err,files){
        (function watchdir(i){
            if(i==files.length){
                res.render("index.ejs",{
                    dirs:files
                });
                return;
            }
            watchdir(i+1);
        })(0)
    })
}

//创建文件夹
app.post("/",urlencodedParser,function(req,res){
    var foldername=req.body.foldername;
    fs.mkdir("./public/img/"+foldername);
    mongoclient.connect(dburl,function(err,db){
        var collection=db.collection(foldername);
        //需插入一条数据才算创建成功
        collection.insert({"name":"newCollention"},function(err,result){
            console.log("成功新建一个相册"+foldername);
            getfolder(req,res);
        })
    })
    
})

//进入某个相册
app.get("/:folder",function(req,res){
    mongoclient.connect(dburl,function(err,db){
        if(err){throw err};
        var collection=db.collection(req.url.substr(1));
        collection.find().toArray(function(err,result){
            if(err){throw err};
            // console.log(result);
            res.render("album.ejs",{
                obj:result,
                title:req.url.substr(1).toString()
            })
        })
    })
})

//上传图片到相册
app.post("/:folder",urlencodedParser,function(req,res){
    form.uploadDir="./public/img"+req.url;
    form.parse(req,function(err,fields,files){
        if(err){throw err};
        var extname=path.extname(files.pic.name);
        var picname;
        if(fields.name==""){
            picname=parseInt(Math.random()*89999+10000)+extname;
        }else{
            picname=fields.name+extname;
        };
        fs.rename(__dirname+"/"+files.pic.path,__dirname+"/public/img"+req.url+"/"+picname,function(err){
            if(err){throw err};
            console.log(picname+"上传成功");
        })
        var objdata=fields;
        objdata.pic=picname;
        mongoclient.connect(dburl,function(err,db){
            var collection=db.collection(req.url.substr(1));
            collection.insert(objdata,function(err,result){
                if(err){throw err};
                collection.find().toArray(function(err,result){
                    if(err){throw err};
                    console.log(result);
                    res.render("album.ejs",{
                        obj:result,
                        title:req.url.substr(1).toString()
                    })
                })
            })
        })
    })
})


//默认页面
app.all("/",function(req,res){
    getfolder(req,res);
})


app.listen(3008,function(){
    console.log("运行在3008端口")
})

