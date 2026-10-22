# 公開データの読み方

公開の正本は `data/index.json` からたどる。schema は `data/schema/` にある。データの版と各fileのSHA-256を固定して使う。IDは数学データの正規形から決まり、日付や由来を含まない。

## 整数の構成

側 A の整数を `sum(weights.A[i] * limb[i])` と表す。リムは `limb_sets.A[i]` に属し、面 `planes.A[j]` はリムとの内積で、`plane_sets.A[j]` に属する。B 側も同様。各積は `products[k].a` と `.b` で面を選び、`.numerator` を掛け、総和を `denominator` で割る。

`domain.A/B` は保証する閉区間。`coverage` はその中の対称な半径。`widths` は対称な整数範囲 `[-(2^(M-1)-1), 2^(M-1)-1]` が入る最大の M を表す。通常の符号付き整数の最小値を含めて使う場合は、domain を直接確認する。対象の幅が異なる場合も両側の包含で選べる。

積の本数は products の長さ、面数は planes の長さ。混成形式は形式ごとの内訳を明示する。異なる形式の積に同じコストを暗黙に仮定しない。

## 検証

- `exhaustive_encoding_and_bilinear_identity`: 対象となる全整数の符号化を列挙で確かめ、係数行列の厳密な等式を確かめた。その組合せが全ての入力対の復元を証明する。
- `full_pairs`: 上記に加えて対象となる全対を実際に照合した。
- `coverage_proof_and_bilinear_identity`: 係数の式の一致と、構成規則に対する機械検査可能な被覆証明。全数確認できない幅だけに用いる。現時点では対応する証明検査器は未実装であり、この方法を名乗る入力は隔離する。
- `n_pairs`: 実際に照合した対数。代数証明だけの場合は0。
- `n_pairs_proven`: 証明が保証する対象対の数。

全対の値が一致しても、多項式としての係数が違えば不合格とする。片側の全数はA・B別々に対象範囲の全整数を確かめる。どの方法にも当たらないものは未検証区画に置く。

元データにある検証済みの印はコピーしていない。schema と検算器の検査を通った構成だけを公開正本へ入れる。未対応・証拠不足・資源制限の記録は理由を集計し、正本に混ぜない。

## 累積の十分条件

v1 は各積を別に累積する整数モデル。符号化は格納集合の昇順で列挙した最初の表現を選ぶ。その符号化で現れる各面の最大絶対値から積の絶対値上界を作り、24 bit の整数精度で全中間和が厳密になる十分条件を `max_k` に記録する。重み付き復元は厳密演算を前提とする。実機の動作保証や性能値ではない。元データの特別な符号化規則、共有累積器、未確定の上限式は流用しない。

## 由来と取り込み

由来は入力fileのhashと、その役割で選択した配列の1始まりの位置。JSONLでは行番号。取り込み report の sources がhashと役割を対応させる。原文の自由記述や作業用パスは含めない。

原データが明示的な面の積を持ち、係数だけを欠く場合は、有理数の連立一次方程式から係数を構成し、独立検算器で証明する。説明文のみの混成形式については、確認した入力hashに限定した数値テンプレートを用い、同じ検算を行う。

取り込みと再検算の例（入力は読み取り専用）:

```sh
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python -m tools.ingest \
  --inputs "$INPUTS" --output "$OUT" --date YYYY-MM-DD
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python -m tools.check_data "$OUT"
```

`--limit` を使った試験出力は `complete=false`。`complete=true` は取り込み対象の入力を切り詰めず処理したことを示す。全ての探索が完全であることや、隔離された構成がないことは意味しない。対象の入力は report の sources で確認する。公開前に全対象の会計と隔離理由を確認する。新たな取り込みは既存の出力ディレクトリを上書きしない。

S・A・B の格付けの表のschemaは `data/schema/board.schema.json`。解の参照先は `urn:awe:schema:solution:1` であり、JSON Schema validatorへ solution.schema.json をこのIDで登録して検査する。ID参照の存在・格付けをまたぐ重複と数学の再検算はbrowser importerで別途確認する。


## 法の構成と法の組

`index.json` の `modular` 参照をhash照合して読むと、`modular/index.json` にカタログのhashがある。`modular/catalog.json` の `solutions` はリム・面・復元係数・全剰余の符号化表、`sets` は法ごとの構成IDと絶対値bit数・Kを持つ。`schema/modular.schema.json` に形式を定義する。元の自由記述・性能情報・機械名・作業用パスは含めない。

`kind=modular` の `verified.method=full_pairs` は全剰余対の照合。`identity=modulo_p` が係数の合同恒等式、`encoding=all_residues` が片側ずつ全剰余の符号化を表す。整数構成の等号による恒等式や、53 bitの全整数対の逐次照合ではない。法の組全体の保証は、全整数を剰余へ写す規則と全剰余の表、互いに素、CRTの厳密範囲検査の組合せによる。

`magnitude_bits` は絶対値の上限 `2^M−1` を定める。整数構成の `widths` と同じ定義ではない。CRT積・整数範囲・K上限の大きな値は10進文字列。各積は別々に24 bit整数精度で累積し、復元とCRTは厳密整数演算とする。符号化の補正、面の合同折り返し、分母1以外はこの初版の対象外。対応する検算を通った保存済みの組だけを載せ、最少性・既存結果全体の網羅性は主張しない。

`input_inventory` は受領したfile群のhash付き棚卸しへの参照で、解の件数ではない。`copies` は異なる場所にある同一内容の数、`review_status=unreviewed` は棚卸しが意味を判定しないことを示す。追加入力の意味の検討は別の記録を参照する。

法のカタログの `intake` には各入力の採否と理由、元資料の表検査結果、保存された候補という位置付けを残す。`source_sha256` は公開構成のprovenanceと対応する。`declarations.scope_id` から `search_scopes` の有限範囲の宣言へ辿る。scopeがnullなら範囲宣言は未接続である。元の表検査の通過を独立検算の代わりにせず、表生成の適用対象外でも独立した数学的検査に通った構成はその違いを示す。隔離した組の一部を別の組として公表しない。

## 単独の法の構成

法の組に属さない法の構成は `modular/forms-index.json` からたどる。schema は `schema/modular-forms.schema.json`(各行)と `schema/modular-forms-index.schema.json`(索引と外した構成の一覧)。行は法の昇順に並び、約 2 MB ごとの file(`forms-<法の下限>-<法の上限>.json`)に分かれる。索引は各 file の法の範囲・SHA-256・件数を持つ。IDは `awem2_<hash>` で、数学の項から決まる。schema 1 の行はそのまま通る。

- **面の法と穴**: `plane_moduli` は各面の値が合えばよい法(法の約数)。法より小さい面の法は折り返しを表す。`holes.A/B` は符号化の無い剰余の数。`holes.method=search` は、法を法とする全部のリムのベクトルについて、面の値が各面の法で値の集合に入るかを調べた数で、厳密(`exact=true`)。`holes.method=literal_table` は、リムと面の値がそのまま値の集合に入る符号化だけの数で、折り返しの符号化を調べていないので、0 でなければ上界(`exact=false`)。穴が 64 個以下なら `hole_set` に剰余を並べる。
- **値の集合**: `plane_sets` は、その構成を確かめた一番小さい値の集合。`2xE2M1` は整数として `8xE2M3` にも `16xE3M2` にも含まれる(索引の `value_set_inclusion`)ので、`2xE2M1` の構成は FP6 の両方の値の集合でもそのまま成り立つ。FP6 で使える構成は、`2xE2M1` の行と FP6 の値の集合の行の和集合。
- **同じ形**: リムの並べ替えと符号、重みの単元倍、面の符号と並び、A と B の入れ替え、分母のうち法と互いに素な部分で移り合う構成は、同じ形として 1 行だけ持つ(値の集合ごとに数える)。法の目録(`catalog.json`・`powers.json`・`fp32.json`・`fp32-history.json`)に同じ形がある構成は、ここには入れない。
- **分母と復元**: 分母 `denominator` は `d1·d2` に分ける(`verified.den_split`。d1 は法の素因数だけでできた部分、d2 は法と互いに素)。検算はすべて `d1·m`(`verified.check_modulus`)を法として行う。`reconstruction.procedure=divide_d1_then_multiply_d2_inverse` の行は、積の和を `d1·m` を法として持ち、d1 で割り、d2 の法 m での逆数を掛ける手順だけを確かめている。和を分母·m を法として持ち、分母全体で割る手順は、この検算の対象外で、d2 > 1 の時に成り立たない組があり得る。d2 = 1 なら二つの手順は同じ。
- **符号化表**: 法が 256 以下の行だけが全剰余の表(`encoding`・`plane_values`)を持つ。ほかの行は `verify/modular_forms.py` が数学の項から作り直す。分母が法の単元でない行は、検算器の探索が表を作らないので、法が 256 以下の時に限り、リムと面の値がそのまま値の集合に入る表で全部の対を確かめ、その表を持つ。
- **外した構成**: 検算器で確かめ切れない構成は一覧に入れず、索引の `excluded` に理由ごとの数、`modular/forms-excluded.json` に各構成(ID は `awem2c_<hash>`、構成の項の SHA-256)を置く。一覧に無い事は、その構成が無い事や成り立たない事を意味しない。
- **素数べきの要約**: 索引の `prime_powers` は、素数べきの法と値の集合ごとに、積の一番少ない穴なしの行・穴ありの行と、穴なしとして渡され一覧の外にある構成を持つ。サイトの周期表はこれを読む。
- **出所**: `prior_checker_versions` は、`verify/modular_forms.py` が作り直す前に、その構成を確かめた別の厳密な検算器の版。ID と作り直しの比較には含まない。

再検算(全部の行を数学の項から作り直す。`--quick` は ID と恒等式だけ、`--sample N` は N 行だけ作り直す):

```sh
python -m tools.modular_forms check data/modular
```

## FP6 の法の組

`modular/fp6-sets.json`(schema は `schema/modular-fp6-sets.schema.json`)は、FP6 の値の集合で組む保存済みの法の組。各組は `value_set`(今は `8xE2M3`)を持ち、`solution_ids` が同じ file の `solutions` を順に指す。各構成は単独の法の構成と同じ schema 2 の行(`awem2_<hash>`)に `provenance` を足した物で、`verify/modular_forms.py` が、穴を変えない一番小さい値の集合の上で確かめる。単独の法の構成の一覧に同じ形があれば同じ ID になる。ただし一覧と違い、法が 256 を超えても全剰余の符号化表(`encoding`・`plane_values`)を持つ(法の目録の構成と同じく、サイトが組の構成の表を読むため)。一覧の schema は表を 4096 行までとするので、表は `modular-fp6-sets.schema.json` と作り直しの照合で確かめ、ほかの項目は一覧の schema で確かめる。`2xE2M1` の行は整数として `8xE2M3` に含まれるので、組の中でもそのまま成り立つ。組の `verification` は、法・法の積・CRT の範囲・K の上限(CRT の範囲、`k`、各構成の 24 bit 累積の上限の最小)・積と面の数を持つ。由来は入力 file の hash と、その組の中の 1 始まりの位置。

```sh
python -m tools.fp6_sets build "$INPUTS"/*.json --output data/modular/fp6-sets.json --date YYYY-MM-DD
python -m tools.fp6_sets check
```

## 検算結果の要約

取り込み時の再検算結果は、整数を `data/verification.json`、法を `data/modular/verification.json` に保存する。schema_version=2の記録は `counts`、`methods`（各方法の件数・verifier_version）、`date`（検算日）、`checks`（成功した検査の範囲）、`files`（対象の相対名・SHA-256）を持つ。機械名・性能値・元データの自由記述は含めない。整数の分割記録にあるcountは全体数なので、分割数倍しない。

`tools.check_data --record` は整数と参照する法を全件検査し、全検査の成功後だけ両方の記録を保存する。`tools.check_modular --record` は法だけの記録を保存する。`--record` を省略すれば検算器は記録を書き換えない。配布台本は記録とデータのhash・件数・方法が合うことを検査し、要約も配布する。記録の整合性検査自体は数学の再検算の代替ではない。
