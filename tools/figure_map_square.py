#!/usr/bin/env python3
"""Project final map values onto the source's axis rule with one square cell size.

This is a display projection, not a source rerun or a mathematical verification.
"""
import argparse
import ast
import copy
import json
from pathlib import Path


def generate(source, scene):
    tree = ast.parse(source.read_text())
    constants = {}
    references = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            name = node.targets[0].id
            if name in ('GAPS', 'COL_W', 'FIG_W', 'EDGE_LW'):
                constants[name] = ast.literal_eval(node.value)
                references[name] = node.lineno
        if isinstance(node, ast.FunctionDef) and node.name in ('axis_positions', 'build', 'legend_layout'):
            references[node.name] = node.lineno
    widths = sorted({c['column_width'] for c in scene['cells']})
    gaps = constants['GAPS']
    def positions(widen):
        # Transcribed axis_positions: edge=-.5, add GAPS, then centre at half width.
        result = {}; edge = -.5
        for width in widths:
            edge += gaps.get(width, 0)
            cw = constants['COL_W'].get(width, 1.) if widen else 1.
            result[width] = (edge+cw/2, cw); edge += cw
        return result, edge
    oldx, xmax = positions(True); oldy, ymax = positions(False)
    newpos, newmax = positions(False)
    left, right, top = 10.5, .6, 22.
    unit = (constants['FIG_W']-left-right)/(xmax+.5)
    side = unit*max(cw for _, cw in oldx.values())
    old_grid_w, old_grid_h = (xmax+.5)*unit, (ymax+.5)*unit
    new_grid = (newmax+.5)*side
    delta_h = new_grid-old_grid_h
    delta_center = (new_grid-old_grid_w)/2
    layout_record = json.loads((source.parent.parent/'figures/fig_plane_tri_v16a_hatchfree_check.json').read_text())
    legend_width = layout_record['legend']['width_pt']
    legend_old_left = layout_record['legend']['box_pt_left_top_right_lastbaseline'][0]
    legend_new_left = min(max(left+new_grid/2-legend_width/2,.6),left+new_grid+right-.6-legend_width)
    legend_dx = legend_new_left-legend_old_left
    result = copy.deepcopy(scene)
    result['page_pt'] = [left+new_grid+right, scene['page_pt'][1]+delta_h]
    result['provenance'] = 'source axis_positions rule and final PDF values; common square display cells'
    old_centers = {}
    new_centers = {}
    for cell in scene['cells']:
        key = (cell['column_width'], cell['row_width'])
        old_centers[key] = (left+(oldx[key[0]][0]+.5)*unit, top+(ymax-oldy[key[1]][0])*unit)
        new_centers[key] = (left+(newpos[key[0]][0]+.5)*side, top+(newmax-newpos[key[1]][0])*side)
    def near(x, y):
        return min(old_centers, key=lambda k: abs(old_centers[k][0]-x)+abs(old_centers[k][1]-y))
    def axis_x(x):
        # Tick and name pen origins retain their offset from the relevant column.
        width = min(widths, key=lambda w: abs(left+(oldx[w][0]+.5)*unit-x))
        return x + (newpos[width][0]+.5)*side-(oldx[width][0]+.5)*unit
    def move_point(point, key=None, geometry=False):
        x, y = point
        if key is not None:
            ox, oy = old_centers[key]; nx, ny = new_centers[key]
            if geometry:
                # Source cell/inner-frame edges retain their physical inset.
                hx, hy = oldx[key[0]][1]*unit/2, unit/2
                return [nx+(x-ox)+(1 if x>=ox else -1)*(side/2-hx), ny+(y-oy)+(1 if y>=oy else -1)*(side/2-hy)]
            return [x+nx-ox, y+ny-oy]
        if y > top+old_grid_h+40:
            return [x+legend_dx, y+delta_h]  # legend: same columns and baseline spacing
        if y >= top+old_grid_h-.01:
            return [axis_x(x), y+delta_h]  # x ticks, format names, heading
        if y < top:
            return [x+delta_center if x>left else x, y]  # centred title; M_A stays at margin
        width = min(widths, key=lambda w: abs(top+(ymax-oldy[w][0])*unit-y))
        return [x, y+(newmax-newpos[width][0])*side-(ymax-oldy[width][0])*unit]
    def bounds(box, key=None, geometry=False):
        a=move_point(box[:2],key,geometry); b=move_point(box[2:],key,geometry)
        return a+b
    for d in result['drawings']:
        x0,y0,x1,y1=d['bounds_pt']
        if x0<=left and y0<=top and x1>=left+old_grid_w-.01 and y1>=top+old_grid_h-.01:
            # Whole-page or axes background.
            box=[0.,0.,*result['page_pt']] if y0==0 else [left,top,left+new_grid,top+new_grid]
            d['bounds_pt']=box; d['items']=[['re',box,1]]
            continue
        key=near((x0+x1)/2,(y0+y1)/2) if left<=x0 and y0>=top and y1<=top+old_grid_h+.01 else None
        d['bounds_pt']=bounds(d['bounds_pt'],key,True)
        for item in d['items']:
            if item[0]=='re': item[1]=bounds(item[1],key,True)
            elif item[0] in ('l','c'):
                for i in range(1,len(item)): item[i]=move_point(item[i],key,True)
            elif item[0]=='qu': item[1]=[move_point(p,key,True) for p in item[1]]
    names = iter((4,5,8,9,12,16,32))
    horizontal_gaps = iter(((17,24),(24,32),(32,53)))
    vertical_gaps = iter(((17,24),(24,32),(32,53)))
    for t in result['texts']:
        x,y=t['origin_pt']; key=near(x,y) if left<x<left+old_grid_w and top<y<top+old_grid_h else None
        shift = None
        if t['direction'] != [1,0]:
            w=next(names)
            shift=((newpos[w][0]+.5)*side-(oldx[w][0]+.5)*unit,delta_h)
        elif t['text']=='···':
            a,b=next(horizontal_gaps)
            old=(oldx[a][0]+oldx[a][1]/2+oldx[b][0]-oldx[b][1]/2)/2
            new=(newpos[a][0]+.5+newpos[b][0]-.5)/2
            shift=((new+.5)*side-(old+.5)*unit,delta_h)
        elif t['text']=='⋮':
            a,b=next(vertical_gaps)
            old=(oldy[a][0]+.5+oldy[b][0]-.5)/2
            new=(newpos[a][0]+.5+newpos[b][0]-.5)/2
            shift=(0,(newmax-new)*side-(ymax-old)*unit)
        elif top+old_grid_h+34<y<top+old_grid_h+40:
            shift=(delta_center,delta_h)  # all spans of the centred x heading
        if shift is None:
            t['bounds_pt']=bounds(t['bounds_pt'],key)
            t['origin_pt']=move_point(t['origin_pt'],key)
        else:
            dx,dy=shift
            t['bounds_pt']=[v+(dx if i%2==0 else dy) for i,v in enumerate(t['bounds_pt'])]
            t['origin_pt']=[x+dx,y+dy]
    for cell in result['cells']:
        key=(cell['column_width'],cell['row_width'])
        cell['bounds_pt']=bounds(cell['bounds_pt'],key,True)
        cell['items']=[['re',cell['bounds_pt'],1]]
        for t in cell['labels']:
            t['bounds_pt']=bounds(t['bounds_pt'],key); t['origin_pt']=move_point(t['origin_pt'],key)
    # PDF coordinate quantisation gives <.0001 pt differences; use exact square
    # bounds from source cell-gap rule, and apply them to the matching rectangle.
    fill_side=side-.02*unit
    for cell in result['cells']:
        key=(cell['column_width'],cell['row_width']); x,y=new_centers[key]
        box=[x-fill_side/2,y-fill_side/2,x+fill_side/2,y+fill_side/2]
        corresponding=min(result['drawings'],key=lambda d:sum(abs(a-b) for a,b in zip(d['bounds_pt'],cell['bounds_pt'])) if d['fill']==cell['fill'] and d['stroke']==cell['stroke'] else float('inf'))
        corresponding['bounds_pt']=box; corresponding['items']=[['re',box,1]]
        cell['bounds_pt']=box; cell['items']=[['re',box,1]]
    assert len(result['cells'])==289
    assert all(abs((c['bounds_pt'][2]-c['bounds_pt'][0])-(c['bounds_pt'][3]-c['bounds_pt'][1]))<1e-9 for c in result['cells'])
    assert [t['text'] for t in result['texts']]==[t['text'] for t in scene['texts']]
    assert [c['labels'] and [t['text'] for t in c['labels']] for c in result['cells']]==[c['labels'] and [t['text'] for t in c['labels']] for c in scene['cells']]
    assert min(t['size_pt'] for t in result['texts'])>=8
    assert all(t['bounds_pt'][2]-t['bounds_pt'][0] < fill_side for c in result['cells'] for t in c['labels'])
    result['projection']={'source_reference_lines':references,'common_side_pt':side,'fill_side_pt':fill_side,'font_sizes_preserved':True,'cells_square':289,'values_preserved':True,'axis_gap_units':gaps,'column_width_override':1.,'method':'source axis_positions with COL_W disabled; common side is largest original nominal column width; fixed text, line widths, frame inset, title and legend spacing retained'}
    return result


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',type=Path,required=True)
    p.add_argument('--input',type=Path,default=Path('build/figure-source-map/scene.json'))
    p.add_argument('--output',type=Path,default=Path('build/figure-source-map-square/scene.json'))
    a=p.parse_args(); result=generate(a.source,json.loads(a.input.read_text()))
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result['projection']))

if __name__=='__main__': main()
