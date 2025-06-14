RUNTIME_PREFIX := poetry run
SRC_DIR := src/
TEST_DIR := tests/
PYTHON_DIRS := $(SRC_DIR) $(TEST_DIR)
MIN_TEST_COVERAGE := 80
.PHONY: dev format lint check-format check-lint check-types checks

install:
	poetry install

dev:
	$(RUNTIME_PREFIX) uvicorn ca_common_grants.api:app --reload

format:
	$(RUNTIME_PREFIX) black $(PYTHON_DIRS)

lint:
	$(RUNTIME_PREFIX) ruff check $(PYTHON_DIRS) --fix

test:
	$(RUNTIME_PREFIX) pytest $(TEST_DIR) --cov=$(SRC_DIR) --cov-report=term-missing

test-coverage: test
	$(RUNTIME_PREFIX) coverage report --show-missing --fail-under=$(MIN_TEST_COVERAGE)

check-format:
	$(RUNTIME_PREFIX) black $(PYTHON_DIRS) --check

check-lint:
	$(RUNTIME_PREFIX) ruff check $(PYTHON_DIRS) --fix --exit-non-zero-on-fix

check-spec:
	$(RUNTIME_PREFIX) python src/ca_common_grants/scripts/generate_openapi.py --version 3.0.0 > openapi-v3.yaml && cg check spec openapi-v3.yaml

check-types:
	$(RUNTIME_PREFIX) pyright $(PYTHON_DIRS)

checks: check-format check-lint check-types

gen-openapi:
	$(RUNTIME_PREFIX) python src/ca_common_grants/scripts/generate_openapi.py > openapi.yaml

gen-openapi-v3:
	$(RUNTIME_PREFIX) python src/ca_common_grants/scripts/generate_openapi.py --version 3.0.0 > openapi-v3.yaml

