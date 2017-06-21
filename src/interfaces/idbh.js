
/**
 *	Transactional.IDBH
 *	written by Joel Dentici
 *	on 6/20/2017
 *
 *	An interface to a database handle for
 *	a relational database.
 */

class IDBH {
	/**
	 *	beginTransaction :: IDBH -> Promise () DBError
	 *
	 *	Begins a transaction. Returns a promise
	 *	for the result of beginning the transaction.
	 */
	beginTransaction() {}

	/**
	 *	commit :: IDBH -> Promise () DBError
	 *
	 *	Commits the transaction. Returns a promise
	 *	for the result.
	 */
	commit() {}

	/**
	 *	rollback :: IDBH -> Promise () DBError
	 *
	 *	Rolls back the transaction. Returns a promise
	 *	for when rollingback finishes.
	 */
	rollback() {}

	/**
	 *	prepare :: IDBH -> String -> Promise IStatement ([Object] | int | ())
	 *
	 *	Prepares a statement to run on
	 *	the database. Returns a promise
	 *	for a statement handle. The statement
	 *	must be disposed of when the connection
	 *	is closed.
	 */
	prepare(sql) {}

	/**
	 *	status$ :: IDBH -> Observable DBStatus DBFatalError
	 *
	 *	Returns a stream of status events.
	 *
	 *	The only required functionality is that when the connection
	 *	is closed (in any possible way), the stream returned by this
	 *	method is ended.
	 */
	get status$() {}

	/**
	 *	connect :: IDBH -> Promise () DBError
	 *
	 *	Connects to the database. Returns
	 *	a promise for the result of the
	 *	connection.
	 */
	connect() {}

	/**
	 *	close :: IDBH -> ()
	 *
	 *	Closes the database connection.
	 */
	close() {}
}