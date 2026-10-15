"""Public artifact metadata filtering, disclosure checks and checksum preservation."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
import jsonschema
from tools.pages_artifact import ROOT, scan, digest


class PagesArtifactTest(unittest.TestCase):
    def test_public_metadata_preserves_all_mathematics_and_other_evidence(self):
        original=json.loads((ROOT/'data/modular/powers.json').read_text())
        expected=copy.deepcopy(original)
        for entry in expected['sets']:
            for usage in entry.get('usage',[]):usage.pop('device',None)
        actual=json.loads((ROOT/'build/pages-data/modular/powers.json').read_text())
        self.assertEqual(actual,expected)
        jsonschema.validate(actual,json.loads((ROOT/'data/schema/modular-powers.schema.json').read_text()))
        jsonschema.validate(actual,json.loads((ROOT/'build/pages-data/schema/modular-powers.schema.json').read_text()))
        index=json.loads((ROOT/'data/index.json').read_text())
        for entry in index['files']+[index['search'],index['modular'],index['input_inventory']]:
            self.assertEqual(digest(ROOT/'build/pages-data'/entry['path']),entry['sha256'])
        self.assertEqual(digest(ROOT/'build/pages-data/index.json'),digest(ROOT/'data/index.json'))

    def test_disclosure_detector_reports_category_not_sensitive_value(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'sample.json'
            for value,category in [('/home/example/private','personal_path'),('ghp_'+'x'*36,'credential')]:
                p.write_text(json.dumps({'value':value}));self.assertEqual(scan(p)[0]['category'],category)
                self.assertNotIn(value,json.dumps(scan(p)))
            p.write_text(json.dumps({'sha256':'ab200'+'0'*59}));self.assertEqual(scan(p),[])

    def test_public_schema_and_measurement_metadata(self):
        schema=json.loads((ROOT/'build/pages-data/schema/modular-powers.schema.json').read_text())
        for variant in schema['properties']['sets']['items']['properties']['usage']['items']['oneOf']:
            self.assertNotIn('device',variant.get('properties',{}));self.assertNotIn('device',variant.get('required',[]))
        report=json.loads((ROOT/'build/pages-data/publication.json').read_text())
        self.assertEqual(len(report['metadata_omissions']),3)
        for row in report['transformed_files']:
            self.assertEqual(digest(ROOT/'data'/row['path']),row['source_sha256'])
            self.assertEqual(digest(ROOT/'build/pages-data'/row['path']),row['published_sha256'])


if __name__=='__main__':unittest.main()
