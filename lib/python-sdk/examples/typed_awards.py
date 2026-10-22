"""Typed awards: an award whose individual recipient has typed custom fields.

Custom fields live on ``AwardBase.recipient_individual``, not on the award. Declare
them once as a ``CustomFieldSet`` and nest it::

    TypedAward = AwardBase[AwdRecipientIndividual[RecipientFields]]

The award response wrappers take the award model the same way
(``AwardResponse[TypedAward]``); bare ``AwardBase`` and bare wrappers keep the
protocol's untyped ``dict[str, CustomField]``.

Runs as a self-check without an API::

    poetry run python -m examples.typed_awards

and pyright checks the ``assert_type`` calls with the rest of ``examples/``. The
static unhappy path is ``typed_awards_failures.py`` (``make check-award-fixtures``).
"""

from __future__ import annotations

import copy
from typing import Any, Optional

from typing_extensions import assert_type

from common_grants_sdk.extensions import CustomField, CustomFieldSet
from common_grants_sdk.schemas import (
    AwardBase,
    AwardResponse,
    AwardsFilteredResponse,
    AwardsListResponse,
    AwardsSortedResponse,
    AwdRecipientIndividual,
)


class RecipientFields(CustomFieldSet):
    """Custom fields this implementation publishes about an individual recipient."""

    scholarship_year: Optional[CustomField[int]] = None


TypedAward = AwardBase[AwdRecipientIndividual[RecipientFields]]

AWARD: dict[str, Any] = {
    "id": "01912a8b-7c3d-7894-abcd-ef1234567890",
    "title": "Graduate Research Fellowship",
    "description": "Supports a graduate student's research.",
    "status": {"value": "awarded"},
    "recipientIndividual": {
        "name": {"firstName": "Ada", "lastName": "Lovelace"},
        "customFields": {
            "scholarshipYear": {
                "name": "scholarshipYear",
                "fieldType": "integer",
                "value": 2026,
            },
            # Not declared on RecipientFields: kept under its exact key.
            "mentor_note": {
                "name": "mentor_note",
                "fieldType": "string",
                "value": None,
            },
        },
    },
    "createdAt": "2026-03-01T00:00:00Z",
    "lastModifiedAt": "2026-03-01T00:00:00Z",
}
PAGE = {"page": 1, "pageSize": 100}
SORT_INFO = {"sortBy": "lastModifiedAt", "sortOrder": "desc"}


def wire(model: Any) -> dict[str, Any]:
    """The wire recipe: camelCase keys, unset properties omitted, explicit nulls kept."""
    return model.model_dump(mode="json", by_alias=True, exclude_unset=True)


def scholarship_year(award: TypedAward) -> int | None:
    recipient = award.recipient_individual
    if recipient is None or recipient.custom_fields is None:
        return None
    field = recipient.custom_fields.scholarship_year
    if field is None:
        return None
    assert_type(field.value, int)
    return field.value


def bare_defaults() -> None:
    """Bare models default all the way down to the untyped custom-field map."""
    response = AwardResponse.model_validate(
        {"status": 200, "message": "Success", "data": AWARD}
    )
    assert_type(response.data, AwardBase)
    recipient = response.data.recipient_individual
    assert_type(recipient, Optional[AwdRecipientIndividual])
    assert recipient is not None and recipient.custom_fields is not None
    assert_type(recipient.custom_fields, dict[str, CustomField])
    entry = recipient.custom_fields["scholarshipYear"]
    assert_type(entry, CustomField)
    assert entry.value == 2026
    assert wire(response)["data"] == AWARD


def typed_award() -> None:
    award = TypedAward.model_validate(AWARD)
    recipient = award.recipient_individual
    assert recipient is not None
    assert_type(recipient.custom_fields, Optional[RecipientFields])
    assert scholarship_year(award) == 2026
    assert recipient.custom_fields is not None
    assert recipient.custom_fields.model_extra is not None
    assert "mentor_note" in recipient.custom_fields.model_extra
    assert wire(award) == AWARD


def typed_responses() -> None:
    get = AwardResponse[TypedAward].model_validate(
        {"status": 200, "message": "Success", "data": AWARD}
    )
    assert_type(get.data, TypedAward)
    assert scholarship_year(get.data) == 2026

    listed = AwardsListResponse[TypedAward].model_validate(
        {"status": 200, "message": "Success", "items": [AWARD], "paginationInfo": PAGE}
    )
    assert_type(listed.items, list[TypedAward])
    assert [scholarship_year(a) for a in listed.items] == [2026]

    sorted_ = AwardsSortedResponse[TypedAward].model_validate(
        {**wire(listed), "sortInfo": SORT_INFO}
    )
    assert_type(sorted_.items[0], TypedAward)

    searched = AwardsFilteredResponse[TypedAward].model_validate(
        {**wire(sorted_), "filterInfo": {"filters": {}}}
    )
    assert_type(searched.items[0], TypedAward)
    assert scholarship_year(searched.items[0]) == 2026


def invalid_values_are_rejected() -> None:
    from pydantic import ValidationError

    wrong_type = copy.deepcopy(AWARD)
    wrong_type["recipientIndividual"]["customFields"]["scholarshipYear"][
        "value"
    ] = "2026-27"
    root_fields = {**AWARD, "customFields": {}}

    AwardBase.model_validate(wrong_type)  # untyped: any value
    for payload in (wrong_type, root_fields):
        try:
            TypedAward.model_validate(payload)
        except ValidationError:
            continue
        raise AssertionError("expected a ValidationError")

    # An explicit null on an optional property reads as omitted.
    null_parent = TypedAward.model_validate({**AWARD, "parent": None})
    assert "parent" not in wire(null_parent)


def main() -> None:
    bare_defaults()
    typed_award()
    typed_responses()
    invalid_values_are_rejected()
    print("typed awards: OK")


if __name__ == "__main__":
    main()
