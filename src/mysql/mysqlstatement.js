'use strict';

const {promisfy} = require('js-helpers');
const Async = require('monadic-js').Async;

/**
 *	Transactional.MySQLStatement
 *	written by Joel Dentici
 *	on 6/20/2017
 *
 *	A "prepared" statement for node-mysql.
 */

/**
 *	mapper :: Map string (DBResult -> [Object] | int | ())
 *
 *	Maps the result of a query to the correct
 *	type per the IDBH contract.
 */
const mapper = {
	insert: (res) => res.insertId,
	select: (res) => res,
	delete: (res) => undefined,
	update: (res) => undefined,
};

class MySQLStatement {
	/**
	 *	new :: NodeMySQLConnection -> string -> MySQLStatement ([Object] | int | ())
	 *
	 *	Construct a new MySQLStatement.
	 */
	constructor(dbh, str) {
		this.dbh = dbh;
		this.str = str;
		this.query = Async.wrap(this.dbh.query.bind(this.dbh));

		//figure out the type of statement
		const start = str.trim().toLowerCase();
		for (let queryType of Object.keys(mapper)) {
			if (start.indexOf(queryType) > -1) {
				this.__type = queryType;
			}
		}
	}


	/**
	 *	execute :: MySQLStatement ([Object] | int | ()) -> ...any -> Promise ([Object] | int | ()) DBError
	 *
	 *	Executes the prepared statement
	 *	with the provided placeholder
	 *	bindings. Returns a promise
	 *	with the result of the query.
	 */	
	execute(...bindings) {
		return this.query(this.str, bindings).map(mapper[this.__type]);
	}

	/**
	 *	destroy :: IStatement ([Object] | int | ()) -> ()
	 *
	 *	Cleans up underlying resources
	 *	associated with the statement
	 *	handle.
	 */
	destroy() { /* There are no resources to clean up on MySQL server */ }
}

module.exports = MySQLStatement;