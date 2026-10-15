"""Derive browser drawing geometry from executed figure sources and supplied PDF paths.

Preserve source colours and opacity. Only corner geometry, readable scale,
and browser mathematical typography follow the separate UI requirements.
"""
import argparse
import hashlib
import json
import re
from datetime import date
from pathlib import Path
import xml.etree.ElementTree as ET

from figure_svg_bounds import painted_bounds

SVG='http://www.w3.org/2000/svg'
ET.register_namespace('',SVG)
ET.register_namespace('xlink','http://www.w3.org/1999/xlink')
def normalize(root):
    for el in root.iter():
        if el.tag.endswith('style') and el.text:el.text=el.text.replace('stroke-linejoin: round','stroke-linejoin: miter')
        style={k.strip():v.strip() for k,v in (x.split(':',1) for x in el.get('style','').split(';') if ':' in x)}
        if 'stroke-linejoin' in style:style['stroke-linejoin']='miter'
        if style:el.set('style',';'.join(f'{k}:{v}' for k,v in style.items()))
        if el.tag.endswith('rect'):el.attrib.pop('rx',None);el.attrib.pop('ry',None)
        d=el.get('d','')
        # Source corner_brackets uses a bevel between its two straight legs.
        # Keep both endpoints and turn at their intersection (explicit square-corner request).
        if style.get('stroke','').lower()=='#0288d1' and d.count('L')==3 and not d.strip().lower().endswith('z'):
            points=[float(v) for v in re.findall(r'-?\d+(?:\.\d+)?',d)]
            if len(points)==8 and points[0]==points[2] and points[5]==points[7]:
                el.set('d',f'M {points[0]} {points[1]} L {points[0]} {points[7]} L {points[6]} {points[7]}')
        # Rounded rectangular group frames emitted by FancyBboxPatch.
        if ('Q' in d or 'q' in d) and d.strip().lower().endswith('z'):
            points=[float(v) for v in re.findall(r'-?\d+(?:\.\d+)?(?:e[-+]?\d+)?',d)]
            xs,ys=points[::2],points[1::2]
            if xs and ys:el.set('d',f'M {min(xs)} {min(ys)} H {max(xs)} V {max(ys)} H {min(xs)} Z')
    return root

def source_scene(name,directory):
    root=ET.fromstring((directory/f'{name}-source.svg').read_text())
    if name=='figure2':
        meta=json.loads((directory/'figure2-texts.json').read_text());labels=meta['texts'];size=meta['size_pt']
    else:
        meta=json.loads((directory/f'{name}-artists.json').read_text());size=meta['svg_viewbox_pt'][2:]
        labels=[{'gid':a['gid'],'text':a['text'],'anchor_pt':a['svg_anchor_pt'],'ha':a['ha'],'va':a['va'],'fontsize':a['fontsize'],'rotation':a['svg_rotation_degrees'],'color':a['color'],'fontfamily':a['fontfamily'],'fontweight':a['fontweight'],'fontstyle':a.get('fontstyle','normal')} for a in meta['artists'] if a['type'] in ('Text','Annotation') and a.get('gid')]
    ids={l['gid'] for l in labels}
    legend=None
    if name=='figure3':
        group=next(e for e in root.iter() if e.get('id')=='legend_1')
        frame=list(group)[0]
        frame.set('id','source_legend_frame')
        path=next(e for e in frame.iter() if e.tag.endswith('path'))
        points=[float(v) for v in re.findall(r'-?\d+(?:\.\d+)?',path.get('d'))]
        legend={'label_gids':[e.get('id') for e in group.iter() if e.get('id') in ids], 'bounds_pt':[min(points[::2]),min(points[1::2]),max(points[::2]),max(points[1::2])]}
    if name=='figure3':
        # Use SVG painted geometry, not Agg font metrics, for crowded labels.
        # The two renderers differ in mathematical baselines and text advances.
        groups={e.get('id'):e for e in root.iter() if e.get('id')}
        fitted=set(legend['label_gids'])
        for label in labels:
            if label['gid'] in fitted or 'fewer' in label['text'] or 'scale' in label['text']:
                label['painted_box_pt']=painted_bounds(root,groups[label['gid']])
    for parent in root.iter():
        for child in list(parent):
            if child.get('id') in ids or child.tag.endswith('metadata'):parent.remove(child)
    normalize(root)
    # Matplotlib gives clip paths random IDs. Use document order for stable output.
    identifiers={e.get('id'):f'source_clip_{i}' for i,e in enumerate(root.iter()) if e.tag.endswith('clipPath') and e.get('id')}
    for el in root.iter():
        for key,value in list(el.attrib.items()):
            if key=='id' and value in identifiers:el.set(key,identifiers[value])
            else:
                for old,new in identifiers.items():value=value.replace(f'url(#{old})',f'url(#{new})')
                el.set(key,value)
    return {'source':'executed_drawing','size_pt':size,'graphics':''.join(ET.tostring(c,encoding='unicode') for c in root),'labels':labels,**({'legend':legend} if legend else {}),**({'laws':meta['laws'],'crops':{c['lane']:{'viewbox_pt':c['bounds_pt'],'label_gids':c['label_gids']} for c in meta.get('crops',[])}} if name=='laws' else {})}

def map_scene(directory, check=None):
    source=json.loads((directory/'scene.json').read_text());graphics=[]
    # The supplied final PDF already contains the post-swap publication palette.
    # Never reverse drawn_fill_swap when projecting the square display cells.
    palette={'direct':'#9464CB','reduced':'#ED964F','crt':'#DC92AE'}
    pale={'direct':'#EBE2F5','reduced':'#FCEBDB','crt':'#F7E5ED'}
    if check:
        assert check['drawn_palette']==palette
        assert check['drawn_pale_palette']==pale
    def map_color(value): return value
    by_bounds={tuple(c['bounds_pt']):c for c in source['cells']}
    for d in source['drawings']:
        commands=[]
        for op,*args in d['items']:
            if op=='re':
                x0,y0,x1,y1=args[0];commands.append(f'M{x0},{y0} H{x1} V{y1} H{x0} Z')
            elif op=='l':
                p,q=args;commands.append(f'M{p[0]},{p[1]} L{q[0]},{q[1]}')
            elif op=='c':
                p,a,b,q=args;commands.append(f'M{p[0]},{p[1]} C{a[0]},{a[1]} {b[0]},{b[1]} {q[0]},{q[1]}')
            elif op=='qu':
                points=[args[0][i] for i in (0,1,3,2)];commands.append('M'+' L'.join(f'{p[0]},{p[1]}' for p in points)+' Z')
        cell=by_bounds.get(tuple(d['bounds_pt']))
        attributes=f' data-map-paint-row="{cell["row_width"]}" data-map-paint-column="{cell["column_width"]}"' if cell and d['fill']==cell['fill'] else ''
        if commands:graphics.append(f'<path{attributes} d="{" ".join(commands)}" fill="{map_color(d["fill"]) or "none"}" stroke="{map_color(d["stroke"]) or "none"}" stroke-width="{d["stroke_width_pt"] or 0}"/>')
    labels=[]
    for i,t in enumerate(source['texts']):
        text=t['text'];rotation=0
        if t['direction']!=[1,0]:
            import math
            rotation=math.degrees(math.atan2(t['direction'][1],t['direction'][0]))
        labels.append({'gid':f'pdf_text_{i}','text':text,'anchor_pt':t['origin_pt'],'ha':'left','va':'baseline','fontsize':t['size_pt'],'rotation':rotation,'color':map_color(t['color']),'fontfamily':['STIXGeneral'],'fontstyle':'italic' if 'Italic' in t['font'] else 'normal','fontweight':'bold' if 'Bold' in t['font'] else 'normal'})
    # plot_v16_swap.py: REF_NAMES={24:'FP32',53:'FP64'}, REF_SHIFT=4 pt.
    # The supplied m25 PDF omits these references. FP16/FP32/FP64 have equal
    # STIX advances (same prefix and two tabular digits), so preserve its exact
    # baseline/rotation and translate by source column centres plus REF_SHIFT.
    template=next(l for l in labels if l['text']=='FP16')
    def center(width):
        cell=next(c for c in source['cells'] if c['column_width']==width)
        return (cell['bounds_pt'][0]+cell['bounds_pt'][2])/2
    for width,name in [(24,'FP32'),(53,'FP64')]:
        labels.append({**template,'gid':f'source_reference_{name}','text':name,
                       'anchor_pt':[template['anchor_pt'][0]+center(width)-center(12)+4,template['anchor_pt'][1]]})
    return {'source':'final_pdf_values_source_axis_rule_square_cells','projection':source.get('projection'),'size_pt':source['page_pt'],'graphics':''.join(graphics),'labels':labels,'cells':[{**c,'fill':map_color(c['fill']),'stroke':map_color(c['stroke'])} for c in source['cells']],'palette':palette, 'pale_palette':pale, 'legend_labels':check['legend']['labels_as_drawn'] if check else [], 'note':'Source rerun awaits the listed prerequisites. Values are from the supplied final PDF; axis_positions supplies gaps, with COL_W disabled for square cells.'}

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=Path('data/visualization'))
    p.add_argument('--map-only',action='store_true');p.add_argument('--map-check',type=Path)
    a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
    check=json.loads(a.map_check.read_text()) if a.map_check else None
    if a.map_only:
        if not check: p.error('--map-only requires --map-check')
        scene=map_scene(Path('build/figure-source-map-square'),check);scene['schema_version']=1
        scene['palette_check_sha256']=hashlib.sha256(a.map_check.read_bytes()).hexdigest()
        (a.output/'figure4.json').write_text(json.dumps(scene,ensure_ascii=False,separators=(',',':'))+'\n')
        audit_path=a.output/'verification.json';audit=json.loads(audit_path.read_text())
        audit['figures']['figure4']['palette_check_sha256']=scene['palette_check_sha256']
        audit['figures']['figure4']['palette']=scene['palette']
        audit['figures']['figure4']['legend_labels']=scene['legend_labels']
        audit['date']=date.today().isoformat();audit['verifier_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
        audit['verifier_sources'][Path(__file__).name]=audit['verifier_sha256']
        for row in audit['files']:
            if row['path']=='figure4.json':row['sha256']=hashlib.sha256((a.output/row['path']).read_bytes()).hexdigest()
        audit_path.write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps({'cells':len(scene['cells']),'palette':scene['palette'],'legend_entries':len(scene['legend_labels'])}))
        return
    for name,directory in [('laws',Path('build/figure-source-laws')),('figure1',Path('build/figure-source-other')),('figure2',Path('build/figure-source-two')),('figure3',Path('build/figure-source-other'))]:
        scene=source_scene(name,directory);scene['schema_version']=1
        (a.output/f'{name}.json').write_text(json.dumps(scene,ensure_ascii=False,separators=(',',':'))+'\n')
    scene=map_scene(Path('build/figure-source-map-square'),check);scene['schema_version']=1
    (a.output/'figure4.json').write_text(json.dumps(scene,ensure_ascii=False,separators=(',',':'))+'\n')
    base=Path('build/figure-source-laws-all')
    index=json.loads((base/'index.json').read_text())
    for width in index['widths']:
        scene=source_scene('laws',base/width['directory']);scene['schema_version']=1
        (a.output/f'laws-{width["bits"]}.json').write_text(json.dumps(scene,ensure_ascii=False,separators=(',',':'))+'\n')
    audit=json.loads(Path('build/figure-source-other/reference-audit.json').read_text())
    figures={}
    for name in ('figure1','figure3'):
        row=audit[name]
        figures[name]={k:row[k] for k in ('sha256','plot_rerun','rerun_pagebox_matches','rerun_text_matches','rerun_pixel_mean_absolute_difference','rerun_pixel_channels_different_fraction')}
    figures['figure2']=json.loads(Path('build/figure-source-two/comparison.json').read_text())
    figures['figure4']={'plot_rerun':False,'reference':'final_pdf_vector_extraction','cells':len(json.loads((a.output/'figure4.json').read_text())['cells']),'missing_prerequisites':'reference-generation-inputs'}
    catalog=json.loads((a.output/'modsets.json').read_text());rows=[r for w in catalog['widths'] for r in w['rows']];mods=[m for r in rows for m in r['mods']]
    report={'schema_version':1,'date':date.today().isoformat(),'method':'drawing source execution and final PDF comparison; saved numerical field projection','verifier_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'source_sha256':catalog['source_sha256'],'counts':{'widths':len(catalog['widths']),'sets':len(rows),'tile_occurrences':len(mods),'distinct_visual_ids':len({m['id'] for m in mods}),'source_drawing_rows':2*len(index['widths']),'source_drawing_tiles':sum(w['laws'] for w in index['widths'])},'figures':figures,'construction_verification':'This is a display projection audit, not a new mathematical verification or search.'}
    report['verifier_sources']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (Path(__file__),Path(__file__).with_name('figure_svg_bounds.py'))}
    report['files']=[{'path':f.name,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(a.output.glob('*.json')) if f.name!='verification.json']
    (a.output/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':main()
