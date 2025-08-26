"""CommonGrants marshmallow schemas package."""

from .generated_schema import *

__all__ = [name for name in dir() if name.endswith("Schema") and not name.startswith("_")]
