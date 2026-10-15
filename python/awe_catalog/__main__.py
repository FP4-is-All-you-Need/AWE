import argparse
import json
from pathlib import Path
from . import Catalog, example, verify, verify_modular, modular_example


def main():
    p=argparse.ArgumentParser(description='Retrieve exact, versioned AWE constructions')
    p.add_argument('--data',required=True);p.add_argument('--version',required=True)
    p.add_argument('--index-sha256',required=True)
    sub=p.add_subparsers(dest='command',required=True)
    f=sub.add_parser('find');f.add_argument('--a',type=int,default=8);f.add_argument('--b',type=int,default=8)
    f.add_argument('--products',type=int,default=0);f.add_argument('--limit',type=int,default=10)
    m=sub.add_parser('find-modular');m.add_argument('--bits',type=int,default=53);m.add_argument('--k',type=int,default=8192)
    m.add_argument('--product-cost',type=float,default=1);m.add_argument('--plane-cost',type=float,default=0)
    for name in ('get-modular', 'verify-modular-set'):
        sub.add_parser(name).add_argument('id')
    for name in ('svg-modular', 'tikz-modular', 'matplotlib-modular', 'example-modular', 'verify-modular'):
        c=sub.add_parser(name);c.add_argument('id')
        if name in ('svg-modular', 'tikz-modular', 'matplotlib-modular'):
            c.add_argument('--output',required=True,type=Path)
        if name=='example-modular':
            c.add_argument('--a',required=True,type=int);c.add_argument('--b',required=True,type=int)
    for name in ('get','verify','svg','tikz','matplotlib','example','constants'):
        c=sub.add_parser(name);c.add_argument('id')
        if name in ('svg','tikz','matplotlib','constants'):c.add_argument('--output',required=True,type=Path)
        if name=='example':c.add_argument('--a',required=True,type=int);c.add_argument('--b',required=True,type=int)
    args=p.parse_args();catalog=Catalog(args.data,version=args.version,index_sha256=args.index_sha256)
    if args.command=='find':result=catalog.find(args.a,args.b,products=args.products)[:max(0,args.limit)]
    elif args.command=='find-modular':result=catalog.find_modular(args.bits,args.k,product_cost=args.product_cost,plane_cost=args.plane_cost)
    elif args.command=='get-modular':result=catalog.get_modular(args.id)
    elif args.command=='verify-modular-set':result=catalog.verify_modular_set(args.id)
    elif args.command.endswith('-modular'):
        s=catalog.get_modular(args.id)
        proof=verify_modular(s)
        if args.command=='verify-modular':result=proof
        elif args.command=='example-modular':result=modular_example(s,args.a,args.b)
        else:
            from . import diagrams
            args.output.write_text(getattr(diagrams,args.command.removesuffix('-modular'))(s));return
    else:
        s=catalog.get(args.id)
        if args.command=='get':result=s
        elif args.command=='verify':result=verify(s)
        elif args.command=='example':result=example(s,args.a,args.b)
        elif args.command=='constants':
            verify(s)
            result={'data_version':catalog.version,'index_sha256':catalog.index_sha256,'id':s['id'],
                    'weights':s['weights'],'planes':s['planes'],'products':s['products'],'denominator':s['denominator'],
                    'limb_sets':s['limb_sets'],'plane_sets':s['plane_sets'],'domain':s['domain'],'accumulation':s['accumulation']}
            args.output.write_text(json.dumps(result,sort_keys=True,indent=2)+'\n');return
        else:
            from . import diagrams
            verify(s);args.output.write_text(getattr(diagrams,args.command)(s));return
    print(json.dumps(result,sort_keys=True,indent=2))


if __name__=='__main__':main()
