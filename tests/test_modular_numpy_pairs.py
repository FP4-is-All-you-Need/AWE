import importlib.util,random,unittest
from verify import modular_forms as MF
from tools.modular_numpy_pairs import pairs_literal_numpy

class NumpyPairsTests(unittest.TestCase):
    @unittest.skipUnless(importlib.util.find_spec("numpy"), "NumPy is optional")
    def test_exact_batching_matches_reference(self):
        rng=random.Random(20261020)
        for m in [2,3,7,13,63,127]:
         for nproducts in [1,2,4]:
          for trial in range(12):
           prod=[(i,i,rng.randrange(-m,m+1)) for i in range(nproducts)]
           c=MF.make(m,[1],[1],[[1]]*nproducts,[[1]]*nproducts,[m]*nproducts,[m]*nproducts,prod,1,alph=('e2m3','e2m3'))
           enc=[]
           for side in 'AB':enc.append([None if rng.random()<.15 else ('Z',[i],[rng.randrange(-60,61) for _ in range(nproducts)]) for i in range(m)])
           assert pairs_literal_numpy(c,*enc,chunk_size=3)==MF.pairs_literal(c,*enc)
         for coefficient in [1,2]:
          c=MF.make(m,[1],[1],[[1]],[[1]],[m],[m],[(0,0,coefficient)],1,alph=('e2m3','e2m3'));enc=[('Z',[i],[i]) for i in range(m)]
          assert pairs_literal_numpy(c,enc,enc,chunk_size=3)==MF.pairs_literal(c,enc,enc)
        m=2**70+3;c=MF.make(m,[1],[1],[[1]],[[1]],[m],[m],[(0,0,1)],1,alph=('e2m3','e2m3'));enc=[('Z',[0],[0]),('Z',[1],[1])]
        assert pairs_literal_numpy(c,enc,enc)==MF.pairs_literal(c,enc,enc)
        print('Exact agreement: 216 sparse/invalid cases, 12 complete cases, 1 arbitrary-precision fallback')

if __name__ == "__main__": unittest.main()
