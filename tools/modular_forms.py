"""Build and check the catalog of single modular constructions (data/modular/forms-*.json, schema 2).

The rows are sorted by modulus and split into files of about CHUNK_BYTES each (a modulus is never split).  forms-index.json lists
every file with its modulus range, SHA-256 and count, the value-set inclusions, a summary of the prime-power moduli, and the
constructions left out, by reason; forms-excluded.json lists each left-out construction.
build: verify every construction of a JSON-lines input on the smallest value set that keeps its holes, and write the files.
check: validate the index, the hashes, the schema and the ids, and rebuild every record (or a sample) from its construction.
"""
import argparse
from collections import Counter
from datetime import date
import hashlib
import json
from pathlib import Path
import random
import re
import jsonschema
from referencing import Registry, Resource
from tools.ingest import digest, write
from verify.core import Invalid
import verify.modular_forms as MF

DATA_VERSION = '0.2.0'
SCHEMA_DIR = Path('data/schema')
CHUNK_BYTES = 2_000_000
EXCLUDED_FILE = 'forms-excluded.json'
INDEX_KEYS = {'schema_version', 'data_version', 'kind', 'solutions', 'chunks', 'excluded', 'excluded_list', 'value_set_inclusion',
              'prime_powers'}
CHUNK_KEYS = {'path', 'sha256', 'solutions', 'modulus_min', 'modulus_max'}
CHUNK_NAME = re.compile(r'^forms-[0-9]{7,10}-[0-9]{7,10}\.json$')
NOTES = {'coverage_cost_cap': 'the encoding search of verify/modular_forms.py exceeds its fixed work budget, so the encoding cannot '
                              'be rebuilt and checked',
         'nonunit_denominator_needs_table': 'the denominator is not a unit modulo the modulus, so checking the construction with '
                                            'verify/modular_forms.py needs its encoding table, and tables are not stored for '
                                            'moduli above 256',
         'holes_differ_from_input': 'verify/modular_forms.py counts holes different from those given with the construction',
         'no_served_residue': 'no residue has an encoding on one side, so no pair can be checked'}
INPUT_FIELDS = ('modulus', 'weights', 'planes', 'plane_moduli', 'products', 'denominator', 'value_set')


def construction(line):
    """A construction from one input line: modulus, weights, planes, plane_moduli, products [[a, b, numerator]], denominator,
    value_set (2xE2M1, 8xE2M3 or 16xE3M2)."""
    if line.get('value_set') not in MF.SET_KEY:
        raise Invalid('unsupported_value_set')
    m = line['modulus']
    pm = line.get('plane_moduli') or {s: [m] * len(line['planes'][s]) for s in MF.SIDES}
    al = MF.SET_KEY[line['value_set']]
    return MF.make(m, line['weights']['A'], line['weights']['B'], line['planes']['A'], line['planes']['B'], pm['A'], pm['B'],
                   [tuple(p) for p in line['products']], line.get('denominator', 1), alph=(al, al))


def chunks_of(rows, chunk_bytes):
    """Consecutive groups of the sorted rows; a group closes at the end of a modulus once it holds chunk_bytes or more."""
    out, cur, size = [], [], 0
    for i, r in enumerate(rows):
        cur.append(r)
        size += len(json.dumps(r, separators=(',', ':')))
        if (i + 1 == len(rows) or rows[i + 1]['modulus'] != r['modulus']) and size >= chunk_bytes:
            out.append(cur)
            cur, size = [], 0
    if cur:
        out.append(cur)
    return out


def input_id(line):
    """The id of an input construction that has no record: awem2c_ and the SHA-256 of its construction fields."""
    return 'awem2c_' + hashlib.sha256(MF.packed({k: line.get(k) for k in INPUT_FIELDS})).hexdigest()


def holes_of(r):
    return [r['holes']['A'], r['holes']['B']]


def minimal_record(line, verified_date, table_max=MF.TABLE_MAX):
    """The record on the smallest value set that holds the construction with the same holes: the value sets contained in the
    given one are tried first.  Holes [A, B] given in the line are exact when holes_exact is true (or both are 0): a record
    must then have exactly those holes.  Otherwise they are an upper bound: the searched count may be lower, and the holes to
    keep are those of the given value set.  A count from a literal table must equal the given holes."""
    key = MF.SET_KEY.get(line.get('value_set'))
    smaller = [MF.LIMB_SET_NAME[s] for s, bigs in MF.INCLUDED_IN.items() if key in bigs]
    given_holes = line.get('holes')
    exact = given_holes is not None and (line.get('holes_exact') or not any(given_holes))

    def fits(r, want):
        h = holes_of(r)
        if want is None:
            return True
        if exact or r['holes']['method'] == 'literal_table':
            return h == list(want)
        return all(x <= y for x, y in zip(h, want))

    given, want, tries, reason = None, given_holes, smaller + [line['value_set']], None
    if not exact:
        # the given value set fixes the holes to keep; if its search fails, a smaller set may still hold within the bound
        tries = smaller
        try:
            given = MF.record(construction(line), verified_date, table_max)
        except MF.Fail as e:
            reason = str(e)
        else:
            if not fits(given, given_holes):
                raise MF.Fail('holes_differ_from_input')
            want = holes_of(given)
    for name in tries:
        try:
            r = MF.record(construction(dict(line, value_set=name)), verified_date, table_max)
        except MF.Fail as e:
            reason = str(e) if name == line['value_set'] else reason or str(e)   # the given set's reason comes first
            continue
        if (holes_of(r) == list(want)) if given else fits(r, want):
            return r
        if name == line['value_set'] or reason is None:
            reason = 'holes_differ_from_input'
    if given:
        return given
    raise MF.Fail(reason)


def collect(outcomes):
    """(input line, record or Fail reason) pairs -> (records by id, excluded [{reason, construction}]).  Records with the same id
    are one record; prior_checker_version of the lines becomes the record's sorted prior_checker_versions."""
    records, excluded = {}, []
    for line, out in outcomes:
        if isinstance(out, str):
            c = dict({k: line[k] for k in INPUT_FIELDS if k in line}, id=input_id(line))
            if line.get('holes') is not None:
                c['holes_given'] = list(line['holes'])
            excluded.append({'reason': out, 'construction': c})
            continue
        r = records.setdefault(out['id'], out)
        if line.get('prior_checker_version'):
            r['prior_checker_versions'] = sorted(set(r.get('prior_checker_versions', [])) | {line['prior_checker_version']})
    return records, excluded


def prime_power(m):
    """(p, e) when m = p^e for a prime p, else None."""
    p = 2
    while p * p <= m and m % p:
        p += 1
    if p * p > m:
        return (m, 1) if m > 1 else None
    e = 0
    while m % p == 0:
        m //= p
        e += 1
    return (p, e) if m == 1 else None


def prime_power_summary(rows, excluded):
    """Per prime-power modulus and value set: the fewest-product record with holes and without, and the fewest-product
    left-out construction given without holes (with its reason), ordered by modulus, value set, kind."""
    best = {}
    def keep(key, entry, rank):
        if key not in best or rank < best[key][0]:
            best[key] = (rank, entry)
    for r in rows:
        pe = prime_power(r['modulus'])
        if pe is None:
            continue
        holey = bool(r['holes']['A'] or r['holes']['B'])
        vs = r['plane_sets']['A'][0]
        entry = {'modulus': r['modulus'], 'prime': pe[0], 'exponent': pe[1], 'value_set': vs, 'kind': 'holes' if holey else 'hole_free',
                 'products': len(r['products']), 'planes': [len(r['planes']['A']), len(r['planes']['B'])],
                 'holes': {k: r['holes'][k] for k in ('A', 'B', 'exact')}, 'id': r['id']}
        keep((r['modulus'], vs, entry['kind']), entry, (entry['products'], sum(entry['planes']), r['id']))
    for e in excluded:
        c = e['construction']
        pe = prime_power(c['modulus'])
        if pe is None or c.get('holes_given') != [0, 0]:
            continue
        entry = {'modulus': c['modulus'], 'prime': pe[0], 'exponent': pe[1], 'value_set': c['value_set'], 'kind': 'excluded',
                 'products': len(c['products']), 'planes': [len(c['planes']['A']), len(c['planes']['B'])], 'reason': e['reason'],
                 'id': c['id']}
        keep((c['modulus'], c['value_set'], 'excluded'), entry, (entry['products'], sum(entry['planes']), c['id']))
    order = {'hole_free': 0, 'holes': 1, 'excluded': 2}
    return [v[1] for k, v in sorted(best.items(), key=lambda kv: (kv[0][0], kv[0][1], order[kv[0][2]]))]


def inclusion():
    return {MF.LIMB_SET_NAME[s]: [MF.LIMB_SET_NAME[b] for b in bigs] for s, bigs in MF.INCLUDED_IN.items() if bigs}


def write_forms(records, output, excluded=(), chunk_bytes=CHUNK_BYTES):
    """Write the chunk files, forms-excluded.json and forms-index.json; excluded is a list of {reason, construction}."""
    rows = sorted(records, key=lambda r: (r['modulus'], len(r['products']), r['id']))
    if len({r['id'] for r in rows}) != len(rows):
        raise Invalid('duplicate_id')
    output.mkdir(parents=True, exist_ok=True)
    for old in output.glob('forms-*.json'):
        if CHUNK_NAME.match(old.name):
            old.unlink()
    chunks = []
    for part in chunks_of(rows, chunk_bytes):
        lo, hi = part[0]['modulus'], part[-1]['modulus']
        name = 'forms-%07d-%07d.json' % (lo, hi)
        write(output/name, {'schema_version': 2, 'data_version': DATA_VERSION, 'kind': 'modular_forms', 'solutions': part})
        chunks.append({'path': name, 'sha256': digest(output/name), 'solutions': len(part), 'modulus_min': lo, 'modulus_max': hi})
    excluded = sorted(excluded, key=lambda e: (e['reason'], e['construction']['modulus'], e['construction']['id']))
    reasons = Counter(e['reason'] for e in excluded)
    groups = [{'reason': k, 'note': NOTES.get(k, 'the construction failed this check'),
               'constructions': [e['construction'] for e in excluded if e['reason'] == k]} for k in sorted(reasons)]
    write(output/EXCLUDED_FILE, {'schema_version': 2, 'data_version': DATA_VERSION, 'kind': 'modular_forms_excluded', 'excluded': groups})
    write(output/'forms-index.json', {'schema_version': 2, 'data_version': DATA_VERSION, 'kind': 'modular_forms_index',
                                      'solutions': len(rows), 'chunks': chunks,
                                      'excluded': [{'reason': g['reason'], 'count': len(g['constructions']), 'note': g['note']} for g in groups],
                                      'excluded_list': {'path': EXCLUDED_FILE, 'sha256': digest(output/EXCLUDED_FILE)},
                                      'value_set_inclusion': inclusion(), 'prime_powers': prime_power_summary(rows, excluded)})
    return len(rows)


def build(inputs, output, verified_date, table_max=MF.TABLE_MAX, chunk_bytes=CHUNK_BYTES):
    date.fromisoformat(verified_date)
    outcomes = []
    for line in inputs:
        try:
            outcomes.append((line, minimal_record(line, verified_date, table_max)))
        except MF.Fail as e:
            outcomes.append((line, str(e)))
        except Invalid as e:
            outcomes.append((line, str(e)))
    records, excluded = collect(outcomes)
    return {'solutions': write_forms(list(records.values()), output, excluded, chunk_bytes),
            'failed': [{'line': n, 'reason': o} for n, (_, o) in enumerate(outcomes, 1) if isinstance(o, str)]}


def validator(name='modular-forms.schema.json', part=None):
    resources = [(p.name, Resource.from_contents(json.loads(p.read_text())))
                 for p in (SCHEMA_DIR/'modular.schema.json', SCHEMA_DIR/'modular-forms.schema.json',
                           SCHEMA_DIR/'modular-forms-index.schema.json')]
    schema = json.loads((SCHEMA_DIR/name).read_text())
    if part:
        schema = {'$id': schema['$id'], '$ref': '#/$defs/' + part, '$defs': schema['$defs']}
    return jsonschema.Draft202012Validator(schema, registry=Registry().with_resources(resources),
                                           format_checker=jsonschema.FormatChecker())


def check(root, rebuild=True, sample=None, seed=0):
    index = json.loads((root/'forms-index.json').read_text())
    if set(index) != INDEX_KEYS or index['kind'] != 'modular_forms_index' or index['schema_version'] != 2:
        raise Invalid('invalid_index')
    validator('modular-forms-index.schema.json').validate(index)
    listed = {c.get('path') for c in index['chunks']}
    if any(CHUNK_NAME.match(p.name) and p.name not in listed for p in root.glob('forms-*.json')):
        raise Invalid('unlisted_chunk')
    v = validator()
    rows, last = [], 0
    for c in index['chunks']:
        if set(c) != CHUNK_KEYS or not CHUNK_NAME.match(c['path']):
            raise Invalid('invalid_index')
        if c['modulus_min'] <= last or c['modulus_max'] < c['modulus_min']:
            raise Invalid('chunk_order')
        last = c['modulus_max']
        if digest(root/c['path']) != c['sha256']:
            raise Invalid('hash_mismatch')
        data = json.loads((root/c['path']).read_text())
        v.validate(data)
        part = data['solutions']
        ms = [r['modulus'] for r in part]
        if len(part) != c['solutions'] or ms != sorted(ms) or any(not c['modulus_min'] <= x <= c['modulus_max'] for x in ms):
            raise Invalid('count_mismatch')
        rows += part
    if len(rows) != index['solutions']:
        raise Invalid('count_mismatch')
    if len({r['id'] for r in rows}) != len(rows):
        raise Invalid('duplicate_id')
    lst = index['excluded_list']
    if set(lst) != {'path', 'sha256'} or lst['path'] != EXCLUDED_FILE or digest(root/EXCLUDED_FILE) != lst['sha256']:
        raise Invalid('hash_mismatch')
    left = json.loads((root/EXCLUDED_FILE).read_text())
    validator('modular-forms-index.schema.json', 'excluded_file').validate(left)
    excluded = [{'reason': g['reason'], 'construction': c} for g in left['excluded'] for c in g['constructions']]
    if [{'reason': g['reason'], 'count': len(g['constructions']), 'note': g['note']} for g in left['excluded']] != index['excluded']:
        raise Invalid('count_mismatch')
    if any(c['construction']['id'] != input_id(c['construction']) for c in excluded):
        raise Invalid('id_mismatch')
    if index['value_set_inclusion'] != inclusion() or index['prime_powers'] != prime_power_summary(rows, excluded):
        raise Invalid('summary_mismatch')
    picked = set(range(len(rows)))
    if sample is not None and sample < len(rows):
        picked = set(random.Random(seed).sample(range(len(rows)), sample))
    rebuilt = 0
    for i, r in enumerate(rows):
        full = rebuild and i in picked
        try:
            MF.check_record(r, rebuild=full)
        except MF.Fail as e:
            raise Invalid('record_%s:%s' % (r['id'], e))
        rebuilt += full
    return {'solutions': len(rows), 'chunks': len(index['chunks']), 'excluded': sum(e['count'] for e in index['excluded']),
            'rebuilt': rebuilt, 'valid': True}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest='command', required=True)
    b = sub.add_parser('build')
    b.add_argument('input', type=Path)
    b.add_argument('output', type=Path)
    b.add_argument('--date', default=date.today().isoformat())
    b.add_argument('--table-max', type=int, default=MF.TABLE_MAX)
    b.add_argument('--chunk-bytes', type=int, default=CHUNK_BYTES)
    c = sub.add_parser('check')
    c.add_argument('root', type=Path)
    c.add_argument('--quick', action='store_true', help='check ids and identities without rebuilding encodings')
    c.add_argument('--sample', type=int, help='rebuild only this many records, chosen at random')
    a = p.parse_args()
    if a.command == 'build':
        lines = [json.loads(x) for x in a.input.read_text().splitlines() if x.strip()]
        print(json.dumps(build(lines, a.output, a.date, a.table_max, a.chunk_bytes), sort_keys=True))
    else:
        print(json.dumps(check(a.root, rebuild=not a.quick, sample=a.sample), sort_keys=True))
