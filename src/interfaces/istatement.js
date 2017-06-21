
/**
 *	Transactional.IStatement
 *	written by Joel Dentici
 *	on 6/20/2017
 *
 *	An interface to a statement handle for
 *	a relational database.
 */

class IStatement {
	/**
	 *	execute :: IStatement ([Object] | int | ()) -> ...any -> Promise ([Object] | int | ()) DBError
	 *
	 *	Executes the prepared statement
	 *	with the provided placeholder
	 *	bindings. Returns a promise
	 *	with the result of the query.
	 *
	 *	The result type will depend on the type of statement
	 *	that is executed. If it is a Select Query, then a list
	 *	of objects, representing the rows selected is returned. If
	 *	it is an Insert Statement, then the ID of the new row is
	 *	returned. If it is any other kind of statement, then nothing
	 *	is returned. 
	 */
	execute(...bindings) {}

	/**
	 *	destroy :: IStatement ([Object] | int | ()) -> ()
	 *
	 *	Cleans up underlying resources
	 *	associated with the statement
	 *	handle.
	 */
	destroy() {}
}