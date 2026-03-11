"""Generate typed plugin schema models from a plugin config."""

from __future__ import annotations

import argparse
import importlib.util
import keyword
import re
from pathlib import Path
from typing import Iterable

from common_grants_sdk.extensions import CustomFieldSpec, SchemaExtensions
from common_grants_sdk.plugin import PluginConfig
from common_grants_sdk.schemas.pydantic.fields import CustomFieldType
from common_grants_sdk.utils.json import snake

MODEL_BASE_CLASS: dict[str, str] = {
    "Opportunity": "OpportunityBase",
}

FIELD_TYPE_DEFAULT_ANNOTATION: dict[CustomFieldType, str] = {
    CustomFieldType.STRING: "str",
    CustomFieldType.NUMBER: "float",
    CustomFieldType.INTEGER: "int",
    CustomFieldType.BOOLEAN: "bool",
    CustomFieldType.OBJECT: "dict[str, Any]",
    CustomFieldType.ARRAY: "list[str]",
}


def _load_config(config_path: Path) -> PluginConfig:
    spec = importlib.util.spec_from_file_location(
        f"cg_plugin_config_{config_path.parent.name}", config_path
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load plugin config from {config_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    config = getattr(module, "config", None)
    if config is None or not hasattr(config, "extensions"):
        raise RuntimeError(
            'Plugin config must expose a "config" variable created by define_plugin()'
        )
    return config


def _normalize_identifier(name: str) -> str:
    ident = re.sub(r"\W+", "_", name.strip())
    if not ident:
        ident = "plugin"
    if ident[0].isdigit():
        ident = f"plugin_{ident}"
    if keyword.iskeyword(ident):
        ident = f"{ident}_plugin"
    return ident


def _to_pascal(value: str) -> str:
    parts = re.split(r"[^A-Za-z0-9]+", value)
    return "".join(p[:1].upper() + p[1:] for p in parts if p) or "Field"


def _resolve_field_type(field_type: CustomFieldType | str) -> CustomFieldType:
    if isinstance(field_type, CustomFieldType):
        return field_type
    return CustomFieldType(field_type)


def _annotation_for_spec(spec: CustomFieldSpec, resolved_type: CustomFieldType) -> str:
    if spec.value is None:
        return FIELD_TYPE_DEFAULT_ANNOTATION[resolved_type]

    value = spec.value
    if isinstance(value, type):
        if value.__module__ == "builtins":
            return value.__name__
        if value.__module__.startswith("common_grants_sdk"):
            return value.__name__
        return "Any"

    rendered = str(value).replace("typing.", "")
    if rendered in {
        "<class 'str'>",
        "<class 'int'>",
        "<class 'float'>",
        "<class 'bool'>",
    }:
        return rendered.split("'")[1]
    return rendered or "Any"


def _model_blocks(extensions: SchemaExtensions) -> Iterable[str]:
    for model_name, fields in extensions.items():
        if model_name not in MODEL_BASE_CLASS:
            raise ValueError(
                f'Generator does not support model "{model_name}". '
                f"Supported models: {sorted(MODEL_BASE_CLASS)}"
            )

        custom_field_classes: list[str] = []
        custom_fields_attrs: list[str] = []

        for field_key, spec in fields.items():
            resolved_type = _resolve_field_type(spec.field_type)
            field_cls_name = f"{model_name}{_to_pascal(field_key)}CustomField"
            attr_name = _normalize_identifier(snake(field_key))
            value_annotation = _annotation_for_spec(
                spec=spec, resolved_type=resolved_type
            )
            field_name_default = spec.name or field_key
            description_default = repr(spec.description) if spec.description else "None"

            custom_field_classes.append(
                "\n".join(
                    [
                        f"class {field_cls_name}(CustomField):",
                        "    model_config = ConfigDict(populate_by_name=True)",
                        "    field_type: CustomFieldType = Field(",
                        f"        default=CustomFieldType.{resolved_type.name},",
                        '        alias="fieldType",',
                        "    )",
                        f"    name: str = Field(default={field_name_default!r})",
                        f"    description: Optional[str] = Field(default={description_default})",
                        f"    value: Optional[{value_annotation}] = None",
                    ]
                )
            )
            custom_fields_attrs.append(
                "\n".join(
                    [
                        f"    {attr_name}: Optional[{field_cls_name}] = Field(",
                        "        default=None,",
                        f"        alias={field_key!r},",
                        "    )",
                    ]
                )
            )

        custom_fields_model_name = f"{model_name}CustomFields"
        model_name_with_extensions = model_name
        base_class = MODEL_BASE_CLASS[model_name]

        yield "\n\n".join(custom_field_classes)
        yield "\n".join(
            [
                f"class {custom_fields_model_name}(CommonGrantsBaseModel):",
                "    model_config = ConfigDict(populate_by_name=True)",
                *custom_fields_attrs,
            ]
        )
        yield "\n".join(
            [
                f"class {model_name_with_extensions}({base_class}):",
                "    model_config = ConfigDict(populate_by_name=True)",
                f"    custom_fields: Optional[{custom_fields_model_name}] = Field(",
                "        default=None,",
                '        alias="customFields",',
                "    )",
            ]
        )


def _render_schemas_py(extensions: SchemaExtensions) -> str:
    model_names = list(extensions.keys())
    blocks = "\n\n\n".join(_model_blocks(extensions))
    schema_assignments = "\n".join(
        [f"        self.{name} = {name}" for name in model_names] or ["        pass"]
    )
    all_exports = ", ".join([f'"{name}"' for name in model_names] + ['"schemas"'])

    return "\n".join(
        [
            "from __future__ import annotations",
            "",
            "from typing import Any, Optional",
            "",
            "from pydantic import ConfigDict, Field",
            "",
            "from common_grants_sdk.schemas.pydantic.base import CommonGrantsBaseModel",
            "from common_grants_sdk.schemas.pydantic.fields import CustomField, CustomFieldType",
            "from common_grants_sdk.schemas.pydantic.models import OpportunityBase",
            "",
            blocks,
            "",
            "class _Schemas:",
            "    def __init__(self) -> None:",
            schema_assignments,
            "",
            "schemas = _Schemas()",
            "",
            f"__all__ = [{all_exports}]",
            "",
        ]
    )


def _render_generated_init_py() -> str:
    return "\n".join(
        [
            "from .schemas import schemas",
            "",
            '__all__ = ["schemas"]',
            "",
        ]
    )


def _render_plugin_init_py(plugin_variable_name: str) -> str:
    return "\n".join(
        [
            "from __future__ import annotations",
            "",
            "import importlib.util",
            "from pathlib import Path",
            "",
            "from common_grants_sdk.plugin import Plugin",
            "from .generated import schemas",
            "",
            "",
            "def _load_config():",
            '    config_path = Path(__file__).with_name("cg.config.py")',
            '    spec = importlib.util.spec_from_file_location(f"{__name__}.cg_config", config_path)',
            "    if spec is None or spec.loader is None:",
            '        raise RuntimeError(f"Unable to load plugin config from {config_path}")',
            "    module = importlib.util.module_from_spec(spec)",
            "    spec.loader.exec_module(module)",
            '    config = getattr(module, "config", None)',
            "    if config is None or not hasattr(config, 'extensions'):",
            "        raise RuntimeError('Plugin config must define \"config = define_plugin(...)\"')",
            "    return config",
            "",
            f"{plugin_variable_name} = Plugin(",
            "    extensions=_load_config().extensions,",
            "    schemas=schemas,",
            ")",
            "",
            f'__all__ = ["{plugin_variable_name}", "schemas"]',
            "",
        ]
    )


def generate_plugin(plugin_dir: Path) -> Path:
    plugin_dir = plugin_dir.resolve()
    config_path = plugin_dir / "cg.config.py"
    if not config_path.exists():
        raise FileNotFoundError(f"Could not find config file: {config_path}")

    config = _load_config(config_path)
    generated_dir = plugin_dir / "generated"
    generated_dir.mkdir(parents=True, exist_ok=True)

    schemas_py = generated_dir / "schemas.py"
    init_generated_py = generated_dir / "__init__.py"
    root_init_py = plugin_dir / "__init__.py"

    schemas_py.write_text(_render_schemas_py(config.extensions), encoding="utf-8")
    init_generated_py.write_text(_render_generated_init_py(), encoding="utf-8")

    plugin_variable_name = _normalize_identifier(plugin_dir.name)
    root_init_py.write_text(
        _render_plugin_init_py(plugin_variable_name), encoding="utf-8"
    )

    return generated_dir


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m common_grants_sdk.generate",
        description="Generate typed plugin schemas from cg.config.py",
    )
    parser.add_argument(
        "--plugin",
        default=".",
        help="Path to plugin directory containing cg.config.py (default: current directory)",
    )
    args = parser.parse_args(argv)

    generated_dir = generate_plugin(Path(args.plugin))
    print(f"Generated plugin schemas at {generated_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
