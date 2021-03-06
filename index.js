var fs = require('fs');
var path = require('path');

var createSourceMapLocatorPreprocessor = function(args, logger, helper) {
  var log = logger.create('preprocessor.sourcemap');

  return function(content, file, done) {
    function sourceMapData(data){
      file.sourceMap = JSON.parse(data);
      done(content);
    }

    function inlineMap(inlineData){
      var data;
      var b64Match = inlineData.match(/^data:..*\/(..*);base64,(.*)$/);
      if (b64Match !== null && b64Match.length == 3) {
        // base64-encoded JSON string
        log.debug('base64-encoded source map for', file.originalPath);
        var buffer = new Buffer(b64Match[2], 'base64');
        sourceMapData(buffer.toString());
      } else {
        // straight-up URL-encoded JSON string
        log.debug('raw inline source map for', file.originalPath);
        sourceMapData(decodeURIComponent(inlineData.slice('data:application/json'.length)));
      }
    }

    function fileMap(mapPath){
      fs.exists(mapPath, function(exists) {
        if (!exists) {
          done(content);
          return;
        }
        fs.readFile(mapPath, function(err, data) {
          if (err){ throw err; }

          log.debug('external source map exists for', file.originalPath);
          sourceMapData(data);
        });
      });
    }

    var lines = content.split(/\n/);
    var lastLine = lines.pop();
    while (new RegExp("^\\s*$").test(lastLine)) {
      lastLine = lines.pop();
    }

    var match = /^\/\/#\s*sourceMappingURL=(..*)$/.exec(lastLine);
    var mapUrl = match && match[1];
    if (!mapUrl) {
      fileMap(file.path + ".map");
    } else if (/^data:application\/json/.test(mapUrl)) {
      inlineMap(mapUrl);
    } else {
      fileMap(path.resolve(path.dirname(file.path), mapUrl));
    }
  };
};

createSourceMapLocatorPreprocessor.$inject = ['args', 'logger', 'helper'];

// PUBLISH DI MODULE
module.exports = {
  'preprocessor:sourcemap': ['factory', createSourceMapLocatorPreprocessor]
};
