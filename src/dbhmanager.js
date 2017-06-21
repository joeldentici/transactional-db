'use strict';

const PooledDBH = require('./pooleddbh.js');
const RecordMapper = require('./recordmapper.js');
const {runWith} = require('./transaction_free.js');

/**
 *	Transactional.DBHManager
 *	written by Joel Dentici
 *	on 6/20/2017
 *
 *	Provides methods to manage a set of connections
 *	to a database, including creating connections,
 *	retrieving a connection from a pool, and performing
 *	an atomic transaction with a connection retrieved from
 *	the pool.
 *
 *	Does not provide pooling capabilities on its own. It instead
 *	relies on provided functions to interact with the pool. May
 *	provide a default pool implementation at some point.
 */
class DBHManager {

	/**
	 *	new :: DriverFuncs -> (IDBH -> IDBH) -> DBHManager
	 *
	 *	Constructs a new DBHManager with the
	 *	provided functions to create connections,
	 *	get connections from a connection pool,
	 *	and to return connections to the pool, and shutdown
	 *	the pool.
	 *
	 *	createLogger (possibly) wraps a connection in a logger
	 *
	 *	The provided functions must take and return
	 *	IDBH implementations.
	 *
	 *	toPool is guaranteed to receive the same type of IDBH that
	 *	fromPool provides.
	 */
	constructor(funcs, createLogger) {
		this.create = funcs.create;
		this.fromPool = funcs.fromPool;
		this.toPool = funcs.toPool;
		this.shutdown = funcs.shutdown;
		this.createLogger = createLogger;
	}

	/**
	 *	createConnection :: DBHManager -> Promise RecordMapper DBError 
	 *
	 *	Creates a new connection that is
	 *	not from the connection pool. A promise
	 *	for the connection is returned. You are responsible for closing
	 *	the connection.
	 */
	createConnection() {
		//create the connection and then wrap it in
		//a record mapper
		return this.create()
		.then(this.createLogger)
		.then(createMapper);
	}

	/**
	 *	getConnection :: DBHManager -> Promise RecordMapper DBError
	 *
	 *	Returns a promise for a connection
	 *	from the connection pool. The connection is
	 *	already open.
	 */
	getConnection() {
		//grab the connection, and then wrap it in a pooled
		//connection. wrap that in a record mapper
		return this.fromPool()
		.then(createPooled(this))
		.then(this.createLogger)
		.then(createMapper);
	}

	/**
	 *	runTransaction :: DBHManager -> Transaction DBError Any -> Promise Any DBError
	 *
	 *	Gets a connection from the connection pool,
	 *	runs the provided transaction monad with it,
	 *	and then closes the transaction. Returns a promise
	 *	for the result of executing the transaction.
	 */
	runTransaction(trans, bus = {publish: (_,__) => null}) {
		return runWith(this, bus, trans);
	}

	/**
	 *	close :: DBHManager -> ()
	 *
	 *	Closes the connection pool. After calling this method,
	 *	the object should no longer be used.
	 */
	close() {
		this.shutdown();
	}
}

/**
 *	createMapper :: IDBH -> RecordMapper
 *
 *	Wraps a connection in a record mapper.
 */
function createMapper(conn) {
	return new RecordMapper(conn);
}


/**
 *	createPooled :: DBHManager -> (IDBH -> RecordMapper) -> RecordMapper
 *
 *	Wraps a connection in a pooled connection,
 *	then wraps that in a record mapper to provide
 *	additional functionality.
 */
function createPooled(manager) {
	//close over the manager
	return function(conn) {
		//make a pooled connection
		const pooled = new PooledDBH(conn);
		
		//return base connection to pool once it closes
		pooled.getStatus$().subscribe({
			onEnd: () => manager.toPool(conn),
			onError: () => manager.toPool(conn),
			onNext: () => {},
		});

		return pooled;
	}
}

module.exports = DBHManager;