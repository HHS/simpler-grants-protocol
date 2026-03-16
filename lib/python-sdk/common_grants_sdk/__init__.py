"""
CommonGrants Python SDK

A Python implementation of the CommonGrants protocol.
"""

__version__ = "0.1.0"

from . import schemas
from .client import Auth, Client, Config
from .extensions import merge_extensions
from .plugin import Plugin, PluginConfig, define_plugin

__all__ = [
    "schemas",
    "Client",
    "Auth",
    "Config",
    "Plugin",
    "PluginConfig",
    "merge_extensions",
    "define_plugin",
]
