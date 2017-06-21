const {Free, Utility, Maybe} = require('monadic');
const CaseClass = require('js-helpers').CaseClass;
const {doM} = Utility;

/**
 *	Transactional.Transaction
 *	written by Joel Dentici
 *	on 6/20/2017
 *
 *	Provides a DSL to compose and execute database
 *	transactions. This comes in the form of a Free monad
 *	over a (rather large) functor defined below, along with
 *	an interpreter that translates monadic values into calls
 *	in the library.
 *
 *	This is the preferred way to use this library and produces
 *	much cleaner code than directly using the library functions
 *	to interact with your database.
 */
class Transaction {
	/**
	 *	query :: string -> ...any -> Transaction ([Object] | int | ())
	 *
	 *	Execute a query on the database.
	 */
	static query(sql, ...bindings) {
		return Free.liftF(new Query(x => x, sql, ...bindings));
	}

	/**
	 *	insert :: string -> Map string any -> Transaction int
	 *
	 *	Insert a row into a table.
	 */
	static insert(table, record) {
		return Free.liftF(new Insert(table, record, x => x));
	}

	/**
	 *	update :: string -> Map string any -> Transaction ()
	 *
	 *	Update a row in a table.
	 */
	static update(table, record) {
		return Free.liftF(new Update(table, record, x => x));
	}

	/**
	 *	delete :: string -> Map string any | int -> Transaction ()
	 *
	 *	Delete a row in a table.
	 */
	static delete(table, record) {
		return Free.liftF(new Delete(table, record, x => x));
	}

	/**
	 *	read :: string -> int -> Transaction (Maybe (Map string any))
	 *
	 *	Read a row from a table.
	 */
	static read(table, id) {
		return Free.liftF(new Read(table, id, x => x));
	}

	/**
	 *	prepare :: string -> Transaction IStatement
	 *
	 *	Prepare a statement for execution on the database.
	 */
	static prepare(stmt) {
		return Free.liftF(new Prepare(stmt, x => x));
	}

	/**
	 *	execute :: IStatement -> ...any -> Transaction ([Object] | int | ())
	 *
	 *	Execute a prepared statement on the database.
	 */
	static execute(stmt, ...args) {
		return Free.liftF(new Execute(stmt, args, x => x));
	}

	/**
	 *	throwE :: Error -> Transaction ()
	 *
	 *	Raise an error with the transaction. This will
	 *	cause a rollback to happen.
	 */
	static throwE(err) {
		return Free.liftF(new ThrowE(err));
	}

	/**
	 *	emit :: string -> Object -> Transaction ()
	 *
	 *	Emit an event. This is used to signal that an
	 *	event occurred while executing the transaction. The
	 *	interpreter will automatically publish these events
	 *	to a provided event bus.
	 */
	static emit(ev, data) {
		return Free.liftF(new Emit(ev, data, x => x));
	}

	/**
	 *	liftPromise :: Promise a () -> Transaction a
	 *
	 *	Causes the transaction execution to suspend until
	 *	the promise is fulfilled. The value returned by the
	 *	transaction is the same as that returned by the promise.
	 */
	static liftPromise(prom) {
		return Free.liftF(new LiftPromise(prom, x => x));
	}

	/**
	 *	skip :: () -> Transaction ()
	 *
	 *	Causes any further statements in the transaction to
	 *	be skipped.
	 */
	static skip() {
		return Free.liftF(new Skip(x => x));
	}

	/**
	 *	continue :: Transaction a -> Transaction a
	 *
	 *	Marks a continuation point and then executes the
	 *	provided transaction. When the provided transaction
	 *	finishes executing, control is returned to the continuation
	 *	point with the result of that transaction.
	 *
	 *	NOTE: This is not nested transactions. As far as the database
	 *	is concerned, there is only a single transaction occurring. Most
	 *	database engines don't even support nested transactions. This is
	 *	strictly for control flow management.
	 */
	static continue(next) {
		return Free.liftF(new Continue(next, x => x));
	}

	/**
	 *	unit :: a -> Transaction a
	 *
	 *	Lift a normal value into the Transaction context.
	 */
	static unit(v) {
		return Free.unit(v);
	}
}
exports.Transaction = Transaction;

class Query extends CaseClass {
	constructor(g, sql, ...bindings) {
		super('Query');
		this.sql = sql;
		this.bindings = bindings;
		this.g = g;
	}

	map(f) {
		const bindings = this.bindings;
		return new Query(x => f(this.g(x)), this.sql, ...bindings);
	}

	doCase(fn) {
		return fn(this.sql, this.bindings, this.g);
	}
}

class Insert extends CaseClass {
	constructor(table, record, g) {
		super('Insert');
		this.table = table;
		this.record = record;
		this.g = g;
	}

	map(f) {
		return new Insert(this.table, this.record, x => f(this.g(x)));
	}

	doCase(fn) {
		return fn(this.table, this.record, this.g);
	}
}

class Update extends CaseClass {
	constructor(table, record, g) {
		super('Update');
		this.table = table;
		this.record = record;
		this.g = g;
	}

	map(f) {
		return new Update(this.table, this.record, x => f(this.g(x)));
	}

	doCase(fn) {
		return fn(this.table, this.record, this.g);
	}
}

class Delete extends CaseClass {
	constructor(table, record, g) {
		super('Delete');
		this.table = table;
		this.record = record;
		this.g = g;
	}

	map(f) {
		return new Delete(this.table, this.record, x => f(this.g(x)));
	}

	doCase(fn) {
		return fn(this.table, this.record, this.g);
	}
}

class Read extends CaseClass {
	constructor(table, id, g) {
		super('Read');
		this.table = table;
		this.id = id;
		this.g = g;
	}

	map(f) {
		return new Read(this.table, this.id, x => f(this.g(x)));
	}

	doCase(fn) {
		return fn(this.table, this.id, this.g);
	}
}

class Prepare extends CaseClass {
	constructor(stmt, g) {
		super('Prepare');
		this.stmt = stmt;
		this.g = g;
	}

	map(f) {
		return new Prepare(this.stmt, x => f(this.g(x)));
	}

	doCase(fb) {
		return fn(this.stmt, this.g);
	}
}

class Execute extends CaseClass {
	constructor(stmt, args, g) {
		super('Execute');
		this.stmt = stmt;
		this.args = args;
		this.g = g;
	}

	map(f) {
		return new Execute(this.stmt, this.args, x => f(this.g(x)));
	}

	doCase(fn) {
		return fn(this.stmt, this.args, this.g);
	}
}

class ThrowE extends CaseClass {
	constructor(err) {
		super('ThrowE');
		this.err = err;
	}

	map(f) {
		return this;
	}

	doCase(fn) {
		return fn(this.err);
	}
}

class Emit extends CaseClass {
	constructor(ev, data, next) {
		super('Emit');
		this.ev = ev;
		this.data = data;
		this.next = next;
	}

	map(f) {
		return new Emit(this.ev, this.data, f(this.next));
	}

	doCase(fn) {
		return fn(this.ev, this.data, this.next);
	}
}

class Skip extends CaseClass {
	constructor(next) {
		super('Skip');
		this.next = next;
	}

	map(f) {
		return new Skip(f(this.next));
	}

	doCase(fn) {
		return fn(this.next);
	}
}

class Continue extends CaseClass {
	constructor(next, g) {
		super('Continue');
		this.next = next;
		this.g = g;
	}

	map(f) {
		return new Continue(this.next, x => f(this.g(x)));
	}

	doCase(fn) {
		return fn(this.next, this.g);
	}
}

class LiftPromise extends CaseClass {
	constructor(prom, next) {
		super('LiftPromise');
		this.prom = prom;
		this.next = next;
	}

	map(f) {
		return new LiftPromise(this.prom, x => f(this.next(x)));
	}

	doCase(fn) {
		return fn(this.prom, this.next);
	}
}

const defaultRetrieve = {
	insert: (_,__) => 1,
	query: (_,__) => [],
	read: (_,__) => Maybe.Nothing,
	execute: (_,__) => [],
};

/**
 *	show :: Transaction a -> IRetrieve -> String
 *
 *	Returns a string representation of the
 *	transaction.
 *
 *	The optional IRetrieve object provides methods
 *	to mock retrieval of data. This allows testing
 *	basic logic, by returning different data for
 *	different queries. The object must provide methods
 *	for:
 *		insert: Gets insertId for (table,record)
 *		query: Gets [Record] for (sql,bindings)
 *		read: Gets (Maybe Record) for (table, id)
 *		execute: Gets [Record] for (stmt#, bindings)
 */
exports.show = function(trans, retrieve = defaultRetrieve) {
	function showR(trans, stmts) {
		return trans.case({
			'Free': x => x.case({
				'Insert': (t,r,n) => `\tInsert into '${t}':\n\t\t` 
					+ JSON.stringify(r) + "\n" + showR(n(retrieve.insert(t,r)), stmts),
				'Query': (s,b,n) => `\tRun Query '${s}'(\n\t\t`
					+ b.join(',') + ")\n" + showR(n(retrieve.query(s,b)), stmts),
				'Update': (t,r,n) => `\tUpdate table '${t}':\n\t\t`
					+ JSON.stringify(r) + "\n" + showR(n(), stmts),
				"Delete": (t,r,n) => `\tDelete from '${t}':\n\t\t`
					+ JSON.stringify(r) + "\n" + showR(n(), stmts),
				"Read": (t,i,n) => `\tRead id ${i} from '${t}'\n` + showR(n(retrieve.read(t,i)), stmts),
				"Prepare": (s,n) => `\tStatement ${stmts} <- PrepareStatement(\n\t\t'${s}')\n` + showR(n(stmts), stmts + 1),
				"Execute": (s,a,n) => `\tExecute Statement ${s}(\n\t\t` + a.join(',') + ")\n" + showR(n(retrieve.execute(s,a)), stmts),
				"ThrowE": e => `\nTransaction Failed: ${e}`,
				"Emit": (e,d,n) => `\tEmit event '${e}':\n\t\t` + JSON.stringify(d) + "\n" + showR(n, stmts),
				"LiftPromise": (p,n) => "\tAwait Promise\n" + showR(n(1), stmts),
			}),
			'Return': v => `\nTransaction Result: ` + JSON.stringify(v),
		});	
	}

	return 'Transaction Statements:\n' + showR(trans, 1);
}

/**
 *	interpret :: IDBH -> Transaction a -> [Object] -> Promise a DBError
 *
 *	Interprets a transaction into a promise, running each statement
 *	on the provided connection. Events that are emitted by the transaction
 *	are stored in the provided list.
 */
function interpret(conn, trans, evs) {
	const resume = n => x => interpret(conn, n(x), evs);

	return trans.case({
		'Free': x => x.case({
			'Insert': (t,r,n) => conn.insert(t, r).then(resume(n)),
			'Query': (s,b,n) => conn.query(s, ...b).then(resume(n)),
			'Update': (t,r,n) => conn.update(t, r).then(resume(n)),
			'Delete': (t,r,n) => conn.delete(t, r).then(resume(n)),
			'Read': (t,i,n) => conn.read(t, i).then(resume(n)),
			'Prepare': (s,n) => conn.prepare(s).then(resume(n)),
			'Execute': (s,a,n) => s.execute(...a).then(resume(n)),
			'ThrowE': e => Promise.reject(e),
			'Emit': (e,d,n) => {evs.push([e,d]); return interpret(conn, n, evs)},
			'LiftPromise': (p,n) => p.then(resume(n)),
			'Skip': (n) => Promise.resolve(),
			'Continue': (a,n) => interpret(conn, a, evs).then(resume(n)),
		}),
		'Return': v => Promise.resolve(v)
	});
}

/**
 *	runTransaction :: IDBH -> IBus -> Transaction a -> Promise a DBError
 *
 *	Runs a transaction with the provided connection.
 *
 *	If the transaction completes successfully, we publish the events
 *	that it emits to the provided event bus.
 */
function runTransaction(conn, bus, trans) {
	//store events that are emitted by the transaction
	//to possibly publish at end
	const evs = [];

	const res = doM(function*() {
		//start a transaction on the database connection
		yield conn.beginTransaction();
		//interpret the transaction
		const res = yield interpret(conn, trans, evs);
		//commit the transaction
		yield conn.commit();
		//if all goes well, we return the final value
		return Promise.resolve(res);
	//otherwise, we will rollback and return the error!
	}).catch((err) => conn.rollback().then(
		() => Promise.reject(err),
		() => Promise.reject(err)));

	//if the transaction is successful, publish the events that were
	//emitted during it onto the provided event bus
	res.then(() => evs.forEach(([ev, data]) => bus.publish(ev, data)));

	return res;
}

/**
 *	runWith :: DBHManager -> IBus -> Transaction a -> Promise a DBError
 *
 *	Runs a transaction using a provided database handle manager. A connection
 *	is retrieved from the manager, the transaction is ran on it,
 *	and the connection is closed (returned to connection pool).
 */
exports.runWith = function(dbm, bus, trans) {
	//get a connection from the pool
	return dbm.getConnection().then((conn) => {
		//run the transaction with the connection
		return runTransaction(conn, bus, trans).then(
			(val) => {
				//close the connection & return result
				conn.close()
				return Promise.resolve(val);
			},
			(err) => {
				//close the connection & return the error
				conn.close();
				return Promise.reject(err);
			});
	});
}

/**
 *	maybeSkip :: Transaction (Maybe a) -> Transaction a
 *
 *	Controls the execution of the transaction. If the provided
 *	value does not exist, then we skip the rest of the transaction.
 *
 *	By calling Transaction.continue on a transaction that may skip,
 *	we can continue execution from that point.
 */
exports.maybeSkip = function(x) {
	return doM(function*() {
		const val = yield x;
		return val.case({
			Just: x => Transaction.unit(x),
			Nothing: _ => Transaction.skip(),
		});
	});
}