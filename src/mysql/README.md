# Reference Implementation #
The reference implementation adapts node-mysql to work with the transactional library.

## MySQLDBH ##
Adapts a node-mysql connection to work with the library. Most methods just promisfy the underlying method on the node-mysql connection.

## MySQLStatement ##
Since node-mysql doesn't actually support prepared statements, we just wrap node-mysql's idea of a prepared statement. The destroy method therefore does absolutely nothing.