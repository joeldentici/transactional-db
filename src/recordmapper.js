'use strict';

const {objectSplit} = require('js-helpers');
const {Maybe, Utility} = require('monadic-js');
const doM = Utility.doM;

/**
 *	Transactional.RecordMapper
 *	written by Joel Dentici
 *	on 6/20/2017
 *
 *	Extends the IDBH interface to include record mapping.
 */
class RecordMapper {
	/**
	 *	new :: IDBH -> RecordMapper
	 *
	 *	Extends the underlying IDBH with additional functionality.
	 */
	constructor(base) {
		this.base = base;
	}

	/**
	 *	insert :: RecordMapper -> string -> Map string any -> Promise int DBError
	 *
	 *	Inserts a record into a
	 *	table. Returns a promise
	 *	with the result of the insertion.
	 */
	insert(table, record) {
		//split record into keys and values
		const [keys, vals] = objectSplit(record);

		//join keys into csv string
		const theKeys = keys.join(',');
		//map keys to placeholders and join to csv string
		const placeHolders = keys.map(() => '?').join(',');

		//insert the record as a row
		return this.query(
			`INSERT into ${table}(${theKeys}) VALUES(${placeHolders})`,
			...vals);
	}

	/**
	 *	update :: RecordMapper -> string -> Map string any -> Promise () DBError
	 *
	 *	Updates the record in the table.
	 *	Returns a promise with the result
	 *	of the update.
	 */
	update(table, record) {
		//split record into k-v pairs
		const [keys, vals] = split(record);

		//set statements for each pair
		const setters = keys.map((key) => key + ' = ?').join(',');

		//always need id at end for where constraint
		vals.push(record.id);

		//update the row
		return this.query(
			`UPDATE ${table} SET ${setters} WHERE id = ?`,
			...vals);
	}

	/**
	 *	delete :: RecordMapper -> string -> (Map string any) | int -> Promise () DBError
	 *
	 *	Deletes the record from the table.
	 *	Returns a promise for the result
	 *	of the deletion.
	 */
	delete(table, record) {
		return this.query(
			`DELETE FROM ${table} WHERE id = ?`,
			typeof !isNaN(Number.parseInt(record)) ? record : record.id);
	}

	/**
	 *	read :: RecordMapper -> String -> int -> Promise (Maybe (Map string any)) DBError
	 *
	 *	Reads a record from the table.
	 *	Returns a promise for the row
	 *	read from the table.
	 */
	read(table, id) {
		return this.query(
			`SELECT * FROM ${table} WHERE id = ?`,
			id).then(res => {
				if (res.length > 0) {
					return Promise.resolve(Maybe.Just(res[0]));
				}
				else {
					return Promise.resolve(Maybe.Nothing);
				}
			});
	}

	/**
	 *	query :: RecordMapper -> string -> ...any -> Promise ([Object] | int | ()) DBError
	 *	Runs a sql query on the database,
	 *	preparing a statement, bindings
	 *	the bindings to placeholders,
	 *	and executing it. Returns a promise
	 *	for the result.
	 *
	 *	Useful when you only want to execute
	 *	a statement once.
	 */
	query(sql, ...bindings) {
		const self = this;
		return doM(function*() {
			const stmt = yield self.prepare(sql);
			const res = yield stmt.execute(...bindings);
			stmt.destroy();
			return res;
		});
	}

	/**
	 *	beginTransaction :: IDBH -> Promise () DBError
	 *
	 *	Begins a transaction on the base IDBH.
	 */
	beginTransaction() {
		return this.base.beginTransaction();
	}

	/**
	 *	commit :: IDBH -> Promise () DBError
	 *
	 *	Commits the transaction on the base IDBH
	 */
	commit() {
		return this.base.commit();
	}

	/**
	 *	rollback :: IDBH -> Promise () DBError
	 *
	 *	Rolls back the transaction on the base IDBH
	 */
	rollback() {
		return this.base.rollback();
	}

	/**
	 *	prepare :: IDBH -> String -> Promise IStatement ([Object] | int | ())
	 *
	 *	Prepares a statement on the base IDBH.
	 */
	prepare(sql) {
		return this.base.prepare(sql);
	}

	/**
	 *	status$ :: IDBH -> Observable DBStatus DBFatalError
	 *
	 *	Returns a stream of status events from the base IDBH.
	 */
	get status$() {
		return this.base.status$;
	}

	/**
	 *	connect :: IDBH -> Promise () DBError
	 *
	 *	Connects the base IDBH.
	 */
	connect() {
		return this.base.connect();
	}

	/**
	 *	close :: IDBH -> ()
	 *
	 *	Closes the base connection.
	 */
	close() {
		this.base.close();
	}
}

module.exports = RecordMapper;