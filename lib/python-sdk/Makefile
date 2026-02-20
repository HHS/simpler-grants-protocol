RUNTIME_PREFIX := poetry run
.PHONY: install format lint test build check-format check-lint check-types checks

install:
	poetry install

format:
	$(RUNTIME_PREFIX) black .

lint:
	$(RUNTIME_PREFIX) ruff check . --fix

test:
	$(RUNTIME_PREFIX) pytest

build:
	poetry build

check-format:
	$(RUNTIME_PREFIX) black . --check

check-lint:
	$(RUNTIME_PREFIX) ruff check .

check-types:
	$(RUNTIME_PREFIX) mypy .

checks: check-format check-lint check-types
