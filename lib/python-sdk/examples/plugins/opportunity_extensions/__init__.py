from __future__ import annotations

import importlib.util
from pathlib import Path

from common_grants_sdk.plugin import Plugin
from .generated import schemas


def _load_config():
    config_path = Path(__file__).with_name("cg.config.py")
    spec = importlib.util.spec_from_file_location(f"{__name__}.cg_config", config_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load plugin config from {config_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    config = getattr(module, "config", None)
    if config is None or not hasattr(config, "extensions"):
        raise RuntimeError('Plugin config must define "config = define_plugin(...)"')
    return config


opportunity_extensions = Plugin(
    extensions=_load_config().extensions,
    schemas=schemas,
)

__all__ = ["opportunity_extensions", "schemas"]
