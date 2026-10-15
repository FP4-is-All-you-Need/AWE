"""Inventory bytes without interpreting inputs. All symbolic links are skipped.

Input roots must be directories and cannot themselves be symbolic links. The
manifest describes content identity only; every content remains unreviewed.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import tempfile


BLOCK_BYTES = 1024 * 1024
FORMATS = {'.json': 'json', '.jsonl': 'jsonl', '.tsv': 'tsv',
           '.csv': 'csv', '.py': 'python', '.txt': 'text', '.md': 'markdown'}


def _roots(inputs):
    roots = set()
    for value in inputs:
        path = Path(value)
        if path.is_symlink():
            raise ValueError('input_root_symlink')
        root = path.resolve()
        if not root.is_dir():
            raise ValueError('input_directory_missing')
        roots.add(root)
    if not roots:
        raise ValueError('inputs_empty')
    return sorted(roots)


def _files(roots):
    paths = set()
    for root in roots:
        for directory, dirs, files in os.walk(root, followlinks=False):
            dirs[:] = sorted(name for name in dirs
                             if not (Path(directory) / name).is_symlink())
            for name in sorted(files):
                path = Path(directory) / name
                if stat.S_ISREG(path.lstat().st_mode):
                    paths.add(path.resolve())
    return sorted(paths)


def _digest(path):
    digest = hashlib.sha256()
    size = 0
    # O_NOFOLLOW also rejects a file replaced with a symbolic link during traversal.
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(descriptor, 'rb') as source:
        if not stat.S_ISREG(os.fstat(source.fileno()).st_mode):
            raise ValueError('input_file_not_regular')
        while block := source.read(BLOCK_BYTES):
            digest.update(block)
            size += len(block)
    return digest.hexdigest(), size


def inventory(inputs, output):
    """Write a new manifest atomically; never overwrite an existing output."""
    roots = _roots(inputs)
    destination = Path(output).absolute()
    resolved_output = destination.resolve()
    if any(resolved_output.is_relative_to(root) for root in roots):
        raise ValueError('output_inside_inputs')
    if os.path.lexists(destination):
        raise ValueError('output_exists')
    paths = _files(roots)
    contents = {}
    physical_bytes = 0
    for path in paths:
        sha, size = _digest(path)
        physical_bytes += size
        entry = contents.setdefault(sha, {'source_sha256': sha, 'bytes': size,
                                         'copies': 0, 'formats': set(),
                                         'review_status': 'unreviewed'})
        entry['copies'] += 1
        entry['formats'].add(FORMATS.get(path.suffix.lower(), 'other'))
    files = []
    for sha in sorted(contents):
        entry = contents[sha]
        entry['formats'] = sorted(entry['formats'])
        files.append(entry)
    result = {'schema_version': 1,
              'counts': {'physical_files': len(paths), 'unique_contents': len(files),
                         'duplicate_copies': len(paths) - len(files),
                         'physical_bytes': physical_bytes},
              'files': files}
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8',
                                         dir=destination.parent, delete=False) as target:
            temporary = Path(target.name)
            json.dump(result, target, sort_keys=True, indent=2)
            target.write('\n')
            target.flush()
            os.fsync(target.fileno())
        # Linking the complete file publishes atomically and fails if output exists.
        os.link(temporary, destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return result


def check(path):
    """Check the public byte inventory's closed fields and internal counts."""
    data = json.loads(Path(path).read_text())
    if set(data) != {'schema_version', 'counts', 'files'} or type(data['schema_version']) is not int or data['schema_version'] != 1:
        raise ValueError('invalid_inventory')
    seen = set()
    total_copies = total_bytes = 0
    for row in data['files']:
        if set(row) != {'source_sha256', 'bytes', 'copies', 'formats', 'review_status'}:
            raise ValueError('invalid_inventory_fields')
        if not re.fullmatch('[0-9a-f]{64}', row['source_sha256']) or row['source_sha256'] in seen:
            raise ValueError('invalid_inventory_hash')
        seen.add(row['source_sha256'])
        if type(row['copies']) is not int or row['copies'] < 1 or type(row['bytes']) is not int or row['bytes'] < 0:
            raise ValueError('invalid_inventory_count')
        if row['review_status'] != 'unreviewed' or not row['formats'] or row['formats'] != sorted(set(row['formats'])) or set(row['formats']) - (set(FORMATS.values()) | {'other'}):
            raise ValueError('invalid_inventory_classification')
        total_copies += row['copies']
        total_bytes += row['copies'] * row['bytes']
    expected = {'physical_files': total_copies, 'unique_contents': len(seen),
                'duplicate_copies': total_copies-len(seen), 'physical_bytes': total_bytes}
    if data['counts'] != expected or any(type(v) is not int for v in data['counts'].values()):
        raise ValueError('inventory_count_mismatch')
    return expected


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inputs', action='append', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args(argv)
    try:
        inventory(args.inputs, args.output)
    except (ValueError, OSError):
        parser.exit(2, 'input_manifest_failed\n')


if __name__ == '__main__':
    main()
