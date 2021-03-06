"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vscode = require("vscode");
var WebSocket = require("ws");
var Utils = require("./utils");
var HttpsProxyAgent = require("https-proxy-agent");
var Url = require("url");
var WebsocketProvider = /** @class */ (function () {
    function WebsocketProvider(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.sessionState = "NOT_CONNECTED";
        this.awsregion = Utils.GetRegion();
    }
    WebsocketProvider.prototype.disconnect = function () {
        clearInterval(this.ch2_interval);
        clearInterval(this.ping_interval);
        clearInterval(this.connect_interval);
        if (this.ws) {
            this.ws.terminate();
        }
        this.sessionState = "NOT_CONNECTED";
    };
    WebsocketProvider.prototype.connect = function (vfsid, xauth, sid, cookieJar, environmentId) {
        var _this = this;
        this.sessionState = "CONNECTING";
        this.last_seq = 10001;
        this.my_seq = 20002;
        this.vfsid = vfsid;
        console.log("Declaring websocket");
        var cookiestr = cookieJar.getCookieString('https://vfs.cloud9.' + this.awsregion + '.amazonaws.com/vfs/' + environmentId);
        try {
            console.log('wss://vfs.cloud9.' + this.awsregion + '.amazonaws.com/vfs/' + environmentId + '/' + vfsid + '/socket/?authorization=' + xauth + '&EIO=3&transport=websocket&sid=' + sid);
            var proxy = Utils.GetProxy();
            var agent = void 0;
            if (proxy) {
                agent = new HttpsProxyAgent(Url.parse(proxy));
            }
            else {
                agent = null;
            }
            this.ws = new WebSocket('wss://vfs.cloud9.' + this.awsregion + '.amazonaws.com/vfs/' + environmentId + '/' + vfsid + '/socket/?authorization=' + xauth + '&EIO=3&transport=websocket&sid=' + sid, [], {
                'agent': agent,
                'headers': {
                    'Cookie': cookiestr
                },
                'keepAlive': {
                    'enable': true,
                    'initialDelay': 60000
                }
            });
            this.ws.addEventListener('open', function () {
                console.log("WebSocket opened");
                _this.ws.send('2probe');
                _this.ch2_interval = setInterval(function () {
                    _this.ws.send("2");
                }, 25000);
            });
            this.ws.addEventListener('message', function (data) {
                console.log("---GOT MESSAGE---");
                console.log(data.data);
                var messageType = parseInt(data.data[0]);
                if (data.data == "3probe") {
                    _this.ws.send("5");
                    _this.init();
                }
                else if (messageType == 4) {
                    var message = JSON.parse(data.data.substring(1));
                    if ('ack' in message) {
                        _this.eventEmitter.emit('ack', message['ack']);
                    }
                    if ('seq' in message) {
                        _this.last_seq = message['seq'];
                        _this.ws.send("4" + JSON.stringify({
                            "ack": _this.last_seq
                        }));
                        _this.eventEmitter.emit('ch4_data', message['d'], environmentId);
                    }
                }
            });
            this.ws.addEventListener('error', function (data) {
                vscode.window.showErrorMessage("Error connecting with AWS Cloud9 environment");
                console.warn("---ERROR---");
                console.log(data);
            });
            this.ws.addEventListener('close', function () {
                vscode.window.showWarningMessage("Disconnected from AWS Cloud9 environment");
                console.warn('---DISCONNECTED---');
                _this.eventEmitter.emit('disconnect');
            });
        }
        catch (error) {
            console.log(error);
            vscode.window.showWarningMessage("There was an error connecting to the AWS Cloud9 environment");
            this.eventEmitter.emit('disconnect');
        }
    };
    WebsocketProvider.prototype.init = function () {
        var _this = this;
        console.log("Starting Websock Init");
        this.send_ch4_message([1, ["onData", "onEnd", "onClose", "onError", "write", "end", "destroy", "resume", "pause", "onExit", "onProcessClose", "onPtyKill", "onChange", "onEvent", "vfsDying"], false]);
        this.send_ch4_message(["execFile", "node", { "args": ["-e", "log(Date.now())"], "encoding": "utf8" }, { "$": 2 }]);
        this.send_ch4_message(["stat", "/.c9/builders", {}, { $: 3 }]);
        this.send_ch4_message(["stat", "~/.c9/bin/.c9gdbshim2", {}, { $: 4 }]);
        this.send_ch4_message(["watch", "/home/ec2-user/environment", {}, { $: 5 }]);
        this.send_ch4_message(["watch", "/.c9/project.settings", {}, { $: 6 }]);
        this.send_ch4_message(["watch", "/", {}, { $: 7 }]);
        this.send_ch4_message(["execFile", "sudo", { "args": ["chown", "ec2-user", "-R", "/usr/local/rvm/gems"], "encoding": "utf8" }, { "$": 9 }]);
        this.send_ch4_message(["stat", "/.eslintrc", {}, { $: 11 }]);
        this.send_ch4_message(["execFile", "bash", { args: ["-c", "echo $C9_HOSTNAME"] }, { $: 12 }]);
        this.send_ch4_message(["extend", "ping", { file: "c9.vfs.client/ping-service.js" }, { $: 13 }]);
        this.send_ch4_message(["execFile", "bash", { args: ["-c", "echo $C9_HOSTNAME"] }, { $: 16 }]);
        this.send_ch4_message(["extend", "ping", { file: "c9.vfs.client/ping-service.js" }, { $: 17 }]);
        this.send_ch4_message(["extend", "collab", { file: "c9.ide.collab/server/collab-server.js" }, { $: 20 }]);
        this.send_ch4_message(["spawn", "/home/ec2-user/.c9/node/bin/node", { "args": ["/home/ec2-user/.c9/node_modules/.bin/nak", "--json", "{\"pathToNakignore\":\"/home/ec2-user/environment/.c9/.nakignore\",\"ignoreCase\":true,\"literal\":true,\"pathInclude\":\"*.yml, *.yaml, *.json\",\"query\":\"AWS::Serverless\",\"path\":\"/home/ec2-user/environment/\",\"follow\":true,\"limit\":100000}"], "stdoutEncoding": "utf8", "stderrEncoding": "utf8", "stdinEncoding": "utf8" }, { "$": 21 }]);
        this.send_ch4_message(["spawn", "/home/ec2-user/.c9/node/bin/node", { "args": ["/home/ec2-user/.c9/node_modules/.bin/nak", "--json", "{\"pathToNakignore\":\"/home/ec2-user/environment/.c9/.nakignore\",\"ignoreCase\":true,\"literal\":true,\"pathInclude\":\"*.yml, *.yaml, *.json\",\"query\":\"AWS::Serverless\",\"path\":\"/home/ec2-user/environment/\",\"follow\":true,\"limit\":100000}"], "stdoutEncoding": "utf8", "stderrEncoding": "utf8", "stdinEncoding": "utf8" }, { "$": 22 }]);
        this.send_ch4_message(["call", "jsonalyzer_server", "init", [{ "environmentDir": "/home/ec2-user/environment", "homeDir": "/home/ec2-user", "packagePath": "plugins/c9.ide.language.jsonalyzer/jsonalyzer", "useCollab": true, "useSend": false, "maxServerCallInterval": 2000, "provides": ["jsonalyzer"], "consumes": ["Plugin", "commands", "language", "c9", "watcher", "save", "language.complete", "dialog.error", "ext", "collab", "collab.connect", "language.worker_util_helper", "error_handler", "installer"] }, { "$": 23 }]]);
        this.send_ch4_message(["call", "bridge", "connect", [{ $: 24 }]]);
        this.send_ch4_message(["call", "jsonalyzer_server", "init", [{ "environmentDir": "/home/ec2-user/environment", "homeDir": "/home/ec2-user", "packagePath": "plugins/c9.ide.language.jsonalyzer/jsonalyzer", "useCollab": true, "useSend": false, "maxServerCallInterval": 2000, "provides": ["jsonalyzer"], "consumes": ["Plugin", "commands", "language", "c9", "watcher", "save", "language.complete", "dialog.error", "ext", "collab", "collab.connect", "language.worker_util_helper", "error_handler", "installer"] }, { "$": 25 }]]);
        /*this.send_ch4_message(
            ["stat", "/2", {}, {$: 26}]
        );
        this.send_ch4_message(
            ["watch", "/deep/folder", {}, {$: 27}]
        );
        this.send_ch4_message(
            ["watch", "/deep", {}, {$: 28}]
        );*/
        this.send_ch4_message(["call", "jsonalyzer_server", "init", [{ "environmentDir": "/home/ec2-user/environment", "homeDir": "/home/ec2-user", "packagePath": "plugins/c9.ide.language.jsonalyzer/jsonalyzer", "useCollab": true, "useSend": false, "maxServerCallInterval": 2000, "provides": ["jsonalyzer"], "consumes": ["Plugin", "commands", "language", "c9", "watcher", "save", "language.complete", "dialog.error", "ext", "collab", "collab.connect", "language.worker_util_helper", "error_handler", "installer"] }, { "$": 30 }]]);
        this.send_ch4_message(["stat", "/", {}, { $: 31 }]);
        this.connect_interval = setInterval(function () {
            _this.send_ch4_message(["call", "collab", "connect", [{ "basePath": "/home/ec2-user/environment", "clientId": _this.vfsid }, { "$": 32 }]]);
        }, 3000);
    };
    WebsocketProvider.prototype.postconnect = function () {
        var _this = this;
        console.log("POST CONNECT WEBSOCK INIT");
        clearInterval(this.connect_interval);
        this.ping_interval = setInterval(function () {
            _this.send_ch4_message(["call", "ping", "ping", ["serverTime", { "$": 32 }]]);
        }, 10000);
        this.send_ch4_message(["call", "ping", "ping", ["serverTime", { "$": 32 }]]);
        this.send_ch4_message(["extend", "collab", { "file": "c9.ide.collab/server/collab-server.js" }, { "$": 32 }]);
        this.eventEmitter.emit('websocket_init_complete');
        this.sessionState = "CONNECTED";
    };
    WebsocketProvider.prototype.send_ch4_message = function (data) {
        var seq = this.my_seq;
        this.my_seq += 1;
        var msg = {
            'ack': this.last_seq,
            'seq': seq,
            'd': data
        };
        console.log("Sending:");
        console.log('4' + JSON.stringify(msg));
        this.ws.send('4' + JSON.stringify(msg));
        return seq;
    };
    return WebsocketProvider;
}());
exports.WebsocketProvider = WebsocketProvider;
