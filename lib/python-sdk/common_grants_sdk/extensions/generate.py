"""Generate typed plugin schema models from a plugin config."""

from __future__ import annotations

import argparse
import importlib.util
import keyword
import re
from pathlib import Path
from typing import Iterable

from common_grants_sdk.schemas.pydantic.fields import CustomFieldType
from common_grants_sdk.utils.json import snake
from .plugin import PluginConfig
from .specs import CustomFieldSpec

# Maps extensible model names to the SDK base class they extend in generated code.
# Add an entry here when a new model gains customFields support.
MODEL_BASE_CLASS: dict[str, str] = {
    "Opportunity": "OpportunityBase",
}

# Default Python type annotation strings written into generated source for each field type.
# ARRAY and OBJECT use parameterized forms (list[Any], dict[str, Any]) as practical defaults;
# callers can override these by setting spec.value to a more specific type.
FIELD_TYPE_DEFAULT_ANNOTATION: dict[CustomFieldType, str] = {
    CustomFieldType.STRING: "str",
    CustomFieldType.NUMBER: "float",
    CustomFieldType.INTEGER: "int",
    CustomFieldType.BOOLEAN: "bool",
    CustomFieldType.OBJECT: "dict[str, Any]",
    CustomFieldType.ARRAY: "list[Any]",
}


def _load_config(config_path: Path) -> PluginConfig:
    """Load and validate a plugin config file, returning the PluginConfig object.

    Uses importlib to load cg_config.py as an isolated module so it doesn't
    pollute sys.modules and can be loaded from any directory at runtime.

    Args:
        config_path: Absolute path to the cg_config.py file.

    Returns:
        The ``PluginConfig`` bound to the module-level ``config`` variable.

    Raises:
        RuntimeError: If the file cannot be loaded or does not expose a valid
            ``config`` variable created by ``define_plugin()``.
    """
    spec = importlib.util.spec_from_file_location(
        f"cg_plugin_config_{config_path.parent.name}", config_path
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load plugin config from {config_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    config = getattr(module, "config", None)
    if not isinstance(config, PluginConfig):
        raise RuntimeError(
            'Plugin config must expose a "config" variable created by define_plugin()'
        )
    return config


def _extract_custom_fields(
    config: PluginConfig,
) -> dict[str, dict[str, CustomFieldSpec]]:
    """Extract custom field specs from PluginExtensions into the flat shape used by generators.

    Returns an empty dict if config.extensions is None or has no schemas with custom_fields.
    """
    if config.extensions is None or config.extensions.schemas is None:
        return {}
    return {
        obj: schema.custom_fields
        for obj, schema in config.extensions.schemas.items()
        if schema.custom_fields is not None
    }


def _normalize_identifier(name: str) -> str:
    """Convert an arbitrary string into a valid Python identifier.

    Args:
        name: The raw string to normalise (e.g. a directory name or field key).

    Returns:
        A non-empty string that is a legal Python identifier and not a keyword.

    Example::

        _normalize_identifier("my-plugin")   # "my_plugin"
        _normalize_identifier("123abc")       # "plugin_123abc"
        _normalize_identifier("class")        # "class_plugin"
    """
    # Replace any non-word characters with underscores to produce a valid Python identifier.
    ident = re.sub(r"\W+", "_", name.strip())
    if not ident:
        ident = "plugin"  # empty string edge case
    if ident[0].isdigit():
        ident = f"plugin_{ident}"  # identifiers can't start with a digit
    if keyword.iskeyword(ident):
        ident = f"{ident}_plugin"  # e.g. "class" -> "class_plugin"
    return ident


def _to_pascal(value: str) -> str:
    """Convert a snake_case or kebab-case string to PascalCase.

    Args:
        value: The string to convert (e.g. ``"eligibility_type"``).

    Returns:
        PascalCase string (e.g. ``"EligibilityType"``). Falls back to
        ``"Field"`` if the input contains no alphanumeric characters.
    """
    parts = re.split(r"[^A-Za-z0-9]+", value)
    return "".join(p[:1].upper() + p[1:] for p in parts if p) or "Field"


def _resolve_field_type(field_type: CustomFieldType | str) -> CustomFieldType:
    """Normalise a field type value to a ``CustomFieldType`` enum member.

    Accepts either an already-resolved enum member or a plain string (e.g.
    ``"string"``, ``"array"``) as used in ``cg_config.py`` shorthand.

    Args:
        field_type: A ``CustomFieldType`` member or its string value.

    Returns:
        The corresponding ``CustomFieldType`` enum member.

    Raises:
        ValueError: If the string does not match any ``CustomFieldType`` value.
    """
    if isinstance(field_type, CustomFieldType):
        return field_type
    return CustomFieldType(field_type)


def _annotation_for_spec(spec: CustomFieldSpec, resolved_type: CustomFieldType) -> str:
    """Determine the Python type annotation string for a custom field's ``value`` property.

    Handles three cases based on what ``spec.value`` contains:

    - ``None``: looks up a default annotation from ``FIELD_TYPE_DEFAULT_ANNOTATION``
      (e.g. ``field_type="array"`` → ``"list[Any]"``).
    - A plain ``type`` object (e.g. ``int``, ``MyModel``): uses ``__name__``. Builtin
      and SDK types are already importable in the generated file; external types (e.g.
      Pydantic models from ``cg_config.py`` or third-party packages) will have their
      import emitted by :func:`_collect_extra_imports`.
    - A generic alias or complex type (e.g. ``list[str]``, ``Optional[int]``): converts
      to string, strips the ``typing.`` prefix added by older Python versions, and unwraps
      ``<class 'str'>``-style repr strings produced by ``str()`` in some contexts.

    Args:
        spec: The ``CustomFieldSpec`` for the field being generated.
        resolved_type: The normalised ``CustomFieldType`` for the field.

    Returns:
        A string suitable for use as a type annotation in generated Python source,
        e.g. ``"str"``, ``"list[str]"``, ``"dict[str, Any]"``, or ``"MyModel"``.
    """
    if spec.value is None:
        return FIELD_TYPE_DEFAULT_ANNOTATION[resolved_type]

    value = spec.value
    if isinstance(value, type):
        # Always use the bare name; _collect_extra_imports handles the import
        # statement for any type that isn't already available in the generated file.
        return value.__name__

    # spec.value is a generic alias or other non-type (e.g. list[str], Optional[int]).
    # Strip the "typing." prefix so the annotation is valid in generated source that
    # uses `from __future__ import annotations`.
    rendered = str(value).replace("typing.", "")
    # str(type_obj) for builtins renders as "<class 'str'>" rather than "str" — unwrap it.
    if rendered in {
        "<class 'str'>",
        "<class 'int'>",
        "<class 'float'>",
        "<class 'bool'>",
    }:
        return rendered.split("'")[1]
    return rendered or "Any"


def _collect_extra_imports(
    custom_fields: dict[str, dict[str, CustomFieldSpec]],
) -> list[str]:
    """Collect import lines needed for external types used as ``spec.value``.

    Walks all specs and returns one ``import`` line per distinct external type.
    Types from ``builtins`` or ``common_grants_sdk`` are skipped because they
    are already available in the generated file without an explicit import.

    Types loaded from a ``cg_config.py`` module (identified by the synthetic
    ``cg_plugin_config_*`` module name that :func:`_load_config` assigns) are
    imported via a relative ``from ..cg_config import`` statement.  All other
    types are imported using their ``__module__`` path directly.

    Args:
        custom_fields: The flat custom fields mapping extracted from the plugin config.

    Returns:
        A deduplicated list of import-statement strings in the order they were
        first encountered, ready to be inserted into the generated source file.
    """
    seen: set[tuple[str, str]] = set()
    imports: list[str] = []

    for fields in custom_fields.values():
        for spec in fields.values():
            if not isinstance(spec.value, type):
                continue
            module = spec.value.__module__
            name = spec.value.__name__
            if module == "builtins" or module.startswith("common_grants_sdk"):
                continue
            key = (module, name)
            if key in seen:
                continue
            seen.add(key)
            if module.startswith("cg_plugin_config_"):
                # Type was defined in cg_config.py, loaded via importlib with a
                # synthetic module name — import it relative to the generated/ dir.
                imports.append(f"from ..cg_config import {name}")
            else:
                imports.append(f"from {module} import {name}")

    return imports


def _model_blocks(
    custom_fields: dict[str, dict[str, CustomFieldSpec]],
) -> Iterable[str]:
    """Yield source-code blocks for every model defined in the extensions mapping.

    For each model, yields three blocks in dependency order:

    1. One ``CustomField`` subclass per field key (typed ``value`` property).
    2. A ``CustomFields`` container model grouping all fields for the model.
    3. The extended model class that adds a ``custom_fields`` attribute typed to
       the container.

    Args:
        custom_fields: The flat custom fields mapping extracted from the plugin config.

    Yields:
        Source-code strings to be joined and written into ``schemas.py``.

    Raises:
        ValueError: If a model name is not present in ``MODEL_BASE_CLASS``.
    """
    for model_name, fields in custom_fields.items():
        if model_name not in MODEL_BASE_CLASS:
            raise ValueError(
                f'Generator does not support model "{model_name}". '
                f"Supported models: {sorted(MODEL_BASE_CLASS)}"
            )

        custom_field_classes: list[str] = []
        custom_fields_attrs: list[str] = []

        for field_key, spec in fields.items():
            resolved_type = _resolve_field_type(spec.field_type)
            # Derive generated class names and the snake_case attribute name for this field.
            field_cls_name = f"{model_name}{_to_pascal(field_key)}CustomField"
            attr_name = _normalize_identifier(snake(field_key))
            value_annotation = _annotation_for_spec(
                spec=spec, resolved_type=resolved_type
            )
            # Use spec.name as the runtime display name if provided, otherwise fall back
            # to the field key (the dict key in PluginExtensionsSchema.custom_fields).
            field_name_default = spec.name or field_key
            # repr() produces a quoted string literal safe to embed directly in source code.
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

        # Yield three source blocks per model in dependency order:
        # 1. Individual CustomField subclasses (one per field key)
        # 2. A CustomFields container model grouping all fields for this model
        # 3. The extended model class that wires in the CustomFields container
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
                f"    custom_fields: Optional[{custom_fields_model_name}] = Field(  # type: ignore[assignment]",
                "        default=None,",
                '        alias="customFields",',
                "    )",
            ]
        )


def _render_schemas_py(
    custom_fields: dict[str, dict[str, CustomFieldSpec]],
    mappings_only_objs: set[str] | None = None,
) -> str:
    """Render the full source of the generated ``schemas.py`` file.

    Produces a self-contained module containing typed ``CustomField`` subclasses,
    a ``CustomFields`` container, and an extended model class for each entry in
    ``custom_fields``. Also emits a ``_Schemas`` container object (attribute access
    rather than dict lookup) and a module-level ``schemas`` instance.

    For objects that only have ``mappings`` (no ``custom_fields``), the ``_Schemas``
    object will expose the base SDK model class directly (e.g. ``schemas.Opportunity``
    will be ``OpportunityBase``).

    Args:
        custom_fields: The flat custom fields mapping extracted from the plugin config.
        mappings_only_objs: Set of object names that have mappings but no custom_fields.
            These will be exposed on ``_Schemas`` as their base SDK class.

    Returns:
        A string of valid Python source code ready to be written to disk.
    """
    # _Schemas is a plain object (not a dict) so callers get attribute access:
    # plugin.schemas.Opportunity rather than plugin.schemas["Opportunity"].
    # The dynamic __init__ assignment is necessary because model names aren't
    # known until generation time, so a static class body can't be used.
    model_names = list(custom_fields.keys())
    blocks = "\n\n\n".join(_model_blocks(custom_fields))
    mappings_only: set[str] = mappings_only_objs or set()

    # Build schema assignments: generated classes for custom_fields objects,
    # base SDK classes for mappings-only objects.
    assignments: list[str] = [f"        self.{name} = {name}" for name in model_names]
    for obj in sorted(mappings_only):
        if obj not in MODEL_BASE_CLASS:
            raise ValueError(
                f'Generator does not support model "{obj}". '
                f"Supported models: {sorted(MODEL_BASE_CLASS)}"
            )
        base_class = MODEL_BASE_CLASS[obj]
        assignments.append(f"        self.{obj} = {base_class}")

    schema_assignments = "\n".join(assignments or ["        pass"])
    all_names = model_names + sorted(mappings_only)
    all_exports = ", ".join([f'"{name}"' for name in all_names] + ['"schemas"'])
    extra_imports = _collect_extra_imports(custom_fields)
    extra_import_lines = ["", *extra_imports] if extra_imports else []

    return "\n".join(
        [
            "# This file is auto-generated. Do not edit it manually — it will be overwritten",
            "# the next time `python -m common_grants_sdk.extensions.generate` is run.",
            "from __future__ import annotations",
            "",
            "from typing import Any, Optional",
            "",
            "from pydantic import ConfigDict, Field",
            "",
            "from common_grants_sdk.schemas.pydantic.base import CommonGrantsBaseModel",
            "from common_grants_sdk.schemas.pydantic.fields import CustomField, CustomFieldType",
            "from common_grants_sdk.schemas.pydantic.models import OpportunityBase",
            *extra_import_lines,
            *([blocks, ""] if blocks else []),
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
    """Render the source of the ``generated/__init__.py`` file.

    This file re-exports the ``schemas`` instance from ``schemas.py`` so that
    the generated package can be imported as ``from .generated import schemas``.

    Returns:
        A string of valid Python source code ready to be written to disk.
    """
    return "\n".join(
        [
            "# This file is auto-generated. Do not edit it manually — it will be overwritten",
            "# the next time `python -m common_grants_sdk.extensions.generate` is run.",
            "from .schemas import schemas",
            "",
            '__all__ = ["schemas"]',
            "",
        ]
    )


def _render_plugin_init_py(plugin_variable_name: str, config: PluginConfig) -> str:
    """Render the source of the plugin directory's root __init__.py file.

    Emits a fully compiled Plugin instance that includes:
    - generated_schemas: the _Schemas object from generated/schemas.py
    - extensions, meta: forwarded from config
    - schemas: compiled ObjectSchemas dict (one entry per config.schemas key,
      plus auto-generated entries for mappings-only objects)
    - get_client: wrapped with functools.lru_cache if provided
    """
    needs_functools = config.get_client is not None

    # Collect the sets of objects needing ObjectSchemas entries.
    explicit_objs: set[str] = set(config.schemas.keys()) if config.schemas else set()
    mappings_objs: set[str] = (
        {obj for obj, s in config.extensions.schemas.items() if s.mappings is not None}
        if config.extensions and config.extensions.schemas
        else set()
    )
    all_schema_objs: set[str] = explicit_objs | mappings_objs

    needs_object_schemas = bool(all_schema_objs)
    needs_build_transforms = bool(mappings_objs - explicit_objs)

    # Build pre-plugin lines for build_transforms calls (mappings-only objects).
    build_transforms_lines: list[str] = []
    for obj in sorted(mappings_objs - explicit_objs):
        build_transforms_lines += [
            f"_{obj}_to_common, _{obj}_from_common = build_transforms(",
            f'    to_common_mapping=config.extensions.schemas["{obj}"].mappings.to_common,',
            f'    from_common_mapping=config.extensions.schemas["{obj}"].mappings.from_common,',
            f"    common_model=schemas.{obj},",
            ")",
            "",
        ]

    obj_schemas_lines: list[str] = []
    if all_schema_objs:
        entries: list[str] = []
        for obj in sorted(all_schema_objs):
            if obj in explicit_objs:
                entries.extend(
                    [
                        f'        "{obj}": ObjectSchemas(',
                        f'            native=(config.schemas["{obj}"].native or dict),',
                        f"            common=schemas.{obj},",
                        f'            to_common=config.schemas["{obj}"].to_common,',
                        f'            from_common=config.schemas["{obj}"].from_common,',
                        "        ),",
                    ]
                )
            else:
                # mappings-only object: no explicit schemas entry, use dict as native
                entries.extend(
                    [
                        f'        "{obj}": ObjectSchemas(',
                        "            native=dict,",
                        f"            common=schemas.{obj},",
                        f"            to_common=_{obj}_to_common,",
                        f"            from_common=_{obj}_from_common,",
                        "        ),",
                    ]
                )
        obj_schemas_lines = [
            "    schemas={",
            *entries,
            "    },",
        ]
    else:
        obj_schemas_lines = ["    schemas=None,"]

    get_client_lines = (
        [
            "    get_client=(",
            "        functools.lru_cache(maxsize=None)(config.get_client)",
            "        if config.get_client is not None else None",
            "    ),",
        ]
        if needs_functools
        else ["    get_client=None,"]
    )

    imports = [
        "# This file is auto-generated. Do not edit it manually — it will be overwritten",
        "# the next time `python -m common_grants_sdk.extensions.generate` is run.",
        "from __future__ import annotations",
        "",
    ]
    if needs_functools:
        imports.append("import functools")
        imports.append("")

    if needs_build_transforms:
        imports.append(
            "from common_grants_sdk.extensions import Plugin, build_transforms"
        )
    else:
        imports.append("from common_grants_sdk.extensions import Plugin")
    if needs_object_schemas:
        imports.append("from common_grants_sdk.extensions.types import ObjectSchemas")
    imports += [
        "from .cg_config import config",
        "from .generated import schemas",
        "",
    ]

    plugin_lines = [
        f"{plugin_variable_name} = Plugin(",
        "    generated_schemas=schemas,",
        "    extensions=config.extensions,",
        "    meta=config.meta,",
        *get_client_lines,
        *obj_schemas_lines,
        "    filters=config.filters,",
        ")",
    ]

    # Emit None-narrowing assertions for config.schemas and per-object transforms
    # so that mypy can verify the types without the pydantic plugin.
    narrow_lines: list[str] = []
    if explicit_objs:
        narrow_lines.append("assert config.schemas is not None")
        for obj in sorted(explicit_objs):
            narrow_lines.append(f'assert config.schemas["{obj}"].to_common is not None')
            narrow_lines.append(
                f'assert config.schemas["{obj}"].from_common is not None'
            )
        narrow_lines.append("")

    pre_plugin = build_transforms_lines + narrow_lines  # may be empty

    return "\n".join(
        imports
        + pre_plugin
        + plugin_lines
        + [
            "",
            f'__all__ = ["{plugin_variable_name}", "schemas"]',
            "",
        ]
    )


def generate_plugin(plugin_dir: Path) -> Path:
    """Run the full code generation pipeline for a single plugin directory.

    Loads ``cg_config.py``, creates the ``generated/`` subdirectory, and writes
    three files: ``generated/schemas.py``, ``generated/__init__.py``, and the
    root ``__init__.py`` that exports the ``Plugin`` instance.

    Args:
        plugin_dir: Path to the plugin directory containing ``cg_config.py``.

    Returns:
        The path to the ``generated/`` directory that was created.

    Raises:
        FileNotFoundError: If ``cg_config.py`` does not exist in ``plugin_dir``.
        RuntimeError: If the config file cannot be loaded or is invalid.
        ValueError: If the config references an unsupported model name.
    """
    plugin_dir = plugin_dir.resolve()
    config_path = plugin_dir / "cg_config.py"
    if not config_path.exists():
        raise FileNotFoundError(f"Could not find config file: {config_path}")

    config = _load_config(config_path)
    custom_fields = _extract_custom_fields(config)

    # Determine objects that have mappings but no custom_fields — these need a
    # pass-through entry in _Schemas pointing at the base SDK model class.
    explicit_cf_objs: set[str] = set(custom_fields.keys())
    mappings_only_objs: set[str] = (
        {
            obj
            for obj, s in config.extensions.schemas.items()
            if s.mappings is not None and obj not in explicit_cf_objs
        }
        if config.extensions and config.extensions.schemas
        else set()
    )

    # Validate that auto-generated transform objects have both mapping directions.
    # Auto-generated objects: have mappings in extensions.schemas but no explicit
    # to_common/from_common in config.schemas.
    if config.extensions and config.extensions.schemas:
        explicit_schema_objs: set[str] = (
            set(config.schemas.keys()) if config.schemas else set()
        )
        ext_schemas = config.extensions.schemas
        for obj, schema in ext_schemas.items():
            if schema.mappings is None or obj in explicit_schema_objs:
                continue
            if schema.mappings.to_common is None:
                raise ValueError(
                    f'Plugin object "{obj}": mappings.to_common is required when '
                    f"auto-generating transforms. Either provide a to_common mapping "
                    f"or pass an explicit to_common callable via schemas['{obj}']."
                )
            if schema.mappings.from_common is None:
                raise ValueError(
                    f'Plugin object "{obj}": mappings.from_common is required when '
                    f"auto-generating transforms. Either provide a from_common mapping "
                    f"or pass an explicit from_common callable via schemas['{obj}']."
                )

    generated_dir = plugin_dir / "generated"
    generated_dir.mkdir(parents=True, exist_ok=True)

    schemas_py = generated_dir / "schemas.py"
    init_generated_py = generated_dir / "__init__.py"
    root_init_py = plugin_dir / "__init__.py"

    schemas_py.write_text(
        _render_schemas_py(custom_fields, mappings_only_objs=mappings_only_objs),
        encoding="utf-8",
    )
    init_generated_py.write_text(_render_generated_init_py(), encoding="utf-8")

    plugin_variable_name = _normalize_identifier(plugin_dir.name)
    root_init_py.write_text(
        _render_plugin_init_py(plugin_variable_name, config), encoding="utf-8"
    )

    return generated_dir


def main(argv: list[str] | None = None) -> int:
    """CLI entry point for ``python -m common_grants_sdk.extensions.generate``.

    Parses command-line arguments and delegates to ``generate_plugin()``.

    Args:
        argv: Argument list to parse. Defaults to ``sys.argv[1:]`` when ``None``.

    Returns:
        Exit code (``0`` on success).
    """
    parser = argparse.ArgumentParser(
        prog="python -m common_grants_sdk.extensions.generate",
        description="Generate typed plugin schemas from cg_config.py",
    )
    parser.add_argument(
        "--plugin",
        nargs="+",
        default=["."],
        help="One or more plugin directories containing cg_config.py (default: current directory)",
    )
    args = parser.parse_args(argv)

    for plugin_path in args.plugin:
        generated_dir = generate_plugin(Path(plugin_path))
        print(f"Generated plugin schemas at {generated_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
