"""Numeric allowlist adapters; source annotations never enter public objects."""
from verify.core import Invalid, integer


def base(weights, planes, products, domain, denominator=1, limb_sets=None, plane_sets=None):
    return {'schema_version': 1, 'kind': 'integer', 'weights': weights, 'planes': planes,
            'products': products, 'denominator': denominator, 'domain': domain,
            'limb_sets': limb_sets or {k:['2xE2M1']*len(v) for k,v in weights.items()},
            'plane_sets': plane_sets or {k:['2xE2M1']*len(v) for k,v in planes.items()}}


def catalog_row(row, pair_sets):
    if type(row) is not list or not row: raise Invalid('invalid_source_row')
    for x in row: integer(x)
    length = row[0]
    if length not in (1,2,3) or len(row) != length + 15: raise Invalid('unsupported_source_row')
    weights = row[3:3+length]
    pairs = pair_sets[str(row[2])]
    if len({tuple(p) for p in pairs}) != len(pairs): raise Invalid('invalid_source_pairs')
    for i,j in pairs:
        if not 0 <= i < j < length: raise Invalid('invalid_source_pairs')
    if row[1] != length*length-len(pairs): raise Invalid('source_product_count')
    planes = [[int(i==j) for j in range(length)] for i in range(length)]
    products = []
    for i,w in enumerate(weights):
        coefficient = w*w - sum(w*weights[j if i==k else k] for k,j in pairs if i in (k,j))
        products.append({'a':i,'b':i,'numerator':coefficient})
    for i,j in pairs:
        planes.append([int(k in (i,j)) for k in range(length)])
        products.append({'a':len(planes)-1,'b':len(planes)-1,'numerator':weights[i]*weights[j]})
    for i in range(length):
        for j in range(length):
            if i != j and [min(i,j),max(i,j)] not in pairs:
                products.append({'a':i,'b':j,'numerator':weights[i]*weights[j]})
    radius = row[length+3]
    return base({'A':weights,'B':weights}, {'A':planes,'B':planes}, products,
                {'A':[-radius,radius],'B':[-radius,radius]})


def numeric_record(record):
    """Read explicit vector products only; annotations are neither parsed nor copied."""
    from fractions import Fraction
    from math import lcm
    if record.get('kind') not in ('solution', 'solution_provisional'):
        raise Invalid('non_solution_record')
    source = record.get('representative', record)
    weights = source.get('weights')
    if weights is None and 'w_A' in source:
        weights = {'A':source['w_A'], 'B':source['w_B']}
    if type(weights) is list: weights = {'A':weights,'B':weights}
    radius = source.get('X')
    if radius is None and 'X_A' in source: radius = {'A':source['X_A'], 'B':source['X_B']}
    if type(radius) is int: radius = {'A':radius,'B':radius}
    if type(weights) is not dict or type(radius) is not dict: raise Invalid('missing_numeric_domain')
    explicit = source
    recovered = record.get('products_recovered_20260824', {})
    construction = record.get('construction', {})
    if isinstance(recovered.get('products'),list): explicit = recovered
    elif not isinstance(explicit.get('products'),list) and isinstance(construction.get('products'),list): explicit = construction
    pairs = explicit.get('products')
    coefficients = explicit.get('lambda')
    correction = record.get('lambda_correction_20260824', {})
    if isinstance(correction.get('lambda_exact'), list):
        coefficients = correction['lambda_exact']
    if not isinstance(pairs,list): raise Invalid('missing_numeric_products')
    if coefficients is None:
        from tools.linear import coefficients as solve
        coefficients=solve(weights,pairs)
    if not isinstance(coefficients,list): raise Invalid('missing_numeric_products')
    if len(pairs) != len(coefficients): raise Invalid('coefficient_count_mismatch')
    coeff = []
    import re
    for x in coefficients:
        if type(x) is int: coeff.append(Fraction(x))
        elif type(x) is str and re.fullmatch(r'-?[0-9]{1,18}(?:/[1-9][0-9]{0,17})?',x): coeff.append(Fraction(x))
        else: raise Invalid('invalid_rational')
    denominator = lcm(*(x.denominator for x in coeff))
    planes = {'A':[], 'B':[]}
    # Preserve explicit unused planes: they can be encoding constraints.
    faces = record.get('faces',{})
    if isinstance(faces,dict):
        for side in ('A','B'):
            values = faces.get(side+'_vectors',faces.get(side))
            if isinstance(values,list): planes[side].extend(values)
    for p in pairs:
        if not isinstance(p,list) or len(p)!=2: raise Invalid('invalid_source_product')
        for side,vector in zip(('A','B'),p):
            if vector not in planes[side]: planes[side].append(vector)
    products = [{'a':planes['A'].index(p[0]),'b':planes['B'].index(p[1]),'numerator':int(c*denominator)}
                for p,c in zip(pairs,coeff)]
    return base(weights,planes,products,{k:[-radius[k],radius[k]] for k in ('A','B')},denominator)


def uv_record(record):
    """Expand the documented pair-plane formula with exact rational coefficients."""
    from fractions import Fraction
    from itertools import combinations
    from math import lcm
    weights = record.get('w',record.get('weights'))
    if not isinstance(weights,list): raise Invalid('missing_numeric_weights')
    length=len(weights)
    pairs=record.get('pairs',list(map(list,combinations(range(length),2))))
    uv=record.get('uvs',record.get('uv'))
    if not isinstance(uv,list) or len(uv)!=len(pairs): raise Invalid('missing_numeric_planes')
    planes=[[int(i==j) for j in range(length)] for i in range(length)]
    coefficients=[Fraction(w*w) for w in weights]
    for (i,j),(u,v) in zip(pairs,uv):
        for x in (i,j,u,v): integer(x)
        if not 0<=i<j<length or not u or not v: raise Invalid('invalid_source_pairs')
        c=Fraction(weights[i]*weights[j],u*v)
        coefficients[i]-=c*u*u
        coefficients[j]-=c*v*v
        coefficients.append(c)
        planes.append([u if k==i else v if k==j else 0 for k in range(length)])
    products=[(i,i,c) for i,c in enumerate(coefficients)]
    for i in range(length):
        for j in range(length):
            if i!=j and [min(i,j),max(i,j)] not in pairs:
                products.append((i,j,Fraction(weights[i]*weights[j])))
    denominator=lcm(*(c.denominator for _,_,c in products))
    radius=record['X']
    return base({'A':weights,'B':weights},{'A':planes,'B':planes},
                [{'a':i,'b':j,'numerator':int(c*denominator)} for i,j,c in products],
                {'A':[-radius,radius],'B':[-radius,radius]},denominator)


def supplementary(inputs):
    """Explicit extraction paths for additional mathematical candidate arrays."""
    import json
    specs=[('gen_uv.json','pair_plane_candidates',lambda d:d['top'],uv_record),
           ('gen_uv_ext.json','extended_pair_plane_candidates',lambda d:d['top'],uv_record),
           ('l4_uv.json','four_limb_pair_plane_candidates',lambda d:d['top'],uv_record),
           ('cap_wide.json','bounded_pair_plane_candidates',lambda d:[r for v in d['by_cap'].values() for r in v['top']],uv_record),
           ('verify_uv6.json','three_limb_pair_plane_examples',lambda d:d['schemes'],uv_record),
           ('verify_l4.json','four_limb_pair_plane_examples',lambda d:d['schemes'],uv_record),
           ('verify_rect.json','independent_examples',lambda d:d['verified'],
            lambda r:numeric_record(dict(r,kind='solution',weights={'A':r['w'],'B':r['v']},X={'A':r['X_A'],'B':r['X_B']})))]
    specs += [('rect23_r4.json','independent_front',lambda d:[r for c in d['cells'].values() for b in c['by_r'] for r in b['front']],independent_record),
              ('rect_cap.json','bounded_independent_examples',lambda d:d['rows'],independent_record),
              ('rect_ext.json','extended_independent_examples',lambda d:list(d['best'].values()),independent_record),
              ('RECT_ENCODING.json','explicit_encoding_examples',lambda d:list(d['schemes'].values()),encoding_record)]
    specs += [('minrank5.json','symmetric_rank_example',lambda d:[d],symmetric_rank_record)]
    specs += [(f'sol_m{m}_r{r}.json',f'width_{m}_example',lambda d:[d],named_plane_record) for m,r in [(11,11),(12,12),(15,20),(16,23)]]
    for filename,role,extract,adapter in specs:
        path=inputs/'solutions'/filename
        if path.exists(): yield path,role,extract(json.loads(path.read_text())),adapter
    path=inputs/'solutions/minrank5.jsonl'
    if path.exists():
        yield path,'symmetric_rank_results',[json.loads(l) for l in path.read_text().splitlines() if l.strip()],symmetric_rank_record
    path=inputs/'solutions/gen_uv_ext_done.jsonl'
    if path.exists():
        yield path,'extended_pair_plane_results',[json.loads(l) for l in path.read_text().splitlines() if l.strip()],uv_record


def independent_record(r):
    return numeric_record(dict(r,kind='solution',weights={'A':r['w'],'B':r['v']},
                               X={'A':r['X_A'],'B':r['X_B']}))


def named_plane_record(r):
    return numeric_record({'kind':'solution','weights':r['w'],'X':r['coverage'],
                           'products':[[r['faces'][a],r['faces'][b]] for a,b in r['products']],
                           'lambda':r['lambda']})


def encoding_record(r):
    planes={'A':r['planes_A'],'B':r['planes_B']}
    return base({'A':r['weights_A'],'B':r['weights_B']},planes,
                [{'a':p[0],'b':p[1],'numerator':c} for p,c in zip(r['products'],r['lambda_num'])],
                {'A':r['range_A'],'B':r['range_B']},r['D'])


def symmetric_rank_record(r):
    """Explicit same-plane products in the documented rank span condition."""
    if not isinstance(r.get('best_w'),list) or not isinstance(r.get('best_faces'),list):
        raise Invalid('non_solution_record')
    return numeric_record({'kind':'solution','weights':r['best_w'],'X':r['best_X'],
                           'products':[[p,p] for p in r['best_faces']]})
