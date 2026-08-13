.PHONY: check db-up db-down migrate run-api run-worker test

check: db-up
	cargo fmt --check
	cargo clippy --all-targets --all-features --locked -- -D warnings
	LIFE_TEST_DATABASE_URL=postgres://life:life@localhost:54329/postgres \
		cargo test --all-targets --all-features --locked

test: db-up
	LIFE_TEST_DATABASE_URL=postgres://life:life@localhost:54329/postgres \
		cargo test --all-targets --all-features --locked

db-up:
	docker compose up --detach --wait postgres

db-down:
	docker compose down

migrate:
	cargo run --locked --bin life-api -- --migrate-only

run-api:
	cargo run --locked --bin life-api

run-worker:
	cargo run --locked --bin life-worker
