var webPage = require('webpage');
var page = webPage.create();
var system = require('system');

if (system.args.length === 1) {
    console.log('Error:[\n未传入url\n]');
    phantom.exit(1);
} else {
    var url = system.args[1];
    var settings = system.args[2];
    var message = {
        'js': '',
        'resource': ''
    };

    if (settings) {
        try {
            settings = JSON.parse(settings);
        } catch (e) {
            settings = {};
        }
    }

    if (settings.userAgent) {
        page.settings.userAgent = settings.userAgent;
    }

    if (settings.cookie) {
        if (!settings.cookie.domain) {
            settings.cookie.domain = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im)[1];
        }
        phantom.addCookie(settings.cookie);
    }

    function ERROR_STRUCTOR(type) {
        var key = {
            'js': 'JSRuntimeError',
            'resource': 'ResourceError',
            'url': 'UrlError'
        }
        return key[type && type.toLowerCase()] || 'UnexpectedError';
    }

    function logMsg(type, msg) {
        var msgStack = [ERROR_STRUCTOR(type)+ ':['];
        if (msg instanceof Array) {
            msgStack = msgStack.concat(msg);
        } else if (typeof msg === 'string') {
            msgStack.push(msg);
        }
        msgStack.push(']');
        return msgStack.join('\n')
    }

    function checkReadyState() {
        setTimeout(function () {
            var readyState = page.evaluate(function () {
                return document.readyState;
            });
            if (readyState === 'complete') {
                onPageReady();
            } else {
                checkReadyState();
            }
        }, 20);
    }

    function onPageReady() {
        if (message.js) {
            console.log(message.js);
        }
        if (message.resource) {
            console.log(message.resource);
        }
        phantom.exit();
    }

    page.settings.resourceTimeout = 30000;
    // JS报错
    page.onError = function(msg, trace) {
        var msgStack = [msg];

        if (trace && trace.length) {
            msgStack.push('TRACE:');
            trace.forEach(function(t) {
                msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
            });
        }

        message.js += logMsg('js', msgStack);
    };

    // 资源加载错误
    page.onResourceError = function(resourceError) {
        var msgStack = [];
        msgStack.push('Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + ')');
        msgStack.push('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);

        message.resource += logMsg('resource', msgStack);
    };

    page.open(url, function (status) {
        if (status === 'success') {
            checkReadyState();
        } else {
            console.log(logMsg('url', '连接失败'));
            phantom.exit();
        }
    });
}
