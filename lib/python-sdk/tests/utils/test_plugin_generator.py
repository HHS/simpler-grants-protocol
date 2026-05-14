from __future__ import annotations

import importlib
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import get_type_hints

import pytest

from common_grants_sdk import merge_extensions, define_plugin
from common_grants_sdk.extensions import CustomFieldSpec
from common_grants_sdk.extensions import PluginConfig
from common_grants_sdk.schemas.pydantic.fields import CustomFieldType


def _sdk_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _env_with_sdk_pythonpath() -> dict[str, str]:
    env = os.environ.copy()
    sdk_root = str(_sdk_root())
    existing = env.get("PYTHONPATH")
    env["PYTHONPATH"] = f"{sdk_root}{os.pathsep}{existing}" if existing else sdk_root
    return env


def test_define_plugin_returns_config_with_extensions():
    from common_grants_sdk.extensions.types import (
        PluginExtensions,
        PluginExtensionsSchema,
    )

    ext = PluginExtensions(
        schemas={
            "Opportunity": PluginExtensionsSchema(
                custom_fields={
                    "program_area": CustomFieldSpec(
                        field_type=CustomFieldType.STRING,
                        description="Grant category",
                    )
                }
            )
        }
    )
    config = define_plugin(extensions=ext)

    assert isinstance(config, PluginConfig)
    assert config.extensions is ext


def test_merge_extensions_merges_extensions():
    from common_grants_sdk.extensions.types import (
        PluginExtensions,
        PluginExtensionsSchema,
    )

    one = PluginExtensions(
        schemas={
            "Opportunity": PluginExtensionsSchema(
                custom_fields={"program_area": CustomFieldSpec(field_type="string")}
            )
        }
    )
    two = PluginExtensions(
        schemas={
            "Opportunity": PluginExtensionsSchema(
                custom_fields={"eligibility_type": CustomFieldSpec(field_type="array")}
            )
        }
    )

    merged = merge_extensions([one, two], on_conflict="error")

    fields = merged.schemas["Opportunity"].custom_fields
    assert set(fields.keys()) == {"program_area", "eligibility_type"}


def test_generate_cli_emits_plugin_and_typed_models(tmp_path: Path):
    plugins_dir = tmp_path / "plugins"
    plugins_dir.mkdir()
    (plugins_dir / "__init__.py").write_text("", encoding="utf-8")

    plugin_dir = plugins_dir / "combined"
    plugin_dir.mkdir()
    (plugin_dir / "cg_config.py").write_text(
        "\n".join(
            [
                "from common_grants_sdk import define_plugin",
                "from common_grants_sdk.extensions import CustomFieldSpec",
                "from common_grants_sdk.extensions.types import PluginExtensions, PluginExtensionsSchema",
                "",
                "config = define_plugin(",
                "    extensions=PluginExtensions(",
                "        schemas={",
                '            "Opportunity": PluginExtensionsSchema(',
                "                custom_fields={",
                '                    "program_area": CustomFieldSpec(',
                '                        field_type="string",',
                '                        description="Program area",',
                "                    ),",
                '                    "eligibility_type": CustomFieldSpec(',
                '                        field_type="array",',
                '                        description="Types of eligible organizations",',
                "                    ),",
                "                },",
                "            )",
                "        }",
                "    ),",
                ")",
                "",
            ]
        ),
        encoding="utf-8",
    )

    env = _env_with_sdk_pythonpath()
    cmd = [sys.executable, "-m", "common_grants_sdk.extensions.generate"]
    run = subprocess.run(
        cmd,
        cwd=plugin_dir,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert run.returncode == 0, run.stderr

    assert (plugin_dir / "generated" / "__init__.py").exists()
    assert (plugin_dir / "generated" / "schemas.py").exists()
    assert (plugin_dir / "__init__.py").exists()

    sys.path.insert(0, str(tmp_path))
    try:
        combined_module = importlib.import_module("plugins.combined")
        combined = getattr(combined_module, "combined")
        opp_model = combined.generated_schemas.Opportunity

        type_hints = get_type_hints(opp_model, include_extras=False)
        assert "custom_fields" in type_hints

        payload = {
            "id": "573525f2-8e15-4405-83fb-e6523511d893",
            "title": "Test Opportunity",
            "status": {"value": "open"},
            "description": "Funding available for pilot projects",
            "createdAt": "2026-01-01T00:00:00Z",
            "lastModifiedAt": "2026-01-01T00:00:00Z",
            "customFields": {
                "program_area": {
                    "fieldType": "string",
                    "value": "Health",
                },
                "eligibility_type": {
                    "fieldType": "array",
                    "value": ["nonprofit", "city_government"],
                },
            },
        }

        opp = opp_model.model_validate(payload)

        assert opp.custom_fields is not None
        assert opp.custom_fields.program_area is not None
        assert opp.custom_fields.program_area.value == "Health"
        assert opp.custom_fields.eligibility_type is not None
        assert opp.custom_fields.eligibility_type.value == [
            "nonprofit",
            "city_government",
        ]
        assert combined.extensions is not None
        assert "Opportunity" in (combined.extensions.schemas or {})
    finally:
        sys.path.remove(str(tmp_path))


def test_generate_emits_import_for_pydantic_model_in_cg_config(tmp_path: Path):
    """spec.value set to a Pydantic model defined in cg_config.py should produce
    a ``from ..cg_config import <Model>`` line in the generated schemas.py."""
    plugin_dir = tmp_path / "my_plugin"
    plugin_dir.mkdir()
    (plugin_dir / "cg_config.py").write_text(
        "\n".join(
            [
                "from pydantic import BaseModel",
                "from common_grants_sdk import define_plugin",
                "from common_grants_sdk.extensions import CustomFieldSpec",
                "from common_grants_sdk.extensions.types import PluginExtensions, PluginExtensionsSchema",
                "",
                "class AgentInfo(BaseModel):",
                "    name: str",
                "    email: str",
                "",
                "config = define_plugin(",
                "    extensions=PluginExtensions(",
                "        schemas={",
                '            "Opportunity": PluginExtensionsSchema(',
                "                custom_fields={",
                '                    "point_of_contact": CustomFieldSpec(',
                '                        field_type="object",',
                "                        value=AgentInfo,",
                "                    ),",
                "                },",
                "            )",
                "        }",
                "    ),",
                ")",
                "",
            ]
        ),
        encoding="utf-8",
    )

    env = _env_with_sdk_pythonpath()
    run = subprocess.run(
        [sys.executable, "-m", "common_grants_sdk.extensions.generate"],
        cwd=plugin_dir,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert run.returncode == 0, run.stderr

    schemas_src = (plugin_dir / "generated" / "schemas.py").read_text(encoding="utf-8")
    assert "from ..cg_config import AgentInfo" in schemas_src
    assert "value: Optional[AgentInfo]" in schemas_src


def test_generate_emits_import_for_external_module_type(tmp_path: Path):
    """spec.value set to a type from a real importable module should produce
    a ``from <module> import <Type>`` line in the generated schemas.py."""
    plugin_dir = tmp_path / "my_plugin"
    plugin_dir.mkdir()
    (plugin_dir / "cg_config.py").write_text(
        "\n".join(
            [
                "from datetime import datetime",
                "from common_grants_sdk import define_plugin",
                "from common_grants_sdk.extensions import CustomFieldSpec",
                "from common_grants_sdk.extensions.types import PluginExtensions, PluginExtensionsSchema",
                "",
                "config = define_plugin(",
                "    extensions=PluginExtensions(",
                "        schemas={",
                '            "Opportunity": PluginExtensionsSchema(',
                "                custom_fields={",
                '                    "deadline": CustomFieldSpec(',
                '                        field_type="string",',
                "                        value=datetime,",
                "                    ),",
                "                },",
                "            )",
                "        }",
                "    ),",
                ")",
                "",
            ]
        ),
        encoding="utf-8",
    )

    env = _env_with_sdk_pythonpath()
    run = subprocess.run(
        [sys.executable, "-m", "common_grants_sdk.extensions.generate"],
        cwd=plugin_dir,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert run.returncode == 0, run.stderr

    schemas_src = (plugin_dir / "generated" / "schemas.py").read_text(encoding="utf-8")
    assert "from datetime import datetime" in schemas_src
    assert "value: Optional[datetime]" in schemas_src


def test_generate_auto_builds_transforms_from_mappings(tmp_path):
    """When cg_config has extensions.schemas[obj].mappings but no explicit schemas[obj],
    the generated __init__.py calls build_transforms() automatically."""
    plugin_dir = tmp_path / "plugins" / "auto_transform"
    plugin_dir.mkdir(parents=True)
    (plugin_dir / "__init__.py").write_text("", encoding="utf-8")

    (plugin_dir / "cg_config.py").write_text(
        "\n".join(
            [
                "from common_grants_sdk import define_plugin",
                "from common_grants_sdk.extensions.types import PluginExtensions, PluginExtensionsSchema, ObjectMappings",
                "",
                "config = define_plugin(",
                "    extensions=PluginExtensions(",
                "        schemas={",
                '            "Opportunity": PluginExtensionsSchema(',
                "                mappings=ObjectMappings(",
                '                    to_common={"title": {"field": "data.title"}},',
                "                    from_common={},",
                "                ),",
                "            )",
                "        }",
                "    ),",
                ")",
                "",
            ]
        ),
        encoding="utf-8",
    )

    from common_grants_sdk.extensions.generate import generate_plugin

    generate_plugin(plugin_dir)

    init_content = (plugin_dir / "__init__.py").read_text(encoding="utf-8")
    assert "build_transforms" in init_content
    assert 'config.extensions.schemas["Opportunity"].mappings.to_common' in init_content
    assert "_Opportunity_to_common" in init_content

    # Load the generated plugin and verify schemas are populated
    import importlib
    import sys

    # Remove any stale 'plugins' package from previous tests before inserting our path.
    for key in list(sys.modules.keys()):
        if key == "plugins" or key.startswith("plugins."):
            del sys.modules[key]

    sys.path.insert(0, str(tmp_path))
    try:
        mod = importlib.import_module("plugins.auto_transform")
        plugin = getattr(mod, "auto_transform")
        assert plugin.schemas is not None
        assert "Opportunity" in plugin.schemas
        assert plugin.schemas["Opportunity"].to_common is not None
    finally:
        if str(tmp_path) in sys.path:
            sys.path.remove(str(tmp_path))
        for key in list(sys.modules.keys()):
            if key == "plugins" or key.startswith("plugins."):
                del sys.modules[key]


@pytest.mark.skipif(shutil.which("pyright") is None, reason="pyright is not installed")
def test_generate_models_typecheck_with_pyright_strict(tmp_path: Path):
    plugins_dir = tmp_path / "plugins"
    plugins_dir.mkdir()
    (plugins_dir / "__init__.py").write_text("", encoding="utf-8")

    plugin_dir = plugins_dir / "combined"
    plugin_dir.mkdir()
    (plugin_dir / "cg_config.py").write_text(
        "\n".join(
            [
                "from common_grants_sdk import define_plugin",
                "from common_grants_sdk.extensions import CustomFieldSpec",
                "from common_grants_sdk.extensions.types import PluginExtensions, PluginExtensionsSchema",
                "",
                "config = define_plugin(",
                "    extensions=PluginExtensions(",
                "        schemas={",
                '            "Opportunity": PluginExtensionsSchema(',
                "                custom_fields={",
                '                    "eligibility_type": CustomFieldSpec(field_type="array"),',
                "                },",
                "            )",
                "        }",
                "    ),",
                ")",
                "",
            ]
        ),
        encoding="utf-8",
    )

    env = _env_with_sdk_pythonpath()
    run = subprocess.run(
        [sys.executable, "-m", "common_grants_sdk.extensions.generate"],
        cwd=plugin_dir,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert run.returncode == 0, run.stderr

    typecheck_file = tmp_path / "typecheck.py"
    typecheck_file.write_text(
        "\n".join(
            [
                "# pyright: strict",
                "from plugins.combined import combined",
                "",
                "payload = {",
                '    "id": "573525f2-8e15-4405-83fb-e6523511d893",',
                '    "title": "Typed Opportunity",',
                '    "status": {"value": "open"},',
                '    "description": "Typed custom fields",',
                '    "createdAt": "2026-01-01T00:00:00Z",',
                '    "lastModifiedAt": "2026-01-01T00:00:00Z",',
                '    "customFields": {"eligibility_type": {"fieldType": "array", "value": ["a"]}},',
                "}",
                "",
                "opp = combined.generated_schemas.Opportunity.model_validate(payload)",
                "if opp.custom_fields is not None and opp.custom_fields.eligibility_type is not None:",
                "    values = opp.custom_fields.eligibility_type.value",
                "    reveal_type(values)",
                "",
            ]
        ),
        encoding="utf-8",
    )

    env = _env_with_sdk_pythonpath()
    env["PYTHONPATH"] = f"{tmp_path}{os.pathsep}{env['PYTHONPATH']}"
    pyright = subprocess.run(
        ["pyright", str(typecheck_file)],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert pyright.returncode == 0, pyright.stdout + "\n" + pyright.stderr
    assert 'Type of "values" is "list[Any] | None"' in pyright.stdout


def test_generate_get_client_is_memoized(tmp_path):
    """get_client in generated __init__.py is wrapped with lru_cache."""
    from common_grants_sdk.extensions.generate import generate_plugin

    plugin_dir = tmp_path / "plugins" / "memoized"
    plugin_dir.mkdir(parents=True)
    (plugin_dir / "__init__.py").write_text("", encoding="utf-8")

    (plugin_dir / "cg_config.py").write_text(
        "\n".join(
            [
                "from common_grants_sdk import define_plugin",
                "from common_grants_sdk.extensions.types import PluginExtensions",
                "",
                "def _get_client(cfg):",
                "    # cfg is a frozenset of items, convert back to dict",
                "    cfg_dict = dict(cfg) if isinstance(cfg, frozenset) else cfg",
                "    # returns a new dict each call — lru_cache makes it return the same one",
                "    return {'host': cfg_dict.get('host', 'localhost')}",
                "",
                "config = define_plugin(",
                "    extensions=PluginExtensions(),",
                "    get_client=_get_client,",
                ")",
                "",
            ]
        ),
        encoding="utf-8",
    )

    generate_plugin(plugin_dir)

    init_content = (plugin_dir / "__init__.py").read_text(encoding="utf-8")
    assert "functools.lru_cache" in init_content

    sys.path.insert(0, str(tmp_path))
    try:
        mod = importlib.import_module("plugins.memoized")
        plugin = getattr(mod, "memoized")
        assert plugin.get_client is not None
        result_a = plugin.get_client(frozenset({"host": "example.com"}.items()))
        result_b = plugin.get_client(frozenset({"host": "example.com"}.items()))
        assert (
            result_a is result_b
        ), "lru_cache should return the same instance for the same args"
    finally:
        sys.path.remove(str(tmp_path))
        for key in list(sys.modules.keys()):
            if "memoized" in key:
                del sys.modules[key]
