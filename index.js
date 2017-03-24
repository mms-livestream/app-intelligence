/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

//Dependencies

let Promise = require('bluebird');  //jshint ignore:line

let core = require('mms-core');
let serverAPI = require('./api/server/module.js');
let serviceAPI = require('./api/server/module.js');

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
.then(() => intelligence.server.listen());
