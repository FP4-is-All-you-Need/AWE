"""Read painted text bounds from Matplotlib's SVG glyph geometry."""
import math
import re

IDENTITY=(1,0,0,1,0,0)
def multiply(a,b):
    x,y,z,w,u,v=a; A,B,C,D,U,V=b
    return (x*A+z*B,y*A+w*B,x*C+z*D,y*C+w*D,x*U+z*V+u,y*U+w*V+v)
def transform(value):
    out=IDENTITY
    for name,args in re.findall(r'(\w+)\(([^)]*)\)',value):
        n=[float(x) for x in re.findall(r'[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?',args)]
        if name=='translate':m=(1,0,0,1,n[0],n[1] if len(n)>1 else 0)
        elif name=='scale':m=(n[0],0,0,n[-1],0,0)
        elif name=='rotate':
            a=math.radians(n[0]);m=(math.cos(a),math.sin(a),-math.sin(a),math.cos(a),0,0)
            if len(n)==3:m=multiply(multiply((1,0,0,1,n[1],n[2]),m),(1,0,0,1,-n[1],-n[2]))
        elif name=='matrix':m=tuple(n)
        else:raise ValueError(f'Unsupported SVG transform: {name}')
        out=multiply(out,m)
    return out

def painted_bounds(root,group):
    """Include curve control points: their hull encloses the actual painted path.

    Matplotlib emits absolute glyph coordinates. Definitions do not paint;
    referenced glyphs inherit each use's translation and its enclosing scale.
    """
    ids={e.get('id'):e for e in root.iter() if e.get('id')};points=[]
    def visit(e,parent):
        if e.tag.endswith('defs'):return
        m=multiply(parent,transform(e.get('transform','')))
        if e.tag.endswith('use'):
            m=multiply(m,(1,0,0,1,float(e.get('x',0)),float(e.get('y',0))))
            visit(ids[e.get('{http://www.w3.org/1999/xlink}href').lstrip('#')],m);return
        if e.tag.endswith('path'):
            d=e.get('d','')
            if re.search(r'[mlqchvsta]',d):raise ValueError('Expected absolute Matplotlib glyph path')
            n=[float(v) for v in re.findall(r'[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?',d)]
            if len(n)%2:raise ValueError('Expected coordinate pairs')
            a,b,c,d,x,y=m
            points.extend((a*u+c*v+x,b*u+d*v+y) for u,v in zip(n[::2],n[1::2]))
        for child in e:visit(child,m)
    visit(group,IDENTITY)
    xs,ys=zip(*points)
    return [min(xs),min(ys),max(xs)-min(xs),max(ys)-min(ys)]
