RUNTIME_PREFIX := poetry run
.PHONY: install format lint test build publish check-format check-lint check-types checks

install:
	poetry install

format:
	$(RUNTIME_PREFIX) black .

lint:
	$(RUNTIME_PREFIX) ruff check .

test:
	$(RUNTIME_PREFIX) pytest

build:
	poetry build

publish: plugins build
	poetry publish

check-format:
	$(RUNTIME_PREFIX) black . --check

check-lint:
	$(RUNTIME_PREFIX) ruff check .

check-types: plugins
	$(RUNTIME_PREFIX) mypy .

checks: check-format check-lint check-types

plugins:
	$(RUNTIME_PREFIX) python -m common_grants_sdk.extensions.generate --plugin examples/plugins/opportunity_extensions
