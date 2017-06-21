# Base Implementation #
This directory provides the types that client code is going to interact with.

## DBHManager ##
A DBHManager provides access to connections to a DBMS as RecordMappers, which are an extension to the IDBH interface.

The DBHManager also provides a method to run a transaction monad with a connection from its connection pool.

## PooledDBH ##
Implements IDBH to allow access to an underlying implementation of IDBH (decorates it), so that when it is closed, the underlying IDBH is returned to a connection pool. It also prevents usage of the connection once it is closed, so that clients can't mess up and use it after they close it.

## RecordMapper ##
Extends IDBH to provide CRUD operations that work on JS objects:

	* insert(table, record)
	* update(table, record)
	* delete(table, record | id)
	* read(table, id)
	* query(statement, ...bindings)

Query is provided here so that drivers don't need to provide basically the same method twice (since prepare + execute is equivalent to query).

## Transaction Monad ##
The small heart of the library. Provides basic functions which lift the IDBH operations such as:

	* query
	* prepare
	* insert
	* update
	* delete
	* read

as well as providing the monadic functions:
	
	* unit => brings a value into the monad
	* bind => binds the result of a transaction to parameter of the next

Along with the provided doM helper, powerful transaction scripts that compose nicely and that cannot be ran outside of database transactions are very easy to write.

You don't need to understand monads, to use this, just look at the examples.