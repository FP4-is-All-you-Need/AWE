import {useEffect,useSyncExternalStore} from 'react';

export type Language='en'|'ja';
// Terminology follows the English paper: limb, plane, encoding, construction,
// and reconstruction coefficient. Original Japanese is retained for toggling.
export const dictionary:Record<string,string>={
 "測定で使用":"Used in measurements",
 "コンパイル済・実行未確認":"Compiled; run unconfirmed",
 "補正の費用比（元資料）":"Correction cost ratio (source estimate)",
 "FP4 格納":"Stored in FP4",
 "FP4に格納しないリム":"Limbs outside FP4 storage",
 "未確認":"Unknown",
 "分母不正":"Invalid denominator",
 "S範囲外・未補正":"Outside S / uncorrected",
 "符号化表と不一致":"Encoding table mismatch",
 "互いに素でない":"Not coprime",
 "整数行列 1〜4 × 1〜4":"Integer matrix: 1–4 × 1–4",
 "ID不正":"Invalid ID",
 "データの検査値が不一致":"Data checksum mismatch",
 "JSON未収録":"JSON unavailable",
 "データのURLが不正":"Invalid data URL",
 "未設定":"Not set",
 "CRT の法の組を見る":"View CRT modulus sets",
 "未収録":"Not recorded",
 "広い入力範囲用の構成も表示(16 積まで)":"Include wider-range constructions (up to 16 products)",
 "符号化できる範囲の広い順":"Encoding range: widest first",
 "表示 ":"Shown ",
 "件（隠した ":" (hidden ",
 "範囲比 A ×":"Range ratio A ×",
 "読込中":"Loading",
 "整数のみ":"Integer only",
 "計算中":"Computing",
 "未計算":"Not computed",
 "一致":"Match",
 "不一致":"Mismatch",
 "範囲内":"In range",
 "範囲外":"Out of range",
 "対応するブロック配置なし":"No matching block layout",
 "表の採用値なし":"Table choice unavailable",
 "符号化が格納集合の外":"Encoding outside storage set",
 "法の積が不足":"Modulus product too small",
 "記録あり":"Recorded",
 "不要":"None",
 "次元不一致":"Dimension mismatch",
 "書出済":"Exported",
 "CRT未計算":"CRT not computed",
 "面ごとに計算":"Compute each plane separately",
 "積数最少":"Fewest products",
 "穴なし":"No holes",
 "使う値":"Used values",
 "近い値へずらす ±":"Shift to a nearby value ±",
 "面：3倍制約":"Planes: ×3 constraint",
 "面の値 ":"Plane values ",
 "K範囲外":"K out of range",
 "8×8：穴あり ":"8×8: with holes ",
 "FP32・FP64：地図の札 b、整数幅 b + 1":"FP32 / FP64: map labels b; integer width b + 1",
 "面・係数未収録":"Planes / coefficients unavailable",
 "符号化表未収録":"Encoding table not recorded",
 "法未収録":"Moduli unavailable",
 "論文の図 2 の例":"Paper Figure 2 example",
 "入力条件と地図":"Input settings and map",
 "精度と入力範囲":"Precision and input ranges",
 "単一の積：重みの小さい順":"Single products: increasing weight",
 "全表現と表の採用値":"All representations and the table choice",
 "手順 ":"Step ",
 "全体":"Overview",
 "基数13の階層と繰り上がり":"Base-13 hierarchy and carries",
 "数直線（基数13とAWE）":"Number lines (base 13 and AWE)",
 "整数の入力 ":"Integer inputs ",
 "基数13とAWEで共有":"Share between base 13 and AWE",
 "別々に入力":"Separate inputs",
 "AWE の整数 ":"AWE integer ",
 "範囲 ":"Range ",
 "最大 ":"maximum ",
 "とり得る全ての範囲":"Full representable range",
 "連続整数範囲":"Largest contiguous interval",
 "正の値のみ":"Positive values only",
 "左端":"Left endpoint",
 "右端":"Right endpoint",
 "横へ移動":"Move view",
 "拡大倍率":"Zoom factor",
 "範囲を戻す":"Reset range",
 "表し方の数と穴の分布":"Representation counts and hole distribution",
 "、平均 ":"; mean ",
 "、穴 ":"; holes ",
 "選択中":"Selected",
 "前":"Previous",
 "次":"Next",
 "候補 ":"Candidates ",
 "被覆範囲":"Coverage range",
 "並べ替え":"Sort",
 "面数順":"By planes",
 "積数順":"By products",
 "既定の組":"Default set",
 "法の組を選ぶ":"Choose a modulus set",
 "法と重みの一覧":"Moduli and weights",
 "ページ":"Page",
 "構成の候補":"Construction candidates",
 "含めたい重み":"Required weights",
 "復元係数の分母":"Reconstruction coefficient denominator",
 "面の総数の上限":"Maximum total planes",
 "両側のリム数":"Limbs on each side",
 "積の本数の上限":"Maximum products",
 "検索条件":"Search filters",
 "CRTを使わない整数構成":"Integer constructions without CRT",
 "使わない":"Do not use CRT",
 "使う":"Use CRT",
 "{side} 側・積 {index} の面":"Side {side}: plane for product {index}",
 "入力側":"Input side",
 "表現数：":"Representations: ",
 "全表現の重複と整数の数直線":"Number line of integers and all their representations",
 "数値例の構成":"Construction for numerical examples",
 "一覧で選んだ構成":"Construction selected in the list",
 "ブロック Karatsuba：":"Block Karatsuba: ",
 " 組。":" blocks. ",
 "リムの並び":"Limb order",
 "保存順":"Stored order",
 "重み順":"By weight",
 "ブロック順":"By blocks",
 "各セルの尺":"Each cell with its scale",
 "展開図の表示":"Expansion view",
 "積ごと":"Per product",
 "まとめた形":"Grouped",
 "全項と直接積と面の積をまとめた格子":"Lattices grouping all terms, direct products, and plane products",
 "和・差の面の積：左上から右下へ":"Combined-plane products: upper left to lower right",
 "入力から各法の剰余と積へ分岐しCRTへ合流する図":"Flow from inputs to residues and products for each modulus, joining at CRT reconstruction",
 "CRT：剰余から整数へ復元する":"CRT: reconstruct an integer from residues",
 "入力の剰余":"Input residues",
 "符号化表のリム":"Limbs from the encoding table",
 "面の積から復元":"Reconstruction from plane products",
 "CRTの係数":"CRT coefficient",
 "行列の例：基数13とAWE":"Matrix example: base 13 and AWE",
 "既定の行列へ戻す":"Reset to the default matrices",
 "AWE — 選択中の構成":"AWE — selected construction",
 "基数13":"Base 13",
 "AWE — 選択中の構成 ":"AWE — selected construction ",
 "表の採用値":"Table choice",
 "：面・加減算":": planes and additions/subtractions",
 "構成と表示設定：JSON / JSONL":"Constructions and settings: JSON / JSONL",
 "JSONを書き出す":"Export JSON",
 "JSONLを書き出す":"Export JSONL",
 "JSON / JSONLを読み込む":"Import JSON / JSONL",
 "読み込んだ構成":"Imported constructions ",
 "読み込んだ構成を選択":"Select an imported construction",
 "未選択":"None selected",
 "読み取れなかった行・未対応の記録":"Unreadable rows and unsupported records ",
 "補正の種類：":"Correction kind: ",
 "積を選択":"Select a product",
 "比較する組と構成を選ぶ":"Select a comparison set and construction",
 "既定":"Default",
 "差の積 ":"Difference product ",
 "全9項":"All 9 terms",
 "直接の積3本":"3 direct products",
 "：面・加減算・法ごとの出力費":": planes, additions/subtractions, and output cost per modulus",
 "1法・出力1要素の費用":"Cost per output element per modulus",
 "法ごとの出力費":"Output cost per modulus",
 "費用の模型":"Cost model",
 "処理を重ねる（max）":"Overlap work (max)",
 "重ねない":"No overlap",
 "費用の設定":"Cost settings",
 "総費用順":"Order by total cost",
 "総費用":"Total cost ",
 "出力費未設定":"Output cost unspecified",
 "の重なり率":" overlap",
 "重なり率":"Overlap",
 "段":"Stage ",
 "個":" entries",
 "橙 = 符号化の中の補完(carry)で済む":"Orange: completion within the encoding (carry) suffices",
 "複素FP32":"Complex FP32",
 "複素FP64":"Complex FP64",
 "全対の照合":"Exhaustive pair check",
 "係数の式の一致 ＋ 片側の全数":"Coefficient identity and exhaustive one-side encoding",
 "係数の式の一致 ＋ 被覆の証明":"Coefficient identity and coverage proof",
 "データ読込失敗":"Data load failed",
 "行列サイズ未設定":"Matrix dimensions unspecified",
 "単価未設定":"Unit cost: not set",
 "積数未確認":"Product count unconfirmed",
 "B側の面数未確認":"B-side plane count unconfirmed",
 "面の加減算：計算法未設定":"Plane addition model: not set",
 "補正イベント頻度未設定":"Correction-event frequency unspecified",
 "法の数未確認":"Modulus count unconfirmed",
 "法の固定費":"Fixed modulus cost",
 "加減算":"Additions/subtractions",
 "補正":"Correction",
 "整数の構成":"Integer construction",
 "リムと":" limbs and ",
 "リムの":" limb ",
 " の ":" ",
 "A・B の入力範囲を同じにする":"Use the same input range for A and B",
 "の行列サイズ":" matrix dimension",
 "のスライダー":" slider",
 "のリム":" limbs",
 "の精度":" precision",
 "の詳細：":" details: ",
 "の入れ替え候補":" replacement candidates",
 "の構成へ":" constructions",
 "の比較":" comparison",
 "の既定の組":" default set",
 "の面":" plane",
 "側の面":" side plane",
 "側のリムから面への流れ":" side limb-to-plane flow",
 "行列分解、":"matrix decomposition, ",
 "個の直接項":" direct terms",
 "8×8：穴・面の制約（":"8 × 8: holes and plane constraints (",
 "積へ入れ替え":" products: replace",
 "採用":"Accepted ",
 "全項":"All terms",
 "差の面":"Difference planes",
 "直接積":"Direct products",
 "図3：幅ごとの本数の階段":"Figure 3: product-count staircase by width",
 "図4：正方セルの幅の組の地図":"Figure 4: width-pair map with square cells",
 "入替え後":"After replacement ",
 "法の組":"Modulus set",
 "法の積":"Modulus product",
 "（100%を含む）":" (including 100%)",
 "幅":"width",
 "対":"pairs",
 "ごとの":" for each ",
 "本":" products",
 "枚":" planes",
 "形式ごとのビット数":"Format bits",
 "入力形式の符号、指数、仮数のビット配置":"Input sign, exponent, and fraction bit layouts",
 "入れ替え":"Swap",
 "穴・補正あり":"Uncovered values or corrections",
 "同じ法に限る":"Same modulus only",
 "使用中の素因数":"Prime factors in use",
 "非零リムが少ない順":"Fewer nonzero limbs",
 "剰余の代表を固定":"Fixed residue representatives",
 "数直線の拡大":"Number-line zoom",
 "選び方":"Selection rule",
 "行列の分解と行列サイズ":"Matrix decomposition and dimensions",
 "面を作る流れ（A / B）":"Forming planes (A / B)",
 "符号化表の剰余の数直線":"Encoding table residue number line",
 "合同な剰余：":"Congruent residues: ",
 "Sの外：":"Outside S:",
 "保存済み符号化の実値":"Actual values from saved encodings",
 "1リム以下を使う面：":"Planes using at most one limb:",
 "元のリム":"Original limbs",
 "3 リム以上の面":"Planes with at least 3 limbs",
 "2 リムの面":"Planes with 2 limbs",
 "全項の格子と面の積の和":"All-term grid and sum of plane products",
 "面の格納集合が異なる構成も含める":"Include other plane storage sets",
 "選んだ整数構成の格子":"Grid of the selected integer construction",
 "穴の率の上限（パーセント）":"Maximum uncovered rate (percent)",
 "穴の率の上限を変更":"Change maximum uncovered rate",
 "穴の率の上限":"Maximum uncovered rate",
 "穴の率の分布。測定済み":"Uncovered-rate distribution. Measured ",
 "面を作る加減算":"Additions/subtractions to form planes",
 "面の読込・生成の単価（加減算を除く）":"Plane load/generation cost (no additions)",
 "積和1回の単価":"Unit cost per multiply-add",
 "加減算1回の単価":"Unit cost per addition/subtraction",
 "補正1回の単価":"Cost per correction",
 "入力対あたりの補正回数":"Corrections per input pair",
 "行列積1回・1法の固定費":"Fixed cost per modulus per matrix multiplication",
 "計算法未設定":"Calculation method: not set",
 "費用を足す":"Add costs",
 "利用者が作った組":"User-created set",
 "実測で選ばれた組":"Set selected by measurement",
 "保存された組":"Saved set",
 "論文の組":"Paper set",
 "収録した組の最少積":"Fewest products in this catalog",
 "保存された組の比較":"Compare saved sets",
 "左右のリム数が異なる":"Different limb counts on the two sides",
 "和・差の面の積":"Sum/difference plane products",
 "穴と補正":"Uncovered values and corrections",
 "幅の組の地図":"Map of width pairs",
 "正方セルの幅の組の地図":"Width-pair map with square cells",
 "幅ごとの本数の階段":"Product-count staircase by width",
 "幅ごとの積の本数（論文の図3）":"Products by width (paper Figure 3)",
 "許容する非被覆率":"Allowed uncovered rate ",
 "穴の値：":"Uncovered values: ",
 "積の一覧":"Product list",
 "係数式のずれ（行A・列B）：":"Coefficient identity residual (rows A, columns B): ",
 "構成の積":"Construction products: ",
 "直接項":"Direct terms",
 "補正イベント":"Correction event",
 "累積器":"Accumulator ",
 "率未測定":"Rate unmeasured",
 "復元係数":"Reconstruction coefficient",
 "未測定":"Unmeasured",
 "未検証":"Unverified",
 "塊ずらし":"Block shift",
 "ビット数超過":"Too many bits",
 "仮数":"Fraction",
 "符号":"Sign",
 "指数":"Exponent",
 "使用":"Used ",
 "重み":"Weights ",
 "復元":"Reconstruction",
 "精度":"Precision",
 "任意bit":"Custom",
 "選択中の構成":"Selected construction",
 "この直接項を含む積":"Products containing this direct term",
 "共通の素因数：":"Prime-factor collision: ",
 "素因数":"Prime factor",
 "条件":"Conditions",
 "整数":"Integer",
 "構成数":"Construction count",
 "構成":"Construction",
 "剰余":"Residue",
 "補正：":"Correction: ",
 "穴":"Uncovered values",
 "非被覆率":"Uncovered rate",
 "上限以内":"Accepted ",
 "除外":"Excluded ",
 "測定済み":"Measured ",
 "すべて":"All",
 "側":"Side",
 "拡大":"Zoom",
 "数値":"Value",
 "スライダー":"Slider",
 "ビット":" bits",
 "リム":" limbs",
 "面":" planes",
 "積":" products",
 "件":" entries",
 "法":" moduli",
 "展開":"Expansion",
 "共通の素因数":"Shared prime factor",
 "貪欲法の符号化":"Greedy encoding",
 "表現数":"Representations",
 "格納するリムを越える繰り上がり":"Carry beyond the stored limbs",
 "不明":"Unknown",
 "実行段階 ":"Execution stage ",
 " の重なり率":" overlap",
 "重なり率：未設定":"Overlap: not set",
 "出所の記録 ":"Source records ",
 "係数式のずれ（行A・列B）":"Coefficient difference (rows A, columns B)",
 "費用模型で選んだ組（2×2まで）":"Cost-model selection (up to 2×2)",
 "大きいリム格子を含む組":"Set allowing larger limb grids",
 "近い値へずらす":"Shift to a nearby value",
 "加減算回数は未計算":"Addition count: not computed",
 "列挙数の上限":"Enumeration limit",
 "符号化表（LUT）":"Encoding table (LUT)",
 "符号化表と数直線":"Encoding table and number line",
 "保存表":"Saved table",
 "検算用":"For checking",
 "検算に使う符号化":"Encoding used for checking",
 "検算":"Check",
 "別の符号化":"Alternative encodings",
 "構成の番号":"Construction number",
 "比較する組":"Comparison set",
 "件 / 非表示 ":" / Hidden ",
 "丸：表現、点線：表の採用値、赤：穴、青：表現数":"Circles: representations; dashed: table choice; red: holes; blue: representation count",
 "表現数：棒=最大、線=平均、赤=穴の割合":"Representations: bars=max, line=mean; red=hole %"
};

const replacements=Object.entries(dictionary).sort((a,b)=>b[0].length-a[0].length);
const japanese=/[\u3040-\u30ff\u3400-\u9fff]/;
const japanesePunctuation=/[・。（）、：　／]/;
const singularUnits:Record<string,string>={products:'product',planes:'plane',limbs:'limb',entries:'entry',moduli:'modulus',blocks:'block'};
const englishPunctuation=(text:string)=>text.replaceAll('・',' · ').replaceAll('。','. ').replaceAll('（',' (').replaceAll('）',')').replaceAll('、',', ').replaceAll('：',': ').replaceAll('　',' ').replaceAll('／',' / ').replace(/(?<![\d.])1 (products|planes|limbs|entries|moduli|blocks)\b/g,(_,unit:string)=>'1 '+singularUnits[unit]).replace(/[ \t]{2,}/g,' ');
export const missingTranslations=new Set<string>();
const englishLabels:Record<string,string>={
 "Invalid modulus or denominator":"法または分母が不正です",
 "Invalid limb weights":"リムの重みが不正です",
 "Invalid planes":"面が不正です",
 "Invalid products or reconstruction coefficients":"積または復元係数が不正です",
 "Invalid plane counts":"面数が不正です",
 "Invalid hole measurements":"穴の測定値が不正です",
 "Missing correction attributes":"補正の属性がありません",
 "Invalid saved encoding":"保存済み符号化が不正です",
 "Invalid hole values":"穴の値が不正です",
 "Invalid input domain":"入力範囲が不正です",
 "Invalid correction record":"補正の記録が不正です",
 "File exceeds 8 MB":"ファイルが 8 MB を超えています",
 "Invalid JSON":"JSON が不正です",
 "Unsupported record":"未対応の記録です",
 "the $13^{k}$ ruler read downward from $13^{k+1}$  ($13^{k+1}-j\\,{\\cdot}\\,13^{k}$, drawn for $k{=}1$)":"$13^{k+1}$ から $13^{k}$ の物差しを下向きに読む（$13^{k+1}-j\\,{\\cdot}\\,13^{k}$、$k{=}1$ の図）",
 " (integer width)":"（整数幅）",
 "3 direct products":"3 本の直接積",
 "AWE (ours)":"AWE（提案法）",
 "AWE + CRT (ours)":"AWE + CRT（提案法）",
 "AWE count obtained by lifting":"リフトで得た AWE の積数",
 "AWE with CRT fewer":"CRT を使う AWE の方が少ない",
 "AWE without CRT fewer":"CRT を使わない AWE の方が少ない",
 "AWE: fewer products via weights":"AWE：重みにより積を削減",
 "Base-13 limbs: direct products":"基数 13 のリム：直接積",
 "CRT (AWE per modulus)":"CRT（各法で AWE）",
 "Direct ":"直接 ",
 " (base-13 limbs)":"（基数 13 のリム）",
 "FP4 products per output element":"出力要素ごとの FP4 積数",
 "Integer AWE and CRT: product counts":"整数 AWE と CRT：積数",
 "Integer width ":"整数幅 ",
 "Pale: more products than":"淡色：積数が多い",
 "Toom rank ":"Toom の階数 ",
 "all 9 terms":"全 9 項",
 "carry form: store ":"繰上げの形：格納 ",
 ", carry ":"、繰上げ ",
 " up":" を上の段へ",
 "denominator 2\n(final shift)":"分母 2\n（最後のシフト）",
 "difference product ":"差の面の積 ",
 "example: encoding the input 1000":"例：入力 1000 の符号化",
 "gap, filled from a higher scale":"上の段から補う欠けた値",
 "interval the zoom expands":"拡大する区間",
 "linear scale":"線形目盛",
 "log scale":"対数目盛",
 "reconstruction denominator 2":"復元の分母 2",
 "representable at this scale":"この段で表せる値",
 "same ruler, read downward":"同じ物差しを下向きに読む",
 "the other method":"もう一方の方法",
 " scale":" の段",
 "CONSTRUCTION / 展開":"CONSTRUCTION / 展開",
 "CONSTRUCTION / Expansion":"構成 / 展開",
 "MODULAR CONSTRUCTIONS":"剰余の構成",
 "COMPARE & SHARE":"比較と共有",
 "Too many records (max 5,000)":"件数超過（上限5,000件）",
 "Invalid display settings":"表示設定の形式が不正"
};
const labelReplacements=Object.entries(englishLabels).sort((a,b)=>b[0].length-a[0].length);
export function translate(text:string,lang:Language=language):string{
 if(lang==='ja'){
  // Translate prose labels only; LaTeX commands and numeric expressions remain intact.
  let output=text;
  for(const [from,to] of labelReplacements)output=output.split(from).join(to);
  return output;
 }
 if(!japanese.test(text)&&!japanesePunctuation.test(text))return text;
 const indexed=text.match(/^(\s*)(積|面)\s+(\d+)(?=\s*[:：]|\s*$)/);
 if(indexed)return englishPunctuation(text.replace(indexed[0],indexed[1]+(indexed[2]==='積'?'Product':'Plane')+' '+indexed[3]));
 if(dictionary[text])return englishPunctuation(dictionary[text]);
 let translated=text.replace(/法\s*(\d+)/g,'mod $1').replace(/法\s+p\b/g,'modulus p');
 for(const [from,to] of replacements)translated=translated.split(from).join(to);
 if(japanese.test(translated))missingTranslations.add(text);
 return englishPunctuation(translated);
}
let language:Language=typeof location!=='undefined'&&new URLSearchParams(location.search).get('lang')==='ja'?'ja':'en';
const listeners=new Set<()=>void>();
function updateMetadata(){
 if(typeof document==='undefined')return;
 document.documentElement.lang=language;
 document.title=language==='ja'?'AWE — 構成カタログ':'AWE — Construction catalog';
 const description=document.querySelector('meta[name="description"]');
 description?.setAttribute('content',language==='ja'?'AWE の整数行列積の構成、重み、面、復元係数、被覆と補正を調べる。':'Explore AWE integer multiplication constructions, weights, planes, reconstruction coefficients, coverage and corrections.');
}
updateMetadata();
export function setLanguage(next:Language){
 language=next;updateMetadata();
 const query=new URLSearchParams(location.search);query.set('lang',next);history.replaceState(null,'',location.pathname+'?'+query.toString()+location.hash);
 for(const listener of listeners)listener();
}
export function useLanguage():Language{return useSyncExternalStore(listener=>{listeners.add(listener);return()=>{listeners.delete(listener);};},()=>language,()=> 'en');}

type Original={raw:string;rendered:string};
const originals=new WeakMap<Node,Original>();
const attributeOriginals=new WeakMap<Element,Map<string,Original>>();
function updateText(node:Text,lang:Language){
 const value=node.data,previous=originals.get(node),raw=previous&&previous.rendered===value?previous.raw:value;
 let rendered=translate(raw,lang);
 // React renders numeric counts and their units in separate text nodes.
 if(lang==='en'){
  if(/^\s*1\s*$/.test(node.previousSibling?.textContent??''))rendered=rendered.replace(/^(\s*)(products|planes|limbs|entries|moduli|blocks)\b/,(_,space:string,unit:string)=>space+singularUnits[unit]);
  if(/^\s*(積|面)\s+$/.test(raw)&&/^\s*\d+\s*$/.test(node.nextSibling?.textContent??''))rendered=raw.includes('積')?'Product ':'Plane ';
 }
 originals.set(node,{raw,rendered});if(rendered!==value)node.data=rendered;
}
function updateAttributes(element:Element,lang:Language){
 const saved=attributeOriginals.get(element)??new Map<string,Original>();attributeOriginals.set(element,saved);
 for(const name of ['aria-label','title','placeholder','alt']){
 const value=element.getAttribute(name);if(value===null){saved.delete(name);continue;}
 const previous=saved.get(name),raw=previous&&previous.rendered===value?previous.raw:value,rendered=translate(raw,lang);
 saved.set(name,{raw,rendered});if(rendered!==value)element.setAttribute(name,rendered);
 }
}
export function LanguageControl(){
 const lang=useLanguage();
 useEffect(()=>{
 const root=document.getElementById('root')??document.body;
 const options:MutationObserverInit={subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder','alt']};
 let observer:MutationObserver;
 const apply=(changes?:MutationRecord[])=>{
 observer?.disconnect();document.documentElement.lang=language;
 const visit=(node:Node)=>{
 if(node instanceof Element){if(node.matches('script,style,code,pre,.katex,[data-no-i18n]'))return;updateAttributes(node,language);}
 if(node.nodeType===Node.TEXT_NODE)updateText(node as Text,language);
 else for(const child of [...node.childNodes])visit(child);
 };
 if(!changes)visit(root);
 else {
  const touched=new Set<Node>();
  for(const change of changes){
   if(change.type==='attributes'&&change.target instanceof Element){if(!change.target.closest('.katex,[data-no-i18n]'))updateAttributes(change.target,language);}
   else if(change.type==='characterData'){touched.add(change.target);if(change.target.nextSibling instanceof Text)touched.add(change.target.nextSibling);if(change.target.previousSibling instanceof Text)touched.add(change.target.previousSibling);}
   else for(const node of change.addedNodes)touched.add(node);
  }
  for(const node of touched){if(node.parentElement?.closest('script,style,code,pre,.katex,[data-no-i18n]'))continue;if(![...touched].some(other=>other!==node&&other.contains(node)))visit(node);}
 }
 observer.observe(root,options);
 };
 observer=new MutationObserver(changes=>apply(changes));apply();const refresh=()=>apply();listeners.add(refresh);
 const pop=()=>{language=new URLSearchParams(location.search).get('lang')==='ja'?'ja':'en';updateMetadata();for(const listener of listeners)listener();};
 addEventListener('popstate',pop);
 return()=>{observer.disconnect();listeners.delete(refresh);removeEventListener('popstate',pop);};
 },[]);
 return <label className="language-control" data-no-i18n style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,fontSize:16}}>{lang==='ja'?'言語':'Language'} <select name="lang" aria-label="Language" value={lang} onChange={event=>setLanguage(event.target.value as Language)} style={{fontSize:16}}><option value="en">English</option><option value="ja">日本語</option></select></label>;
}
