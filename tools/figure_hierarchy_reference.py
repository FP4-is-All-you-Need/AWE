"""Extract the complete source number line without changing the drawing source."""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import inspect
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
sys.dont_write_bytecode = True

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source', type=Path, required=True)
    p.add_argument('--reference', type=Path, required=True)
    p.add_argument('--output', type=Path, default=Path('build/figure-source-hierarchy'))
    p.add_argument('--web-output', type=Path)
    a = p.parse_args()
    a.output.mkdir(parents=True, exist_ok=True)
    spec = importlib.util.spec_from_file_location('hierarchy_drawing', a.source)
    source = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(source)
    from matplotlib.axes import Axes
    from matplotlib.text import Text
    from matplotlib.lines import Line2D
    from matplotlib.patches import Patch
    provenance = {}
    originals = {}
    for name in ('plot', 'text', 'add_patch'):
        original = getattr(Axes, name)
        originals[name] = original
        def wrapped(self, *args, _original=original, **kwargs):
            stack = inspect.stack()
            frames = [(f.function, f.lineno) for f in stack if Path(f.filename) == a.source]
            result = _original(self, *args, **kwargs)
            for artist in result if isinstance(result, list) else [result]:
                provenance[id(artist)] = frames
            return result
        setattr(Axes, name, wrapped)
    try:
        assert source.verify_demo()
        fig = source.build('en', source.PALETTES[source.RECOMMENDED])
    finally:
        for name, original in originals.items():
            setattr(Axes, name, original)
    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    assert source.verify_equation(fig, fig._eq_marks, quiet=True)[0]
    rows = []
    dynamic_ids = set()
    removable_box_ids = set()
    dynamic_boxes = {id(t.get_bbox_patch()) for t in fig.findobj(Text) if t.get_bbox_patch() is not None and any(fn == 'build' and line == 886 for fn, line in provenance.get(id(t), [])) and t.get_text() == '$143$'}
    for i, art in enumerate(fig.findobj()):
        if not isinstance(art, (Text, Line2D, Patch)) or not art.get_visible():
            continue
        if isinstance(art, Text) and not art.get_text():
            continue
        frames = provenance.get(id(art), [])
        dynamic = any(fn in ('caret', 'step', 'equation', '_txt', '_badge') or (fn == 'build' and line in (812, 911)) for fn, line in frames)
        dynamic = dynamic or (isinstance(art, Text) and ('1000' in art.get_text() or (frames and frames[-1][1] == 886 and art.get_text() == '$143$')))
        dynamic = bool(dynamic) or id(art) in dynamic_boxes
        gid = f'hierarchy_{i}'
        art.set_gid(gid)
        if isinstance(art, Text) and art.get_bbox_patch() is not None and any(fn in ('values','below') for fn, _ in frames):
            box_gid = gid + '_background'
            art.get_bbox_patch().set_gid(box_gid)
            removable_box_ids.add(box_gid)
        if dynamic:
            dynamic_ids.add(gid)
        row = {'gid': gid, 'type': type(art).__name__, 'dynamic': dynamic, 'source_calls': frames, 'zorder': art.get_zorder(), 'alpha': art.get_alpha()}
        if isinstance(art, Text):
            anchor = art.get_transform().transform(art.get_position())
            extent = art.get_window_extent(renderer=renderer)
            row['painted_box_pt'] = [float(extent.x0*72/fig.dpi), float((fig.bbox.height-extent.y1)*72/fig.dpi), float(extent.width*72/fig.dpi), float(extent.height*72/fig.dpi)]
            row.update(text=art.get_text(), anchor_pt=[float(anchor[0]*72/fig.dpi), float((fig.bbox.height-anchor[1])*72/fig.dpi)], fontsize=art.get_fontsize(), color=art.get_color(), ha=art.get_ha(), va=art.get_va(), fontfamily=art.get_fontfamily(), fontweight=art.get_fontweight(), fontstyle=art.get_fontstyle(), rotation=-float(art.get_rotation()))
        else:
            path = art.get_path().transformed(art.get_transform())
            row.update(vertices_pt=[[float(x*72/fig.dpi),float((fig.bbox.height-y)*72/fig.dpi)] for x,y in path.vertices], path_codes=None if path.codes is None else path.codes.tolist(), linewidth=art.get_linewidth(), linestyle=art.get_linestyle())
            if isinstance(art, Line2D): row['color'] = art.get_color()
            else: row.update(facecolor=list(art.get_facecolor()), edgecolor=list(art.get_edgecolor()))
        rows.append(row)
    for suffix in ('pdf', 'png', 'svg'):
        fig.savefig(a.output/f'figure1-hierarchy.{suffix}', **({'dpi':220} if suffix=='png' else {}))
    svg = ET.parse(a.output/'figure1-hierarchy.svg')
    for kind in ('static', 'dynamic'):
        root = ET.fromstring(ET.tostring(svg.getroot()))
        for parent in root.iter():
            for child in list(parent):
                gid = child.get('id')
                if (kind=='static' and gid in dynamic_ids) or (kind=='dynamic' and gid and gid.startswith('hierarchy_') and gid not in dynamic_ids):
                    parent.remove(child)
        ET.ElementTree(root).write(a.output/f'figure1-{kind}.svg', encoding='unicode')
    data = {'schema_version':1, 'source_sha256':hashlib.sha256(a.source.read_bytes()).hexdigest(), 'size_pt':[source.W*72,source.H*72], 'coordinates':{k:getattr(source,k) for k in ('W','H','XL','XR','XS','Y3','Y2','Y1','Y0','YR','D_VAL','D_MUL','D_BASE','D_HEAD','X_MUL_R','X_BASE','Y_EQ','STEP_DROP','EQ_PITCH','EQ_R_BADGE')}, 'palette':{'levels':source.PALETTES[source.RECOMMENDED]['lv'], 'reverse':source.PALETTES[source.RECOMMENDED]['rev'], 'trace':source.TRACE,'ink':source.INK,'line_ink':source.LINE_INK,'rule':source.RULE}, 'solids':sorted(source.SOLID), 'gaps':sorted(source.GAPS), 'example_values':source.EQ_VALUES, 'artists':rows}
    (a.output/'figure1-artists.json').write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
    sys.path.insert(0, str(Path('build/pdf-reader').resolve()))
    import fitz
    import numpy as np
    with fitz.open(a.reference) as ref, fitz.open(a.output/'figure1-hierarchy.pdf') as generated:
        audit={'pagebox_matches':[list(p.rect) for p in ref]==[list(p.rect) for p in generated], 'text_matches':[p.get_text() for p in ref]==[p.get_text() for p in generated]}
        l,r=ref[0].get_pixmap(matrix=fitz.Matrix(2,2)),generated[0].get_pixmap(matrix=fitz.Matrix(2,2))
        ref[0].get_pixmap(matrix=fitz.Matrix(2,2)).save(a.output/'reference.png')
        if (l.width,l.height,l.n)==(r.width,r.height,r.n):
            delta=np.abs(np.frombuffer(l.samples,dtype=np.uint8).astype(float)-np.frombuffer(r.samples,dtype=np.uint8))
            audit.update(pixel_mean_absolute_difference=float(delta.mean()),pixel_channels_different_fraction=float(np.mean(delta!=0)))
    from PIL import Image
    reference_png = a.reference.with_suffix('.png')
    if reference_png.is_file():
        left = np.array(Image.open(reference_png).convert('RGBA')).astype(float)
        right = np.array(Image.open(a.output/'figure1-hierarchy.png').convert('RGBA')).astype(float)
        if left.shape == right.shape:
            delta = np.abs(left-right)
            audit['reference_png_comparison'] = {'size':[left.shape[1],left.shape[0]], 'pixel_identical':bool(np.array_equal(left,right)), 'pixel_mean_absolute_difference':float(delta.mean()), 'pixel_channels_different_fraction':float(np.mean(delta!=0))}
    if a.web_output:
        ET.register_namespace('', 'http://www.w3.org/2000/svg')
        ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
        root = ET.fromstring(ET.tostring(svg.getroot()))
        text_ids = {r['gid'] for r in rows if r['type'] in ('Text','Annotation')}
        removed = dynamic_ids | text_ids | removable_box_ids
        for parent in root.iter():
            for child in list(parent):
                if child.get('id') in removed or child.tag.endswith('metadata'):
                    parent.remove(child)
        identifiers = {node.get('id'):f'hierarchy_asset_{i}' for i,node in enumerate(root.iter()) if node.get('id')}
        for node in root.iter():
            for key,value in list(node.attrib.items()):
                if key=='id': node.set(key, identifiers[value])
                else:
                    for old,new in identifiers.items():
                        value=value.replace(f'url(#{old})', f'url(#{new})')
                        if value=='#'+old: value='#'+new
                    node.set(key,value)
        label_keys = ('gid','text','anchor_pt','fontsize','color','ha','va','fontfamily','fontweight','fontstyle','rotation')
        labels = [{k:r[k] for k in (*label_keys,'painted_box_pt')} for r in rows if r['type'] in ('Text','Annotation') and not r['dynamic']]
        dynamic_labels = [{k:r[k] for k in label_keys} for r in rows if r['type'] in ('Text','Annotation') and r['dynamic']]
        scene = {'schema_version':1,'source':'executed_drawing','source_file':'fig_zoom_multiscale.py','source_sha256':data['source_sha256'],'size_pt':data['size_pt'],'graphics':''.join(ET.tostring(c,encoding='unicode') for c in root),'labels':labels,'dynamic_labels':dynamic_labels,'coordinates':data['coordinates'],'palette':data['palette'],'solids':data['solids'],'gaps':data['gaps']}
        a.web_output.parent.mkdir(parents=True,exist_ok=True)
        a.web_output.write_text(json.dumps(scene,ensure_ascii=False,separators=(',',':'))+'\n')
        audit['web_output'] = {'static_labels':len(labels),'dynamic_labels':len(dynamic_labels),'removed_value_backgrounds':len(removable_box_ids),'static_graphics_dynamic_artists_removed':len(dynamic_ids)}
    audit.update(artists=len(rows),dynamic_artists=sum(r['dynamic'] for r in rows),example_verified=True,equation_alignment_verified=True)
    (a.output/'comparison.json').write_text(json.dumps(audit,indent=2)+'\n')
    print(json.dumps(audit))

if __name__=='__main__':main()
