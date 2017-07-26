'use strict';

const mysql = require('mysql');

const Async = require('monadic-js').Async;

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
		//TODO: implement status events for mysql driver
		this._status$ = Rx.Observable.just('Not Implemented').share();
	}

	/**
	 *	beginTransaction :: MySQLDBH -> Async DBError ()
	 *
	 *	Begins a transaction. Returns a promise
	 *	for the result of beginning the transaction.
	 */
	beginTransaction() {
		return Async.wrap(this.base.beginTransaction.bind(this.base))();
	}

	/**
	 *	commit :: MySQLDBH -> Async DBError ()
	 *
	 *	Commits the transaction. Returns a promise
	 *	for the result.
	 */
	commit() {
		return Async.wrap(this.base.commit.bind(this.base))();
	}

	/**
	 *	rollback :: MySQLDBH -> Async DBError ()
	 *
	 *	Rolls back the transaction. Returns a promise
	 *	for when rollingback finishes.
	 */
	rollback() {
		return Async.wrap(this.base.rollback.bind(this.base))();
	}

	/**
	 *	prepare :: MySQLDBH -> String -> Async DBError (IStatement ([Object] | int | ()))
	 *
	 *	Prepares a statement to run on
	 *	the database. Returns a promise
	 *	for a statement handle.
	 */
	prepare(sql) {
		return Async.unit(new MySQLStatement(this.base, sql));
	}

	/**
	 *	status$ :: MySQLDBH -> Observable DBStatus DBFatalError
	 *
	 *	Returns a stream of status events.
	 */
	get status$() {
		return this._status$;
	}

	/**
	 *	connect :: MySQLDBH -> Async DBError ()
	 *
	 *	Connects to the database. Returns
	 *	a promise for the result of the
	 *	connection.
	 */
	connect() {
		return Async.wrap(this.base.connect.bind(this.base))();
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
		create: () => Async.unit(
			new MySQLDBH(mysql.createConnection(options))),
		fromPool: () => Async.wrap(pool.getConnection.bind(pool))().map(conn => 
			new MySQLDBH(conn)),
		toPool: (conn) => conn.base.release(),
		shutdown: () => pool.end()
	};
}

exports.MySQLDBH = MySQLDBH;
exports.MySQLStatement = MySQLStatement;