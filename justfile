set shell := ["bash", "-lc"]

# Default target prints available recipes
default:
	@just --list

install:
	uv venv --seed
	uv pip install -e '.[dev]'

lint:
	uv run ruff check src tests

format:
	uv run black src tests

format-check:
	uv run black --check src tests

test:
	uv run pytest

coverage:
	uv run pytest --cov=pydatatracker --cov-report=term-missing

check: lint format-check test

clean:
	rm -rf .ruff_cache .pytest_cache htmlcov .coverage*

benchmark:
	uv run python scripts/benchmark.py
