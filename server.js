console.log("init started");
const WebSocket = require("ws");

const server = new WebSocket.Server({
    "host": "ip-172-31-37-215.ap-northeast-1.compute.internal",
    "port" : 3000
});

server.on("connection", function (client){
    console.log("client connection open!!!!!!");

    client.on("message", function (data){
        console.log("client message received~! hi bitch <3 " + data);
    });
});

server.on("listening", function (){
    console.log("server listening");
});

server.on("error", function (e){
    console.log("server error", e);
});

console.log("init done");

// const express = require('express')
// const app = express()
// app.get('/', (req, res) => {
//     res.send('HEY!')
// })
// app.listen(3000, () => console.log('Server running on port 3000'))