const λ = require('fantasy-check/src/adapters/nodeunit');

const {eq, createManager} = require('../test-lib.js');
const {identity, constant} = require('fantasy-combinators');

const transactional = require('../src/transactional.js');
const {Async, Maybe, ConcurrentFree: F} = require('monadic-js');
const T = transactional.Transaction;

//run Async computations in an immediate, blocking manner for unit tests.
const oldScheduler = Async.setScheduler(x => x());

transactional.register('mysql-test-1', createManager({
	'select * from blah': [{id: 1, a: '1', b: '2'}, {id: 2, a: '2', b: '3'}],
	'insert into blah(a,b) values(1,2)': {insertId: 3},
	'delete from blah where id = 1': null,
	'update blah set a = 2 where id = 1': null,
	'select * from blah where id = 1': [{id: 1, a: '1', b: '2'}],
	'select * from blah where id = 3': [],
}));

exports.DBM = {
	'test-1': test => {
		const check = eq(test);

		const dbm = transactional.create('mysql-test-1');

		const result = dbm.runTransaction(T.read('blah', 1)).run();
		const result2 = dbm.runTransaction(T.read('blah', 3)).run();
		const result3 = dbm.runTransaction(T.insert('blah', {
			a: 1,
			b: 2,
		})).run();
		const result4 = dbm.runTransaction(T.update('blah', {
			id: 1,
			a: 2,
		})).run();
		const result5 = dbm.runTransaction(T.delete('blah', 1)).run();
		const result6 = dbm.runTransaction(T.delete('blah', {id: 1})).run();
		const result7 = dbm.runTransaction(F.Control.throwE('blahhhh')).run();

		check(result, Maybe.of({id: 1, a: '1', b: '2'}));
		check(result2, Maybe.Nothing);
		check(result3, 3);
		check(result4, undefined);
		check(result5, undefined);
		check(result6, undefined);
		check(result7, 'blahhhh');

		dbm.close();

		test.done();
	}
}