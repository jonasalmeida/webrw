var http = require('http'); 
var fs = require('fs');
var port = process.env.PORT || 3000; // nitrous will proxy it through SSL through this port
//var request = require('request');
var openUri = require('open-uri'); // dependency on ftp not recognized on manifest of this node package
http.createServer(function (req, res) {
	res.writeHead(200, {
		'Content-Type': 'text/javascript',
		'Access-Control-Allow-Origin':'*',
	});
  console.log(req.url); // report to the command line what is being asked
	var AVs=req.url.slice(2).split('&'), AVi;
	AV={};
	for(var i=0;i<AVs.length;i++){
		AVi=AVs[i].split('=');
		AV[AVi[0]]=AVi[1];
	}
	if(!AV.callback){AV.callback='callback'}
	if(AV.set){
		var len = 0;
		var log = function(docId,docLength){
			// LOG:  [TIME in mins since 1970] \t [UID] \t [STRING LENGTH]
			fs.open('/home/node/admin/log', 'a',mode=0666,function(er,fd){fs.write(fd,Math.round(Date.now()/60000)+'\t'+docId+'\t'+docLength+'\n');fs.close(fd)})
			}
		if(!AV.key){AV.key='UID'+Math.random().toString().slice(2)}
		if(AV.set=='blob'){// get chunks of data in a data blob
			var chunks=[];
			req.on('data', function (chunk) {
				chunks.push(chunk);
				return;
			});
			//req.on('error', function (res) {
			//	console.log('Error:', res);
			//})
			req.on('end',function(){ // all chunks in
				fs.open('/tmp/'+AV.key, 'a',mode=0666,function(er,fd){
					var val = chunks.join('');
					fs.writeSync(fd,val);
					fs.close(fd)
					res.end(AV.callback+'('+AV.key+')');
					log(AV.key,val.length);
				});
			});
		}
		else{fs.open('/tmp/'+AV.key, 'a',mode=0666,function(er,fd){var val=decodeURIComponent(AV.set);fs.write(fd,val+'\n');fs.close(fd);res.end(AV.callback+'('+AV.key+')');log(AV.key,val.length);})}
	}		
	else{ // AV.get OR AV.doc
		if(!AV.get){
			if(!AV.doc){res.end('ERROR: neither set, get or doc were defined for this call')}
			else{ // DOC, is this for a key or url?
				if (!AV.doc.match(/\./g)){ // it is a key
					res.end(fs.readFileSync('/home//tmp//doc/'+AV.doc).toString()); // return content as is
					//var fd = fs.openSync('/tmp/'+AV.doc, 'r');
					//var val = fs.readSync(fd,1000);
					//res.end(val[0]); // return content as is
					//fs.close(fd);
				}
				else {
					//if(!AV.doc.match(/ftp:/g)){request({uri:AV.doc},function(e,r){res.end(r.body)})}
					//else{openUri(AV.doc,function(e,r){res.end(r)})}
					openUri(AV.doc,function(e,r){res.end(r+'')}); // note silly trick to make sure res.end takes a string
				}
			}
		}
		else{ // GET
			// is this a key or a URL
			if (!AV.get.match(/\./g)){ // it is  KEY
				//var fd = fs.openSync('/tmp/'+AV.get, 'r');
				//var val = fs.readSync(fd,1000);
				//val=val[0].split('\n');
				var val = fs.readFileSync('/tmp/'+AV.get).toString().split('\n');
				if(val[val.length-1].length==0){val=val.slice(0,val.length-1)} // remove trailing blanks
				res.end(AV.callback+'('+JSON.stringify(val)+')'); // val[1] is the length of the content, val[0]
				//fs.close(fd);
			}
			else { // it is a URL
				//request({uri:AV.get},function(e,r){res.end(AV.callback+'('+JSON.stringify(r.body.split('\n'))+')')});
				openUri(AV.get,function(e,val){
					val = (val+'').split('\n');
					if(val[val.length-1].length==0){val=val.slice(0,val.length-1)} // remove trailing blanks
					res.end(AV.callback+'('+JSON.stringify(val)+')');
				});
			}
		}
	}
}).listen(port);
