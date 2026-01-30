def snake(s: str) -> str:
    """Tiny camelCase/PascalCase -> snake_case helper for attribute names."""
    out = []
    for i, ch in enumerate(s):
        if (
            ch.isupper()
            and i > 0
            and (s[i - 1].islower() or (i + 1 < len(s) and s[i + 1].islower()))
        ):
            out.append("_")
        out.append(ch.lower())
    return "".join(out)
