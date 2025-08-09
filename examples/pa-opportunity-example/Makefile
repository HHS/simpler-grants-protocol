RUNTIME_PREFIX := poetry run
SRC_DIR := src/
TEST_DIR := tests/
PYTHON_DIRS := $(SRC_DIR) $(TEST_DIR)
MIN_TEST_COVERAGE := 80
.PHONY: dev format lint check-format check-lint check-types checks

install:
	poetry install && chmod +x src/common_grants/scripts/generate_openapi.py

dev:
	$(RUNTIME_PREFIX) fastapi dev src/common_grants/api.py

format:
	$(RUNTIME_PREFIX) black $(PYTHON_DIRS)

lint:
	$(RUNTIME_PREFIX) ruff check $(PYTHON_DIRS) --fix

test:
	$(RUNTIME_PREFIX) pytest $(TEST_DIR) --cov=$(SRC_DIR) --cov-report=term-missing

test-coverage: test
	$(RUNTIME_PREFIX) coverage report --show-missing --fail-under=$(MIN_TEST_COVERAGE)

check-domain:
	@./src/common_grants/scripts/check_domain.sh

check-format:
	$(RUNTIME_PREFIX) black $(PYTHON_DIRS) --check

check-lint:
	$(RUNTIME_PREFIX) ruff check $(PYTHON_DIRS) --fix --exit-non-zero-on-fix

check-spec:
	$(RUNTIME_PREFIX) python src/common_grants/scripts/generate_openapi.py > openapi.yaml && cg check spec openapi.yaml

check-spec-devmode:
	$(RUNTIME_PREFIX) python src/common_grants/scripts/generate_openapi.py > openapi.yaml && node ../../lib/cli/dist/index.js check spec openapi.yaml

check-types:
	$(RUNTIME_PREFIX) pyright $(PYTHON_DIRS)

checks: check-format check-lint check-types check-domain

gen-openapi:
	$(RUNTIME_PREFIX) python src/common_grants/scripts/generate_openapi.py > openapi.yaml
