# This file is auto-generated. Do not edit it manually — it will be overwritten
# the next time `python -m common_grants_sdk.extensions.generate` is run.
from __future__ import annotations

from common_grants_sdk.extensions import Plugin
from .cg_config import plugin
from .generated import schemas

grants_gov = Plugin(
    extensions=plugin.extensions,
    schemas=schemas,
)

__all__ = ["grants_gov", "schemas"]
