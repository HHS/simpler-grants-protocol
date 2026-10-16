"""Inventory of the emitted Core v0.5 award contract, mapped to the Python models.

The closure is recomputed from ``website/public/schemas/yaml/AwardBase.yaml``, so a
schema added to the emitted contract fails here until it is classified. Every
object schema's property names, required set and sealing are compared with the
Python model's wire keys; enums and identifier patterns are compared value for
value. Wire validity of serialized output is checked separately, by the AJV oracle
(``make check-award-schema``).
"""

from functools import cache
from pathlib import Path
from typing import Any, get_args
from uuid import UUID

import pytest
import yaml
from pydantic import BaseModel

from common_grants_sdk.schemas import (
    AppRef,
    AwardBase,
    AwdDefaultFilters,
    AwdFilters,
    AwdFunding,
    AwdIdFain,
    AwdIds,
    AwdRecipientIndividual,
    AwdRef,
    AwdSortBy,
    AwdSorting,
    AwdStatus,
    AwdStatusOptions,
    AwdTimeline,
    CustomField,
    CustomFieldType,
    DateRangeEvent,
    DecimalString,
    Duns,
    EmployerTaxId,
    Event,
    EventBase,
    EventType,
    Identifier,
    IdentifierCollection,
    IdentifierRegistry,
    IdentifierStatus,
    IdentifierValue,
    ISODate,
    ISOTime,
    Money,
    Name,
    OppIdAln,
    OppIdFon,
    OppIds,
    OppRef,
    OrgIdDuns,
    OrgIdEin,
    OrgIds,
    OrgIdUei,
    OrgRef,
    OrgRefCollection,
    OtherEvent,
    SamUEI,
    SingleDateEvent,
    SystemId,
)

SCHEMA_DIR = (
    Path(__file__).resolve().parents[4] / "website" / "public" / "schemas" / "yaml"
)

# Emitted $id -> Python type. Records (``$defs/Record*``) are ``dict[str, T]`` fields
# and the identifier ``registry`` / ``allIds`` items are IdentifierRegistry and
# IdentifierValue; both are checked below rather than listed.
AWARD_CLOSURE: dict[str, Any] = {
    # Award models
    "AwardBase.yaml": AwardBase,
    "AwdFunding.yaml": AwdFunding,
    "AwdIdFain.yaml": AwdIdFain,
    "AwdIds.yaml": AwdIds,
    "AwdRecipientIndividual.yaml": AwdRecipientIndividual,
    "AwdRef.yaml": AwdRef,
    "AwdStatus.yaml": AwdStatus,
    "AwdStatusOptions.yaml": AwdStatusOptions,
    "AwdTimeline.yaml": AwdTimeline,
    # Shared references and identifiers
    "AppRef.yaml": AppRef,
    "OppRef.yaml": OppRef,
    "OrgRef.yaml": OrgRef,
    "OrgRefCollection.yaml": OrgRefCollection,
    "Identifier.yaml": Identifier,
    "IdentifierCollection.yaml": IdentifierCollection,
    "IdentifierStatus.yaml": IdentifierStatus,
    "SystemId.yaml": SystemId,
    "OppIds.yaml": OppIds,
    "OppIdFon.yaml": OppIdFon,
    "OppIdAln.yaml": OppIdAln,
    "OrgIds.yaml": OrgIds,
    "OrgIdEin.yaml": OrgIdEin,
    "OrgIdUei.yaml": OrgIdUei,
    "OrgIdDuns.yaml": OrgIdDuns,
    # Shared fields
    "CustomField.yaml": CustomField,
    "CustomFieldType.yaml": CustomFieldType,
    "Event.yaml": Event,
    "EventBase.yaml": EventBase,
    "EventType.yaml": EventType,
    "SingleDateEvent.yaml": SingleDateEvent,
    "DateRangeEvent.yaml": DateRangeEvent,
    "OtherEvent.yaml": OtherEvent,
    "Money.yaml": Money,
    "Name.yaml": Name,
    # Scalars
    "decimalString.yaml": DecimalString,
    "duns.yaml": Duns,
    "employerTaxId.yaml": EmployerTaxId,
    "isoDate.yaml": ISODate,
    "isoTime.yaml": ISOTime,
    "samUEI.yaml": SamUEI,
    "uuid.yaml": UUID,
}
# Award search schemas emitted alongside the models. Their filter values are
# award-local sealed compositions; the AJV oracle checks those instances.
SEARCH_SCHEMAS: dict[str, Any] = {
    "AwdDefaultFilters.yaml": AwdDefaultFilters,
    "AwdFilters.yaml": AwdFilters,
    "AwdSorting.yaml": AwdSorting,
    "AwdSortBy.yaml": AwdSortBy,
}
IDENTIFIERS = [
    Identifier,
    SystemId,
    OrgIdEin,
    OrgIdUei,
    OrgIdDuns,
    OppIdFon,
    OppIdAln,
    AwdIdFain,
]

# Python defaults the event discriminator for construction, but always emits it.
DEFAULTED_BUT_EMITTED = {"eventType"}
# Core leaves EventBase unsealed for its subclasses to extend; in Python the base
# carries the subclasses' sealing and is never used on its own.
SEALED_BASES = {"EventBase.yaml"}


@cache
def emitted(schema_id: str) -> dict[str, Any]:
    return yaml.safe_load((SCHEMA_DIR / schema_id).read_text())


def external_refs(node: Any) -> set[str]:
    if isinstance(node, dict):
        refs = {node["$ref"]} if isinstance(node.get("$ref"), str) else set()
        refs = {r for r in refs if not r.startswith("#")}
        return refs.union(*(external_refs(v) for v in node.values()))
    if isinstance(node, list):
        return set().union(*(external_refs(v) for v in node))
    return set()


def closure(root: str) -> set[str]:
    seen: set[str] = set()
    todo = [root]
    while todo:
        schema_id = todo.pop()
        if schema_id not in seen:
            seen.add(schema_id)
            todo.extend(external_refs(emitted(schema_id)))
    return seen


def emitted_shape(schema: dict[str, Any]) -> tuple[set[str], set[str]]:
    """Property names and required names, including ``allOf`` bases."""
    props = set(schema.get("properties", {}))
    required = set(schema.get("required", []))
    for part in schema.get("allOf", []):
        if part["$ref"].startswith("#"):  # a local record: open keys, no named ones
            continue
        base_props, base_required = emitted_shape(emitted(part["$ref"]))
        props |= base_props
        required |= base_required
    return props, required


def wire_shape(model: type[BaseModel]) -> tuple[set[str], set[str]]:
    keys, required = set(), set()
    for name, info in model.model_fields.items():
        key = info.serialization_alias or info.alias or name
        keys.add(key)
        if info.is_required() or key in DEFAULTED_BUT_EMITTED:
            required.add(key)
    return keys, required


def test_core_baseline_is_v0_5():
    assert (SCHEMA_DIR.parents[1] / "openapi" / "openapi.0.5.0.yaml").exists()
    assert not list((SCHEMA_DIR.parents[1] / "openapi").glob("openapi.0.[6-9]*.yaml"))


def test_inventory_classifies_the_whole_award_closure():
    assert closure("AwardBase.yaml") == set(AWARD_CLOSURE)


MODELS = {
    k: v
    for k, v in {**AWARD_CLOSURE, **SEARCH_SCHEMAS}.items()
    if isinstance(v, type) and issubclass(v, BaseModel)
}


@pytest.mark.parametrize(("schema_id", "model"), MODELS.items(), ids=MODELS.keys())
def test_model_properties_and_required_match_the_emitted_schema(schema_id, model):
    assert wire_shape(model) == emitted_shape(emitted(schema_id))


@pytest.mark.parametrize(("schema_id", "model"), MODELS.items(), ids=MODELS.keys())
def test_model_sealing_matches_the_emitted_schema(schema_id, model):
    schema = emitted(schema_id)
    sealed = schema.get("unevaluatedProperties") == {"not": {}}
    # A sealed schema that spreads in a local record still accepts that record's keys.
    spreads_record = any(p["$ref"].startswith("#") for p in schema.get("allOf", []))
    expected = "forbid" if sealed and not spreads_record else "allow"
    if schema_id in SEALED_BASES:
        expected = "forbid"

    assert model.model_config.get("extra") == expected


ENUMS = {
    k: v
    for k, v in {**AWARD_CLOSURE, **SEARCH_SCHEMAS}.items()
    if isinstance(v, type)
    and not issubclass(v, BaseModel)
    and hasattr(v, "__members__")
}


@pytest.mark.parametrize(("schema_id", "enum"), ENUMS.items(), ids=ENUMS.keys())
def test_enum_values_match_the_emitted_schema(schema_id, enum):
    assert [m.value for m in enum] == emitted(schema_id)["enum"]


@pytest.mark.parametrize(
    "schema_id", ["duns.yaml", "employerTaxId.yaml", "samUEI.yaml"]
)
def test_identifier_value_patterns_match_the_emitted_schema(schema_id):
    (constraints,) = get_args(AWARD_CLOSURE[schema_id])[1:]
    assert constraints.pattern == emitted(schema_id)["pattern"]


@pytest.mark.parametrize("model", IDENTIFIERS, ids=lambda m: m.__name__)
def test_identifier_inline_objects_match_the_emitted_schema(model):
    schema = emitted(f"{model.__name__}.yaml")
    registry = schema["properties"]["registry"]
    history = schema["properties"]["allIds"]["items"]

    assert wire_shape(IdentifierRegistry) == emitted_shape(registry)
    assert wire_shape(IdentifierValue) == emitted_shape(history)
    assert (
        registry["unevaluatedProperties"]
        == history["unevaluatedProperties"]
        == {"not": {}}
    )
    code = registry["properties"]["code"].get("const")
    registry_model = model.model_fields["registry"].annotation
    code_type = get_args(registry_model)[0].model_fields["code"].annotation
    assert (get_args(get_args(code_type)[0]) or (None,))[0] == code
