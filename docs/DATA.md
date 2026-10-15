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

段の表のschemaは `data/schema/board.schema.json`。解の参照先は `urn:awe:schema:solution:1` であり、JSON Schema validatorへ solution.schema.json をこのIDで登録して検査する。ID参照の存在・段をまたぐ重複と数学の再検算はbrowser importerで別途確認する。


## 法の構成と法の組

`index.json` の `modular` 参照をhash照合して読むと、`modular/index.json` にカタログのhashがある。`modular/catalog.json` の `solutions` はリム・面・復元係数・全剰余の符号化表、`sets` は法ごとの構成IDと絶対値bit数・Kを持つ。`schema/modular.schema.json` に形式を定義する。元の自由記述・性能情報・機械名・作業用パスは含めない。

`kind=modular` の `verified.method=full_pairs` は全剰余対の照合。`identity=modulo_p` が係数の合同恒等式、`encoding=all_residues` が片側ずつ全剰余の符号化を表す。整数構成の等号による恒等式や、53 bitの全整数対の逐次照合ではない。法の組全体の保証は、全整数を剰余へ写す規則と全剰余の表、互いに素、CRTの厳密範囲検査の組合せによる。

`magnitude_bits` は絶対値の上限 `2^M−1` を定める。整数構成の `widths` と同じ定義ではない。CRT積・整数範囲・K上限の大きな値は10進文字列。各積は別々に24 bit整数精度で累積し、復元とCRTは厳密整数演算とする。符号化の補正、面の合同折り返し、分母1以外はこの初版の対象外。対応する検算を通った保存済みの組だけを載せ、最少性・既存結果全体の網羅性は主張しない。

`input_inventory` は受領したfile群のhash付き棚卸しへの参照で、解の件数ではない。`copies` は異なる場所にある同一内容の数、`review_status=unreviewed` は棚卸しが意味を判定しないことを示す。追加入力の意味の検討は別の記録を参照する。

法のカタログの `intake` には各入力の採否と理由、元資料の表検査結果、保存された候補という位置付けを残す。`source_sha256` は公開構成のprovenanceと対応する。`declarations.scope_id` から `search_scopes` の有限範囲の宣言へ辿る。scopeがnullなら範囲宣言は未接続である。元の表検査の通過を独立検算の代わりにせず、表生成の適用対象外でも独立した数学的検査に通った構成はその違いを示す。隔離した組の一部を別の組として公表しない。

## 検算結果の要約

取り込み時の再検算結果は、整数を `data/verification.json`、法を `data/modular/verification.json` に保存する。schema_version=2の記録は `counts`、`methods`（各方法の件数・verifier_version）、`date`（検算日）、`checks`（成功した検査の範囲）、`files`（対象の相対名・SHA-256）を持つ。機械名・性能値・元データの自由記述は含めない。整数の分割記録にあるcountは全体数なので、分割数倍しない。

`tools.check_data --record` は整数と参照する法を全件検査し、全検査の成功後だけ両方の記録を保存する。`tools.check_modular --record` は法だけの記録を保存する。`--record` を省略すれば検算器は記録を書き換えない。配布台本は記録とデータのhash・件数・方法が合うことを検査し、要約も配布する。記録の整合性検査自体は数学の再検算の代替ではない。
