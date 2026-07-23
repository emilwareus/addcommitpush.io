FROM rust:1.96-bookworm AS builder
WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY migrations ./migrations
COPY src ./src
RUN cargo build --locked --release --bin life-api --bin life-worker --bin life-provision

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home --uid 10001 life
COPY --from=builder /build/target/release/life-api /usr/local/bin/life-api
COPY --from=builder /build/target/release/life-worker /usr/local/bin/life-worker
COPY --from=builder /build/target/release/life-provision /usr/local/bin/life-provision
USER life
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/life-api"]
