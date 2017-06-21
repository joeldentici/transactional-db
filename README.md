# transactional
This library provides composable transactions for RDBMS. Currently only MySQL is supported through the use of `node-mysql`. Other databases can be supported by writing an appropriate adapter for their drivers and registering it with this library.

transactional can be used in two ways, but only one is recommended. The first is to use it as a traditional Object Oriented library. It is written using methods that return promises so you don't need to worry about callback hell.

The second is to use the provided DSL to write composable transactions. This is the recommended way to use it and an example of it is shown below.

Read the [documentation.html](documentation) for more information.

# install
To install and use this library in your application:
`npm install --save transactional`

# example
Below is an extremely contrived example of how this library may be used, although similar cases to it commonly show up in relational schemas:

```
const transactional = require('transactional');
const {Transaction: T} = transactional;
const {doM} = require('monadic').Utility;

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
	return doM(function*() {
		const userId = yield addUser(userName, hash(password));
		const addAddress = yield addAddress(street, city, state, zip);
		yield linkUserAddress(userId, addressId);

		return T.unit(`User ${userName} created with address`);
	});
}

const transaction = createUser('foo', 'bar', 'fake st', 'fake city', 'FS', 00000);

dbm
	.runTransaction(transaction)
	.then(x => console.log(x), e => console.error(e));

```

The problem the above example tries to solve is inserting related records to a database, but in an atomic way. Not performing the above queries in a transaction could possibly leave the database in an inconsistent state if they do not all complete together (perhaps the database crashes after inserting the user and address, but before linking them in the join table). Running them in a transaction guarantees that this won't happen.

Because we have separated running a transaction from defining a transaction, we can guarantee two desirable things:

	1. All queries/statements run in a transactional context
	2. Two transactions can be composed together.

The only way around this is to not use the DSL. As long as we use it, the only things we can do are construct Transactions, compose Transactions, and run Transactions.

Other solutions, such as defining functions that run a set of statements as a transaction (1 above), or only executing queries in certain places in the software (2 above) can only make one of these guarantees.

Note: This example is contrived and you would probably just do all the queries in one function. This doesn't preclude the fact that there are times in a real system where you want to: Run only Transaction A, Run only Transaction B, or Run both Transaction A and Transaction B in a single large Transaction.

# credits
I stole the idea from [https://github.com/helium/postgresql-transactional](here). Their software is written in Haskell and uses a Monad Transformer rather than a Free Monad.