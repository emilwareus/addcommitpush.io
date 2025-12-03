.PHONY: help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

RESEARCHER_DIR := go-research

# ============================================================================
# Build Commands
# ============================================================================

.PHONY: build build-blog build-researcher

build: build-researcher build-blog ## Build everything (researcher + blog)

build-blog: ## Build blog application
	pnpm build

build-researcher: ## Build researcher binary
	cd $(RESEARCHER_DIR) && go build -o research ./cmd/research

# ============================================================================
# Test Commands
# ============================================================================

.PHONY: test test-researcher test-blog

test: test-researcher ## Run all tests

test-researcher: ## Run researcher tests
	cd $(RESEARCHER_DIR) && go test ./...

test-blog: ## Run blog tests (if any)
	@echo "No blog tests configured"

# ============================================================================
# Lint Commands
# ============================================================================

.PHONY: lint lint-researcher lint-blog

lint: lint-researcher lint-blog ## Lint all code

lint-researcher: ## Lint researcher code
	cd $(RESEARCHER_DIR) && go vet ./...

lint-blog: ## Lint blog code
	pnpm lint

# ============================================================================
# Format Commands
# ============================================================================

.PHONY: format format-researcher format-blog format-check format-check-researcher format-check-blog

format: format-researcher format-blog ## Format all code

format-researcher: ## Format researcher code (cmd and internal only)
	cd $(RESEARCHER_DIR) && go fmt ./cmd/... ./internal/...

format-blog: ## Format blog code (app directory only)
	pnpm prettier --write app

format-check: format-check-researcher format-check-blog ## Check code formatting

format-check-researcher: ## Check researcher code formatting
	@cd $(RESEARCHER_DIR) && \
		UNFORMATTED=$$(gofmt -l ./cmd ./internal); \
		if [ -n "$$UNFORMATTED" ]; then \
			echo "The following files need formatting:"; \
			echo "$$UNFORMATTED"; \
			exit 1; \
		fi; \
		echo "✓ Researcher code is properly formatted"

format-check-blog: ## Check blog code formatting (app directory only)
	pnpm prettier --check app

# ============================================================================
# Check Command (runs all checks)
# ============================================================================

.PHONY: check

check: format-check lint test build ## Run all checks (format, lint, test, build)
	@echo "✓ All checks passed"

# ============================================================================
# Utility Commands
# ============================================================================

.PHONY: clean setup run-researcher start-blog

clean: ## Clean build artifacts
	cd $(RESEARCHER_DIR) && rm -f research research-* *.test
	rm -rf .next

setup: ## Set up the project (install dependencies)
	pnpm install
	cd $(RESEARCHER_DIR) && go mod download

run-researcher: ## Run researcher application
	cd $(RESEARCHER_DIR) && go run ./cmd/research

start-blog: ## Start blog production server
	pnpm start

