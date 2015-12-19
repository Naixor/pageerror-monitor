var Promise = require('promise');
var cp = require('child_process');
var path = require('path');
var spawn = cp.spawn;

function _process(url, settings) {
    var pageerror = spawn('phantomjs', [path.join(__dirname, 'pageerror.js'), url].concat(settings));

    return new Promise(function (resolve, reject) {
        var stdout = "";
        var stderr = "";

        pageerror.stdout.on('data', function (data) {
            // console.log(data.toString());
            stdout += data.toString();
        });

        pageerror.stderr.on('data', function (data) {
            // console.error(data.toString());
            stderr += data.toString();
        });

        pageerror.on('close', function (code) {
            if (stdout) {
                resolve(stdout);
            } else {
                if (stderr) {
                    reject(stderr);
                } else {
                    if (code !== 0) {
                        reject(new Error('Exit with Unexpected error, exit code:'+ code));
                    } else {
                        resolve('无');
                    }
                }
            }
        });
    });
}

module.exports = _process;
