'use strict';

const {nolog} = require('./logger.js');
const DBHManager = require('./DBHManager');
const {createManager} = require('./mysql/mysqldbh.js');

/**
 *	Transactional
 *	written by Joel Dentici
 *	on 6/20/2017
 *
 *	The transactional library provides a mechanism for
 *	performing database transactions on an RDBMS from
 *	a node.js application.
 *
 *	This library only implements a driver for MySQL right
 *	now, but other drivers can be registered by calling
 *	the register function. Drivers are responsible for adapting
 *	to the interface used by this library.
 */

/**
 *	drivers :: Map String (int -> Object -> DriverFuncs)
 *
 *	Store references to driver creation functions
 */
const drivers = {};

/**
 *	register :: String -> (int -> Object -> DriverFuncs) -> ()
 *
 *	Registers a database driver to be used to create
 *	a database manager at a later time.
 */
exports.register = function(driverName, driverFunc) {
	drivers[driverName] = driverFunc;
}

/**
 *	create :: String -> int -> Object -> (IDBH -> IDBH) -> DBHManager
 *
 *	Uses the registered database driver creation function
 *	to create a database manager. An optional logger can be specified.
 */
exports.create = function(driverName, maxConnections, options, logger = nolog) {
	const funcs = drivers[driverName](maxConnections, options);
	return new DBHManager(funcs, logger);
}

/* Register the MySQL driver */
exports.register('mysql', createManager);

/* Export Transaction Monad Stuff */
const transaction = require('./transaction_free.js');
exports.runWith = transaction.runWith;
exports.maybeSkip = transaction.maybeSkip;
exports.Transaction = transaction.Transaction;

/* Export Logger Stuff */
exports.Logging = require('./logger.js');