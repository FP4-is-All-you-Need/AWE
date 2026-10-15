"""Search summaries must retain verified data and trace their exact shard bytes."""
import json
from pathlib import Path
import tempfile
import unittest

from tools.check_data import check
from tools.ingest import digest
from tools.preview_data import preview
from tools.search_index import build, check_search, COLUMNS, naive_additions
from verify.core import Invalid


class SearchIndexTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        preview(self.root)

    def test_preview_and_search_accounting_and_hashes(self):
        index = json.loads((self.root / 'index.json').read_text())
        self.assertFalse(index['complete'])
        self.assertEqual(index['count'], 4)
        self.assertEqual(check(self.root)['count'], 4)
        self.assertEqual(check_search(self.root)['count'], 4)
        reference = index['search']
        self.assertEqual(digest(self.root / reference['path']), reference['sha256'])
        search = json.loads((self.root / reference['path']).read_text())
        self.assertEqual(search['columns'], COLUMNS)
        self.assertFalse(search['complete'])
        solutions = {s['id']: s for entry in index['files']
                     for s in json.loads((self.root / entry['path']).read_text())}
        seen = []
        for group in search['groups']:
            path = self.root / group['path']
            self.assertEqual(digest(path), group['sha256'])
            rows = json.loads(path.read_text())
            self.assertEqual(len(rows), group['count'])
            self.assertEqual([r[0] for r in rows], sorted(r[0] for r in rows))
            for row in rows:
                s = solutions[row[0]]
                expected = [s['id'], s['widths']['A'], s['widths']['B'],
                            len(s['weights']['A']), len(s['weights']['B']), len(s['products']),
                            len(s['planes']['A']), len(s['planes']['B']), s['denominator'],
                            s['accumulation']['max_k'], s['weights']['A'], s['weights']['B'], False]
                self.assertEqual(row[:13], expected)
                expected_add={}
                for side,key in (('A','a'),('B','b')):
                    used={p[key] for p in s['products']}
                    expected_add['add_'+key]=sum(max(0,len([v for v in s['planes'][side][i] if v])-1) for i in used)
                    expected_add['domain_'+key]=s['domain'][side]
                self.assertEqual(row[13], expected_add)
                self.assertEqual((row[1], row[2], row[5], row[12]),
                                 (group['width_a'], group['width_b'], group['r'], group['mixed']))
                seen.append(row[0])
        self.assertEqual(len(seen), search['count'])
        self.assertEqual(set(seen), set(solutions))
        self.assertEqual(len(seen), len(set(seen)))

    def test_saved_board_matches_the_declared_schema(self):
        from jsonschema import Draft202012Validator
        from referencing import Registry, Resource
        schema_root=Path(__file__).resolve().parents[1]/'data/schema'
        solution_schema=json.loads((schema_root/'solution.schema.json').read_text())
        board_schema=json.loads((schema_root/'board.schema.json').read_text())
        registry=Registry().with_resource(solution_schema['$id'],Resource.from_contents(solution_schema))
        index=json.loads((self.root/'index.json').read_text())
        solution=json.loads((self.root/index['files'][0]['path']).read_text())[0]
        board={'schema_version':1,'kind':'awe_board','solutions':[solution],
               'tiers':{'S':[solution['id']],'A':[],'B':[]}}
        Draft202012Validator(board_schema,registry=registry).validate(board)

    def test_search_rebuild_preserves_solution_and_index_bytes(self):
        before = {str(p.relative_to(self.root)): p.read_bytes()
                  for p in self.root.rglob('*.json')}
        build(self.root)
        after = {str(p.relative_to(self.root)): p.read_bytes()
                 for p in self.root.rglob('*.json')}
        self.assertEqual(before, after)

    def test_search_build_rejects_tampered_solution_shard(self):
        index = json.loads((self.root / 'index.json').read_text())
        path = self.root / index['files'][0]['path']
        path.write_bytes(path.read_bytes() + b' ')
        with self.assertRaisesRegex(Invalid, '^hash_mismatch$'):
            build(self.root)

    def test_naive_additions_use_each_used_plane_once_and_keep_unknown_sides(self):
        solution={'planes':{'A':[[1,-1,1],[0,0,0],[2,1,0]],'B':[[0,1,0],[2,0,1]]},
                  'products':[{'a':0,'b':0},{'a':0,'b':1},{'a':1,'b':0}]}
        self.assertEqual(naive_additions(solution),{'add_a':2,'add_b':None})
        solution['products']=[{'a':1,'b':0}]
        self.assertEqual(naive_additions(solution),{'add_a':0,'add_b':0})

    def test_search_check_rejects_changed_cost_with_valid_hashes(self):
        index=json.loads((self.root/'index.json').read_text())
        search_path=self.root/index['search']['path']
        search=json.loads(search_path.read_text())
        group=search['groups'][0]
        path=self.root/group['path']
        rows=json.loads(path.read_text())
        rows[0][13]['add_a']+=1
        path.write_text(json.dumps(rows))
        group['sha256']=digest(path)
        search_path.write_text(json.dumps(search))
        index['search']['sha256']=digest(search_path)
        (self.root/'index.json').write_text(json.dumps(index))
        with self.assertRaisesRegex(Invalid,'^search_row$'):
            check_search(self.root)

    def test_search_check_rejects_changed_domain_with_valid_hashes(self):
        index=json.loads((self.root/'index.json').read_text())
        search_path=self.root/index['search']['path']
        search=json.loads(search_path.read_text())
        group=search['groups'][0]
        path=self.root/group['path']
        rows=json.loads(path.read_text())
        rows[0][13]['domain_b'][0]-=1
        path.write_text(json.dumps(rows))
        group['sha256']=digest(path)
        search_path.write_text(json.dumps(search))
        index['search']['sha256']=digest(search_path)
        (self.root/'index.json').write_text(json.dumps(index))
        with self.assertRaisesRegex(Invalid,'^search_row$'):
            check_search(self.root)


if __name__ == '__main__':
    unittest.main()
