from __future__ import annotations

from common_grants_sdk.extensions import Plugin
from .cg_config import config
from .generated import schemas

grants_gov = Plugin(
    extensions=config.extensions,
    schemas=schemas,
)

__all__ = ["grants_gov", "schemas"]
