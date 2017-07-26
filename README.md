# transactional-db
[![Build Status](https://travis-ci.org/joeldentici/transactional-db.png?branch=master)](https://travis-ci.org/joeldentici/transactional-db)
[![Coverage Status](https://coveralls.io/repos/github/joeldentici/transactional-db/badge.png?branch=master)](https://coveralls.io/github/joeldentici/transactional-db?branch=master)

This library provides composable transactions for RDBMS. Currently only MySQL is supported through the use of `node-mysql`. Other databases can be supported by writing an appropriate adapter for their drivers and registering it with this library.

transactional can be used in two ways, but only one is recommended. The first is to use it as a traditional Object Oriented library. It is written using methods that return promises so you don't need to worry about callback hell.

The second is to use the provided DSL to write composable transactions. This is the recommended way to use it and an example of it is shown below. This can even be combined with the instructions of other Free monad DSLs, provided you use your own interpreter.

Read [documentation.md](documentation.md) for more information.

## Install
To install and use this library in your application:
`npm install --save transactional-db`

## Example
Below is an extremely contrived example of how this library may be used. Similar cases to it commonly show up when inserting into 2+NF databases:

```js
const transactional = require('transactional-db');
const {Transaction: T} = transactional;

const dbm = transactional.create('mysql', 10, {
	host: 'localhost',
	user: 'root',
	password: 'password',
	database: 'test'
});

function hash(password) { return password; }

function addUser(userName, password) {
	return T.insert('user', {
		userName,
		password
	});
}

function addAddress(street, city, state, zip) {
	return T.insert('address', {
		street,
		city,
		state,
		zip
	});
}

function linkUserAddress(userId, addressId) {
	return T.insert('user_address', {
		userId,
		addressId
	});
}

function createUser(userName, password, street, city, state, zip) {
	return do T {
		userId <- addUser(userName, hash(password))
		addressId <- addAddress(street, city, state, zip)

		do! linkUserAddress(userId, addressId)

		return `User ${userName} created with address.`
	};
}

const transaction = createUser('foo', 'bar', 'fake st', 'fake city', 'FS', 00000);

dbm
	.runTransaction(transaction)
	.fork(x => console.log(x), e => console.error(e));

```

The problem the above example tries to solve is inserting related records to a database, but in an atomic way. Not performing the above queries in a transaction could possibly leave the database in an inconsistent state if they do not all complete together (perhaps the database crashes after inserting the user and address, but before linking them in the join table). Running them in a transaction guarantees that this won't happen.

Because we have separated running a transaction from defining a transaction, we can guarantee two desirable things:

1. All queries/statements run in a transactional context
2. Two transactions can be composed together.

The only way around (1) is to not use the DSL. As long as we use it, the only things we can do are construct Transactions, compose Transactions, and run Transactions.

Note that we cannot achieve both (1) and (2) by just using the library calls alone. We could achieve either independently. To get (1) all we need to do is update our functions that interact with the database to run their queries in a transaction. But this means we have now wrapped those queries in calls to "beginTransaction" and "endTransaction", so they can no longer be composed (unless the database engine supports nested transactions, but that is semantically different anyway). To get (2) all we need to do is wrap the outermost database-interfacting-with functions in a transaction. But then someone can run any of the non-outermost functions and their queries/statements will run independently!

Note: This example is contrived and you would probably just do all the queries in one function as a transaction. This doesn't preclude the fact that there are times in a real system where you want to: Run only Transaction A, Run only Transaction B, or Run both Transaction A and Transaction B in a single large Transaction.

## Credits
I based the idea on [postgresql-transactional](https://github.com/helium/postgresql-transactional). Their software is written in Haskell and uses a Monad Transformer rather than a Free Monad.
