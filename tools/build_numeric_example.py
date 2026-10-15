"""Extract the small matrix example from the supplied slide PDF; no search."""
import argparse
import hashlib
import json
from pathlib import Path
import fitz

parser = argparse.ArgumentParser()
parser.add_argument('pdf', type=Path)
parser.add_argument('--output', type=Path, default=Path('data/visualization/numeric-example.json'))
args = parser.parse_args()
with fitz.open(args.pdf) as doc:
    text = doc[20].get_text()
# Refuse to silently attach a different source to these numerical matrices.
assert 'A\n5\n2\n1\n4\nB\n2\n1\n1\n3\n' in text
assert 'C = AB\n12 11\n6 13\n' in text
record = dict(schema_version=1, source_sha256=hashlib.sha256(args.pdf.read_bytes()).hexdigest(),
              source_page=21, printed_slide=23, A=[[5,2],[1,4]], B=[[2,1],[1,3]],
              product=[[12,11],[6,13]], source_moduli=[3,5])
args.output.write_text(json.dumps(record, indent=2)+'\n')
