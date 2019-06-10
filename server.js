console.log("init started");
const WebSocket = require("ws");

const server = new WebSocket.Server({
    "host" : "ip-172-31-37-215.ap-northeast-1.compute.internal", // also tried public IP, but it throws an error
    "port" : 8080
});

server.on("connection", function (client){
    console.log("client connection open");

    client.on("message", function (data){
        console.log("client message received~! hi bitch <3");
    });
});

server.on("listening", function (){
    console.log("server listening");
});

server.on("error", function (e){
    console.log("server error", e);
});

console.log("init done");