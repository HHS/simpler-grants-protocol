"""Tests for parse_batch row-level error partitioning."""

from pydantic import BaseModel

from common_grants_sdk.client import ParseFailure, parse_batch


class _Row(BaseModel):
    n: int


def test_parse_batch_partitions_good_and_bad_rows():
    items, errors = parse_batch([{"n": 1}, {"n": "not-an-int"}, {"n": 3}], _Row)

    # one bad row is collected, not raised; the good rows still come through
    assert [item.n for item in items] == [1, 3]
    assert len(errors) == 1
    assert isinstance(errors[0], ParseFailure)
    assert errors[0].index == 1
    assert errors[0].raw == {"n": "not-an-int"}
    assert errors[0].message  # non-empty


def test_parse_batch_all_valid_has_no_errors():
    items, errors = parse_batch([{"n": 1}, {"n": 2}], _Row)
    assert [item.n for item in items] == [1, 2]
    assert errors == []
