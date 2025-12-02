package ports

// EventPublisher emits events for external observers.
// Used by the aggregate and orchestrator to publish domain events.
type EventPublisher interface {
	// Publish broadcasts an event to all registered handlers and subscribers.
	// This is non-blocking; implementations should handle event distribution asynchronously.
	Publish(event Event)
}

// EventSubscriber receives events from the event bus.
// Used by UI components, storage handlers, and projections.
type EventSubscriber interface {
	// Subscribe creates a channel that receives events of the specified types.
	// Pass empty types to receive all events.
	Subscribe(types ...string) <-chan Event

	// Unsubscribe removes a subscription channel.
	Unsubscribe(ch <-chan Event)

	// Close shuts down the subscriber and all channels.
	Close()
}

// EventHandler processes events for side effects.
// Used for storage persistence, projections (Obsidian), and other event-driven operations.
type EventHandler interface {
	// Handle processes an event and performs side effects.
	// Implementations should be idempotent where possible.
	Handle(event Event) error

	// EventTypes returns the event types this handler is interested in.
	// Return empty slice to receive all events.
	EventTypes() []string
}
