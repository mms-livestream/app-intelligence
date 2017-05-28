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
.then(() => setInterval(turn,2800)); // we execute the function 'turn' every 2800 ms

function turn(){
  let container = []; // container will contain information that we get from DB or we compute so that we don't lose them from a 'Promise' to the following 'Promise'
  let container2 = []; // container2 will be used for the same objective starting from the moment we send the decision to the replicator and the DB.

  return new Promise( (resolve, reject) => {
  	intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"viewers", cmd:"stats"}, function (err, response) {
      // Here we put the number of viewers for the videos in container[0]
  		container = container.concat(response.counters);
  		resolve(container);
  	});
  }) // } )
  .then( (container) => { return new Promise( (resolve, reject) => {
  	intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"servers", cmd:"stats"}, function (err, response) {
      // Here we put the number of connexions on every server in container[1]
  		container = container.concat(response.counters);
  		resolve(container);
  	});
  }) })
  .then( (container) => { return new Promise( (resolve, reject) => {
  	intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"uploader_servers", cmd:"get"}, function (err, response) {
      // Here we put the previous list of servers for every video in container[2]
      container = container.concat(response.lists);
      // Here we put the same thing like container[2] but in an object that wouldn't be modified in container[3]
      container = container.concat(JSON.parse(JSON.stringify(response.lists)));
  	resolve(container);
  	});
  }) })
  .then( (container) => { return new Promise( (resolve, reject) => {
  	intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"uploaders", cmd:"list"}, function (err, response) {
      // Here we put the list of videos in container[4]
      container = container.concat(response.uploaders);
  		resolve(container);
  	});
  }) })
  .then( (container) => {let distrib_fin = update(container[1], container[0],container[2],container[4], serversAdd); // New replication decision
    // Here we put the address of the Replicator
    let destHost = "192.168.2.100";
  	//let destHost = core.dConfig["NODE_REPLICATOR"].server.host;
  	let destPort = core.dConfig["NODE_REPLICATOR"].server.port;
  	let data = distrib_fin;
  	let options = {
  	  	url: `http://${destHost}:${destPort}/api/manage/location`,
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
        // Here we put the new servers for every video in container[5]
        container = container.concat(distrib_fin);
  			resolve(container);
  		});
  	});
  })
  .then( (container) => { let tmp = {};
  	for (let i in container[5]) {
  		tmp[i]=container[5][i];
  	}
    // Here we put the new servers for every video in container2[0]
  	container2 = container2.concat(tmp);
  	return new Promise( (resolve, reject) => {
  		intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"viewers", cmd:"list"}, function (err, response) {
        // Here we put the list of viewers for every video in container2[1]
  			container2 = container2.concat(response.lists);
  			resolve(container2);
  		});
  	})
  })
  .then( (container2) => {
  	return new Promise( (resolve, reject) => {
  		intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"servers", cmd:"bitrates"}, function (err, response) {
        // Here we put the bitrate of every distribution server in container2[2]
  			container2 = container2.concat(response.bitrate);
  			resolve(container2);
  		});
  	})
  })
  .then( (container2) => {
  	return new Promise( (resolve, reject) => {
  		intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"publishTime", cmd:"get"}, function (err, response) {
        // Here we put the publishTime of every video in container2[3]
  			container2 = container2.concat(response.publishTime);
  			resolve(container2);
  		});
  	})
  })
  .then( (container2) => {
  	intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"modif", cmd:"verif"}, function (err, response) {
      // Here we verify if a new Viewer is added, if that's the case, we make a new decision for the servers from which every viewer can watch the video
  		if (response.modification == "yes") {
  			let new_servers = {};
  			for (let i in container2[1]){	// i is a video (uploader:?)
  				let publishTime = response.publishTime;
  				let slicesUploader = i.split(":");
  				for (let j in container2[1][i]["viewers"]){	// container2[1][i] is a list of viewers
            let list_tmp = JSON.parse(JSON.stringify(container2));
  					let slicesViewer = container2[1][i]["viewers"][j].split(":");
  					if (new_servers[slicesViewer[1]] === undefined){		// new_servers[container2[1][i][j]] is a list of servers for each viewer
  						new_servers[slicesViewer[1]] = {"id_uploader": parseInt(slicesUploader[1]),"servers":list_tmp[0][i], "publishTime":container2[3][i]};	// container2[0][i] is the list of possible servers for the viewer
              if (list_tmp[0][i].length == 3){ // There are three distribution servers
                if (Math.floor(Math.random() * 2) + 2 == 2){ // Randomly we give 2 or 3 servers for the Viewer
  								let maxi = 0;
  								let index = -1;
  								for (let k in list_tmp[0][i]){
  									if (container2[2][list_tmp[0][i][k]] >= maxi){
  										maxi = container2[2][list_tmp[0][i][k]];
  										index = k;
  									}
  								}
  								new_servers[slicesViewer[1]]["servers"].splice(index,1);
  							}
  						}else if (list_tmp[0][i].length == 4){ // There are four distribution servers
  							let alea = Math.floor(Math.random() * 2) + 3; // Randomly we give 3 or 4 servers for the Viewer, we can put '* 3' instead of '* 2' if we want to give 2 servers also
  							if (alea == 3){
  								let maxi = 0;
  								let index = -1;
  								for (let k in list_tmp[0][i]){
  									if (container2[2][list_tmp[0][i][k]] >= maxi){
  										maxi = container2[2][list_tmp[0][i][k]];
  										index = k;
  									}
  								}
  								new_servers[slicesViewer[1]]["servers"].splice(index,1);
  							}else if (alea == 2){
  								let maxi = 0;
  								let index = -1;
  								for (let k in list_tmp[0][i]){
  									if (container2[2][list_tmp[0][i][k]] >= maxi){
  										maxi = container2[2][list_tmp[0][i][k]];
  										index = k;
  									}
  								}
                  new_servers[slicesViewer[1]]["servers"].splice(index,1);
  								container2[2][list_tmp[0][i][index]] = -Infinity;
  								maxi = 0;
  								index = -1;
  								for (let k in list_tmp[0][i]){
  									if (container2[2][list_tmp[0][i][k]] >= maxi){
  										maxi = container2[2][list_tmp[0][i][k]];
  										index = k;
  									}
  								}
  								new_servers[slicesViewer[1]]["servers"].splice(index,1);

  							}
  						}
  					}
  				}
  			}
  			container2 = container2.concat(new_servers);
  		  	return new Promise( (resolve, reject) => {
  				intelligence.service.cli.NODE_SESSION_MANAGER.act({role:"mpd", cmd:"update"},{data:new_servers} );
  				intelligence.service.cli.NODE_DB_CONTROLLER.act({role:"viewer_servers", cmd:"update"},{distribution:container2[4]});
  		  	})
  		}
  	})
  })
}
// Here we put the list of the distribution servers, we can get them from the database if we want
let serversAdd = ["192.168.2.100","192.168.2.119","192.168.2.122","192.168.2.110"];
// This function gives the new distribution servers for every video, this method was adapted for the demo
function update(servers, viewers, distrib, uploaders, serversAdd){
	//let charge_max = 20;
	let ups_non_pop=[];  // vidéos non-populaires
	let ups_pop=[];  // vidéos populaires
	let median;

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
	if (viewers['uploader:1'] == undefined)
		viewers['uploader:1'] = 0;
	for (let j in viewers){
		if (viewers[j]!=undefined)
			nbr_viewers = nbr_viewers.concat(viewers[j]);
	}
	if (nbr_viewers!=[])
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
	}else{
		for (let i in viewers){
			ups_pop=ups_pop.concat(i);
			ups_non_pop=ups_non_pop.concat(i);
		}
	}

    for (let i in ups_pop){
		if (distrib[ups_pop[i]].length == 2 && viewers[ups_pop[i]]>=5) // 5 is a threshold to add a third server, it can be modified
			distrib[ups_pop[i]] = distrib[ups_pop[i]].concat(serversAdd[2]);
		else if (distrib[ups_pop[i]].length == 3 && viewers[ups_pop[i]]>=10) // 10 is a threshold to add a fourth server, it can be modified
        	distrib[ups_pop[i]] = distrib[ups_pop[i]].concat(serversAdd[3]);
	}

	for (let i in ups_non_pop){
		if (distrib[ups_non_pop[i]].length > 3 && viewers[ups_non_pop[i]]<10)
	      	distrib[ups_non_pop[i]]=distrib[ups_non_pop[i]].splice(-1,1);
		else if (distrib[ups_non_pop[i]].length > 2 && viewers[ups_non_pop[i]]<5)
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
	return(distrib);
}

// This part was used in the first version of the intelligence, modifications have been made in order to do a good video demo, despite the fact that lack of time made us unable to do a live demo in the amphi.

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
