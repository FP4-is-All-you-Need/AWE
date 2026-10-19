# AWE

AWE improves on base-13 limbs ([arXiv:2608.06812](https://arxiv.org/abs/2608.06812)), which split each integer into fixed radix-13 limbs that FP4 can store and multiply every pair of limbs. AWE chooses the limb weights freely and multiplies linear combinations of limbs, so an exact product needs fewer FP4 GEMMs (6 instead of 9 for INT8 × INT8); the method is described in [arXiv:2609.24519](https://arxiv.org/abs/2609.24519).

Exact constructions for arbitrary-width integer matrix products: limb weights, planes, products, reconstruction coefficients, and independently checked encoding domains.

Within the current input collection, the verified integer catalog contains 184,629 constructions; unsupported inputs are recorded separately. The original modular catalog contains 82 residue constructions and 80 saved sets, including 18 moduli / 62 products at K=8,192 and 21 moduli / 59 products at K=16,384. The supplemental [power-modulus catalog](data/modular/powers.json) adds 25 constructions and four saved sets (three at 53 bits, one at 57 bits), including folded planes and a construction with holes. Its measurements are recorded per construction; correction claims and build-only evidence are kept separate. Source decisions and declared search ranges accompany the data; unsupported inputs and scoped negative results remain pending. The inputs are a partial copy of existing search results; missing inputs do not establish nonexistence. This repository imports and verifies existing results and does not run new searches. No performance measurements are included.

- [Usage: Python, diagrams, explorer, verification](docs/USAGE.md)
- [Data and mathematical guarantees](docs/DATA.md)
- [Machine-readable access guide](llms.txt)

The static explorer shows weighted product tiles and expands a selection into plane combinations and exact coefficients. Shared JSON is rechecked in the browser before use. The Python package retrieves data using a pinned version and SHA-256, verifies constructions, and exports SVG, TikZ and matplotlib figures.

Verification runs at ingestion. The checked file hashes, counts, methods, dates and verifier versions are stored in [data/verification.json](data/verification.json) for integer constructions and [data/modular/verification.json](data/modular/verification.json) for modular constructions. The records accompany distribution files.

To recheck a checkout locally, use Python 3.10 or later. Original search inputs and a GPU are unnecessary. These Linux commands use one CPU at reduced priority; choose up to eight available CPUs if needed:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-verify.txt
VERIFY_CPUS=0
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 nice -n 10 taskset -c "$VERIFY_CPUS" \
  .venv/bin/python -m tools.check_data data --require-complete --record
```

A successful run prints `valid: true` and updates both verification records. Omit `--record` to leave files unchanged. The check validates file hashes, schemas, IDs, accounting, complete per-side encoding and reconstruction identities; modular constructions additionally check every residue pair and CRT bounds. It does not run a new search. For modular data alone:

```sh
nice -n 10 taskset -c "$VERIFY_CPUS" \
  .venv/bin/python -m tools.check_modular data/modular --record
```

The default language is English; select Japanese in the top-right menu or add `?lang=ja`. [URL controls](docs/URL_CONTROLS.md) reproduce a view. Use [JSON / JSONL exchange](docs/JSON_EXCHANGE.md) to share constructions and cost assumptions.

The supplemental modular catalog has its own schema and exact measurement record. Recheck its coefficient identities, per-side encodings, folded-plane storage, holes, accumulator bounds, CRT conditions and source accounting with:

```sh
nice -n 10 taskset -c "$VERIFY_CPUS" \
  .venv/bin/python -m tools.check_powers data/modular/powers.json
```

The command prints counts, methods, the ingestion date and verifier version; it does not modify the catalog. For folded planes, it also regenerates encodings for the fixed stored construction. A valid identity on covered residues does not certify an unknown correction for holes. [Supplemental field definitions and reproduction](docs/POWER_CATALOG.md).

Explore the catalog at **https://fp4-is-all-you-need.github.io/AWE/**. `npm --prefix site run build:pages` prepares and audits the static distribution locally. [Build and publish the static site](docs/PAGES.md).

The [FP32 set](data/modular/fp32.json) records a measured 24-bit construction: 12 moduli, 28 products, 24 planes per side, and a CRT bound of K ≤ 9,180. It includes the source tree ID, table hashes and measurement hashes. Recheck all 79,355 residue pairs and the CRT bounds without the original inputs:

```sh
nice -n 10 taskset -c "$VERIFY_CPUS" \
  .venv/bin/python -m tools.check_fp32 data/modular/fp32.json
```

This checks the stored mathematics; the measurement association is recorded separately in `evidence`.

The [FP32 modulus-set records](data/modular/fp32-history.json) contain 16 distinct sets and their engine, width, K limit and routine records. Failed precision checks are retained separately from the exact residue checks. See [the source report](docs/FP32_HISTORY.md). Recheck the 328,333 residue pairs with `python3 -m tools.check_fp32 data/modular/fp32-history.json`.

The [single modular constructions](data/modular/forms-index.json) are constructions for one modulus outside the saved sets: 7,088 constructions, 6,593 on 2×E2M1 (FP4) and 495 that need FP6 values (284 on 8×E2M3, 211 on 16×E3M2), with folded planes, holes and denominators. Each row names the smallest value set it was checked on; FP4 values are FP6 values as integers, so an FP4 construction also holds on FP6. Each construction appears once: constructions related by limb permutations and signs, unit multiples of the weights, plane signs and order, or swapping A and B are one row, and constructions already in the modular catalog are not repeated. Encoding tables are stored for moduli up to 256 and rebuilt by the verifier otherwise. The 2,171 constructions the public verifier cannot check are listed with their reasons in [forms-excluded.json](data/modular/forms-excluded.json); their absence from the catalog does not establish nonexistence. Recheck the identities and ids, or rebuild every construction:

```sh
.venv/bin/python -m tools.modular_forms check data/modular --quick
.venv/bin/python -m tools.modular_forms check data/modular
```

[Field definitions](docs/DATA.md).

## License

Source code and catalog data are available under the [MIT License](LICENSE).
