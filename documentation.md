# Transactional DB Documentation

## Modules:
Click a module name below to see its documentation

* [Transactional](#transactional)
* [Transactional.DBHManager](#transactional-dbhmanager)
* [Transactional.IBus](#transactional-ibus)
* [Transactional.IDBH](#transactional-idbh)
* [Transactional.IStatement](#transactional-istatement)
* [Transactional.LogDBH](#transactional-logdbh)
* [Transactional.MySQLDBH](#transactional-mysqldbh)
* [Transactional.MySQLStatement](#transactional-mysqlstatement)
* [Transactional.PooledDBH](#transactional-pooleddbh)
* [Transactional.RecordMapper](#transactional-recordmapper)
* [Transactional.Transaction](#transactional-transaction)
## Transactional
<a name="transactional"></a>
**Written By:** Joel Dentici

**Written On:** 6/20/2017

The transactional library provides a mechanism for
performing database transactions on an RDBMS from
a node.js application.

This library only implements a driver for MySQL right
now, but other drivers can be registered by calling
the register function. Drivers are responsible for adapting
to the interface used by this library.
#### create :: String &#8594; int &#8594; Object &#8594; (IDBH &#8594; IDBH) &#8594; DBHManager

Uses the registered database driver creation function
to create a database manager. An optional logger can be specified.
#### drivers :: Map String (int &#8594; Object &#8594; DriverFuncs)

Store references to driver creation functions
#### register :: String &#8594; (int &#8594; Object &#8594; DriverFuncs) &#8594; ()

Registers a database driver to be used to create
a database manager at a later time.
## Transactional.DBHManager
<a name="transactional-dbhmanager"></a>
**Written By:** Joel Dentici

**Written On:** 6/20/2017

Provides methods to manage a set of connections
to a database, including creating connections,
retrieving a connection from a pool, and performing
an atomic transaction with a connection retrieved from
the pool.

Does not provide pooling capabilities on its own. It instead
relies on provided functions to interact with the pool. May
provide a default pool implementation at some point.
#### close :: DBHManager &#8594; ()

Closes the connection pool. After calling this method,
the object should no longer be used.
#### createConnection :: DBHManager &#8594; Async DBError RecordMapper

Creates a new connection that is
not from the connection pool. A promise
for the connection is returned. You are responsible for closing
the connection.
#### createMapper :: IDBH &#8594; RecordMapper

Wraps a connection in a record mapper.
#### createPooled :: DBHManager &#8594; (IDBH &#8594; RecordMapper) &#8594; RecordMapper

Wraps a connection in a pooled connection,
then wraps that in a record mapper to provide
additional functionality.
#### getConnection :: DBHManager &#8594; Async DBError RecordMapper

Returns a promise for a connection
from the connection pool. The connection is
already open.
#### new :: DriverFuncs &#8594; (IDBH &#8594; IDBH) &#8594; DBHManager

Constructs a new DBHManager with the
provided functions to create connections,
get connections from a connection pool,
and to return connections to the pool, and shutdown
the pool.

createLogger (possibly) wraps a connection in a logger

The provided functions must take and return
IDBH implementations.

toPool is guaranteed to receive the same type of IDBH that
fromPool provides.
#### runTransaction :: DBHManager &#8594; Free Transaction a &#8594; Async DBError a

Convenience method to interpret transactions. The transaction is a Free monad
whose values can be of type Async or Transaction.

The transaction is interpreted to an Async.

For most applications, this should not be used -- instead create and use your own
composite interpreter including the transactional interpreter and run the
resulting Async at the root of your application.
## Transactional.IBus
<a name="transactional-ibus"></a>
**Written By:** Joel Dentici

**Written On:** 6/20/2017

An interface for publishing to an Event Bus.
#### publish :: IBus &#8594; String &#8594; Object &#8594; ()

Publishes an event of the given type with the
given data to the bus. Returns immediately.
## Transactional.IDBH
<a name="transactional-idbh"></a>
**Written By:** Joel Dentici

**Written On:** 6/20/2017

An interface to a database handle for
a relational database.
#### beginTransaction :: IDBH &#8594; Async DBError ()

Begins a transaction. Returns a promise
for the result of beginning the transaction.
#### close :: IDBH &#8594; ()

Closes the database connection.
#### commit :: IDBH &#8594; Async DBError ()

Commits the transaction. Returns a promise
for the result.
#### connect :: IDBH &#8594; Async DBError ()

Connects to the database. Returns
a promise for the result of the
connection.
#### prepare :: IDBH &#8594; String &#8594; Async DBError (IStatement ([Object] | int | ()))

Prepares a statement to run on
the database. Returns a promise
for a statement handle. The statement
must be disposed of when the connection
is closed.
#### rollback :: IDBH &#8594; Async DBError ()

Rolls back the transaction. Returns a promise
for when rollingback finishes.
#### status$ :: IDBH &#8594; Observable DBStatus DBFatalError

Returns a stream of status events.

The only required functionality is that when the connection
is closed (in any possible way), the stream returned by this
method is ended.
## Transactional.IStatement
<a name="transactional-istatement"></a>
**Written By:** Joel Dentici

**Written On:** 6/20/2017

An interface to a statement handle for
a relational database.
#### destroy :: IStatement ([Object] | int | ()) &#8594; ()

Cleans up underlying resources
associated with the statement
handle.
#### execute :: IStatement ([Object] | int | ()) &#8594; ...any &#8594; Async DBError ([Object] | int | ())

Executes the prepared statement
with the provided placeholder
bindings. Returns a promise
with the result of the query.

The result type will depend on the type of statement
that is executed. If it is a Select Query, then a list
of objects, representing the rows selected is returned. If
it is an Insert Statement, then the ID of the new row is
returned. If it is any other kind of statement, then nothing
is returned.
## Transactional.LogDBH
<a name="transactional-logdbh"></a>
**Written By:** Joel Dentici

**Written On:** 6/20/2017

Adds logging to connections, so that the queries ran
on them are written to some medium.
#### beginTransaction :: IDBH &#8594; Async DBError ()

Begins a transaction on the base IDBH.
#### close :: IDBH &#8594; ()

Closes the base connection.
#### commit :: IDBH &#8594; Async DBError ()

Commits the transaction on the base IDBH
#### connect :: IDBH &#8594; Async DBError ()

Connects the base IDBH.
#### ConsoleMedia :: () &#8594; Media

Medium that writes to the console.
#### FileMedia :: string &#8594; Media

Medium that writes to a file
#### ListMedia :: () &#8594; Media

Medium that writes to a list
#### log :: IDBH &#8594; IDBH
Creates an IDBH that writes to the closed
over media.
#### makeLogger :: Media &#8594; (IDBH &#8594; IDBH)

Returns a function that will wrap a provided
connection in a logger that writes to the provided
media.
#### makeStmt :: IStatement &#8594; IStatement
Writes the query, with parameters substituted
for arguments, to the media, then executes underlying
statement.
#### makeWrapper :: string &#8594; Media &#8594; (IStatement &#8594; IStatement)

Returns a function that will wrap a prepared
statement to write to the provided media, with
the provided query.
#### MultiMedia :: [Media] &#8594; Media

Medium that writes to underlying media
#### new :: IDBH &#8594; Media &#8594; ()

Constructs a new IDBH that writes queries to
some media before calling the same methods on
the base connection.
#### nolog :: IDBH &#8594; IDBH

The identity function by another name.
#### prepare :: IDBH &#8594; String &#8594; Async DBError (IStatement ([Object] | int | ()))

Prepares a statement on the base IDBH.
#### replaceParameters :: string &#8594; ...any &#8594; string

Replaces the parameters of a prepared statement
with the binded arguments to execute it with. This
is for display purposes only and does not escape the
arguments.
#### rollback :: IDBH &#8594; Async DBError ()

Rolls back the transaction on the base IDBH
#### status$ :: IDBH &#8594; Observable DBStatus DBFatalError

Returns a stream of status events for both the pooled
connection and underlying IDBH.
## Transactional.MySQLDBH
<a name="transactional-mysqldbh"></a>
**Written By:** Joel Dentici

**Written On:** 6/20/2017

Adapts node-mysql to use the IDBH interface.
#### beginTransaction :: MySQLDBH &#8594; Async DBError ()

Begins a transaction. Returns a promise
for the result of beginning the transaction.
#### close :: MySQLDBH &#8594; ()

Closes the database connection.
#### commit :: MySQLDBH &#8594; Async DBError ()

Commits the transaction. Returns a promise
for the result.
#### connect :: MySQLDBH &#8594; Async DBError ()

Connects to the database. Returns
a promise for the result of the
connection.
#### createManager :: int &#8594; node-mysqlOptions &#8594; DriverFuncs

Returns functions to manage a pool of MySQLDBH connections.
#### new :: NodeMySQLConnection &#8594; MySQLDBH

Wrap the connection
#### prepare :: MySQLDBH &#8594; String &#8594; Async DBError (IStatement ([Object] | int | ()))

Prepares a statement to run on
the database. Returns a promise
for a statement handle.
#### rollback :: MySQLDBH &#8594; Async DBError ()

Rolls back the transaction. Returns a promise
for when rollingback finishes.
#### status$ :: MySQLDBH &#8594; Observable DBStatus DBFatalError

Returns a stream of status events.
## Transactional.MySQLStatement
<a name="transactional-mysqlstatement"></a>
**Written By:** Joel Dentici

**Written On:** 6/20/2017

A "prepared" statement for node-mysql.
#### destroy :: IStatement ([Object] | int | ()) &#8594; ()

Cleans up underlying resources
associated with the statement
handle.
#### execute :: MySQLStatement ([Object] | int | ()) &#8594; ...any &#8594; Async DBError ([Object] | int | ())

Executes the prepared statement
with the provided placeholder
bindings. Returns a promise
with the result of the query.
#### mapper :: Map string (DBResult &#8594; [Object] | int | ())

Maps the result of a query to the correct
type per the IDBH contract.
#### new :: NodeMySQLConnection &#8594; string &#8594; MySQLStatement ([Object] | int | ())

Construct a new MySQLStatement.
## Transactional.PooledDBH
<a name="transactional-pooleddbh"></a>
**Written By:** Joel Dentici

**Written On:** 6/20/2017

Wraps an underlying dbh that is pooled
so closing it returns it to the connection
pool.

Attempting to use the pooled connection after
it is closed will cause each method to return
an error.
#### beginTransaction :: IDBH &#8594; Async DBError ()

Begins a transaction on the base IDBH.
#### close :: IDBH &#8594; ()

Closes the pooled connection. This will cause
the underlying IDBH to be returned to its pool.
#### commit :: IDBH &#8594; Async DBError ()

Commits the transaction on the base IDBH
#### connect :: IDBH &#8594; Async DBError ()

Connects the base IDBH.
#### new :: IDBH &#8594; PooledDBH

Constructs a Pooled DBH connection from
an underlying dbh.
#### prepare :: IDBH &#8594; String &#8594; Async DBError (IStatement ([Object] | int | ()))

Prepares a statement on the base IDBH.
#### rollback :: IDBH &#8594; Async DBError ()

Rolls back the transaction on the base IDBH
#### status$ :: IDBH &#8594; Observable DBStatus DBFatalError

Returns a stream of status events for both the pooled
connection and underlying IDBH.
## Transactional.RecordMapper
<a name="transactional-recordmapper"></a>
**Written By:** Joel Dentici

**Written On:** 6/20/2017

Extends the IDBH interface to include record mapping.
#### beginTransaction :: IDBH &#8594; Async DBError ()

Begins a transaction on the base IDBH.
#### close :: IDBH &#8594; ()

Closes the base connection.
#### commit :: IDBH &#8594; Async DBError ()

Commits the transaction on the base IDBH
#### connect :: IDBH &#8594; Async DBError ()

Connects the base IDBH.
#### delete :: RecordMapper &#8594; string &#8594; (Map string any) | int &#8594; Async DBError ()

Deletes the record from the table.
Returns a promise for the result
of the deletion.
#### insert :: RecordMapper &#8594; string &#8594; Map string any &#8594; Async DBError int

Inserts a record into a
table. Returns a promise
with the result of the insertion.
#### new :: IDBH &#8594; RecordMapper

Extends the underlying IDBH with additional functionality.
#### prepare :: IDBH &#8594; String &#8594; Async DBError (IStatement ([Object] | int | ()))

Prepares a statement on the base IDBH.
#### query :: RecordMapper &#8594; string &#8594; ...any &#8594; Async DBError ([Object] | int | ())
Runs a sql query on the database,
preparing a statement, bindings
the bindings to placeholders,
and executing it. Returns a promise
for the result.

Useful when you only want to execute
a statement once.
#### read :: RecordMapper &#8594; String &#8594; int &#8594; Async DBError (Maybe (Map string any))

Reads a record from the table.
Returns a promise for the row
read from the table.
#### rollback :: IDBH &#8594; Async DBError ()

Rolls back the transaction on the base IDBH
#### status$ :: IDBH &#8594; Observable DBStatus DBFatalError

Returns a stream of status events from the base IDBH.
#### update :: RecordMapper &#8594; string &#8594; Map string any &#8594; Async DBError ()

Updates the record in the table.
Returns a promise with the result
of the update.
## Transactional.Transaction
<a name="transactional-transaction"></a>
**Written By:** Joel Dentici

**Written On:** 6/20/2017

Provides a DSL to compose and execute database
transactions. This comes in the form of a Free monad
over a (rather large) functor defined below, along with
an interpreter that translates monadic values into calls
in the library.

This is the preferred way to use this library and produces
much cleaner code than directly using the library functions
to interact with your database.
#### cleanupFail :: Interpret &#8594; b &#8594; Async c ()

Cleans up the resources used to interpret.
#### cleanupSuccess :: Interpret &#8594; a &#8594; Async c ()

Cleans up the resources used to interpret.
#### delete :: string &#8594; Map string any | int &#8594; Transaction ()

Delete a row in a table.
#### emit :: string &#8594; Object &#8594; Transaction ()

Emit an event. This is used to signal that an
event occurred while executing the transaction. The
interpreter will automatically publish these events
to a provided event bus.
#### execute :: IStatement &#8594; ...any &#8594; Transaction ([Object] | int | ())

Execute a prepared statement on the database.
#### insert :: string &#8594; Map string any &#8594; Transaction int

Insert a row into a table.
#### interpreter :: (DBHManager, IBus) &#8594; () &#8594; Interpreter

Creates an interpreter constructor that can be used
with ConcurrentFree.interpret.

This interprets to Async and runs queries/statements in a
transaction.
#### map :: Interpret &#8594; Transaction a &#8594; (Async a, (a &#8594; Free f b) | Free f b)

Maps the transaction to an Async
#### of/unit :: a &#8594; Transaction a

Lift a normal value into the Transaction context.
#### prepare :: string &#8594; Transaction IStatement

Prepare a statement for execution on the database.
#### query :: string &#8594; ...any &#8594; Transaction ([Object] | int | ())

Execute a query on the database.
#### read :: string &#8594; int &#8594; Transaction (Maybe (Map string any))

Read a row from a table.
#### setup :: Interpret &#8594; () &#8594; Async ()

Prepares a context to interpret in.
#### update :: string &#8594; Map string any &#8594; Transaction ()

Update a row in a table.
