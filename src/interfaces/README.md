# Interface #
There are two interfaces to implement:

## IDBH ##
Provides the basic communication with the database for a single connection. The interface is kept light so that implementing it is very simple and using it is simple. We extend this with additional functionality later, but all that needs to work is implemented here.

The only big caveats are:
	* The methods return promises, except for getStatus$() which returns an event stream (Rx Observable)
	* Closing a connection guarantees that all prepared statements are cleaned up by the DBMS (even for a decorator like PooledDBH that doesn't actually close the underlying connection!). This will probably be automatic for you.

## IStatement ##
Provides an interface to a statement that has been prepared for execution in the DBMS. It has two methods:
	* execute(...bindings) which binds placeholders to the provided arguments, executes the statement, and returns a promise for its result.
	* destroy() which destroys the underlying statement.