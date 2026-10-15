"""Exact coefficients for explicitly supplied plane products."""
from fractions import Fraction
from verify.core import Invalid


def coefficients(weights, products):
    rows = [[Fraction(p[0][i]*p[1][j]) for p in products]+[Fraction(wa*wb)]
            for i,wa in enumerate(weights['A']) for j,wb in enumerate(weights['B'])]
    pivot_row=0
    pivots=[]
    for col in range(len(products)):
        pivot=next((i for i in range(pivot_row,len(rows)) if rows[i][col]),None)
        if pivot is None: continue
        rows[pivot_row],rows[pivot]=rows[pivot],rows[pivot_row]
        divisor=rows[pivot_row][col]
        rows[pivot_row]=[v/divisor for v in rows[pivot_row]]
        for i in range(len(rows)):
            if i!=pivot_row and rows[i][col]:
                multiplier=rows[i][col]
                rows[i]=[a-multiplier*b for a,b in zip(rows[i],rows[pivot_row])]
        pivots.append(col)
        pivot_row+=1
        if pivot_row==len(rows): break
    if any(not any(row[:-1]) and row[-1] for row in rows): raise Invalid('coefficient_system_inconsistent')
    result=[Fraction(0)]*len(products)
    for i,col in enumerate(pivots): result[col]=rows[i][-1]
    return [str(v) for v in result]
