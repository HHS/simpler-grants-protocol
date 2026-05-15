# This file is auto-generated. Do not edit it manually — it will be overwritten
# the next time `python -m common_grants_sdk.extensions.generate` is run.
from __future__ import annotations

from common_grants_sdk.extensions import Plugin
from common_grants_sdk.extensions.types import ObjectSchemas
from .cg_config import config
from .generated import schemas

assert config.schemas is not None
assert config.schemas["Opportunity"].to_common is not None
assert config.schemas["Opportunity"].from_common is not None

grants_gov = Plugin(
    generated_schemas=schemas,
    extensions=config.extensions,
    meta=config.meta,
    get_client=None,
    schemas={
        "Opportunity": ObjectSchemas(
            native=(config.schemas["Opportunity"].native or dict),
            common=schemas.Opportunity,
            to_common=config.schemas["Opportunity"].to_common,
            from_common=config.schemas["Opportunity"].from_common,
        ),
    },
    filters=config.filters,
)

__all__ = ["grants_gov", "schemas"]
