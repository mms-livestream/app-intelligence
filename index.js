/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

//Dependencies

let Promise = require('bluebird');  //jshint ignore:line
let request = require('request');
let core = require('mms-core');
let serverAPI = require('./api/server/module.js');
let serviceAPI = require('./api/server/module.js');
let express = require('express');
let math = require('mathjs');
let tools = require('./tools.js');
//Class

class Intelligence {
    constructor() {
        this.node = "NODE_INTELLIGENCE";
        this.service = new core.Service(this.node, serviceAPI);
        this.server = new core.Server(this.node, serverAPI, {"service": this.service});
    }
}

//Main
let intelligence = new Intelligence();
intelligence.service.prepare()
.then(() => intelligence.server.listen())
.then(() => setInterval(testtest,3000));
//.then(() => testtest());

function testtest(){
let container = [];
let container2 = [];

/*.then(() => {*/ return new Promise( (resolve, reject) => {
	intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"viewers", cmd:"stats"}, function (err, response) {
		container = container.concat(response.counters);
		resolve(container);
	});
}) // } )
.then( (container) => { return new Promise( (resolve, reject) => {
	intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"servers", cmd:"stats"}, function (err, response) {
		container = container.concat(response.counters);
		resolve(container);
	});
}) })
.then( (container) => { return new Promise( (resolve, reject) => {
	intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"uploader_servers", cmd:"get"}, function (err, response) {
    container = container.concat(response.lists);
	console.log(">>>>>>>>>>>>>> WHAT DO I GET>>>>> "+response.lists);
    container = container.concat(JSON.parse(JSON.stringify(response.lists)));
	resolve(container);
	});
}) })
.then( (container) => { return new Promise( (resolve, reject) => {
	intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"uploaders", cmd:"list"}, function (err, response) {
		console.log(response.uploaders);
    	container = container.concat(response.uploaders);
		resolve(container);
	});
}) })
.then( (container) => {let distrib_fin = update(container[1], container[0],container[2],container[4], serversAdd);
	console.log(">>>>>>>> WHAT IT BECOMES >>>> "+distrib_fin);
    let destHost = "192.168.2.100";
	//let destHost = core.dConfig["NODE_REPLICATOR"].server.host;
	let destPort = core.dConfig["NODE_REPLICATOR"].server.port;
	let data = distrib_fin;
	let options = {
	  url: `http://${destHost}:${destPort}/api/manage/location`,
	  //url: `http://192.168.2.119:8086/api/manage/location`,
	  method: 'POST',
	  json: true,
	  headers: {
		  'Content-Type': 'application/json'
	  },
	  body: data
	};

	request(options, function(err, res) {
		if (!err && res.statusCode === 200) {
		    console.log("OK sent");
		}
		else {
		    console.log("Error:" + err);
		}
	});
	
	return new Promise( (resolve, reject) => {
		intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"uploader_servers", cmd:"update"},{distribution:distrib_fin}, function (err, response) {
			container = container.concat(distrib_fin);
			resolve(container);
		});
	});
})
.then( (container) => { let tmp = {};
	let list_vid=[];
	for (let i in container[5]) {
		tmp[i]=container[5][i];
	}

	console.log(tmp);
	container2 = container2.concat(tmp);
	return new Promise( (resolve, reject) => {
		intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"viewers", cmd:"list"}, function (err, response) {
			console.log(response.lists);
			container2 = container2.concat(response.lists);
			resolve(container2);
		});
	})
})
.then( (container2) => { let new_servers = {};
	for (let i in container2[1]){
		//console.log(i);
		for (let j in container2[1][i]){
			//console.log(container2[1][i][j]);
			if (new_servers[container2[1][i][j]] === undefined)
				new_servers[container2[1][i][j]] = container2[0][i];
		}
	}
	console.log("new_servers: "+new_servers);
	container2 = container2.concat(new_servers);
  	return new Promise( (resolve, reject) => {
		intelligence.service.cli.NODE_SESSION_MANAGER.act({role:"mpd", cmd:"update"},{data:new_servers}, function (err, response) {
		    resolve(container2);
    	})
  	})
})
.then((container2) => {
	return new Promise( (resolve, reject) => {
		console.log(">>>>> VERIF ENTREE VIEWER SERVERS >>>>>> " +container2[2]);
		intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"viewer_servers", cmd:"update"},{distribution:container2[2]}, function (err, response) {
		    resolve(container2);
    	})
  	})
})
//.then(() => intelligence.server.close);
}

let serversAdd = ["http://192.168.2.100:8087","http://192.168.2.130:8087","http://192.168.2.122:8087","4th server"];
function update(servers, viewers, distrib, uploaders, serversAdd){
	//let charge_max = 20;
	let ups_non_pop=[];  // vidéos non-populaires
	let ups_pop=[];  // vidéos populaires
	let median;
	console.log("DEBUT FCT UPDATE uploaders :" + uploaders);
	
		
    if (tools.isEmpty(distrib)){
		distrib["new"] = [];
		distrib["new"] = distrib["new"].concat(serversAdd[0]);
		distrib["new"] = distrib["new"].concat(serversAdd[1]);
		if(uploaders!=undefined){
			for (let i=0; i<uploaders.length; i++){
				if (distrib[uploaders[i]]==undefined)
					distrib[uploaders[i]]=distrib["new"];
			}
		}
    	return(distrib);
    }

	let nbr_viewers = [];
	for (let j in viewers){
		nbr_viewers = nbr_viewers.concat(viewers[j]);
	}
	median = math.median(nbr_viewers);

	if (nbr_viewers.length>=2){  // number of videos
		for (let i in viewers){
			if (viewers[i]<=(0.5*median)){
				ups_non_pop=ups_non_pop.concat(i);
			}
			else if (viewers[i]>=(1.5*median)){
				ups_pop=ups_pop.concat(i);
			}
		}
		console.log("mediane egale a : ", median);
	}else{
		for (let i in viewers){
			ups_pop=ups_pop.concat(i);
			ups_non_pop=ups_non_pop.concat(i);
		}
	}

    for (let i in ups_pop){
		if (distrib[ups_pop[i]].length == 2 && viewers[ups_pop[i]]>=10)
			distrib[ups_pop[i]] = distrib[ups_pop[i]].concat(serversAdd[2]);
		else if (distrib[ups_pop[i]].length == 3 && viewers[ups_pop[i]]>=20)
        	distrib[ups_pop[i]] = distrib[ups_pop[i]].concat(serversAdd[3]);
	}

	for (let i in ups_non_pop){
		if (distrib[ups_non_pop[i]].length > 3 && viewers[ups_non_pop[i]]<20)
	      	distrib[ups_non_pop[i]]=distrib[ups_non_pop[i]].splice(-1,1);
		else if (distrib[ups_non_pop[i]].length > 2 && viewers[ups_non_pop[i]]<10)
	      	distrib[ups_non_pop[i]]=distrib[ups_non_pop[i]].splice(-1,1);
	}

	distrib["new"] = [];
	distrib["new"] = distrib["new"].concat(serversAdd[0]);
	distrib["new"] = distrib["new"].concat(serversAdd[1]);
	if(uploaders!=undefined){
		for (let i=0; i<uploaders.length; i++){
			if (distrib[uploaders[i]]==undefined)
				distrib[uploaders[i]]=distrib["new"];
		}
	}
	console.log(distrib);
	return(distrib);
}

/*
	for (let i in servers){
		servers[i]=servers[i]*100/charge_max;
	}
	let ups_list=[];
	let nbr_viewers = [];
	for (let j in viewers){
		nbr_viewers = nbr_viewers.concat(viewers[j]);
	}
	median = math.median(nbr_viewers);
	for (let i in servers){
		if (servers[i]>=70){	// 70% charge max
			srv_indisp=srv_indisp+i;
		}else if (servers[i]<=20){ 	// 20% charge min
			srv_prio=srv_prio.concat(i);
		}
	}
	if (srv_prio.length == 0){
		for (let i in servers){
			if (servers[i]<70){
				let srv_disp=srv_disp.concat(i);
			}
		}
	}else{
		srv_disp=srv_disp.concat(srv_prio);
	}
	for (let i in viewers){
		if (viewers[i]<=(0.5*median)){
			ups_non_pop=ups_non_pop.concat(i);
		}
		else if (viewers[i]>=(1.5*median)){
			ups_pop=ups_pop.concat(i);
		}
	}
	console.log("mediane egale a : ", median);
	/*console.log(srv_disp);
	console.log(ups_non_pop);
	console.log(ups_pop);*/
  /*if (srv_disp.length != 0){
loop1:
    for (let i in ups_pop){
      if (distrib[ups_pop[i]].length == 2){
        let bool = false;
loop2:
        for (let j in srv_disp)
loop3:
          for (let k in distrib[ups_pop[i]]){
            if (srv_disp[j] == distrib[ups_pop[i]][k])
              bool = false;
            else {
              bool = true;
            }
            if (bool == true){
              distrib[ups_pop[i]]=distrib[ups_pop[i]].concat(srv_disp[j]);
              break loop2;
            }
          }
        if (bool = false){
          distrib[ups_pop[i]]=distrib[ups_pop[i]].concat("server:5");
        }
      }
    }
  } else if (srv_disp.length == 0){
      for (let i in ups_pop)
        distrib[ups_pop[i]]=distrib[ups_pop[i]].concat("server:5");
  }
  if (srv_disp.length == 0)
    distrib["new"]=["server:5","server:6"];
  else if (srv_disp.length >= 2)
    distrib["new"]=[srv_disp[0],srv_disp[1]];
  else if (srv_disp.length == 1)
    distrib["new"]=[srv_disp[0],"server:5"];*/
	/*for (let i in ups_non_pop){
		//console.log(i);
		distrib[ups_non_pop[i]]=[srv_disp[Math.floor(Math.random() * (srv_disp.length))]];
	}
	console.log(distrib);
	return(distrib);
}*/
