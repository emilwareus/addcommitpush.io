.PHONY: help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

RESEARCHER_DIR := go-research
DR_DIR := dr

# ============================================================================
# Build Commands
# ============================================================================

.PHONY: build build-blog build-researcher build-dr

build: build-researcher build-dr build-blog ## Build everything (researcher + dr + blog)

build-blog: ## Build blog application
	pnpm build

build-researcher: ## Build researcher binary
	cd $(RESEARCHER_DIR) && go build -o research ./cmd/research

build-dr: ## Build dr deep research CLI in release mode
	cd $(DR_DIR) && cargo build --release --locked

# ============================================================================
# Test Commands
# ============================================================================

.PHONY: test test-researcher test-dr test-blog

test: test-researcher test-dr ## Run all tests

test-researcher: ## Run researcher tests
	cd $(RESEARCHER_DIR) && go test ./...

test-dr: ## Run dr CLI tests
	cd $(DR_DIR) && cargo test --locked

test-blog: ## Run blog tests (if any)
	@echo "No blog tests configured"

# ============================================================================
# Lint Commands
# ============================================================================

.PHONY: lint lint-researcher lint-dr lint-blog

lint: lint-researcher lint-dr lint-blog ## Lint all code

lint-researcher: ## Lint researcher code
	cd $(RESEARCHER_DIR) && go vet ./...

lint-dr: ## Lint dr CLI code
	cd $(DR_DIR) && cargo clippy --all-targets --all-features --locked -- -D warnings

lint-blog: ## Lint blog code
	pnpm lint

# ============================================================================
# Format Commands
# ============================================================================

.PHONY: format format-researcher format-dr format-blog format-check format-check-researcher format-check-dr format-check-blog

format: format-researcher format-dr format-blog ## Format all code

format-researcher: ## Format researcher code (cmd and internal only)
	cd $(RESEARCHER_DIR) && go fmt ./cmd/... ./internal/...

format-dr: ## Format dr CLI code
	cd $(DR_DIR) && cargo fmt

format-blog: ## Format blog code (app directory only)
	pnpm prettier --write app

format-check: format-check-researcher format-check-dr format-check-blog ## Check code formatting

format-check-researcher: ## Check researcher code formatting
	@cd $(RESEARCHER_DIR) && \
		UNFORMATTED=$$(gofmt -l ./cmd ./internal); \
		if [ -n "$$UNFORMATTED" ]; then \
			echo "The following files need formatting:"; \
			echo "$$UNFORMATTED"; \
			exit 1; \
		fi; \
		echo "✓ Researcher code is properly formatted"

format-check-dr: ## Check dr CLI formatting
	cd $(DR_DIR) && cargo fmt --check

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

.PHONY: clean setup life run-researcher start-blog install-dr

clean: ## Clean build artifacts
	cd $(RESEARCHER_DIR) && rm -f research research-* *.test
	cd $(DR_DIR) && cargo clean
	rm -rf .next

setup: ## Set up the project (install dependencies)
	pnpm install
	cd $(RESEARCHER_DIR) && go mod download

life: ## Run the Life UI locally against the live Cloud Run backend
	bash scripts/run-life-local.sh

run-researcher: ## Run researcher application
	cd $(RESEARCHER_DIR) && go run ./cmd/research

start-blog: ## Start blog production server
	pnpm start

install-dr: ## Install dr command into Cargo's bin directory
	cd $(DR_DIR) && cargo install --path . --locked --force
