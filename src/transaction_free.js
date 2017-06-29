const {Free, Utility, Maybe, Async} = require('monadic-js');
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

class Interpret {
	constructor(dbm, bus, exec) {
		this.dbm = dbm;
		this.bus = bus;
		this.execute = exec;
	}

	/**
	 *	prepare :: Interpret -> () -> Async ()
	 *
	 *	Prepares a context to interpret in.
	 */
	prepare() {
		const self = this;

		return doM(function*() {
			self.conn = yield self.dbm.getConnection();

			yield self.conn.beginTransaction();

			self.events = [];

			return Async.unit();
		});
	}

	/**
	 *	map :: Interpret -> Transaction a -> (Async a, (a -> Free f b) | Free f b)
	 *
	 *	Maps the transaction to an Async
	 */
	map(trans) {
		const self = this;
		const conn = this.conn;
		const events = this.events;
		return trans.case({
			'Insert': (t,r,n) => [conn.insert(t, r), n],
			'Query': (s,b,n) => [conn.query(s, ...b), n],
			'Update': (t,r,n) => [conn.update(t, r), n],
			'Delete': (t,r,n) => [conn.delete(t, r), n],
			'Read': (t,i,n) => [conn.read(t, i), n],
			'Prepare': (s,n) => [conn.prepare(s), n],
			'Execute': (s,a,n) => [s.execute(...a), n],
			'Emit': (e,d,n) => {events.push([e,d]); return [Async.unit(), n];},
			default: _ => null,
		});
	}

	/**
	 *	cleanup :: Interpret -> a -> Async c ()
	 *
	 *	Cleans up the resources used to interpret.
	 */
	cleanup(result) {
		const self = this;

		return doM(function*() {
			yield self.conn.commit();

			self.conn.close();

			self.events.forEach(([e,d]) => self.bus.publish(e, d));

			return Async.unit();
		});
	}

	/**
	 *	cleanupErr :: Interpret -> b -> Async c ()
	 *
	 *	Cleans up the resources used to interpret.
	 */
	cleanupErr(err) {
		const self = this;
		return doM(function*() {
			yield self.conn.rollback();

			self.conn.close();

			return Async.unit();
		});
	}
}

/**
 *	interpreter :: DBHManager -> IBus -> (Free f a -> Async a) -> Interpreter
 *
 *	Creates an interpreter constructor that can be used
 *	with Free.createInterpreter.
 */
exports.interpreter = (dbm, bus = {publish(_, __) {}}) => exec => new Interpret(dbm, bus, exec);

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