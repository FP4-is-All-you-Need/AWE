"""Pinned package retrieval, exact examples, and portable diagram exports."""
import ast
from fractions import Fraction
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

REPOSITORY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY / 'python'))
from awe_catalog import Catalog, example
from awe_catalog import diagrams
from tools.ingest import digest
from tools.preview_data import preview
from tools.sources import uv_record


class PackageTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        preview(self.root)
        self.hash = digest(self.root / 'index.json')
        self.catalog = Catalog(self.root, version='0.1.0', index_sha256=self.hash)
        self.solution = self.catalog.get(self.catalog.find(weights=[29, 37])[0]['id'])

    def test_pinned_retrieval_search_and_defensive_copy(self):
        self.assertEqual(self.catalog.version, '0.1.0')
        self.assertEqual(self.catalog.index_sha256, self.hash)
        rows = self.catalog.find(1, 1)
        self.assertEqual(len(rows), 4)
        self.assertEqual(rows[0]['r'], 3)
        self.assertEqual([r['r'] for r in rows], sorted(r['r'] for r in rows))
        matches = self.catalog.find(weights=[29, 37])
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]['r'], 6)
        changed = self.catalog.get(matches[0]['id'])
        changed['weights']['A'][0] = 999
        self.assertEqual(self.catalog.get(matches[0]['id'])['weights']['A'], [1, 29, 37])
        self.assertEqual(self.catalog.find(products=5), [])

    def test_wrong_hash_and_version_rejected(self):
        with self.assertRaisesRegex(ValueError, 'catalog hash mismatch'):
            Catalog(self.root, version='0.1.0', index_sha256='0' * 64)
        with self.assertRaisesRegex(ValueError, 'data version mismatch'):
            Catalog(self.root, version='other', index_sha256=self.hash)

    def test_modular_reproduction_and_cost_ranking_are_separate(self):
        rows = self.catalog.find_modular()
        self.assertTrue({59, 62} <= {s['verification']['products'] for s in rows})
        ranked = self.catalog.find_modular(plane_cost=1)
        costs = [s['verification']['products'] + s['verification']['faces'] for s in ranked]
        self.assertEqual(costs, sorted(costs))
        selected = [s for s in self.catalog.find_modular(k=16384) if s['verification']['products'] == 59]
        self.assertGreaterEqual(len(selected), 1)
        proof = self.catalog.verify_modular_set(selected[0]['id'])
        self.assertEqual((len(proof['moduli']), proof['products']), (21, 59))
        row = self.catalog.get_modular(selected[0]['solution_ids'][0])
        self.assertEqual(row['verified']['method'], 'full_pairs')
        from awe_catalog import modular_example
        result = modular_example(row, -123, 456)
        self.assertEqual(result['result_modulo_p'], (-123*456) % row['modulus'])
        for render in (diagrams.svg, diagrams.tikz, diagrams.matplotlib):
            self.assertIn('modulo', render(row))
        path = self.root/'modular/catalog.json'
        path.write_bytes(path.read_bytes()+b' ')
        with self.assertRaisesRegex(ValueError, 'catalog hash mismatch'):
            self.catalog.find_modular()

    def test_example_reconstructs_operands_planes_and_result(self):
        result = example(self.solution, 7, -3)
        for side, operand in [('A', 7), ('B', -3)]:
            limbs = result['limbs'][side]
            self.assertEqual(sum(w * x for w, x in zip(self.solution['weights'][side], limbs)), operand)
            self.assertEqual(result['planes'][side],
                             [sum(c * x for c, x in zip(p, limbs)) for p in self.solution['planes'][side]])
        products = [result['planes']['A'][p['a']] * result['planes']['B'][p['b']]
                    for p in self.solution['products']]
        self.assertEqual(result['products'], products)
        numerator = sum(p['numerator'] * v for p, v in zip(self.solution['products'], products))
        self.assertEqual(Fraction(numerator, result['denominator']), -21)
        self.assertEqual(result['result'], -21)
        with self.assertRaisesRegex(ValueError, 'operand outside verified domain'):
            example(self.solution, 149, -3)

    def test_diagrams_contain_all_nine_cells_and_six_coefficients(self):
        cells = [['1', 'P4: -65', 'P5: 37', 'P6: 29'], ['29', 'P6: 29'], ['37', 'P5: 37'],
                 ['29', 'P6: 29'], ['841', 'P2: -261', 'P3: 1073', 'P6: 29'], ['1073', 'P3: 1073'],
                 ['37', 'P5: 37'], ['1073', 'P3: 1073'], ['1369', 'P1: 259', 'P3: 1073', 'P5: 37']]
        root = ET.fromstring(diagrams.svg(self.solution))
        namespace = '{http://www.w3.org/2000/svg}'
        texts = [node.text for node in root.iter(namespace + 'text')]
        expected = ['b0', 'b1', 'b2']
        for i in range(3):
            expected.append('a' + str(i))
            expected.extend(label for cell in cells[3*i:3*i+3] for label in cell)
        self.assertEqual(texts[:len(expected)], expected)
        coefficients = [259, -261, 1073, -65, 37, 29]
        self.assertEqual(len(texts[len(expected):]), 6)
        tex = diagrams.tikz(self.solution)
        source = diagrams.matplotlib(self.solution)
        compile(source, '<generated diagram>', 'exec')
        tree = ast.parse(source)
        assignment = next(n for n in tree.body if isinstance(n, ast.Assign))
        payload = json.loads(ast.literal_eval(assignment.value.args[0]))
        self.assertEqual([cell for row in payload['cells'] for cell in row], cells)
        for k, coefficient in enumerate(coefficients, 1):
            self.assertTrue(texts[-7+k].endswith('coefficient = ' + str(coefficient)))
            self.assertIn(f'P_{{{k}}}', tex)
            self.assertIn(r'\mathrm{coefficient} = ' + str(coefficient) + '$', tex)
        for cell in cells:
            for label in cell:
                tex_label = label
                if label.startswith('P'):
                    name, value = label.split(': ')
                    tex_label = 'P_{' + name[1:] + '}: ' + value
                self.assertIn('$' + tex_label + '$', tex)

    def test_fractional_coefficients_remain_exact_in_all_exports(self):
        solution = uv_record({'w': [1, 1], 'uv': [[1, 2]], 'X': 1})
        self.assertEqual(Fraction(solution['products'][0]['numerator'], solution['denominator']), Fraction(1, 2))
        self.assertIn('P1: 1/2', diagrams.svg(solution))
        self.assertIn('P_{1}: 1/2', diagrams.tikz(solution))
        self.assertIn('coefficient = 1/2', diagrams.matplotlib(solution))
        compile(diagrams.matplotlib(solution), '<fractional diagram>', 'exec')

    def test_cli_find_get_and_example(self):
        environment = dict(os.environ, PYTHONPATH=os.pathsep.join([str(REPOSITORY / 'python'), str(REPOSITORY)]))
        def call(*arguments):
            command = [sys.executable, '-m', 'awe_catalog', '--data', str(self.root),
                       '--version', '0.1.0', '--index-sha256', self.hash, *arguments]
            result = subprocess.run(command, cwd=REPOSITORY, env=environment,
                                    capture_output=True, text=True, check=True)
            return json.loads(result.stdout)
        rows = call('find', '--a', '1', '--b', '1')
        self.assertEqual(rows[0]['r'], 3)
        self.assertEqual(call('get', self.solution['id']), self.solution)
        self.assertEqual(call('example', self.solution['id'], '--a', '7', '--b', '-3')['result'], -21)


if __name__ == '__main__':
    unittest.main()
