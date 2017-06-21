
/**
 *	Transactional.IBus
 *	written by Joel Dentici
 *	on 6/20/2017
 *
 *	An interface for publishing to an Event Bus.
 */
class IBus {
	/**
	 *	publish :: IBus -> String -> Object -> ()
	 *
	 *	Publishes an event of the given type with the
	 *	given data to the bus. Returns immediately.
	 */
	publish(eventType, eventData) {}
}