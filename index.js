var http = require('http')
var formidable = require('formidable')
const fs = require('fs')
const path = require('path')
var COS = require('cos-nodejs-sdk-v5');
const config = require('./config')

var cos = new COS({
    SecretId: config.SecretId,
    SecretKey: config.SecretKey
});


var server = http.createServer(function(req, res){
  // 1 设置cors跨域
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  // res.setHeader('Content-Type', 'application/json')

  if(req.url === '/check'){
    console.log(req.method);
    if(req.method === 'POST'){
      let str = ''
      req.on('data', data => {
          str += data 
      })
      req.on('end',()=>{ 
        str = JSON.parse(str)
        console.log(str.user);
        if(str.user === config.user && str.pass === config.pass){
          let r = {
            code:200,
            meg:"yes"
          }
          let auth = [];
          config.Cookie.forEach(v => {
            auth.push(
              `name=${str.user}; domain=${v}; path=/; httpOnly=true;Expires=${new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toGMTString()}`
            )
          })
          res.setHeader("Set-Cookie", auth);
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
        res.end("66err")
    }
    
  }
  else if(req.url === '/index'){
    res.writeHead(200, { "content-type": "text/html;charset=utf-8" })
    if(!req.headers.cookie){req.headers.cookie = ""}
    if(req.headers.cookie.indexOf(`name=${config.user}`) !== -1){
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
  
      let files = fs.createReadStream(path.resolve(__dirname,"./static"+req.url))
      files.pipe(res); 
      files.on("error",(err) => {
        console.log(err,11);
        res.writeHead(200, { "content-type": "text/plain;charset=utf-8" })
        res.end("Not Found")
      })

  }
  
  
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
                Bucket:config.Bucket,
                Region:config.Region,
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
            urls:`http://${config.Bucket}.cos.${config.Region}.myqcloud.com/${times}.${suffix}`,
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