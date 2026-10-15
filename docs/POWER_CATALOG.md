# 冪の法を含む保存組と合同格納

`data/modular/powers.json` は旧目録を変更せず加える schema_version=2 の正本。元の候補生成器は実行しない。現在の入力の範囲で、保存組4件の63行と、固定したmod343の候補5行を25構成へ重複除去した。旧82構成とは、重み・面・積・係数・符号化表・面の法・累積の計画を比較して同一の記録は無かった。合わせて107構成・51種類の法・84保存組。

## 項目と測定

- `limbs_stored.A/B` は各リムをFP4に格納するか。`false` の内部の剰余リムを、FP4の15値へ制約しない。
- `plane_moduli.A/B` があれば、面の線形式をその法でSの値へ写す。各積の係数×面の法が全体の法の倍数になることも機械検査する。値を丸めたり切り捨てたりしない。
- `encoding` は剰余順の表。`null` は穴。`encoding_origin=fixed_construction_enumeration` は固定した重み・面・格納条件から検算器が作った表であり、元の実装が選ぶ表という主張ではない。
- `measurement.bits` はlog₂(法)の近似値（小数12桁）で、CRTの判定は法の積の厳密整数を使う。
- `measurement` は係数の合同恒等式のずれ、符号化不一致、片側ずつの穴の全値、各面の実使用値を保持する。符号化を持つ全剰余について検査する。生成表は再列挙して穴を照合する。全座標を省略する場合も、全ての面と重みの値を保存する線形恒等式を検査してから座標を減らす。
- `source_claims` は元の検算・穴・費用の主張。`verified` / `measurement` と分ける。`correction_rel_mma` は入力の順位台本が `flash_adds_per_MNK × 200 / products`（小数3桁）で計算した**仮定の比**であり実測値ではない。補正の手順の証明にはならず、未知の補正は `correction.kind=unspecified`、`measurement.correction_verified=null` とする。利用者の費用単価をこの仮定で自動設定しない。
- `accumulation_plan` は保存された2累積器の項・係数・`lam0`・`gamma`。復元係数との合同関係、各累積器の絶対値上界を検査する。無い構成は各積を別々にFP32に累積し整数復元する模型。`max_k=floor((2^24−1)/bound)` はこの模型の上界で、別の累積手順に転用しない。
- 組の `verification.max_k` は要求K・CRT条件・各構成の累積器条件の最小。ヘッダの `_k16384` の名前だけからK=16384の保証を作らない。
- `usage` はヘッダ照合の証跡と、`kind=run_summary` の実行要約の証跡を分ける。前者は一致した法の列と符号化表のヘッダhash、実行要約hashと状態。後者は元表・実行要約・期待hash表・engine名のhash、実行日、機器、形状、出力hashと照合方法。機器と日付だけを記録し、速度の値は取り込まない。`association=reported_table_name` は表の名前とsummaryのengine名の一致による対応であり、実行バイナリ内のLUTを照合したという主張ではない。`expected_and_baseline` と `baseline_only` を区別する。buildの過去の証跡も残し、一つでも確認済みの実行があれば「測定で使用」。手動で交換した組に元の使用札を引き継がない。
- 構成IDは数学的定義と符号化・累積計画のhash。出所・日付・元の測定主張を含めない。同一構成の各出所を `provenance` に束ねる。壊れた入力は出所と理由を `issues` に残し、意味の取れる恒等式不一致は構成を残して測定不一致を記録する。

## 再生成

`SAVED_TABLES` は保存された法の組の表、`FIXED_ROWS` は固定した候補のJSONL、`BUILD_EVIDENCE` はビルドの記録のディレクトリを指す。これらの入力は別途用意する。`--source` と `--folded-source` は繰り返し指定できる。後者の取り込み範囲は407行中のmod343だけで、`sources.selected_positions` に対象5行を保存する。
```sh
nice -n 10 taskset -c 0 .venv/bin/python -m tools.power_ingest \
  --source "$SAVED_TABLES/s2a53/moduli_set.json" \
  --source "$SAVED_TABLES/s2c53/moduli_set.json" \
  --source "$SAVED_TABLES/s2c53v2/moduli_set.json" \
  --source "$SAVED_TABLES/s2a57/moduli_set.json" \
  --folded-source "$FIXED_ROWS" --evidence "$BUILD_EVIDENCE" \
  --output build/powers.json --date 2026-10-12
nice -n 10 taskset -c 0 .venv/bin/python -m tools.check_powers build/powers.json
```

測定使用の追記は、`RUN_RESULTS` を追加された実行記録の `results` に設定し、次で再現する。符号化表・構成ID・Kの測定は変更しない。同じ証跡を再読しても重複しない。名前が異なるengineへの推測の対応付けは行わない。

```sh
nice -n 10 taskset -c 0 .venv/bin/python -m tools.run_usage \
  --catalog build/powers.json \
  --run "$SAVED_TABLES/s2a53/moduli_set.json" "$RUN_RESULTS/run-53/summary.json" \
  --run "$SAVED_TABLES/s2a57/moduli_set.json" "$RUN_RESULTS/run-57/summary.json" \
  --expected "$RUN_RESULTS/run-folded/src/expected.json" \
  --output build/powers.json
```

実出力JSONLがある場合は `kind=run_jsonl` として別に記録する。`association=header_hash_and_engine_manifest` は、srcのhash一覧→表の全法と符号化表、engine定義→実行開始時のengine情報→実出力の接続を検査したもの。`binary_sha256` は実行時に記録された共有ライブラリのhashであり、手元でバイナリを再build・再検査したという意味ではない。実出力全file・台本・完了記録・機器記録のhashを残す。`processes` は確認した出力file数、`checks` は全processで一致した形状ごとの出力hash。速度・絶対パス・GPU UUIDは転記しない。

`MATCHED_HEADER` は実行の `src/SHA256SUMS` と一致する表のヘッダを指定する。元の表と法の列・符号化表を照合してから使用記録を追加する。
```sh
nice -n 10 taskset -c 0 .venv/bin/python -m tools.jsonl_usage \
  --catalog build/powers.json --output build/powers.json \
  --source "$SAVED_TABLES/s2c53v2/moduli_set.json" \
  --run "$RUN_RESULTS/run-folded" --header "$MATCHED_HEADER"
```

現在の4組は53/57 bit用。78 bitでは保存済みの78 bitの組を使い、同じ法の候補だけという条件を外せば343などの構成が交換候補に出る。自動で新しい法の組を生成しない。
