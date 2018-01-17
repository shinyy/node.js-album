var mongoclient=require("mongodb").MongoClient;
var dburl="mongodb://localhost:27017/album";
var ejs=require("ejs");
var formidable=require("formidable");
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

//抽象读取文件夹并渲染模板 暂时以读取到的文件夹为准  数据表的依据往后再说
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

//
app.get("/ajax",function(req,res){
    fs.readFile("./views/ajax.html",function(err,data){
        res.writeHead(200,{"Content-type":"text/html;charset=UTF8"});
        res.end(data);
    })
})

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
    var form=new formidable.IncomingForm();//要在这里重新new一个form  否则form在外边则一直有缓存 导致同一个文件上传两次导致数据库出错
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
            if(err){throw err};
            var collection=db.collection(req.url.substr(1));
            collection.insert(objdata,function(err,result){
                if(err){throw err};
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
    })
})


//删除图片
app.get("/:folder/delpic/:name",function(req,res){
    //解析url 输出一个数组
    var urlTemp=req.originalUrl.split("/")
    console.log(urlTemp)
    var wherestr={"name":urlTemp[3]};
    mongoclient.connect(dburl,function(err,db){
        if(err){throw err};
        var collection=db.collection(urlTemp[1]);
        //先删除文件
        collection.find(wherestr).toArray(function(err,result){
            if(err){throw err};
            fs.unlink("./public/img/"+urlTemp[1]+"/"+result[0].pic,function(err){
                collection.remove(wherestr,function(err,result){
                    if(err){throw err};
                    console.log("成功删除了"+urlTemp[3]);
                    //restful
                    collection.find().toArray(function(err,result){
                        if(err){throw err};
                        res.render("album.ejs",{
                            obj:result,
                            title:req.url.substr(1).toString()
                        })
                    })
                })
            });
        })
    })
})

//删除文件夹
app.get("/delfolder/:name",function(req,res){
    var urlTemp=req.originalUrl.split("/");
    // console.log(urlTemp);
    //删除集合
    mongoclient.connect(dburl,function(err,db){
        if(err){throw err};
        db.collection(urlTemp[2]).drop(function(err,res){
            console.log(res);
         })
    });

    //删除文件夹 清空所有文件后才能删除文件夹
    // fs.rmdir("./public/img/"+urlTemp[2]);
    fs.readdir("./public/img/"+urlTemp[2],function(err,files){
        (function delfolder(i){
            if(i==files.length){
                fs.rmdir("./public/img/"+urlTemp[2]);
                return;
            }
            fs.unlink("./public/img/"+urlTemp[2]+"/"+files[i],function(err){
                if(err){throw err};
                delfolder(i+1);
            })
        })(0)
        
    })
    res.send("<p>成功删除相册"+urlTemp[2]+"</p><p><a href='/'>点击返回首页</a></p>");
})

//输出JSON  接口
app.get("/:folder/json",function(req,res){
    var urlTemp=req.originalUrl.split("/");
    mongoclient.connect(dburl,function(err,db){
        db.collection(urlTemp[1]).find().toArray(function(err,result){
            if(err){throw err};
            // console.log(result)
            let obj=[],len=result.length;
            for(let i=1;i<len;i++){
                obj[i-1]={};
                obj[i-1].name=result[i].name;
                obj[i-1].pic=result[i].pic;
             }
            res.end(JSON.stringify(obj));
        })
    })
})

//默认页面
app.all("/",function(req,res){
    mongoclient.connect(dburl,function(err,db){
        console.log(db.collections())
    })
    getfolder(req,res);
})



app.listen(3008,function(){
    console.log("运行在3008端口")
})

