# This file is auto-generated. Do not edit it manually — it will be overwritten
# the next time `python -m common_grants_sdk.extensions.generate` is run.
from __future__ import annotations

from common_grants_sdk.extensions import Plugin
from .cg_config import config
from .generated import schemas

if config.schemas is None:
    raise ValueError("config.schemas is required when explicit transforms are declared")

if config.schemas["Opportunity"].to_common is None:
    raise ValueError("Plugin object 'Opportunity': to_common callable is required")
if config.schemas["Opportunity"].from_common is None:
    raise ValueError("Plugin object 'Opportunity': from_common callable is required")
schemas.Opportunity.native = config.schemas["Opportunity"].native or dict
schemas.Opportunity.to_common = config.schemas["Opportunity"].to_common
schemas.Opportunity.from_common = config.schemas["Opportunity"].from_common

grants_gov = Plugin(
    schemas=schemas,
    extensions=config.extensions,
    meta=config.meta,
)

__all__ = ["grants_gov", "schemas"]
