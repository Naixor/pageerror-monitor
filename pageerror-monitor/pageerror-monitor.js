#!/usr/bin/env node

var monitor_process = require('./process');
var colors = require('colors');
var program = require('commander');
var fs = require('fs');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var Promise = require('promise');
var path = require('path');
var resMap = {};

program.version('0.0.1')
    .allowUnknownOption()
    .option('-u, --urls [file]', '需要错误监控的页面链接,可以传入配置文件或者url字符串,多条url使用;分割,多条url建议使用文件')
    .option('-c, --conf [file]', '配置,可以进行cookie、userAgent、emial发送等配置,以文件形式传入')
    .option('-e, --email [file]', '单独配置email,配置此项会覆盖-c中的email配置,以文件传入,写法参考-useage中-c的描述')
    .option('-ck, --cookie [file]', '单独配置cookie,配置此项会覆盖-c中cookie的配置,文件形式传入,格式参考-useage中描述')
    .option('-ua, --userAgent [userAgent]', '单独配置userAgent,配置此项会覆盖-c中userAgent配置,直接传入')
    .option('-useage, --useage', '使用事例');

program.parse(process.argv);

function isUrl(str) {
    return /^http(|s):\/\/\S+/.test(str);
}

function isFile(s) {
    return fs.statSync(s).isFile();
}

if (program.usage === true) {
    var info = [
        '-u, --urls [file] 传入的文件内容中url之间使用\\n分割开,如:',
        '\turl1',
        '\turl2',
        '',
        '-c, --conf [file] 传入的文件格式为json格式,文件类型随意,0.0.1支持的配置如下:',
        '\tcookie',
        '\t\tname',
        '\t\t\tcookie name',
        '\t\tvalue',
        '\t\t\tcookie value',
        '\t\tdomain',
        '\t\t\tcookie domain,缺省为当前url所在domain',
        '\tuserAgent',
        '\t\tYour user-agent string',
        '\temail',
        '\t\thost',
        '\t\t\t(缺省为email.baidu.com)',
        '\t\tport',
        '\t\t\t(缺省为587)',
        '\t\tauth',
        '\t\t\tuser',
        '\t\t\t\t(发送邮件的用户名)',
        '\t\t\tpass',
        '\t\t\t\t(发送邮件的密码)',
        '\t\tfrom',
        '\t\t\t(发送邮件的邮箱地址)',
        '\t\tto',
        '\t\t\t(邮件发送的目的地址)',
        '\t\tsubject',
        '\t\t\t(发送邮件的主题,缺省为页面错误监控)'
    ];
    console.log(colors.green(info.join('\n')));
    return process.exit();
}

var urls = [];
var conf = {};

if (typeof program.urls === 'string') {
    if (isUrl(program.urls)) {
        urls = program.urls.split(';');
    } else if (isFile(program.urls)) {
        urls = fs.readFileSync(path.join(process.cwd(), program.urls)).toString().split('\n');
    }
}

if (typeof program.conf === 'string') {
    try {
        conf = JSON.parse(fs.readFileSync(path.join(process.cwd(), program.conf)).toString());
    } catch (e) {
        throw new Error('配置文件有问题');
    }
}

if (typeof program.userAgent === 'string') {
    conf.userAgent = program.userAgent;
}

if (typeof program.cookie === 'string') {
    try {
        conf.cookie = JSON.parse(fs.readFileSync(path.join(process.cwd(), program.cookie)).toString());
    } catch (e) {
        conf.cookie = null;
    }
}

if (typeof program.email === 'string') {
    try {
        conf.email = JSON.parse(fs.readFileSync(path.join(process.cwd(), program.email)).toString());
    } catch (e) {
        conf.email = null;
    }
}

urls = (urls = urls.filter(function (url) {
    return url !== '';
})).map(function (url) {
    if (!isUrl(url)) {
        url = 'http://' + url;
    }

    return new Promise(function (resolve, reject) {
        monitor_process(url, JSON.stringify(conf)).then(function (logStr) {
            console.log(colors.red(logStr));
            // resMap[url] = logStr;
            resolve({
                url: url,
                msg: logStr
            });
        }).catch(function (error) {
            console.log(colors.red(error));
            // resMap[url] = error;
            resolve({
                url: url,
                msg: error
            });
        });
    });
});

Promise.all(urls).then(function (results) {
    if (conf.email) {
        if (!conf.email.host) {
            conf.email.host = 'email.baidu.com';
        }
        if (!conf.email.port) {
            conf.email.port = '587';
        }
        if (!conf.email.auth) {
            throw new Error('邮件配置没有配置auth!');
        }

        var html;
        if (results.length) {
            html = '<style>.table-fill{table-layout:auto;background:white;border-radius:3px;border-collapse:collapse;height:auto;margin:auto;max-width:1200px;padding:5px;width:100%;box-shadow:0 5px 10px rgba(0,0,0,0.1)}th{word-wrap:break-word;word-break:break-all;color:#D5DDE5;background:#1b1e24;border-bottom:4px solid #9ea7af;border-right:1px solid #343a45;font-size:20px;font-weight:100;padding:24px;text-align:left;text-shadow:0 1px 1px rgba(0,0,0,0.1);vertical-align:middle}th:first-child{border-top-left-radius:3px}th:last-child{border-top-right-radius:3px;border-right:none}.tr{border-top:1px solid #C1C3D1;border-bottom-:1px solid #C1C3D1;color:#666B85;font-size:16px;font-weight:400;text-shadow:0 1px 1px rgba(256,256,256,0.1)}.tr:hover .td{word-wrap:break-word;word-break:break-all;background:#4E5066;color:#FFF;border-top:1px solid #22262e;border-bottom:1px solid #22262e}.tr:first-child{border-top:none}.tr:last-child{border-bottom:none}.tr:nth-child(odd) .td{background:#EBEBEB}.tr:nth-child(odd):hover .td{background:#4E5066}.tr:last-child .td:first-child{border-bottom-left-radius:3px}.tr:last-child .td:last-child{border-bottom-right-radius:3px}.td{word-wrap:break-word;word-break:break-all;background:#FFF;padding:5px;text-align:left;vertical-align:middle;font-weight:300;font-size:16px;text-shadow:-1px -1px 1px rgba(0,0,0,0.1);border-right:1px solid #C1C3D1}.td:last-child{border-right:0}.th.text-left{text-align:left}.text-center{text-align:center}.th.text-right{text-align:right}.td.text-left{text-align:left}.text-center{text-align:center}.td.text-right{text-align:right}</style>'
                +'<table class="table-fill"><thead><tr class="tr"><th class="text-center">序号</th><th class="text-center">被测页面链接</th><th class="text-center">报错内容</th></thead><tbody class="table-hover">';
            html += results.map(function (result, idx) {
                if (result.msg === '无') {
                    return '<tr class="tr"><td class="td text-center">'
                            + (idx+1)
                            +'</td><td class="td text-left" style="word-wrap:break-word;word-break:break-all;">'
                            + result.url
                            +'</td><td class="td text-center" style="word-wrap:break-word;word-break:break-all;">'
                            + result.msg
                            +'</td></tr>';
                } else {
                    return '<tr class="tr" style="background:#ff5557;"><td class="td text-center">'
                            + (idx+1)
                            +'</td><td class="td text-left" style="word-wrap:break-word;word-break:break-all;">'
                            + result.url
                            +'</td><td class="td text-center" style="word-wrap:break-word;word-break:break-all;">'
                            + result.msg
                            +'</td></tr>';
                }
            }).join('');
            html += '</tbody></table>';
        } else {
            html = '不错呦，没有发现错误~';
        }

        nodemailer.createTransport(smtpTransport(conf.email)).sendMail({
    	    from: conf.email.from,
    	    to: conf.email.to,
    	    subject: conf.email.subject || "页面错误监控",
    	    html: html || ""
    	}, function (err) {
            err && console.log(colors.red(err));
        });
    }
});
