const λ = require('fantasy-check/src/adapters/nodeunit');

const {eq, MockMySQL} = require('../test-lib.js');
const {identity, constant} = require('fantasy-combinators');

const transactional = require('../src/transactional.js');
const {MySQLDBH} = require('../src/mysql/mysqldbh.js');
const Async = require('monadic-js').Async;

//run Async computations in an immediate, blocking manner for unit tests.
const oldScheduler = Async.setScheduler(x => x());



function basicTest(method, setter, error, called) {
	return test => {
		const check = eq(test);

		const base = new MockMySQL();
		const dbh = new MySQLDBH(base);

		base[setter](true);

		const expected = Async.of().run();
		const result = dbh[method]().run();

		check(base[called], true);

		check(result, expected);

		base[setter](false);

		const expected2 = Async.fail(new Error(error)).run().message;
		const result2 = dbh[method]().run().message;

		check(result2, expected2);

		test.done();	
	}
}


exports['MySQLDBH & MySQLStatement'] = {
	'connect': basicTest('connect', 'connectStatus', 'Cannot connect!', 'connectCalled'),
	'beginTransaction': basicTest('beginTransaction', 'beginTransactionStatus', 'Cannot begin transaction!', 'beginCalled'),
	'commitTransaction': basicTest('commit', 'commitStatus', 'Cannot commit transaction!', 'commitCalled'),
	'rollbackTransaction': basicTest('rollback', 'rollbackStatus', 'Cannot rollback transaction!', 'rollbackCalled'),
	'close': test => {
		const check = eq(test);
		const base = new MockMySQL();
		const dbh = new MySQLDBH(base);

		dbh.close();

		check(base.endCalled, true);

		test.done();
	},
	'status': test => {
		const check = eq(test);
		const base = new MockMySQL();
		const dbh = new MySQLDBH(base);

		const status$ = dbh.status$;

		check(status$ instanceof require('rx').Observable, true);

		test.done();		
	},
	'prepare/execute': test => {
		const check = eq(test);
		const base = new MockMySQL();
		const dbh = new MySQLDBH(base);

		base.queryResults({
			'select * from blah': [{id: 1, a: '1', b: '2'}, {id: 2, a: '2', b: '3'}],
			'insert into blah(a,b) values(1,2)': {insertId: 3},
			'delete from blah where id = 1': null,
			'update blah set a = 2 where id = 1': null,
		});

		const result1 = dbh.prepare('select * from blah').chain(stmt => stmt.execute()).run();
		const result2 = dbh.prepare('insert into blah(a,b) values(?,?)').chain(stmt => stmt.execute(1,2)).run();
		const result3 = dbh.prepare('delete from blah where id = ?').chain(stmt => stmt.execute(1)).run();
		const result4 = dbh.prepare('update blah set a = ? where id = ?').chain(stmt => {
			const a = stmt.execute(2, 1)
			stmt.destroy();

			return a;
		}).run();

		check(result1, [{id: 1, a: '1', b: '2'}, {id: 2, a: '2', b: '3'}]);
		check(result2, 3);
		check(result3, undefined);
		check(result4, undefined);

		test.done();

	}
};