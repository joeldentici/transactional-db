'use strict';

const fs = require('fs');
const {zip} = require('js-helpers');

/**
 *	Transactional.LogDBH
 *	written by Joel Dentici
 *	on 6/20/2017
 *
 *	Adds logging to connections, so that the queries ran
 *	on them are written to some medium.
 */

class LogDBH {
	/**
	 *	new :: IDBH -> Media -> ()
	 *
	 *	Constructs a new IDBH that writes queries to
	 *	some media before calling the same methods on
	 *	the base connection.
	 */
	constructor(base, media) {
		this.base = base;
		this.media = media;
	}

	/**
	 *	beginTransaction :: IDBH -> Async DBError () 
	 *
	 *	Begins a transaction on the base IDBH.
	 */
	beginTransaction() {
		this.media.write('BEGIN');
		return this.base.beginTransaction();
	}

	/**
	 *	commit :: IDBH -> Async DBError ()
	 *
	 *	Commits the transaction on the base IDBH
	 */
	commit() {
		this.media.write('COMMIT');
		return this.base.commit();
	}

	/**
	 *	rollback :: IDBH -> Async DBError ()
	 *
	 *	Rolls back the transaction on the base IDBH
	 */
	rollback() {
		this.media.write('ROLLBACK');
		return this.base.rollback();
	}

	/**
	 *	prepare :: IDBH -> String -> Async DBError (IStatement ([Object] | int | ()))
	 *
	 *	Prepares a statement on the base IDBH.
	 */
	prepare(sql) {
		return this.base.prepare(sql).map(makeWrapper(sql, this.media));
	}

	/**
	 *	status$ :: IDBH -> Observable DBStatus DBFatalError
	 *
	 *	Returns a stream of status events for both the pooled
	 *	connection and underlying IDBH.
	 */
	get status$() {
		return this.base.status$;
	}

	/**
	 *	connect :: IDBH -> Async DBError ()
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

/**
 *	replaceParameters :: string -> ...any -> string
 *
 *	Replaces the parameters of a prepared statement
 *	with the binded arguments to execute it with. This
 *	is for display purposes only and does not escape the
 *	arguments.
 */
function replaceParameters(sql, ...args) {
	const paired = zip(sql.split('?'), args.concat(''));
	return paired.reduce((acc, val) => acc + val[0] + val[1],
		'');
}

/**
 *	makeWrapper :: string -> Media -> (IStatement -> IStatement)
 *
 *	Returns a function that will wrap a prepared
 *	statement to write to the provided media, with
 *	the provided query.
 */
function makeWrapper(sql, media) {
	/**
	 *	makeStmt :: IStatement -> IStatement
	 *	Writes the query, with parameters substituted
	 *	for arguments, to the media, then executes underlying
	 *	statement.
	 */
	return function wrapStmt(stmt) {
		return {
			execute: (...args) => {
				media.write(replaceParameters(sql, ...args));

				return stmt.execute(...args);
			},
			destroy: () => stmt.destroy(),
		};
	}
}

/**
 *	ConsoleMedia :: () -> Media
 *
 *	Medium that writes to the console.
 */
class ConsoleMedia {
	constructor() {}

	write(data) {
		console.log(data);
	}
}

/**
 *	ListMedia :: () -> Media
 *
 *	Medium that writes to a list
 */
class ListMedia {
	constructor() {
		this.items = [];
	}

	write(data) {
		this.items.push(data);
	}

	toString() {
		return this.items.join("\n");
	}
}

/**
 *	FileMedia :: string -> Media
 *
 *	Medium that writes to a file
 */
class FileMedia {
	constructor(path) {
		this.path = path;
	}

	write(data) {
		fs.appendFile(this.path, data + "\n", () => {});
	}
}

/**
 *	MultiMedia :: [Media] -> Media
 *
 *	Medium that writes to underlying media
 */
class MultiMedia {
	constructor(...media) {
		this.media = media;
	}

	write(data) {
		this.media.forEach(media => media.write(data));
	}
}

exports.ConsoleMedia = ConsoleMedia;
exports.ListMedia = ListMedia;
exports.FileMedia = FileMedia;
exports.MultiMedia = MultiMedia;

/**
 *	makeLogger :: Media -> (IDBH -> IDBH)
 *
 *	Returns a function that will wrap a provided
 *	connection in a logger that writes to the provided
 *	media.
 */
exports.makeLogger = function(media) {
	/**
	 *	log :: IDBH -> IDBH
	 *	Creates an IDBH that writes to the closed
	 *	over media.
	 */
	return function log(dbh) {
		return new LogDBH(dbh, media);
	}	
}

/**
 *	nolog :: IDBH -> IDBH
 *
 *	The identity function by another name.
 */
exports.nolog = function(dbh) {
	return dbh;
}