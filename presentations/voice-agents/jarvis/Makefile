.PHONY: run setup test

run:
	@if [ ! -f .env ]; then \
		echo ""; \
		echo "ERROR: .env file not found."; \
		echo ""; \
		echo "  cp .env.example .env"; \
		echo "  # Then edit .env and add your Groq API key"; \
		echo "  # Get one at https://console.groq.com"; \
		echo ""; \
		exit 1; \
	fi
	uv run jarvis

setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env from .env.example — edit it to add your GROQ_API_KEY"; \
	fi
	brew install espeak-ng mkcert
	mkcert -install
	mkcert localhost 127.0.0.1
	uv sync

test:
	uv run python test_gpu.py
