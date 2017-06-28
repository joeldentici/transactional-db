'use strict';

const Rx = require('rx');
const Async = require('monadic-js').Async;

/**
 *	Transactional.PooledDBH
 *	written by Joel Dentici
 *	on 6/20/2017
 *
 *	Wraps an underlying dbh that is pooled
 *	so closing it returns it to the connection
 *	pool.
 *
 *	Attempting to use the pooled connection after
 *	it is closed will cause each method to return
 *	an error.
 */
class PooledDBH {
	/**
	 *	new :: IDBH -> PooledDBH
	 *
	 *	Constructs a Pooled DBH connection from
	 *	an underlying dbh.
	 */
	constructor(base) {
		this.base = base;
		this.closed = false;
		this.stmts = [];
		this.closedError = () => Async.fail(
			new Error("Cannot use closed pooled connection."));

		//status stream
		this._status$ = Rx.Observable.create((observer) => {
			//base status stream
			const status$ = this.base.status$;

			//subscribe this status stream
			const sub = status$.subscribe(observer);

			//close the single observer when closed
			this._close = () => {
				observer.onCompleted();
				sub.dispose();
			};
		}).share(); //use same stream for all observers
	}

	/**
	 *	beginTransaction :: IDBH -> Async DBError ()
	 *
	 *	Begins a transaction on the base IDBH.
	 */
	beginTransaction() {
		if (this.closed) {
			return this.closedError();
		}
		return this.base.beginTransaction();
	}

	/**
	 *	commit :: IDBH -> Async DBError ()
	 *
	 *	Commits the transaction on the base IDBH
	 */
	commit() {
		if (this.closed) {
			return this.closedError();
		}
		return this.base.commit();
	}

	/**
	 *	rollback :: IDBH -> Async DBError ()
	 *
	 *	Rolls back the transaction on the base IDBH
	 */
	rollback() {
		if (this.closed) {
			return this.closedError();
		}
		return this.base.rollback();
	}

	/**
	 *	prepare :: IDBH -> String -> Async DBError (IStatement ([Object] | int | ()))
	 *
	 *	Prepares a statement on the base IDBH.
	 */
	prepare(sql) {
		if (this.closed) {
			return this.closedError();
		}

		//prepare statement and then
		return this.base.prepare(sql).bind((stmt) => {
			//store the statement to cleanup eventually
			this.stmts.push(stmt);
			//return the statement
			return Async.unit(stmt);
		});
	}

	/**
	 *	status$ :: IDBH -> Observable DBStatus DBFatalError
	 *
	 *	Returns a stream of status events for both the pooled
	 *	connection and underlying IDBH.
	 */
	get status$() {
		return this._status$;
	}

	/**
	 *	connect :: IDBH -> Async DBError ()
	 *
	 *	Connects the base IDBH.
	 */
	connect() {
		if (this.closed) {
			return this.closedError();
		}
		return this.base.connect();
	}

	/**
	 *	close :: IDBH -> ()
	 *
	 *	Closes the pooled connection. This will cause
	 *	the underlying IDBH to be returned to its pool.
	 */
	close() {
		if (!this.closed) {
			//cleanup prepared statements
			this.stmts.forEach((stmt) => stmt.destroy());
			//trigger close event
			this._close();
			//we are now closed
			this.closed = true;
		}
	}
}

module.exports = PooledDBH;