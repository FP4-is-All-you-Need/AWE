# 取得・検算・画面の確認

サイト: https://fp4-is-all-you-need.github.io/AWE/ 。性能やGPU実装は扱わない。

## Python

Python 3.10 以上で `python -m pip install .`。runtime依存はない。元の入力は取得機能に不要。

```python
from awe_catalog import Catalog, verify, example
c = Catalog('data', version='0.1.0', index_sha256='選んだcommitの目次のSHA256')
hits = c.find(a=8, b=8, products=6)
s = c.get(hits[0]['id'])
verify(s)
print(example(s, 7, -3))
```

目次のhashは選んだ版の `sha256sum data/index.json` で取得する。未固定の最新版から取ったhashだけでは期待した版への固定にならない。HTTPSのデータルートも指定できる。各shardは目次のhashで検査してから読む。

`python -m awe_catalog --help` でCLIを確認する。共通引数 `--data data --version 0.1.0 --index-sha256 HASH` の後に `find`、`get ID`、`verify ID`、`example ID --a 7 --b -3` を指定する。`svg ID --output figure.svg`、`tikz ID --output figure.tex`、`matplotlib ID --output figure.py` で全セルの正確な寄与と面を出力する。生成したPython図は `pip install -r requirements-figures.txt` で描画用依存をそろえた環境で `python figure.py --output figure.png` とする。

`constants ID --output constants.json` は、版・目次hash・IDと数値定数を保存する。利用側はこの参照を固定し、再検算してから自身の型・定数へ変換する。kernelや共有累積の仮定は自動では付与しない。

## 小さい画面試験

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-verify.txt
.venv/bin/python -m tools.preview_data build/preview-data
npm --prefix site ci
npm --prefix site test
npm --prefix site run build:preview
```

previewは4件の独立検算済みの例であり、全カタログとは明示的に区別する。Node 22.12以上を使用する。ブラウザ試験はPlaywrightのChromiumを用意し、`playwright test --config site/playwright.config.mjs`。生成した `site/dist` を静的HTTPサーバーで開く。通常のブラウザ以外にデータを送信しない。

## 正本と配布準備

この取り込みでは新しい解・法の組の探索をどの環境でも実行しない。入力は既存探索結果の一部の写しであり、件数・最少積数は「今の入力の範囲では」の値である。入力に無い結果の存在・非存在は、この目録からは判断できない。

取り込みと棚卸しは `--inputs` を繰り返して、既存結果の入力ルートを追加できる。各ルートは `solutions/` または `modsets/` を含む読み取り専用のディレクトリとする。整数取り込みは既知の `solutions/` の相対名・形式だけを扱い、主一覧が無い部分的な写しも読める。新形式を推測して変換しない。符号化表付きの法の形式は後述の `tools.modular_ingest` で扱い。未対応の形式は理由付きで別に記録する。

```sh
python -m tools.ingest --inputs "$INPUTS" --inputs "$EXTRA_INPUTS" --output "$OUT" --date 2026-10-10
python -m tools.source_scope --inputs "$INPUTS" --inputs "$EXTRA_INPUTS" --report "$OUT/report.json" --output "$OUT/source-scope.json"
```

上記の全数取り込みはローカルで実行し、各コマンドに `nice -n 10 taskset -c "$VERIFY_CPUS"` を付ける。`VERIFY_CPUS` は利用可能な最大8 coreの集合とし、並列の処理を含め合計で制限する。`OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1` も指定する。入力先を含む出力先への書き込みは拒否する。同じ内容のファイルはSHA-256で一度だけ数え、異なるファイルの同じ構成は由来を保持して重複に数える。棚卸しも同一内容単位で数える。`complete` は指定した既知形式の全行を処理した意味であり、探索結果全体の網羅性や全形式への対応を意味しない。

全数検査は同じ資源制限を付けて `python -m tools.check_data data --require-complete --shard N --shards 8` を N=0..7 に実行する。すべて成功してから検索索引を `python -m tools.search_index data --check` で照合する。全処理をnice付き・合計8 core以下に制限する。

`npm --prefix site run build` は正本データを含むdistを作る。`python -m tools.site_bundle --data data --assets site/dist --output build/distribution` は検算済み正本と組み合わせ、配布fileのhash目次を作る。既存出力への上書き・previewを含むassetは拒否する。full buildとpreview buildは別に実行する。

検算は取り込み時に実行し、結果の要約をdataに保存する。ライセンスは[MIT](../LICENSE)。

wheelの再現には `pip install setuptools==80.9.0 wheel==0.45.1` の後、`pip wheel --no-deps --no-build-isolation --wheel-dir build/wheel .` を使用する。生成wheelを別のsite-packagesへインストールして取得・純粋Python検算を確認する。

Pythonの `ensurepip` が無い環境では、既存の `uv` を使い `uv venv --python python3 .venv` と `uv pip install --python .venv/bin/python -r requirements-verify.txt` で同じ固定依存を入れられる。Node試験は `tools.preview_data` の生成後に実行する。ブラウザーの共有ライブラリーが足りず管理者権限が無い場合は、配布元のOSパッケージを `build/browser-libs/` へ展開し、試験時の `LD_LIBRARY_PATH` だけで参照できる。これらは生成用環境の準備であり、配布物の依存追加ではない。


## 法の組の取得と再検算

`Catalog.find_modular(bits=53, k=16384)` は今の入力の範囲にある法の組をコスト順で返す。`product_cost` と `plane_cost` で順位を変えられる。`get_modular(id)` は法の組または法ごとの構成を取得し、`verify_modular_set(id)` は法ごとの全剰余対とCRT範囲を再検査する。`magnitude_bits` は `|A|,|B|≤2^M−1` のMで、整数一覧の幅とは区別する。

CLIの共通引数の後に `find-modular --bits 53 --k 16384`、`get-modular ID`、`verify-modular-set ID`。法ごとのIDには `verify-modular ID`、`example-modular ID --a -123 --b 456`、`svg-modular ID --output figure.svg`、`tikz-modular ID --output figure.tex`、`matplotlib-modular ID --output figure.py` が使える。図の各セルの係数和は合同式として読む。

既存の選択結果を追加するには、`python -m tools.modular_ingest --source "$SET_A" --source "$SET_B" --output "$MODULAR_OUT" --date YYYY-MM-DD` とする。`--source` は繰り返し指定できる。`python -m tools.check_modular "$MODULAR_OUT" --record` の独立した再検算後にのみ正本へ入れる。台本は保存済みの `choices.signed_magnitude_M` の組を読むだけで、新しい法の組を選ばない。読み取り専用の元ファイルを変更しない。計算には前述のnice・core制限を付ける。

追加の任意配置のfile群は `python -m tools.input_manifest --inputs "$MORE_INPUTS" --output build/input-manifest.json` で棚卸しできる。`--inputs` は繰り返せる。これは内容の重複検査であり、解や否定証明としての採用ではない。

宣言付きで保存された選択群は、次のように元の2組と合わせて取り込む。`EXPORT` は `sets_index.json` と `sets/` を持つ配布候補のdirectory、`SCOPE` はその探索範囲の宣言fileを指定する。宣言のhashが `tools/reviewed_search_scopes.json` に一致する物だけを受け入れる。未知の宣言は元の定義を確認して数値・用語をレビューしてから追加する。

```sh
python -m tools.modular_collection --source "$SET_A" --source "$SET_B" \
  --export "$EXPORT" --scope "$SCOPE" --output build/modular-more --date 2026-10-10
python -m tools.check_modular build/modular-more --record
```

各コマンドに前述のnice・core制限を付ける。出力の `intake` と `search_scopes` も保存し、`Catalog.modular_catalog()` からprovenanceと結び付けて取得できる。ファイルの写し、同一の数値構成、元資料の不採用/未対応、今回の検算不合格を混ぜて数えない。

取り込み時の最終再検算と記録保存は `python -m tools.check_data "$OUT" --require-complete --record` および `python -m tools.check_modular "$MODULAR_OUT" --record`。いずれも成功時だけ検算記録を保存する。整数の `--record` は全件を処理する分割なしの実行専用で、部分検査では使えない。記録の読解はDATA、利用者向けの実行例はREADMEを参照する。

Pages用は `npm --prefix site run build:pages` を使う。公開用メタデータ・容量・語彙を検査する手順と、`/AWE/` の操作試験は [PAGES.md](PAGES.md)。この命令はdeployしない。
