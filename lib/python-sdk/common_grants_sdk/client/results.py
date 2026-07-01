"""Typed result containers for the CommonGrants client.

``SearchResult`` / ``ListResult`` partition a batch response into the rows that
parsed (``items``) and the rows that did not (``errors``), so one malformed row
never fails the whole response. This is distinct from ``filter_info.errors``,
which carries filter-validation and server-reported errors.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Generic

from pydantic import BaseModel, ValidationError
from typing_extensions import TypeVar

from ..schemas.pydantic.pagination import PaginatedResultsInfo
from ..schemas.pydantic.responses.success import FilterInfo

ItemT = TypeVar("ItemT", bound=BaseModel)


@dataclass
class ParseFailure:
    """A single row that failed to parse into the target schema.

    ``index`` is the row's position in the response batch; ``raw`` is the
    unparsed row so a consumer can inspect or re-process it.
    """

    index: int
    message: str
    raw: dict[str, Any]


@dataclass
class ListResult(Generic[ItemT]):
    """A parsed list response: successfully parsed ``items`` plus per-row ``errors``."""

    items: list[ItemT]
    errors: list[ParseFailure]
    pagination_info: PaginatedResultsInfo


@dataclass
class SearchResult(Generic[ItemT]):
    """A parsed search response.

    ``items`` are the rows that parsed; ``errors`` are per-row ``ParseFailure``s.
    ``filter_info.errors`` is a separate channel carrying filter-validation and
    server-reported errors (fail-soft), not row parse failures.
    """

    items: list[ItemT]
    errors: list[ParseFailure]
    pagination_info: PaginatedResultsInfo
    filter_info: FilterInfo[Any]


def parse_batch(
    rows: list[dict[str, Any]], schema: type[ItemT]
) -> tuple[list[ItemT], list[ParseFailure]]:
    """Validate each row into ``schema``, collecting failures instead of raising.

    Returns ``(items, errors)``: ``items`` are the rows that validated, in order;
    ``errors`` are ``ParseFailure``s for the rows that did not. A single bad row
    never aborts the batch.
    """
    items: list[ItemT] = []
    errors: list[ParseFailure] = []
    for index, row in enumerate(rows):
        try:
            items.append(schema.model_validate(row))
        except ValidationError as exc:
            errors.append(ParseFailure(index=index, message=str(exc), raw=row))
    return items, errors
