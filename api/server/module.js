/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

let express = require('express');

module.exports = (options) => {

    let service = options.service;
    let router = express.Router();

    router.post('/test', function (req, res) {

        service.client.act({role:"viewers", cmd:"stats"}, console.log);
        res.sendStatus(200);
    });

    return router;
};
