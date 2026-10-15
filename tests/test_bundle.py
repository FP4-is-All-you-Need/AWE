import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from tools.preview_data import preview
from tools.site_bundle import bundle


class DistributionBoundaryTests(unittest.TestCase):
    def test_partial_catalog_and_preview_assets_are_rejected(self):
        with TemporaryDirectory() as directory:
            root=Path(directory);data=root/'data';assets=root/'assets';assets.mkdir()
            preview(data);(assets/'index.html').write_text('<html></html>')
            with self.assertRaisesRegex(ValueError,'preview catalog'):
                bundle(data,assets,root/'out')
            self.assertFalse((root/'out').exists())
            (assets/'index.json').write_text('{}')
            with self.assertRaisesRegex(ValueError,'preview data'):
                bundle(data,assets,root/'out')
