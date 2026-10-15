"""Count fixed-palette ranks in canonical integer constructions, without search."""
import argparse
import json
from collections import Counter
from pathlib import Path


def count(root):
    grid, direct = Counter(), Counter()
    for path in sorted(root.glob('*.json')):
        for record in json.loads(path.read_text()):
            a, b = (record['weights'][side] for side in ('A', 'B'))
            grid[len({x * y for x in a for y in b})] += 1
            values = set()
            for product in record['products']:
                aa = [i for i, x in enumerate(record['planes']['A'][product['a']]) if x]
                bb = [i for i, x in enumerate(record['planes']['B'][product['b']]) if x]
                if len(aa) == len(bb) == 1:
                    values.add(a[aa[0]] * b[bb[0]])
            direct[len(values)] += 1
    return {'constructions': sum(grid.values()), 'grid_ranks': dict(sorted(grid.items())),
            'direct_ranks': dict(sorted(direct.items())),
            'grid_over_nine': sum(n for k, n in grid.items() if k > 9),
            'direct_over_nine': sum(n for k, n in direct.items() if k > 9)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path, nargs='?', default=Path('data/solutions'))
    print(json.dumps(count(parser.parse_args().root), ensure_ascii=False))
