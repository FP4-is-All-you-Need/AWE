# 画面を再現するURLとフォーム

値を変えるとURLを書き換える。新しい計算や探索は開始しない。`lang=en`が既定、`lang=ja`で日本語。以下のnameを持つフォームの操作からも同じ状態にする。

| 対象 | フォーム / name | URL |
|---|---|---|
| 精度・bit・K | selection / precision, b, K | 同名 |
| A/B別範囲 | selection / same_inputs, precision_b, b_b | 同名、same_inputsは1/0 |
| 幅の組 | widths / input_ma, input_mb | 同名 |
| 選択する段・タイル | tile / view, slot | 同名、slotは0始まり |
| 非被覆率 | coverage / hole_pct_max | 同名、単位%、小数可 |
| 右の候補 | candidates / prime, same_modulus | 同名、prime=0は全て、same_modulusは1/0 |
| 手動入替え | visual_actions / replacement_id | replace=段ID:slot:構成ID（複数可） |
| 行列のサイズ | matrix.構成ID / matrix_m, matrix_n, matrix_k | matrix_m, matrix_n, K |
| 費用 | cost / cost_product, cost_plane, cost_add, cost_correction, cost_frequency, cost_modulus, cost_output | 同名。空欄は未設定 |
| 費用の条件 | cost / cost_addition_model, cost_model, cost_stage_項, cost_overlap_段 | 同名。段0は直列、段1〜3が同時実行、重なり率は0〜1 |
| 費用欄の行列サイズ | cost / cost_m, cost_n, cost_k | matrix_m, matrix_n, K |
| 展開の積・値の帯 | expansion.構成ID / product_index, plane_values | product_index.構成ID（0始まり）、plane_values.構成ID（1/0） |
| 構成の符号化 | encoding.構成ID / encode_value, encode_side, encode_zoom | 各name.構成ID。data-url-keyにも明記 |
| 図1の保存表 | encoding_example / encode_integer, encode_method, encode_scale | 同名 |
| 図の直接項 | 行列の格子 | matrix_term.構成ID=i,j |
| 整数構成の選択 | visual_actions / integer_id, include_mixed | 同名、include_mixedは1/0 |
| 穴あり比較 | visual_actions / joint_id | 同名 |
| 精度の帯の基準 | 精度選択に連動 | precision_basis（任意bへ変更しても直前の形式を保持） |
| 節の開閉 | details / data-section | open.節ID=1または0 |

各スライダーのnameは対応する数値欄のnameに`_range`を足す。Kスライダーの位置はlog2(K)で、URLと数値欄の値はK自体。図のクリックは同じ選択状態を更新する。URLだけでは別のブラウザに利用者が読み込んだ構成の本体を運べないため、本体を含むJSON/JSONLも共有する。

INT8との横並び比較では、構成ごとの操作引数に `compare.selected.` または `compare.int8.` を前置する（例: `compare.selected.product_index.<id>=2`）。開閉は `open.compare.selected.detail.<id>=1` の形。本体と比較で選択を独立に保ち、M/N/Kだけを共有する。

図4と精度の選択は共通状態。`input_ma/input_mb` は本文の整数幅（FP32=25、FP64=54）で、図の参照札24/53とは分ける。矛盾するURLでは明示された `b/b_b` を優先し、幅・精度名を正規化してURLへ書き戻す。bが省略され、precisionだけ指定された場合はその形式の既定b。`map_method=awe|crt` は下側/上側の選択、`width_results=1|0` は保存整数構成の検索結果の開閉状態。図で省略された幅は新しいセルを作らず、省略中の説明を表示する。
