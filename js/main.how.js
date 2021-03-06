//

$(function() { 

function syncplayer(player){
    if(player.id==socketdata.player.id){
        syncdata(socketdata.player,player);
    }
    for(key in socketdata.room.players) {
        if(socketdata.room.players[key].id == player.id) {
            syncdata(socketdata.room.players[key],player);
            break;
        }
    }
}
function indexOfPlayer(id){
    var ind = 0;
    if(!socketdata.room.players) return -1;
    for(key in socketdata.room.players) {
        if(socketdata.room.players[key].id == id){
            return ind; 
        }
        ind++;
    }
    return -1;
}
function joinIndexOf(id){ return indexOfController(id); }
function indexOfController(id){
    var ind = 0;
    if(!socketdata.room.players) return -1;
    for(key in socketdata.room.players) {
        if(socketdata.room.players[key].role == 'controller') {
            if(socketdata.room.players[key].id == id)
                return ind;
            ind++;
        }
    }
    return -1;
}
function removePlayer(id){
    var ind = indexOfPlayer(id);
    if(ind>=0) socketdata.room.players.splice(ind, 1);
}
function controllers(){
    var ret = [];
    for(key in socketdata.room.players){
        if(socketdata.room.players[key].role=='controller'){
            ret.push(socketdata.room.players[key]);
        }
    }
    return ret;
}

var App = function() {
    this.isMobile =                         isMobile.any();
    this.hasDeviceOrientaitonEvent =        Modernizr.deviceorientation; //!!window.DeviceMotionEvent;//Modernizr.hasEvent('deviceOrientation');
    this.gameCtrl =                         Modernizr.deviceorientation ? 'button' : 'gyroscope';
    this.stat=                              'null';//[init, preload, landing, joinroom, customize, game, result, disconnect, destroy]
    this.jerror=                            $('.error');
    this.jnotification=                     $('.notification');
    this.jlog=                              $('.log');


    this.setStat=function(s){
        if(s==this.stat)return;
        oldstat=this.stat; newstat=s;
        console.log('app.setStat@'+oldstat+' > '+newstat);
        this.stat=s;

        if(this.stat=='init'){
            if(this.isMobile){
                $('.contviewer').hide();
                $('.contcontroller').show();

            }else{
                $('.contviewer').show();
                $('.contcontroller').hide();
            }
            $('.content').hide();
            $('input').prop('disabled',false);

            $('input[name=back]').on('vclick', function(){
                location.reload();
            });

            if(!this.doAdded) {
                this.doAdded=true;
                window.addEventListener('deviceorientation', app.onDeviceOrientation);
            }
            this.animate();
        }else if(this.stat=='preload'){
            $('.mainContainer').css('display','block');
            $('.content').hide();
            $('.contpreload').show();
            this.updateAppStatContent();
        }else if(this.stat=='landing'){
            $('.content').hide();
            $('.contlanding').show();
            this.updateAppStatContent();
        }else if(this.stat=='joinroom'){
            $('.content').hide();
            $('.contjoinroom').show();
            this.updateAppStatContent();
            if(socketdata.player.role=='controller'){
                $('.contcontroller .contjoinroom [name=join]').off('vclick').on('vclick', function(){
                    if($(this).prop('disabled'))return;
                    $('.contcontroller .contjoinroom input').prop('disabled',true);

                    room=$('.contcontroller .contjoinroom [name=room]').val().trim();
                    playerActionJoin(room);
                });
            }
        }else if(this.stat=='customize'){
            $('.content').hide();
            $('.contcustomize').show();
            this.updateAppStatContent();

            if(socketdata.player.role=='controller'){

                $('.contcontroller .contcustomize .control [type=button]').off('vclick').on('vclick', function(){
                    if($(this).prop('disabled'))return;
                    playerAction('control', $(this).attr('data'));
                });

                $('.contcontroller .contcustomize [name=confirm]').off('vclick').on('vclick', function(){
                    if($(this).prop('disabled'))return;
                    $(this).prop('disabled',true);
                    $('.contcontroller .contcustomize .control [type=button]').prop('disabled',true);

                    modifyPlayer({confirmed:true});
                });

                $('.contcontroller .contcustomize [name=start]').off('vclick').on('vclick', function(){
                    if($(this).prop('disabled'))return;
                    $(this).prop('disabled',true);

                    modifyGame({stat:'ready'});
                });
            }
        }else if(this.stat=='game'){
            $('.content').hide();
            $('.contgame').show();

            if(socketdata.player.role=='controller'){
                $('.contcontroller .contgame .control [type=button]').off('vclick').on('vclick', function(){
                    if($(this).prop('disabled'))return;
                    playerAction('control', $(this).attr('data'));
                });
            }

            this.updateAppStatContent();
        }else if(this.stat=='result'){
            $('.content').hide();
            $('.contresult').show();
            this.updateAppStatContent();
        }else if(this.stat=='disconnect'){
            $('.content').hide();
            $('.contdisconnect').show();  
            this.updateAppStatContent();
            window.removeEventListener('deviceorientation', app.onDeviceOrientation);
            socket.disconnect(true);
        }else if(this.stat=='destroy'){
            window.removeEventListener('deviceorientation', app.onDeviceOrientation);
            socket.disconnect(true);
        }

        this.updateContent=function(cont){

            $(cont+' .roomdata').html(sprintf('Room[%s] %s', socketdata.room.stat, socketdata.room.id));
            $(cont+' .gamedata').html(sprintf('Game[%s]', socketdata.game.stat));

            player=socketdata.player;
            $(cont+' .playerdata').html(sprintf('%s,[y=%.0f]',strValueOf(player), player.control?player.control.y:0));

            jplayersdata=$(cont+' ul.playersdata').empty();
            var ctrlrs=controllers();
            for(key in ctrlrs){
                player=ctrlrs[key];
                jli=$('<li></li>').html(sprintf('%s,[y=%.0f]',strValueOf(player), player.control?player.control.y:0));
                jplayersdata.append(jli);
            }

            if(cont=='.contlanding'){
            }else if(cont=='.contcustomize'){
                if(socketdata.player.role=='controller'){
                    if(socketdata.game.stat=='confirmed' || socketdata.game.stat=='ready')$('.contcontroller .contcustomize [name=start]').show();
                    else $('.contcontroller .contcustomize [name=start]').hide();
                }
            }else if(cont=='.contgame'){
            }
        }
        this.updateAppStatContent=function(cont){
            if(!cont)
                this.updateContent('.cont'+this.stat);
            else if(cont==this.stat)
                this.updateContent('.cont'+this.stat);
        }
        this.playanim=function(s){
            console.log('playanim@'+s);
            if(s=='gamereadyanim'){
                cd=5;
                setInterval(function(){
                    $('.contcustomize .ready').html(cd<0?'loading':cd);
                    cd--;
                },1000);
            }
        }

    }

    this.animLastTime = 0;
    this.animDeltaTime = 0;
    this.animCnt = 0;
    this.animate = function() {
        try{
            if(app.animLastTime == 0) { app.animDeltaTime = 0; app.animLastTime = Date.now() / 1000.0; }
            else {app.animDeltaTime = Date.now()/1000.0 - app.animLastTime; app.animLastTime = Date.now() / 1000.0; }
            if(app.stat=='game')app.animatePlayerBalls();
        }finally{
            if(app.stat!='destroy')window.requestAnimFrame(app.animate);
            app.animCnt++;
        }
    }

    this.doFilteringFactor = 0.5;
    this.applyLowPassFilter = function (r, s) {
          s.y = (r.y * app.doFilteringFactor) + (s.y * (1.0 - app.doFilteringFactor));
    }

    this.animatePlayerBalls=function(){
        for(key in socketdata.game.players) {
            player=socketdata.game.players[key];
            if(!player)continue;
            if(!player.control)continue;
            jplayerball=$('.playerBall[data-slot="'+key+'"]');
            rawtop = jplayerball.css('top');
            oldtop = parseInt(rawtop)-50;
            newtop = player.control.y;
            newtop = lerp(oldtop,newtop,20*this.animDeltaTime)+50;
            //console.log(rawtop,oldtop,newtop);
            jplayerball.css('top',newtop);
        }
    }


    this.doAdded=false;
    this.doUpdLastTime = 0;
    this.doUpdTimeOut = 50;
    this.doSmoothed={y:0};
    this.doCnt=0;
    this.doEvent={alpha:0,beta:0,gamma:0}
    this.onDeviceOrientation=function(event){
        if(socketdata.player.role=='viewer'){
            window.removeEventListener('deviceorientation', app.onDeviceOrientation);
            return;
        }
        try{
            if(event.beta == null || event.gamma == null || event.alpha == null) return;
            app.doEvent.alpha=event.alpha;
            app.doEvent.beta=event.beta;
            app.doEvent.gamma=event.gamma;

            data = {y:event.beta};
            data.y = (clamp((data.y-0.7) / 80.0,-1,1) + 1)*0.5*600;

            app.applyLowPassFilter(data, app.doSmoothed);
            socketdata.player.control=app.doSmoothed;
            app.updateAppStatContent('customize');
            app.updateAppStatContent('game');

            
            if(socketdata.game.stat != 'started') return;
            if(Date.now() - app.doUpdLastTime < app.doUpdTimeOut) return;
            app.doUpdLastTime = Date.now();
            playerAction('control', app.doSmoothed);
        }finally{
            app.doCnt++;
        }
    }

    this.updateLog=function(){
        var msg = sprintf('%d %d',app.doCnt, app.animCnt);
        //var msg=sprintf('smoothed.y=%.2f, doEvent={alpha:%.2f,beta:%.2f,gamma:%.2f}', this.doSmoothed.y,this.doEvent.alpha,this.doEvent.beta,this.doEvent.gamma);
        $('.log').html(msg);
    }

    this.notify=function(msg){
        this.jnotification.html(msg);
        TweenMax.killTweensOf(this.jnotification);
        TweenMax.to(this.jnotification, 0.2, {autoAlpha:1});
        TweenMax.to(this.jnotification, 0.8, {autoAlpha:0, delay:3});
    }

    this.error=function(msg){
        this.jerror.html(msg);
        TweenMax.killTweensOf(this.jerror);
        TweenMax.to(this.jerror, 0.2, {autoAlpha:1});
        TweenMax.to(this.jerror, 0.8, {autoAlpha:0, delay:3});
    }

    this.log=function(msg){
        this.jlog.html(msg);
        TweenMax.killTweensOf(this.jlog);
        TweenMax.to(this.jlog, 0.2, {autoAlpha:1});
        TweenMax.to(this.jlog, 0.8, {autoAlpha:0, delay:3});
    }
};

var app = new App();

//var socket = io.connect('http://10.60.8.42:8080', {reconnect:false});
//var socket = io.connect('http://110.74.145.170:37001', {reconnect:false});
//var socket = io.connect('http://192.168.145.170:37001', {reconnect:false});
var socket = io.connect('http://geometry.my/showcase/exp/flatpong:37001', {reconnect:false});
//var socket = io.connect('http://10.60.2.133:37001', {reconnect:false});
var socketdata = {};
socketdata.room = {};
socketdata.game = {};
socketdata.player = {role:app.isMobile?'controller':'viewer'};
//////////////////////////////
socket.on('error', onServerError);
socket.on('disconnect', onDisconnected);
socket.on('onConnected', function (data){
    console.log('_onConnected');
    if(data.e){
        try{ onConnectFailed(); } catch(err) { console.log('onConnectFailed ', err); }
    }else{
       syncdata(socketdata.player,data.player); 
       try{ onConnected(); } catch(err) { console.log('onConnected ', err); }
    } 
});

socket.on('onRoomModified', function(data){ 
    syncdata(socketdata.room,data.room); 
    try{ onRoomModified(data.room);  } catch(err) { console.log('onRoomModified ', err); }
});
socket.on('onGameModified', function (data){ 
    var fireCallbacks = {
    "onGameModified"    : onGameModified,
    "onGameReady"       : ((socketdata.game.stat!='ready'&&data.game.stat=='ready')     ? onGameReady   : null),
    "onGameStarted"     : ((socketdata.game.stat!='started'&&data.game.stat=='started') ? onGameStarted : null),
    "onGameEnded"       : ((socketdata.game.stat!='ended'&&data.game.stat=='ended')     ? onGameEnded   : null),
    "onGameConfirmed"   : ((socketdata.game.stat!='confirmed'&&data.game.stat=='confirmed') ? onGameConfirmed   : null),
    };
    syncdata(socketdata.game,data.game); 
    for(key in fireCallbacks) if(fireCallbacks[key]) try{ fireCallbacks[key](data.game); }catch(err) { console.log(key,err); }
});

socket.on('onViewerAction', function (data){
    try{
        onViewerAction(data.action,data._data);
    }catch(err){
        console.log('onViewerAction',data.action,data);
    }
});

socket.on('onPlayerAction', function (data){

    var fireCallbacks = {
    "onPlayerAction"            : onPlayerAction
    };
    joinind=joinIndexOf(data.id);
    ind=indexOfPlayer(data.id);
    for(key in fireCallbacks) if(fireCallbacks[key]) try{ fireCallbacks[key](data.action,data._data,joinind,ind); }catch(err) { console.log(key,err); }
});

socket.on('onPlayerModified', function (data){
    var fireCallbacks = {
    "onAnyPlayerModified"   : onAnyPlayerModified,
    "onMyPlayerModified"    : (data.player.id==socketdata.player.id ? onMyPlayerModified    : null),
    "onOtherPlayerModified" : (data.player.id!=socketdata.player.id ? onOtherPlayerModified : null),
    };
    syncplayer(data.player);
    joinind=joinIndexOf(data.player.id);
    ind=indexOfPlayer(data.player.id);
    for(key in fireCallbacks) if(fireCallbacks[key]) try{ fireCallbacks[key](data.player,joinind,ind); }catch(err) { console.log(key,err); }
});

socket.on('onPlayerJoined',function (data){
    console.log('onPlayerJoined',data.player,socketdata.player);

    var fireCallbacks = {
    "onAnyPlayerJoined"     : onAnyPlayerJoined,
    "onMyPlayerJoined"      : (data.player.id==socketdata.player.id ? onMyPlayerJoined    : null),
    "onOtherPlayerJoined"   : (data.player.id!=socketdata.player.id ? onOtherPlayerJoined : null),
    };

    //if(data.player.id==socketdata.player.id) syncdata(socketdata.room,data.room);
    //else socketdata.room.players.push(data.player);
    syncdata(socketdata.room,data.room);
    syncdata(socketdata.game,data.game);
    syncplayer(data.player);

    joinind=joinIndexOf(data.player.id);
    ind=indexOfPlayer(data.player.id);
    player=socketdata.room.players[ind];
    for(key in fireCallbacks) if(fireCallbacks[key]) try{ fireCallbacks[key](player,joinind,ind); }catch(err) { console.log(key,err); }
});

socket.on('onPlayerLeave', function (data) {
    joinind=joinIndexOf(data.player.id);
    ind=indexOfPlayer(data.player.id);
    player=socketdata.room.players[ind];
    removePlayer(data.player.id);
    try{ onOtherPlayerLeave(player, joinind,ind); }catch(err) { console.log('onOtherPlayerLeave',err); }
});
//////////////////////////////
function onServerError(data){
    console.log('onServerError@',data);
    if(socketdata.player.role=='controller'){
        if(app.stat=='joinroom'){
            if(data.n=='playerAction'&&data.action=='join'){
                $('.contcontroller .contjoinroom input').prop('disabled',false);
                $('.contcontroller .contjoinroom [name=room]').val('');
            }
        }
    }
    app.error(JSON.stringify(data));
}
function onDisconnected(){
    console.log('onDisconnected@');
    app.setStat('disconnect');
}
function onConnected(){
    console.log('onConnected@',socketdata.player);
    if(socketdata.player.role=='viewer'){ playerActionJoin(); }
    else app.setStat('joinroom');
}
function onConnectFailed(){
    console.log('onConnectFailed@');
    app.setStat('disconnect');
}
function modifyRoom(data){
    syncdata(socketdata.room,data);
    socket.emit('modifyRoom',{room:data});    
}
function onRoomModified(data){
    console.log('onRoomModified@',data);
     app.updateAppStatContent();
}

function modifyGame(data){
    syncdata(socketdata.game,data);
    socket.emit('modifyGame',{game:data});    
}
function onGameModified(data){
    console.log('onGameModified@',data);
    app.updateAppStatContent();
}
function onGameConfirmed(){
    console.log('onGameConfirmed@');
}
function onGameReady(){
    console.log('onGameReady@');
    app.playanim('gamereadyanim');

    //
    var ctrlrs=controllers();
    socketdata.game.players=[
        ctrlrs.length>0?ctrlrs[0]:null,
        ctrlrs.length>1?ctrlrs[1]:null,
        ctrlrs.length>2?ctrlrs[2]:null,
        ctrlrs.length>3?ctrlrs[3]:null,
    ];
    for(key in ctrlrs) ctrlrs[key].slot=key;
    socketdata.game.team1score=0;
    socketdata.game.team2score=0;
}
function onGameStarted(){
    console.log('onGameStarted@');
    app.setStat('game');
}
function onGameEnded(){
    console.log('onGameEnded@');
    app.setStat('result');
}

//viewr action will send to all controllers
function viewerAction(action,data){
    if(socketdata.player.role=='viewer')socket.emit('viewerAction', {action:action, id:socketdta.id, _data:data});
    else if(socketdata.player.role=='controller')socket.emit('playerAction', {action:action, id:socketdta.id, _data:data});
}
function onViewerAction(action,data){
    console.log('onViewerAction@',action,data);
}
function viewrActionBack(){
    viewerAction('back');
}
function modifyPlayer(player){
    if(!player.id)player.id=socketdata.player.id;
    syncplayer(player);
    socket.emit('modifyPlayer',{player:player});
    app.updateAppStatContent();
}
function onAnyPlayerModified(player,joinind,ind){
    //console.log('onAnyPlayerModified@',player,joinind,ind,player.slot);
    app.updateAppStatContent();
}
function onMyPlayerModified(player,joinind,ind){
    //console.log('onMyPlayerModified@',player,joinind,ind,player.slot);
}
function onOtherPlayerModified(player,joinind,ind){
    //console.log('onOtherPlayerModified@',player,joinind,ind,player.slot);
}

//player action will only send to viewer
function playerAction(action,data){
    console.log('playerAction',action,data);
    if(socketdata.player.role=='viewer')socket.emit('viewerAction', {action:action, id:socketdata.player.id, _data:data});
    else if(socketdata.player.role=='controller')socket.emit('playerAction', {action:action, id:socketdata.player.id, _data:data});
}
function playerActionJoin(id){
    playerAction('join', {player:{role:socketdata.player.role}, room:{id:id}})
}
function onPlayerAction(action,data,joinind,ind){
    if(socketdata.player.role=='viewer'){
        if(action=='control' && ['up','left','right','down'].indexOf(data)>=0){
            //up left right down
            app.notify(sprintf('Player(slot=%s, joinind=%s, ind=%s),%s,%s',socketdata.room.players[ind].slot,joinind,ind,action,data));
        }else if(action=='control' && data && data.y){
            //gyroscope
            socketdata.room.players[ind].control=data;
            app.updateAppStatContent();
        }else{
            app.notify(sprintf('Player(slot=%s, joinind=%s, ind=%s),%s,%s',socketdata.room.players[ind].slot,joinind,ind,action,data));
        }
    }

}
function onAnyPlayerJoined(player,joinind,ind){
    console.log('onAnyPlayerJoined@',player.name,joinind,ind);
    app.updateAppStatContent();
}
function onOtherPlayerJoined(player,joinind,ind){
    console.log('onOtherPlayerJoined@',player.name,joinind,ind);
    if(socketdata.player.role=='viewer'){
        if(app.stat=='landing')
            app.setStat('customize'); 

    }
    app.updateAppStatContent();
    app.notify('player joined:'+player.name);
}
function onMyPlayerJoined(player,joinind,ind){
    console.log('onMyPlayerJoined@',player.name,joinind,ind);
    if(socketdata.player.role=='viewer'){
        if(app.stat=='preload')
            app.setStat('landing'); 
    }else{
        if(app.stat=='joinroom')
            app.setStat('customize');
    }
}
function onOtherPlayerLeave(player,joinind,ind){
    console.log('onOtherPlayerLeave@',player.name,joinind,ind);
    //
    for(key in socketdata.game.playerids){
        if(socketdata.game.players[key].id==player.id){
            socketdata.game.players[key]=null;
        }
    }
    app.notify('player leaved:'+player.name);
}

app.setStat('init');
app.setStat('preload');

}); //end $(function() { 
