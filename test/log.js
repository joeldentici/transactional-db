const λ = require('fantasy-check/src/adapters/nodeunit');

const {eq, createManager} = require('../test-lib.js');
const {identity, constant} = require('fantasy-combinators');

const {ConsoleMedia, ListMedia, MultiMedia, FileMedia, makeLogger} = require('../src/logger.js');
const Async = require('monadic-js').Async;

exports.Log = {
	'test-1': test => {
		const check = eq(test);

		const base = new Proxy({}, {
			get(obj, what) {
				if (obj[what])
					return obj[what];

				if(what === 'prepare')
					return () => Async.of(base);

				if (what === 'status$')
					return 'status';

				return function() {return 'result'}
			}
		});

		const list = new ListMedia();

		const media = new MultiMedia(
			list,
			new ConsoleMedia(),
			new FileMedia('./test/.log') //just manually check this one
		);

		const log = makeLogger(media)(base);

		const r1 = log.beginTransaction();
		const r2 = log.commit();
		const r3 = log.rollback();
		const r4 = log.prepare('blah ? ?').map(stmt => {
			const r = stmt.execute('a', 1);
			stmt.destroy();
			return r;
		}).run();
		const r5 = log.connect();
		const r6 = log.close();


		check(r1, 'result');
		check(r2, 'result');
		check(r3, 'result');
		check(r4, 'result');
		check(r5, 'result');
		check(r6, undefined);
		check(log.status$, 'status');

		check(list.items, ['BEGIN', 'COMMIT', 'ROLLBACK', 'blah a 1']);
		check(list.toString(), ['BEGIN', 'COMMIT', 'ROLLBACK', 'blah a 1'].join("\n"));

		test.done();
	}

};