RUNTIME_PREFIX := poetry run
.PHONY: install format lint test build check-format check-lint check-types check-fixtures check-award-fixtures check-award-schema check-opportunity-schema checks

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

check-award-fixtures:
	@expected=$$(grep -c 'EXPECT-ERROR' examples/typed_awards_failures.py); \
	actual=$$($(RUNTIME_PREFIX) pyright -p pyrightconfig.awards-fixtures.json --outputjson | $(RUNTIME_PREFIX) python -c 'import json,sys; print(json.load(sys.stdin)["summary"]["errorCount"])'); \
	if [ "$$actual" -eq "$$expected" ]; then \
		echo "award negative fixtures OK: $$actual/$$expected expected pyright errors"; \
	else \
		echo "award negative fixtures MISMATCH: expected $$expected pyright errors, got $$actual"; \
		exit 1; \
	fi

# Validates JSON the award models serialize against the emitted Core schemas with
# AJV (resolved from lib/ts-sdk's installed dev dependencies). The concrete route
# schemas come from the TS SDK's TypeSpec bundle: `pnpm --filter @common-grants/sdk
# run typespec` generates it, and a missing bundle or dependency fails the check.
SCHEMA_DIR ?= ../../website/public/schemas/yaml
ROUTE_SCHEMAS ?= ../ts-sdk/tsp-output/@typespec/json-schema/schemas.yaml
check-award-schema:
	@dir=$$(mktemp -d); trap 'rm -rf "$$dir"' EXIT; cases="$$dir/award-cases.json"; \
	$(RUNTIME_PREFIX) python -m tests.schemas.award_fixtures "$$cases" && \
	node scripts/check-award-fixtures.mjs --schemas $(SCHEMA_DIR) \
		--route-schemas $(ROUTE_SCHEMAS) --fixtures "$$cases"

# Validates JSON the opportunity models serialize (Core v0.5 identifiers and
# funders) against the emitted model schemas, with the same AJV checker. These are
# model-only cases, so no route bundle is needed.
check-opportunity-schema:
	@dir=$$(mktemp -d); trap 'rm -rf "$$dir"' EXIT; cases="$$dir/opportunity-cases.json"; \
	$(RUNTIME_PREFIX) python -m tests.schemas.opportunity_v05_fixtures "$$cases" && \
	node scripts/check-award-fixtures.mjs --schemas $(SCHEMA_DIR) --fixtures "$$cases"

checks: check-format check-lint check-types check-fixtures check-award-fixtures
