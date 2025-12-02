package events

import (
	"sync"
	"time"
)

// Bus is a channel-based event distribution system
type Bus struct {
	mu          sync.RWMutex
	subscribers map[EventType][]chan Event
	buffer      int
}

// NewBus creates a new event bus
func NewBus(bufferSize int) *Bus {
	return &Bus{
		subscribers: make(map[EventType][]chan Event),
		buffer:      bufferSize,
	}
}

// Subscribe creates a channel for receiving events of specific types
func (b *Bus) Subscribe(types ...EventType) <-chan Event {
	ch := make(chan Event, b.buffer)
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, t := range types {
		b.subscribers[t] = append(b.subscribers[t], ch)
	}
	return ch
}

// Publish sends an event to all subscribers
func (b *Bus) Publish(event Event) {
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}
	b.mu.RLock()
	defer b.mu.RUnlock()
	for _, ch := range b.subscribers[event.Type] {
		select {
		case ch <- event:
		default:
			// Drop if buffer full - non-blocking
		}
	}
}

// Close shuts down all subscriber channels
func (b *Bus) Close() {
	b.mu.Lock()
	defer b.mu.Unlock()

	// Track closed channels to avoid double-close
	closed := make(map[chan Event]bool)
	for _, channels := range b.subscribers {
		for _, ch := range channels {
			if !closed[ch] {
				close(ch)
				closed[ch] = true
			}
		}
	}
	b.subscribers = make(map[EventType][]chan Event)
}
