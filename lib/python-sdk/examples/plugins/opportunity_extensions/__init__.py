# This file is auto-generated. Do not edit it manually — it will be overwritten
# the next time `python -m common_grants_sdk.extensions.generate` is run.
from __future__ import annotations

from common_grants_sdk.extensions import Plugin
from .cg_config import config
from .generated import schemas

opportunity_extensions = Plugin(
    generated_schemas=schemas,
    extensions=config.extensions,
    meta=config.meta,
    get_client=None,
    schemas=None,
)

__all__ = ["opportunity_extensions", "schemas"]
