var http = require('http')
var formidable = require('formidable')
const fs = require('fs')
const path = require('path')
let query = require('querystring')
var COS = require('cos-nodejs-sdk-v5');

var cos = new COS({
    SecretId: 'AKIDCBG56RQfQ5ewyfdZQXP1RagneG53ihNv',
    SecretKey: 'USB23yqTP7ZmuzoNhtPffh67rKlltlls'
});


var server = http.createServer(function(req, res){
  // 1 设置cors跨域
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  // res.setHeader('Content-Type', 'application/json')

  if(req.url === '/check'){
    if(req.method === 'post'){
      let str = ''
      req.on('data', data => {
          str += data 
      })
      req.on('end',()=>{ 
        str = JSON.parse(str)
        console.log(str.user);
        if(str.user === "tang" && str.pass === "tang"){
          let r = {
            code:200,
            meg:"yes"
          }
          // let millisecond = new Date().getTime();
          // let expiresTime = new Date(millisecond + 60 * 1000 * 15); 
          res.setHeader("Set-Cookie", [
              `name=${str.user}; domain=localhost; path=/; httpOnly=true;Expires=${new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toGMTString()}`
          ]);
          res.end(JSON.stringify(r))
        }else{
          let r = {
            code:400,
            meg:"no"
          }    
          res.end(JSON.stringify(r))
        }
      })
    }else{
        res.end("666")
    }
    
  }
  else if(req.url === '/index'){
    res.writeHead(200, { "content-type": "text/html;charset=utf-8" })
    if(req.headers.cookie.indexOf("name=tang") !== -1){
      let stream = fs.createReadStream(
      path.join(__dirname, "/static/my/index.html")
      );
      stream.on("error", function() {
        res.writeHead(500, { "content-type": "text/html;charset=utf-8" });
        res.end("<h1>500 Server Error</h1>");
      });
      stream.pipe(res)
    }else{
      let stream = fs.createReadStream(
        path.join(__dirname, "/static/login.html")
        );
        stream.on("error", function() {
          res.writeHead(500, { "content-type": "text/html;charset=utf-8" });
          res.end("<h1>500 Server Error</h1>");
        });
        stream.pipe(res)
    }
  }
  else if(req.url === '/put'){
    switch (req.method) {
    case 'OPTIONS':
      res.statusCode = 200
      res.end()
      break
    case 'POST':
      upload(req, res)
      break
    case 'GET':
      res.statusCode = 200
      res.write("请以POST方式请求") 
      res.end()
      break
    }
  }   
  else{  
    // try{
      let files = fs.createReadStream(path.resolve(__dirname,"./static"+req.url))
      files.pipe(res); 
      files.on("error",(err) => {
        console.log(err,11);
        res.writeHead(200, { "content-type": "text/plain;charset=utf-8" })
        res.end("666")
      })
    // }catch(err){
    //   console.log(err,111);

    //   
    // }
  }
  // 2
  
}) 
function upload(req, res) {

    let times;
    let suffix;
        // 1 判断
    if (!isFormData(req)) {
        res.statusCode = 400
        res.end('错误的请求, 请用multipart/form-data格式')
        return
    }

  // 2 处理
    var form = new formidable.IncomingForm()
    form.uploadDir = './myImage'
    form.keepExtensions = true

    form.on('field', (field, value) => {
        console.log(field+1)
        console.log(value+2)
    })

   
    form.on('file', (name, file) => {
        // 重命名文件
        let types = file.name.split('.')
        suffix = types[types.length - 1]
        times = new Date().getTime()
        fs.renameSync(file.path,'./myImage/' + times + '.' + suffix) 
        cos.putObject({
                Bucket:'imgs-1304695318',
                Region:'ap-shanghai',
                Key:`${times}.${suffix}`,
                StorageClass:'STANDARD',
                Body:fs.createReadStream('./myImage/' + times + '.' + suffix),
                onProgress: function(progressData) {
                    // console.log(JSON.stringify(progressData));
                }
            }, function(err, data) {
                console.log(err || data);
                if(data.statusCode === 200){
                  fs.unlinkSync(`${__dirname}/myImage/${times}.${suffix}`)
                }

        })
            
        //对象存储
    })
    form.on('end', () => {
        let a = {
            code:200,
            name:"上传完成!",
            urls:"http://imgs-1304695318.cos.ap-shanghai.myqcloud.com/"+times+"."+suffix,
            id:times
        } 
        res.end(JSON.stringify(a))
    }) 
 
    form.parse(req)
}

function isFormData(req) {
  let type = req.headers['content-type'] || ''
  return type.includes('multipart/form-data')
}

server.listen(8080)
console.log('port is on 8080.')