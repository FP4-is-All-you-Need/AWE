"""Validate explicit read-only input roots; never discover outside them."""
from pathlib import Path


def input_roots(inputs):
    values = [inputs] if isinstance(inputs, (str, Path)) else inputs
    roots = []
    for value in values:
        root = Path(value).resolve()
        if not root.is_dir():
            raise ValueError('input_directory_missing')
        if not any((root / name).is_dir() for name in ('solutions', 'modsets')):
            raise ValueError('input_layout_missing')
        if root not in roots:
            roots.append(root)
    if not roots:
        raise ValueError('inputs_empty')
    return roots
