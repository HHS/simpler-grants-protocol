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
from common_grants_sdk.plugin import PluginConfig
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
    extensions = {
        "Opportunity": {
            "program_area": CustomFieldSpec(
                field_type=CustomFieldType.STRING,
                description="Grant category",
            )
        }
    }
    config = define_plugin(extensions)

    assert isinstance(config, PluginConfig)
    assert config.extensions == extensions


def test_merge_extensions_merges_extensions():
    one = {"Opportunity": {"program_area": CustomFieldSpec(field_type="string")}}
    two = {"Opportunity": {"eligibility_type": CustomFieldSpec(field_type="array")}}

    merged = merge_extensions([one, two], on_conflict="error")

    assert set(merged["Opportunity"].keys()) == {"program_area", "eligibility_type"}


def test_generate_cli_emits_plugin_and_typed_models(tmp_path: Path):
    plugins_dir = tmp_path / "plugins"
    plugins_dir.mkdir()
    (plugins_dir / "__init__.py").write_text("", encoding="utf-8")

    plugin_dir = plugins_dir / "combined"
    plugin_dir.mkdir()
    (plugin_dir / "cg.config.py").write_text(
        "\n".join(
            [
                "from common_grants_sdk import merge_extensions, define_plugin",
                "from common_grants_sdk.types import SchemaExtensions, CustomFieldSpec",
                "",
                "local_extensions: SchemaExtensions = {",
                '    "Opportunity": {',
                '        "program_area": CustomFieldSpec(',
                '            field_type="string",',
                '            description="Program area",',
                "        ),",
                '        "eligibility_type": CustomFieldSpec(',
                '            field_type="array",',
                '            description="Types of eligible organizations",',
                "        ),",
                "    },",
                "}",
                "",
                "config = define_plugin(merge_extensions([local_extensions], on_conflict='error'))",
                "",
            ]
        ),
        encoding="utf-8",
    )

    env = _env_with_sdk_pythonpath()
    cmd = [sys.executable, "-m", "common_grants_sdk.generate"]
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
        opp_model = combined.schemas.Opportunity

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
        assert "Opportunity" in combined.extensions
    finally:
        sys.path.remove(str(tmp_path))


@pytest.mark.skipif(shutil.which("pyright") is None, reason="pyright is not installed")
def test_generate_models_typecheck_with_pyright_strict(tmp_path: Path):
    plugins_dir = tmp_path / "plugins"
    plugins_dir.mkdir()
    (plugins_dir / "__init__.py").write_text("", encoding="utf-8")

    plugin_dir = plugins_dir / "combined"
    plugin_dir.mkdir()
    (plugin_dir / "cg.config.py").write_text(
        "\n".join(
            [
                "from common_grants_sdk import define_plugin",
                "from common_grants_sdk.types import SchemaExtensions, CustomFieldSpec",
                "",
                "extensions: SchemaExtensions = {",
                '    "Opportunity": {',
                '        "eligibility_type": CustomFieldSpec(field_type="array"),',
                "    },",
                "}",
                "config = define_plugin(extensions)",
                "",
            ]
        ),
        encoding="utf-8",
    )

    env = _env_with_sdk_pythonpath()
    run = subprocess.run(
        [sys.executable, "-m", "common_grants_sdk.generate"],
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
                "opp = combined.schemas.Opportunity.model_validate(payload)",
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
    assert 'Type of "values" is "list[str] | None"' in pyright.stdout
