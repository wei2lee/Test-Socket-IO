
var appio = new (function() {
	var self=this;
	this.efn = function(){}
	this.socket = null;
	this.isConnected = false;
	this.cfg={
		onConnected:this.efn,
		onDisconnected:this.efn,
		ip:'http://localhost:8080'
	};
	this.connect = function (cfg) {
		if(this.socket){ 
			this.disconnect();
			this.socket.socket.reconnect(true);
		}else{
			for(k in cfg) this.cfg[k] = cfg[k] ? cfg[k] : this.cfg[k];
			this.socket = io.connect(this.cfg.ip, { 'reconnect':false, });
			this.isConnected=false;
	        this.socket.on('error', function (err){ 
	        	console.log('error',err); 
	        	if(err === ''){ 
	        		self.isConnected=false; 
					self.disconnect();
					self.socket.socket.reconnect(true);
	        	} 
	        });
	        this.socket.on('onconnected',function (data) { self.isConnected=true; self.cfg.onConnected(data); });
	        this.socket.on('disconnect', function () { self.isConnected=false; self.cfg.onDisconnected(); });
		}
	}
	this.disconnect = function(){
		//if(!this.isConnected)return;
		this.isConnected=false;
		this.socket.disconnect(true);
		this.cfg.onDisconnected(); 
	}
})();

function log(s){
	var jlog=$('.log');
	jlog.html(jlog.html() + '<br>' + s);
}
function render(dt) {
	if(!appio.room){
		$('#roompanel h1').html('No Room, ' + (appio.isConnected?'Connected':'Disconnected') );
		$('#roompanel ul').empty();
	}else{
		$('#roompanel h1').html('Room:'+appio.room.id);
		$('#roompanel ul').empty();
		$.each(appio.room.players, function( ind, ele ) {
			$('<li />').html((ind+1) + '. ' + ele.id + (appio.player.id==ele.id?' (You)':'')).appendTo($('#roompanel ul'));
		});
	}
	if(!appio.room){
		$('#msgsendto').prop('disabled',true).empty().trigger('update');
	}else{
		$('#msgsendto').prop('disabled',false).empty();
		$('<option selected />').val('broadcast').text('everyone in room').appendTo($('#msgsendto'));
		$.each(appio.room.players, function( ind, ele ) {
			$('<option />').val(ele.id).text(ele.id + (appio.player.id==ele.id?' (You)':'')).appendTo($('#msgsendto'));
		});
		$('#msgsendto').trigger('update');
	}
}
$(function() { 

$('#connect').on('vclick', function (){
	appio.connect({
		ip:'http://10.60.2.133:37001',
		onConnected:function (data){ 
			if(data.s){ appio.player=data.d.player; render(); } 
			console.log(JSON.stringify(data)); 
		},
		onDisconnected:function (){
			appio.room=null;
			appio.player=null;
			render();
		}
	});
	appio.socket.on('onjoinroom', function (data){ appio.room=data.room; render(); console.log('onjoinroom',data); });
	appio.socket.on('onleaveroom', function (data){ appio.room=data.room; render(); console.log('onleaveroom',data); });
	appio.socket.on('onmsg', function (data){ render(); console.log('onmsg',data); });
	render();
});
$('#disconnect').on('vclick', function (){
	appio.disconnect();
});
$('#createroom').on('vclick', function (){
	appio.socket.emit('joinroom', {room:null}, function (data){ if(data.s) appio.room=data.d.room; render(); console.log(JSON.stringify(data)); });
});
$('#joinroom').on('vclick', function (){
	var roomid = $('#roomid').val();
	appio.socket.emit('joinroom', {room:{id:roomid}}, function (data){ if(data.s) appio.room=data.d.room; render(); console.log(JSON.stringify(data)); });
});
$('#leftroom').on('vclick', function (){
	appio.socket.emit('leftroom', null, function (data){ if(data.s) appio.room=data.d.room; render(); console.log(JSON.stringify(data)); });
});
$('#getroom').on('vclick', function (){
	var roomid = $('#roomid').val();
	appio.socket.emit('getroom', {room:{id:roomid}}, function (data){ console.log(JSON.stringify(data)); });
});
$('#sendmsg').on('vclick', function (){
	var msg=$('#msgtext').val();
	var sendto=$('#msgsendto').val();
	appio.socket.emit('msg', msg, sendto, function (data){ console.log(JSON.stringify(data)); });
});
render();
}); //end $(function() { 
