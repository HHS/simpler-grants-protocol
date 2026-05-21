# This file is auto-generated. Do not edit it manually — it will be overwritten
# the next time `python -m common_grants_sdk.extensions.generate` is run.
from __future__ import annotations

from common_grants_sdk.extensions import Plugin, inject_transforms
from .cg_config import config
from .generated import schemas

schemas = inject_transforms(config, schemas)

grants_gov = Plugin(
    schemas=schemas,
    extensions=config.extensions,
    meta=config.meta,
)

__all__ = ["grants_gov", "schemas"]
