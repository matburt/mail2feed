# Build stage
FROM rust:1.75-slim-bullseye as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Copy source code
COPY src ./src
COPY migrations ./migrations
COPY diesel.toml ./

# Build the application with PostgreSQL support
RUN cargo build --release --features postgres

# Runtime stage
FROM debian:bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl1.1 \
    libpq5 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -u 1001 appuser

# Create app directory and set permissions
WORKDIR /app
RUN chown appuser:appuser /app

# Copy the binary from builder stage
COPY --from=builder /app/target/release/mail2feed-backend /app/mail2feed-backend
RUN chmod +x /app/mail2feed-backend && chown appuser:appuser /app/mail2feed-backend

# Copy migration files for potential runtime use
COPY --from=builder /app/migrations /app/migrations
RUN chown -R appuser:appuser /app/migrations

# Switch to app user
USER appuser

# Expose port
EXPOSE 8000

# Set environment variables
ENV RUST_LOG=info
ENV DATABASE_URL=postgresql://mail2feed_user:mail2feed_pass@postgres:5432/mail2feed

# Run the binary
CMD ["./mail2feed-backend"]