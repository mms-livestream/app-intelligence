/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

class Interaction {                 //TODO enforce abstract with tweaks
    constructor(node, framework, api) {
        this.node = node;
        this.framework = framework;
        this.api = api;
    }

    listen() {}
}

module.exports = Interaction;
