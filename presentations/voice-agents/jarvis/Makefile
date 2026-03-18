.PHONY: run run-dev setup test test-gpu test-e2e

PARENT_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))/../

# Load .env file if it exists (exports GROQ_API_KEY etc.)
ifneq (,$(wildcard .env))
include .env
export
endif

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
	cd $(PARENT_DIR) && uv run python -m jarvis

run-dev:
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
	cd $(PARENT_DIR) && JARVIS_NO_SSL=1 uv run python -m jarvis

setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env from .env.example — edit it to add your GROQ_API_KEY"; \
	fi
	brew install espeak-ng mkcert
	mkcert -install
	mkcert localhost 127.0.0.1
	cd $(PARENT_DIR) && uv sync --group dev

test:
	cd $(PARENT_DIR) && uv run python -m pytest jarvis/tests/ -v

test-gpu:
	cd $(PARENT_DIR) && uv run python jarvis/test_gpu.py

test-e2e:
	cd e2e && npx playwright test --config=playwright.config.ts
