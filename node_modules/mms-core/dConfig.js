/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

let db = {
    NODE_SESSION_MANAGER: {"service": {"host": "localhost", "port": 5000}, "server": {"host": "localhost", "port": 8080}},
    NODE_METADATA_MANAGER: {"service": {"host": "localhost", "port": 5001}, "server": {"host": "localhost", "port": 8081}},
    NODE_DB_CONTROLLER: {"service": {"host": "localhost", "port": 5002}, "server": {"host": "localhost", "port": 8082}},
    NODE_INTELLIGENCE: {"service": {"host": "localhost", "port": 5003}, "server": {"host": "localhost", "port": 8083}},
    NODE_MPD_GENERATOR: {"service": {"host": "localhost", "port": 5004}, "server": {"host": "localhost", "port": 8084}},
    NODE_TRANSCODER: {"service": {"host": "localhost", "port": 5005}, "server": {"host": "localhost", "port": 8085}},
    NODE_REPLICATOR: {"service": {"host": "localhost", "port": 5006}, "server": {"host": "localhost", "port": 8086}},
    NODE_DISTRIB: {"service": {"host": "localhost", "port": 5007}, "server": {"host": "localhost", "port": 8087}},
};

db.SERVICE_SCHEMA = {
    "NODE_SESSION_MANAGER": [db.NODE_DB_CONTROLLER, db.NODE_MPD_GENERATOR],
    "NODE_METADATA_MANAGER": [db.NODE_DB_CONTROLLER],
    "NODE_DATABASE_CONTROLLER": [],
    "NODE_INTELLIGENCE": [db.NODE_DB_CONTROLLER, db.NODE_SESSION_MANAGER, db.NODE_TRANSCODER],
    "NODE_TRANSCODER": [db.NODE_REPLICATOR],
    "NODE_REPLICATOR": [db.NODE_DISTRIB],
    "NODE_DISTRIB": []
};

module.exports = db;
