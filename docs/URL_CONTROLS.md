# 画面を再現するURLとフォーム

値を変えるとURLを書き換える。新しい計算や探索は開始しない。`lang=en`が既定、`lang=ja`で日本語。以下のnameを持つフォームの操作からも同じ状態にする。

| 対象 | フォーム / name | URL |
|---|---|---|
| 精度・bit・K | selection / precision, b, K | 同名 |
| A/B別範囲 | selection / same_inputs, precision_b, b_b | 同名、same_inputsは1/0 |
| 幅の組 | widths / input_ma, input_mb | 同名 |
| 比較する組・構成の番号 | tile / view, slot | 同名、slotは0始まり |
| 非被覆率 | coverage / hole_pct_max | 同名、単位%、小数可 |
| 右の候補 | candidates / prime, same_modulus | 同名、prime=0は全て、same_modulusは1/0 |
| 手動入替え | visual_actions / replacement_id | replace=組ID:slot:構成ID（複数可） |
| 行列のサイズ | matrix.構成ID / matrix_m, matrix_n, matrix_k | matrix_m, matrix_n, K |
| 費用 | cost / cost_product, cost_plane, cost_add, cost_correction, cost_frequency, cost_modulus, cost_output | 同名。空欄は未設定 |
| 費用の条件 | cost / cost_addition_model, cost_model, cost_stage_項, cost_overlap_実行段階の番号 | 同名。実行段階0は直列、実行段階1〜3が同時実行、重なり率は0〜1 |
| 費用欄の行列サイズ | cost / cost_m, cost_n, cost_k | matrix_m, matrix_n, K |
| 展開の積・値の帯 | expansion.構成ID / product_index, plane_values | product_index.構成ID（0始まり）、plane_values.構成ID（1/0） |
| 構成の符号化 | encoding.構成ID / encode_value, encode_side, encode_zoom | 各name.構成ID。data-url-keyにも明記 |
| 図1の保存表 | encoding_example / encode_integer, encode_method, encode_scale | 同名 |
| 図の直接項 | 行列の格子 | matrix_term.構成ID=i,j |
| 整数構成の選択 | visual_actions / integer_id, include_mixed | 同名、include_mixedは1/0 |
| 構成の選択 | forms_id | 法付きの構成 ID、または joint_旧ID。旧 joint_id は同じ形に転送 |
| 精度の帯の基準 | 精度選択に連動 | precision_basis（任意bへ変更しても直前の形式を保持） |
| 周期表の層 | prime_layers / prime_set, prime_forms, prime_holes | 同名。prime_setはfp4/fp6、prime_formsとprime_holesは1/0 |
| 単独の法の構成の一覧 | forms_filters / forms_m, forms_holefree, forms_page | 同名。値の集合は最上部の prime_set と periodic_fp6 に従う。forms_pageは1始まりの表示（URLは0始まり） |
| 節の開閉 | details / data-section | open.節ID=1または0 |

各スライダーのnameは対応する数値欄のnameに`_range`を足す。Kスライダーの位置はlog2(K)で、URLと数値欄の値はK自体。図のクリックは同じ選択状態を更新する。URLだけでは別のブラウザに利用者が読み込んだ構成の本体を運べないため、本体を含むJSON/JSONLも共有する。

INT8との横並び比較では、構成ごとの操作引数に `compare.selected.` または `compare.int8.` を前置する（例: `compare.selected.product_index.<id>=2`）。開閉は `open.compare.selected.detail.<id>=1` の形。本体と比較で選択を独立に保ち、M/N/Kだけを共有する。

図4と精度の選択は共通状態。`input_ma/input_mb` は本文の整数幅（FP32=25、FP64=54）で、図の参照札24/53とは分ける。矛盾するURLでは明示された `b/b_b` を優先し、幅・精度名を正規化してURLへ書き戻す。bが省略され、precisionだけ指定された場合はその形式の既定b。`map_method=awe|crt` は下側/上側の選択、`width_results=1|0` は保存整数構成の検索結果の開閉状態。図で省略された幅は新しいセルを作らず、省略中の説明を表示する。

## 法の螺旋表示

`section=polar-periodic` で開く。法を整数順に一つずつ配置する。目録に構成が無い法や表示条件から外れた法も位置を残し、中の空いた丸だけを描く。その位置に札は足さない。収録済みの法の札は回転させない。図の中心には文字を書かず、選んだ法は既存の詳細欄に表示する。

既定は `polar_spacing=linear`、1周目13個、始まりの法2、表示上限169位置（2〜170）。上限は未収録を含む整数の位置の数で、収録法の数ではない。FP4 / FP6 の変更や穴・合成数の条件は塗る構成だけに作用し、法の位置は動かさない。

| URL parameter | 意味 | 初期値 | 範囲 |
|---|---|---|---|
| `polar_spacing` | 周の切り方 | `linear` | `linear`, `powers`, `arc` |
| `arc` | 角度幅と厚みの補間 | `arith` | `arith`, `geom`, `step`（旧表示） |
| `polar_color` | 色の意味 | `prime` | `prime`, `products`, `tier` |
| `polar_mark` | 積と面の見せ方（比較案） | `top` | `top`, `thickness`, `gauge`, `none`（旧 `square` は `gauge` で開く） |
| `polar_top` | `polar_mark=top` で太い□にする上位の割合（%） | `10` | 1〜100 の整数 |
| `polar_factors` | 素因数の表示。`exponent`・`repeat` は素因数と指数（`polar_color=prime` の時）、`dots`・`bands` は種類数だけ | `exponent` | `exponent`, `repeat`, `none`, `dots`, `bands` |
| `polar_count` | 未収録を含む整数の位置の上限個数 | `169` | 1〜65,535 の整数 |
| `polar_cell_width` | 弧の長さ w（arc のみ） | `24` | 8〜80 |
| `polar_spiral_growth` | 半径の増分 b（1 radian 当たり） | `5` | 1〜12 |
| `polar_inner_radius` | 初期半径 r0 | `36` | 24〜100 |
| `polar_base` | 1周目の個数 B（linear）/ 底 B（powers） | `13` | 2〜32 の整数 |
| `polar_band_width` | 初期の帯の厚み / 周回の間隔 | `0.85` | 0.1〜1 |
| `polar_taper` | 外へ薄くする度合い t（0なら一定。半幅は 1/(1+t·周回数) 倍） | `0.1` | 0〜1 |
| `polar_start` | 表示を始める整数の法 | `2` | 2〜65,536 の整数 |
| `polar_layout` | 螺旋 / 同心円 | `spiral` | `spiral`, `rings` |
| `polar_tier` | 帯の太さが一定 / 指標に合わせる | `color` | `color`, `width` |
| `polar_size` | 構成選択と太さの指標 | `products` | `cost`, `products`, `products_per_bit`, `constant` |
| `polar_composites` | 合成数の表示 | `all` | `all`, `saving` |
| `polar_holes` | 穴の割合の上限（%） | `0` | 0〜100 |
| `polar_modulus` | 詳細で選ぶ法 | `13` | 2〜65,536 の整数 |
| `polar_form` | 選んだ法で詳細に出す構成の id（候補の欄か拡大した区画の段で選ぶ） | 空（他に支配されない構成のうち費用が最も小さいもの。同じなら リム A+B が少ないもの、次に id） | 構成の id。選んだ法の候補に無い id は既定に戻る。候補の欄・拡大した区画の段・螺旋の下の詳細は同じ構成を指す |
| `polar_frame_height` | 図の枠の高さ（px。枠の下端のドラッグで替わる） | `0`（図に合わせる） | 0〜4,000 の整数 |
| `polar_side` | 右の欄を開くか | `1` | `1`（開く）, `0`（閉じる） |
| `polar_side_width` | 右の欄の幅（px。欄の境のドラッグで替わる） | `340` | 240〜720 |

画面の操作は同じURLを更新する。範囲外・空文字・非数値は初期値へ戻る。旧 `polar_period`, `polar_period_bits`, `polar_end`, `polar_radius_growth` は無視する。拡大・縮小スライダー（0.5〜64倍）で拡大しても図の左上を枠の左上に保ち、入らない所は枠の中を scroll して見る。「選択した法を拡大」を押した時だけ、選んだ区画が枠の中央に来る。拡大率はURLには保存しない。図の説明は「図の読み方」の欄にあり、既定で閉じている。`open.polar-reading=1` で開いた状態から始まる。

### 座標と厚みの定義

`site/src/ribbonGeometry.ts` の `integerModuli(start,count)` は始まりの法から順に整数を返す（最大65,536まで）。`modulusRibbonCell(m,moduli,parameters,widthScale=1)` は列内の法に対するSVG経路を返し、`ribbonCell(index,parameters,widthScale,moduli)` は角度、内外の半径、中心、周番号、弧の区間、面積の近似値も返す。表示列に無い法はnull。

以前の表示 `polar_spacing=powers&arc=step` では、整数の法 $m\ge2$、整数の底 $2\le B\le32$ に対し、$B^j\le m<B^{j+1}$ となる周 $j$ を使う。周の下端は $L=\max(2,B^j)$、個数は $n=B^{j+1}-L$、位置は $k=m-L$。切れの角度は $2\pi(j+k/n)$ から $2\pi(j+(k+1)/n)$ まで。図の上から時計回りに進む。この個数には未収録の整数も含み、表示上限やフィルターで角度を変えない。

powersの底13は2〜12、13〜168、169〜2196という区間。底10は2〜9、10〜99、100〜999、底11は2〜10、11〜120、121〜1330。底の変更は区間と各法の角度を変える。

螺旋の中心線は $r(\theta)=r_0+b\theta$。半幅は $h(\theta)=\min(\pi b\,\text{polar_band_width},0.4r_0)/(1+t\theta/(2\pi))$。arcと旧表示はこの値を各頂点で計算する。linear/powersの等差・等比はこの半幅を周の両端の値に使い、整数の周内の位置で補間する。法線方向の両側へ半幅を取る。既定の $t=0.2$ では外へなめらかに薄くなり、冪の境界で幅を切り替えない。指標を幅で示す場合は、さらに各構成の倍率を掛ける。面積は半幅両端の平均と弧長からの近似値で、等面積は保証しない。

arcでは、i番目の整数の位置を中心線の弧長 $iw$ から $(i+1)w$ までに置く。弧長は `spiralArcLength`、逆関数は `spiralAngle` で求める。同心円optionは従来の円ごとの半径を使い、powersの整数位置と札の正立を維持する。

穴ありは斜線、合成数は紫の破線。成分の積の和より積が少ない合成数を強調し、それ以外は細い縁にする。色は積の本数かtierを表し、費用が未確認でも積の本数が分かればその色を使う。比較未確認の数値は作らない。細かい札は間引くが回転させない。

比較URL: `?section=polar-periodic&polar_base=10`、`polar_base=11`、`polar_base=13`。いずれも同じ連続的な厚みの規則を使う。`polar_spacing=arc` で弧長による配置に戻せる。

## 分子の表の行の選択

`section=composite-table` で開く。`molecule_page_size` は一ページの件数（既定 15、整数 1〜100）。`molecule_modulus` は選ぶ合成数の法。行のボタンで選ぶと、表の下の details に成分ごとの積の和と、まとめた積を並べる。面・リムは積が最少の形で数え、費用は別に最少を選ぶ。

図は、まとめた構成を成分ごとの法で見たもの。分母の逆数があり、面の折り返しがその項の値を変えず、双線形の係数が重みの積と一致する成分だけを結ぶ。成分ごとに独立に選んだ最少の構成とのリム・符号化の一致は仮定しない。共有する項の数と、減った積の数は別の量。

## 旧リンクと整数の構成

旧 `joint_id=<id>` は、保存した4形の対応表を使って `forms_id=joint_<id>&section=modular-forms` に転送する。元の `joint_` 付きの構成 ID を保つため、展開の積の選択などの引数も引き継ぐ。整数の範囲・穴・符号化・補正は元のまま。法を割り当てず、構成の一覧の「穴のある整数の構成（法の指定なし）」に出す。

法付きの行もクリックして Expansion を開ける。保存された符号化表が無い構成には、表を補わない。

## 入れ替え候補への移動

候補欄の `section=candidates.積数最少` などは、CRT の組と構成の位置が選ばれて候補欄が存在する場合、右のパネルも開いて移動する。`swap=0` と両方を指定した場合は、明示した節への移動を優先する。左の目次から候補の見出しを選んでも同じ動作になる。目次では、候補の見出しは入れ替える構成の詳細の節の下に番号を付けて並ぶ。候補が無い条件では見出し自体を作らない。見出しの末尾の数は現在は候補の件数。


## 分子の格子の図

`section=composite-table&molecule_modulus=510` で法 510 の図を開く。既定の図は行 A・列 B のリムの組の格子。大きさと番号は元の構成の保存順から出す。`molecule_grid_color=components|products` はセルの色を指定する（既定 `components`）。`components` は成分ごとと複数成分への寄与、`products` は既存の Expansion と同じ保存済みの積の色。成分が二つなら専用色二つと重なる部分の色で三色となり、成分が増えれば専用色も増える。

各セルには寄与する積の番号を表示する。T・面・リムは保存順の0始まりで、Expansion の T0 と同じ積を指す。格子または T のボタンを選ぶと、復元係数・A/B の面番号・面のリム係数・使うリム・積と面が寄与する成分を表示する。共有する積・面・リムの数は閉じた流れの図を開かず確認できる。複数の成分に寄与するセルと、その中で同じ積を共有するセル（●）を分ける。色は打ち消し前の各積の係数を各素数べきの法で照合した結果で、合算した係数とは異なる。照合できない成分は ? と表示する。 `products` のまとめた格子は、成分への寄与が未確認でも保存した面の支持セルを描く。各成分の格子では照合できた寄与だけを描き、未確認をゼロや共有と扱わない。格子・積のボタン・閉じた流れの図は同じ積の選択を共有する。

「各成分で見た同じ格子」「既存の積の配色による展開」「つながり：リム → 面 → 積 → 成分」は閉じた details に残す。保存記録に CRT-2 の段順や途中の剰余は無いため、復元順の図は生成しない。

候補の `section=candidates.積数最少` は既存のまま。見出しは「積数最少（N 積）：M 件」で、積数と候補件数を区別する。


## FP6 の族ごとの構成

`prime_set=fp6&periodic_fp6=8xE2M3&section=fp6-families` で、受領した FP6 の族ごとの表を開く。`periodic_fp6=16xE3M2` で E3M2 に替える。周期表・法の螺旋表示・分子の表・法ごとの構成も同じ値の集合に切り替わる。

| Parameter | Default | Meaning |
|---|---|---|
| `fp6_family` | empty | `toom`, `a0_shared_2prime`, `general_weight_2prime`, `p2`, `p2_holes_paid`, `p2_karatsuba`, `p3`, `polynomial`。空ならすべて。 |
| `fp6_m` | empty | 法の整数を完全一致で絞る。空ならすべて。 |
| `fp6_holes` | `1` | `0`: 穴なしのみ、`1`: 穴ありも含む。 |
| `fp6_page` | `0` | 0始まりのページ。50件ずつ。範囲0〜10000、最終ページを越える指定は最終ページを表示。 |

族と積数ごとの代表行をすべて残す。分母と `recon` は穴の数と併記する。検算済みの行は `forms_id` と法の範囲を付けて同じ値の集合の構成詳細へ進む。出所だけの行も表示するが、法の螺旋表示と成分の比較には混ぜない。`fp6_m` を指定すると、その法について出所が報告した穴なし最少積数、一般の重みの探索の条件・未完のセルを表示する。別の族に対する下限に読み替えない。

## 法ごとの費用（試作）

`section=modulus-cost` で表を開く。頁全体の `prime_set=fp4|fp6` と `periodic_fp6=8xE2M3|16xE3M2` に従う。`cost_sort=cost|products|modulus`（既定cost）は費用/bit・積の本数・法の値の順。`cost_prime` は素因数で絞る整数2〜65536（空は全部）、`cost_holes=0|1`（既定0）は穴ありを含めるか、`cost_page=0..10000`（既定0）は15件ごとのページ。範囲外のページは末尾に合わせる。費用は既存の係数模型で、未知は末尾、実測の速さやCRTの組の順位を意味しない。

## 極座標の角度幅と配色

`arc=arith|geom|step`（既定arith）は、各周の角度幅と帯の厚みの補間。arithは等差、geomは等比、stepは比較用の旧表示（周内の角度幅が一定）。目録に無い整数も位置を持つ。冪のモードではB、B²、B³が厳密に周境界になる。`polar_spacing=arc` の弧長一定モードとは別の引数。

周kの整数の数をN_k、周内の位置をu（0以上1以下）とする。等差の境界幅s_kは N_k(s_k+s_{k+1})/2=2π を満たす。N_{k+1}=B N_kとなる周では s_k=4π/[N_k(1+1/B)]、初周は s_0=4π/N_0−s_1。角度はこの幅を整数の位置について積分して求める。等比では境界比1/Bを使い、対数平均×N_k=2πで正規化する。初周だけはその対数平均の式を二分法で解く。半径はr0+bθのまま。帯の厚みも同じuで周の両端の値を等差/等比に補間する。`angularProfile`、`angularWidth`、`ribbonCell`（ribbonGeometry.ts）が実装。

`polar_color=products|tier`（既定は下の prime）は色の意味。productsは積の本数の9区分、tierは候補欄の既存分類（積数最少・穴なし・穴/補正あり・率未測定）。図内に対応を1行表示。`polar_size=products` が新しい既定で、各法の積が最少の構成を選ぶ。旧 `polar_tier=color|width` は維持し、colorでは帯の太さを一律、widthではpolar_sizeの指標に合わせる。色はどちらでもpolar_colorの定義に従う。

### 周回数に比例する個数（新しい既定）

`polar_spacing=linear|powers|arc` の既定はlinear。`polar_base=B`（既定13、整数2〜32）はlinearでは1周目の個数、r周目の個数は $Br$。r周までの累計は $Br(r+1)/2$。開始基準は法2で、B=13なら初周2〜14、次周15〜40、その次41〜79。表示範囲を変えても未収録の位置を詰めない。powersは以前のBの冪の周境界、arcは弧長一定の配置。

等差では角度幅の両端を $s_k,s_{k+1}$ とし、$N_k(s_k+s_{k+1})/2=2\pi$ を満たす。linearの $N_k=B(k+1)$ に対して $s_k=(4\pi/B)I_k$、$I_0=\log 2$、$I_k=1/k-I_{k-1}$。等比は対数平均で同じ1周の条件を満たすよう外側から内側に解く。半径は従来の $r_0+b\theta$ を保ち、角度を累積して各区画を作る。全整数の幅が正で、周境界の値が一致することを、全ての対応する底と法65536までの周について検査する。

### 素数だけを塗る形と、積・面の見せ方

`polar_color=prime`（新しい既定）は素数の法だけを塗る。色は `primeColors.ts` の素数ごとの色で、法ごとの費用・分子の表の素因数の札と同じ（白に30%、縁はその色、数字は textInk）。素数べきと合成数は黒い縁の白で、数字は黒（□で囲まない）。素数べきの成分ごとの積の和より少ない積で組める合成数は、減る積の本数だけ数字に下線を引き(2 本減るなら 2 本)、区画の縁を太くする。札は位置の数と拡大率に応じて間引く(`tickStep` 個おき)が、この合成数と選んでいる法には、どの拡大率でも札を付ける。`products` と `tier` は従来どおり。

`polar_mark` は積と面の見せ方の比較案で、色を増やさない。

- `top`（既定）: 1 bit あたりの費用（`cost` ÷ log₂ m、費用の係数で計算）が小さい順に、表示中の収録法の上位 `polar_top`%（既定10%、切り上げ）の数字を太い□と太字にする。費用が未確認の構成は順位に入らない。帯の形は変えない。
- `thickness`: 帯の厚みを 1 積あたりの bit（log₂ m ÷ 積の本数）に比例させ、表示中の最大値で一杯の厚みにする（下限20%）。`polar_tier=width` より優先する。
- `gauge`: 各区画の内縁に沿った黒い帯の長さ（区画の弧に対する割合）を 1 積あたりの bit、外縁の帯の長さを 1 面あたりの bit（log₂ m ÷ 面 A+B）に比例させる。どちらも表示中の最大値で一杯。帯の太さは区画の半幅の24%。数字の形は変えない。旧い値 `square` は `gauge` として開く。
- `none`: 印を付けない。

どの案も、拡大・縮小が2倍以上の時に各区画の数字の下へ「積の本数 面 A/B」を小さく書く。図内の凡例の2行目に案の意味を1行で書く。

同じ法に、積の本数でも面の数（A+B）でも他に負けない構成が複数ある時（343 なら 5 積 4/4 面と 6 積 3/3 面）は、2倍以上の拡大で区画を半径の向きにその組の数だけ段に分ける。段は内側から積の少ない順で、数字の下の「積の本数 面 A/B」も同じ順に1行ずつ書く。段に出す構成は、螺旋の既定の構成（`polar_size` で選ぶ構成）を含む組ではその構成、ほかの組では他に支配されない構成のうち費用が最も小さいもの（同じなら リム A+B が少ないもの、次に id）。段を押すとその法とその構成を選び（`polar_modulus`, `polar_form`）、段の境に黒の細い線を引き、選んだ段を太い縁と灰色の塗りで示し、行を太字にする。選んだ法では、その構成が法に合う仕組みを行に書き足す：重みが 1, w, w², … で w の冪が法で 0 になる時は「w³,w⁴≡0」（`shapeFormula.ts` の `vanishingPowers`）、元のデータの `plane_moduli` に法より小さい面の法がある時は「面の法 7·49」（面の折り返し）。面の法は選んだ法の候補の元のデータ（`source`）から読み、読み終えるまでは書かない。候補の欄のボタンにも面 A/B と同じ書き足しを付け、詳細の「法への合わせ方」に1文で書く（`plane_moduli` が無い構成は「面の法の記録なし」）。

素数でない法（素数べき・合成数）の数字の□の下に、素因数を色つきの□で並べる（`polar_color=prime` の時）。色と形は分子の表の札と同じ（素数ごとの色を白に30%、縁はその色、数字は textInk）。`polar_factors=exponent`（既定）は素数1つにつき□1つで、指数を右上に小さく書く（72 は 2³ と 3²、169 は 13²）。`repeat` は指数の数だけ同じ素数の□を並べ、5個で折り返す（72 は 2・2・2 と 3・3）。どちらも色は増やさない。素数の法は区画の色そのものが素因数なので□を足さない。

`polar_modulus`（区画を押すと替わる）が、素数べきの成分ごとに組むより少ない積で組める合成数の時だけ、螺旋の下にその展開を出す。中身は分子の表の詳細（`MoleculeDetail`：成分、まとめた構成、リムの組の格子）と同じで、見出しに「CRT 9 本 → 7 本」のように積の本数を添える。格子で複数の成分に寄与するセルは、その成分の色の斜線で塗る。比べ方は分子の表と同じ（同じ値の集合と穴の条件で、それぞれ積が最少の構成。CRT の復元の費用は含まない）。積が減らない合成数・素数・素数べきでは、この欄を出さない。

どの法でも、螺旋の下（上の展開がある時はその後ろ）に、表示中の構成（`polar_form`）を、周期表のカードを押した時と同じ展開（`Expansion`。URL の鍵は `polar.` で始まる）で出す。ここでは展開図の表示の既定を「論文の図の形」にする。論文の図「積で項 a_i b_j を覆う」と同じく、左に全部の項の格子、その右に積ごとの盤を枠の幅で折り返して並べる（枠：その積に含まれる項、塗り：その積が受け持つ項、斜線：より少ない項の積にも含まれる項、盤の下：受け持つ項の尺度、左の格子：尺度 w_i w_j の大きさで濃さを変える）。周期表など他の所の展開では、この表示は選択肢の 1 つで、既定は変えない。

### 素因数の種類数の比較案

`polar_factors=dots` は構成を塗った各区画の弧に小点を素因数の種類数だけ並べる。`bands` は内縁から外縁への放射方向の線で区画を同じ数に分ける（区切り線は種類数−1本）。13・169は1種類、143は2種類、1001は3種類。重複した素因数は1回だけ数える。色・形・位置・構成選択は変えず、図内の既存の凡例の1行に対応を足す。未収録は従来の空印。既定は上の exponent（種類数だけでなく指数も見せる）。
