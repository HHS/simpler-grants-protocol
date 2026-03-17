from __future__ import annotations

from common_grants_sdk.extensions import Plugin
from .cg_config import config
from .generated import schemas


opportunity_extensions = Plugin(
    extensions=config.extensions,
    schemas=schemas,
)

__all__ = ["opportunity_extensions", "schemas"]
