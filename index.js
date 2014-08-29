var request = require('request'),
    p = require('path'),
    fs = require('fs'),
    rimraf = require('rimraf'),
    crypto = require('crypto'),
    through = require('through2'),
    colorThief = require('color-thief'),
    app = require('express')(),
    redis = require("redis"),
    client = redis.createClient()

var md5 = function(value) {
    var hash = crypto.createHash('md5')
    hash.setEncoding('hex')
    hash.write(value)
    hash.end()

    return hash.read()
}

app.get('/', function(req, res){
  if(req.query.image) {
    var hash = md5(req.query.image)

    client.get(hash, function(err, value) {

      if(err) throw err

      if(value == null) {

        var filename = p.basename(req.query.image), path = './tmp/'+filename

        var stream = through(function(chunk, enc, cb) { 
          this.push(chunk) 
          cb()
        })

        request(req.query.image)
          .pipe(stream)
          .pipe(fs.createWriteStream(path))

        stream.on('end', function() {
          var ct = new colorThief()
          var palette = ct.getPalette(path)

          rimraf(path, function() {
            client.set(hash, JSON.stringify(palette))

            res.send(palette)
          })
        })
      } else {
        res.send(JSON.parse(value))
      }
    })

  }
})

app.listen(3100)

