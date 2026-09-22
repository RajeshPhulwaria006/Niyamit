.PHONY: all start run dev backend frontend db lint format test clean help

all: help

help:
	@echo "========================================================================"
	@echo " e-LMPC RADAR : Legal Metrology Packaging Audit Orchestrator (v2.0)    "
	@echo "========================================================================"
	@echo "Available commands:"
	@echo "  make start      - Start everything (PostgreSQL, FastAPI Backend, Next.js UI)"
	@echo "  make backend    - Start only the Python FastAPI backend on :8000"
	@echo "  make frontend   - Start only the Next.js frontend on :3000"
	@echo "  make db         - Ensure PostgreSQL docker container is running"
	@echo "  make lint       - Run Ruff linter on Python codebase"
	@echo "  make format     - Run Ruff auto-formatter on Python codebase"
	@echo "  make test       - Run end-to-end PaddleOCR statutory inspection test"
	@echo "  make clean      - Terminate any running dev processes on :3000 and :8000"
	@echo "========================================================================"

start: run
dev: run

run:
	@./start.sh

backend: db
	@echo "Starting FastAPI Backend on http://0.0.0.0:8000..."
	@cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

frontend:
	@echo "Starting Next.js Frontend on http://0.0.0.0:3000..."
	@cd frontend && npm run dev -- -H 0.0.0.0 -p 3000

db:
	@if docker ps --format '{{.Names}}' | grep -q "^lmpc-postgres$$"; then \
		echo "✓ PostgreSQL container 'lmpc-postgres' is running."; \
	elif docker ps -a --format '{{.Names}}' | grep -q "^lmpc-postgres$$"; then \
		echo "Starting existing 'lmpc-postgres' container..."; \
		docker start lmpc-postgres >/dev/null; \
	else \
		echo "Provisioning new 'lmpc-postgres' container..."; \
		docker run -d --name lmpc-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=lmpc_db -p 5432:5432 postgres:15-alpine >/dev/null; \
	fi

lint:
	@echo "Running Ruff linter on backend..."
	@ruff check backend/ --config backend/pyproject.toml
	@echo "✓ Backend lint checks passed."

format:
	@echo "Formatting backend with Ruff..."
	@ruff format backend/ --config backend/pyproject.toml
	@echo "✓ Backend formatted."

test:
	@echo "Running end-to-end statutory audit pipeline test (Python + PaddleOCR)..."
	@PYTHONPATH=backend python3 backend/tests/test_inspection.py

test-ts:
	@echo "Running TypeScript statutory compliance test suite..."
	@npx tsx scripts/test-engine.ts

test-all: test test-ts

clean:
	@echo "Stopping processes on port 3000 and 8000..."
	@fuser -k 3000/tcp 2>/dev/null || true
	@fuser -k 8000/tcp 2>/dev/null || true
	@echo "✓ Cleaned up ports 3000 and 8000."
