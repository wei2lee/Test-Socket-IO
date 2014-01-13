
var util = require('util');
var apputil = require('./apputil');
var printf = require('printf');

var roomPool = apputil.generateRoomNamePool(10000);

var io = require('socket.io').listen(37001);
//var io = require('socket.io').listen(37001, '192.168.145.170');

io.enable('browser client minification');  // send minified client
io.enable('browser client etag');          // apply etag caching logic based on version number
io.enable('browser client gzip');          // gzip the file
io.set('log level', 1);                    // reduce logging
// enable all transports (optional if you want flashsocket support, please note that some hosting
// providers do not allow you to create servers that listen on a port different than 80 or their
// default port)
io.set('transports', [
    'websocket'
  , 'flashsocket'
  , 'htmlfile'
  , 'xhr-polling'
  , 'jsonp-polling'
]);

function efn(){}
function setdata(a,b){
    for(key in b){
        a[key]=b[key];
    }
}
io.sockets.on('connection', function (socket) {
  var n='connection';
  console.log(n,socket.id);
  socket.data = {};
  socket.data.player={id:socket.id,startTime:Date.now()};
  socket.data.room=null;
  socket.emit('onconnected', {n:'connect', s:true, d:{player:socket.data.player}});
  socket.on('disconnect', function (){
    var n='disconnect';
    console.log(n,socket.id);
    try{
      var rm=socket.data.room;
      if(!rm)return;
      socket.data.room.players.splice(socket.data.room.players.indexOf(socket.data.player),1);
      if(!socket.data.room.players.length)roomPool.push(socket.data.room.id);
      socket.data.room=null;
      for(k in rm.players) io.sockets.sockets[rm.players[k].id].emit('onleaveroom', {room:socket.data.room, player:socket.data.player});
    }catch(err){
      console.log({n:n, s:false, e:err});
    }
  });
  socket.on('getroom', function (data,fn){
    var n='getroom';
    console.log(n,data);
    fn = (typeof fn != 'function') ? efn : fn;
    try{
      if(!data.room.id) fn({n:n, s:true, d:null});
      var sks = io.sockets.clients('/'+data.room.id);
      var rm = null; for(k in sks) { rm = sks[k].data.room; break; }
      fn({n:n, s:true, d:rm});
    }catch(err){
      console.log({n:n, s:false, e:err});
      fn({n:n, s:false, e:err});
    }
  });
  socket.on('joinroom', function (data,fn){
    var n='joinroom';
    console.log(n,data);
    fn = (typeof fn != 'function') ? efn : fn;
    try{
      if(data.room){
        if(socket.data.room)throw 'player joined room';
        var sks = io.sockets.clients('/'+data.room.id);
        if(!sks||!sks.length)throw 'player join invalid room';
        var rm = null; for(k in sks) { rm = sks[k].data.room; break; }
        rm.players.push(socket.data.player);
        socket.data.room=rm;
        socket.join(data.room.id);
        fn({n:n, s:true, d:{room:socket.data.room}});
        socket.broadcast.to(socket.data.room.id).emit('onjoinroom',{room:socket.data.room, player:socket.data.player});
      }else{
        if(socket.data.room)throw 'player joined room';
        socket.data.room={id:roomPool.pop(),startTime:Date.now(),players:[socket.data.player]};
        socket.join(socket.data.room.id);
        fn({n:n, s:true, d:{room:socket.data.room}});
      }
    }catch(err){
      console.log({n:n, s:false, e:err});
      fn({n:n, s:false, e:err});
    }
  });
  socket.on('leftroom', function (data,fn){
    var n='leftroom';
    console.log(n,data);
    fn = (typeof fn != 'function') ? efn : fn;
    try{
      var rm=socket.data.room;
      if(!rm)throw 'player joined no room';
      socket.data.room.players.splice(socket.data.room.players.indexOf(socket.data.player),1);
      if(!socket.data.room.players.length)roomPool.push(socket.data.room.id);
      socket.data.room=null;
      for(k in rm.players) io.sockets.sockets[rm.players[k].id].emit('onleaveroom', {room:socket.data.room, player:socket.data.player});
    }catch(err){
      console.log({n:n, s:false, e:err});
      fn({n:n, s:false, e:err});
    }
  });
  socket.on('msg', function (data,sendto,fn){
    var n='msg';
    console.log(n,',',data,',',sendto);
    fn = (typeof fn != 'function') ? efn : fn;
    try{
      if(sendto=='broadcast'){
        if(!socket.data.room)throw 'player joined no room';
        if(socket.data.room.players.length==1 && socket.data.room.players[0].id == socket.id) throw 'room has no other player';
        socket.broadcast.to(socket.data.room.id).emit('onmsg',data);
      }else{
        var sk=io.sockets.sockets[sendto];
        if(!sk)throw 'player send to invalid player';
        if(sendto==socket.id)throw 'player send msg to self';
        sk.emit('onmsg',data);
      }
    }catch(err){
      console.log({n:n, s:false, e:err});
      fn({n:n, s:false, e:err});
    }
  });
});
