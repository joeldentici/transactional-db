//wrap strictDeepEqual to to return bool, not throw
const assert = require('assert');
function equals(a, b) {
	try {
		assert.deepStrictEqual(a, b);
		return true;
	}
	catch (e) {
		return false;
	}
}

/* Mock of node-mysql to test our adapter */
class MockMySQL {

	/* begin a fake transaction */
	beginTransaction(cb) {
		this.beginCalled = true;
		if (this._beginStatus) {
			return cb(null);
		}
		else {
			return cb(new Error("Cannot begin transaction!"));
		}
	}

	/* perform a fake commit */
	commit(cb) {
		this.commitCalled = true;
		if (this._commitStatus) {
			return cb(null);
		}
		else {
			return cb(new Error("Cannot commit transaction!"));
		}
	}

	/* perform a fake rollback */
	rollback(cb) {
		this.rollbackCalled = true;
		if (this._rollbackStatus) {
			return cb(null);
		}
		else {
			return cb(new Error("Cannot rollback transaction!"));
		}
	}

	/* perform a fake connection */
	connect(cb) {
		this.connectCalled = true;
		if (this._connectStatus) {
			return cb(null);
		}
		else {
			return cb(new Error("Cannot connect!"));
		}
	}

	/* perform a fake ending of the connection */
	end() {
		this.endCalled = true;
	}

	/* perform a fake query */
	query(q, bindings, cb) {
		const res = replaceParameters(q, ...bindings).toLowerCase();

		if (this._queryResults) {
			const v = this._queryResults[res];
			const vals = v === undefined ? [] : v;


			return cb(null, vals);
		}
		else {
			return cb(new Error("Cannot perform query!"));
		}

	}

	/* Sets whether beginning a transaction will succeed */
	beginTransactionStatus(succeeds) {
		this._beginStatus = succeeds;
	}

	/* Sets whether committing will succeed */
	commitStatus(succeeds) {
		this._commitStatus = succeeds;
	}

	/* Sets whether rolling back will succeed */
	rollbackStatus(succeeds) {
		this._rollbackStatus = succeeds;
	}

	/* Sets whether connecting will succeed */
	connectStatus(succeeds) {
		this._connectStatus = succeeds;
	}

	/* Sets the results that will be returned for
	a query. Results is a map from strings to result sets */
	queryResults(results) {
		this._queryResults = results;
	}
}

function eq(test) {
	return function(a, b) {
		test.equals(equals(a, b), true);
	}
}


const {Utility, Async} = require('monadic-js')
const {zip} = Utility;
const {MySQLDBH} = require('./src/mysql/mysqldbh.js');

/* mock of the mysql.createManager */
function createManager(results, defaults = {
	connectStatus: true,
	beginStatus: true,
	commitStatus: true,
	rollbackStatus: true,
}) {
	function makeDBH() {
		const base = new MockMySQL();
		base.connectStatus(defaults.connectStatus);
		base.beginTransactionStatus(defaults.beginStatus);
		base.commitStatus(defaults.commitStatus);
		base.rollbackStatus(defaults.rollbackStatus);

		base.queryResults(results);

		return new MySQLDBH(base);
	}

	function createManager(poolSize, options) {
		return {
			create: () => Async.of(makeDBH()),
			fromPool: () => {
				const dbh = makeDBH();
				return dbh.connect().map(_ => dbh);
			},
			toPool: (conn) => {},
			shutdown: () => {},
		};
	}

	return createManager;
}


function replaceParameters(sql, ...args) {
	const paired = zip(sql.split('?'), args.concat(''));
	return paired.reduce((acc, val) => acc + val[0] + val[1],
		'');
}

module.exports = {
	equals,
	MockMySQL,
	eq,
	createManager
}