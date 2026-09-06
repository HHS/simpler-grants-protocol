RUNTIME_PREFIX := poetry run
SRC_DIR := src/
TEST_DIR := tests/
PYTHON_DIRS := $(SRC_DIR) $(TEST_DIR)
MIN_TEST_COVERAGE := 80
.PHONY: install format lint test test-coverage build check-format check-lint check-types check-fixtures checks

install:
	poetry install

format:
	$(RUNTIME_PREFIX) black .

lint:
	$(RUNTIME_PREFIX) ruff check .

test:
	$(RUNTIME_PREFIX) pytest $(TEST_DIR) --cov=$(SRC_DIR) --cov-report=term-missing

test-coverage: test
	$(RUNTIME_PREFIX) coverage report --show-missing --fail-under=$(MIN_TEST_COVERAGE)

build:
	poetry build

check-format:
	$(RUNTIME_PREFIX) black . --check

check-lint:
	$(RUNTIME_PREFIX) ruff check .

check-types:
	$(RUNTIME_PREFIX) pyright

# Negative type fixtures SHOULD fail pyright — one error per EXPECT-ERROR marker.
# Passes only when the error count matches the marker count exactly, so a guard
# that stops firing (or a new unintended error) both fail the target.
check-fixtures:
	@expected=$$(grep -c 'EXPECT-ERROR' examples/typed_custom_filters_failures.py); \
	actual=$$($(RUNTIME_PREFIX) pyright -p pyrightconfig.fixtures.json --outputjson | $(RUNTIME_PREFIX) python -c 'import json,sys; print(json.load(sys.stdin)["summary"]["errorCount"])'); \
	if [ "$$actual" -eq "$$expected" ]; then \
		echo "negative fixtures OK: $$actual/$$expected expected pyright errors"; \
	else \
		echo "negative fixtures MISMATCH: expected $$expected pyright errors, got $$actual"; \
		exit 1; \
	fi

checks: check-format check-lint check-types check-fixtures test-coverage
