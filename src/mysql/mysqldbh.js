'use strict';

const mysql = require('mysql');
const {promisfy} = require('js-helpers');
const MySQLStatement = require('./mysqlstatement.js');
const Rx = require('rx');

/**
 *	Transactional.MySQLDBH
 *	written by Joel Dentici
 *	on 6/20/2017
 *
 *	Adapts node-mysql to use the IDBH interface.
 */
class MySQLDBH {
	/**
	 *	new :: NodeMySQLConnection -> MySQLDBH
	 *
	 *	Wrap the connection
	 */
	constructor(base) {
		this.base = base;
	}

	/**
	 *	beginTransaction :: MySQLDBH -> Promise () DBError
	 *
	 *	Begins a transaction. Returns a promise
	 *	for the result of beginning the transaction.
	 */
	beginTransaction() {
		return promisfy(this.base.beginTransaction.bind(this.base))();
	}

	/**
	 *	commit :: MySQLDBH -> Promise () DBError
	 *
	 *	Commits the transaction. Returns a promise
	 *	for the result.
	 */
	commit() {
		return promisfy(this.base.commit.bind(this.base))();
	}

	/**
	 *	rollback :: MySQLDBH -> Promise () DBError
	 *
	 *	Rolls back the transaction. Returns a promise
	 *	for when rollingback finishes.
	 */
	rollback() {
		return promisfy(this.base.rollback.bind(this.base))();
	}

	/**
	 *	prepare :: MySQLDBH -> String -> Promise IStatement ([Object] | int | ())
	 *
	 *	Prepares a statement to run on
	 *	the database. Returns a promise
	 *	for a statement handle.
	 */
	prepare(sql) {
		return Promise.resolve(new MySQLStatement(this.base, sql));
	}

	/**
	 *	status$ :: MySQLDBH -> Observable DBStatus DBFatalError
	 *
	 *	Returns a stream of status events.
	 */
	get status$() {
		//TODO: implement
		return Rx.Observable.just('Not Implemented');
	}

	/**
	 *	connect :: MySQLDBH -> Promise () DBError
	 *
	 *	Connects to the database. Returns
	 *	a promise for the result of the
	 *	connection.
	 */
	connect() {
		return promisfy(this.base.connect.bind(this.base))();
	}

	/**
	 *	close :: MySQLDBH -> ()
	 *
	 *	Closes the database connection.
	 */
	close() {
		this.base.end();
	}
}

/**
 *	createManager :: int -> node-mysqlOptions -> DriverFuncs
 *
 *	Returns functions to manage a pool of MySQLDBH connections.
 */
exports.createManager = function(poolSize, options) {
	//set the connection limit option & create pool
	options.connectionLimit = poolSize;
	const pool = mysql.createPool(options);

	//don't need connectionLimit option for regular connections
	delete options['connectionLimit'];

	return {
		create: () => Promise.resolve(
			new MySQLDBH(mysql.createConnection(options))),
		fromPool: () => promisfy(pool.getConnection.bind(pool))().then(conn => 
			new MySQLDBH(conn)),
		toPool: (conn) => conn.base.release(),
		shutdown: () => pool.end()
	};
}