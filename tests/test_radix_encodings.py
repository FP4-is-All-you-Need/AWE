"""The positional encodings of data/visualization/radix-encodings.json: every integer of each range is encoded and decoded."""
import json
import unittest
from pathlib import Path
import jsonschema
from referencing import Registry, Resource
from tools import radix_encodings as R

ROOT = Path(__file__).resolve().parents[1]


def encodings():
    return {e['value_set']: e for e in json.loads((ROOT/R.OUTPUT).read_text())['encodings']}


class RadixEncodingsTest(unittest.TestCase):
    def test_file_follows_the_schema_and_the_rule(self):
        schemas = {p.name: json.loads(p.read_text()) for p in (ROOT/'data/schema').glob('*.schema.json')}
        registry = Registry().with_resources((name, Resource.from_contents(s)) for name, s in schemas.items())
        doc = json.loads((ROOT/R.OUTPUT).read_text())
        jsonschema.Draft202012Validator(schemas['radix-encodings.schema.json'], registry=registry).validate(doc)
        self.assertTrue(R.check(ROOT/R.OUTPUT)['valid'])

    def test_bases_and_ranges(self):
        e = encodings()
        self.assertEqual({k: (v['base'], v['limb_radius'], [r['radius'] for r in v['ranges']]) for k, v in e.items()},
                         {'8xE2M3': (49, 16, [16, 800, 39216]), '16xE3M2': (25, 8, [8, 208, 5208]),
                          '2xE2M1': (13, 4, [4, 56, 732, 9520])})
        for v in e.values():
            self.assertEqual(v['formula'], '(%d^k - 1) / 3' % v['base'])

    def test_every_integer_of_a_range_round_trips(self):
        for name, e in encodings().items():
            B, S, table = e['base'], set(e['limb_values']), {row['residue']: row['limb_value'] for row in e['residues']}
            for rng in e['ranges']:
                k, radius = rng['limbs'], rng['radius']
                for x in range(-radius, radius + 1):
                    values, residues, carries = R.encode(x, B, k, table)
                    self.assertTrue(set(values) <= S and abs(values[-1]) <= e['limb_radius'], (name, k, x))
                    self.assertEqual(sum(v * B ** i for i, v in enumerate(values)), x)
                # one past the range needs a carry above the top limb
                self.assertGreater(abs(R.encode(radius + 1, B, k, table)[0][-1]), e['limb_radius'])

    def test_widest_ranges(self):
        # the encoding covers the widest consecutive range of sums, except on 16xE3M2 with two or three limbs
        for e in encodings().values():
            for rng in e['ranges']:
                s, widest = R.sums(sorted(e['limb_values']), e['base'], rng['limbs']), rng['radius']
                while widest + 1 in s and -widest - 1 in s:
                    widest += 1
                self.assertEqual(widest, R.WIDER.get((e['value_set'], rng['limbs']), rng['radius']))
        self.assertEqual(R.WIDER, {('16xE3M2', 2): 210, ('16xE3M2', 3): 5260})

    def test_examples_step_by_step(self):
        for e in encodings().values():
            B = e['base']
            for ex in e['examples']:
                x = ex['value']
                for v, r, c in zip(ex['limb_values'], ex['residues'], ex['carries']):
                    self.assertEqual(((x - r) % B, (r - v) // B, (r - v) % B), (0, c, 0))
                    x = (x - v) // B
                self.assertEqual(x, ex['limb_values'][-1])


if __name__ == '__main__':
    unittest.main()
