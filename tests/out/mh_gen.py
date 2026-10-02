def ch(R=28, a=45, sgn=1):
    return [['A', R, sgn*a], ['A', R, -sgn*2*a], ['A', R, sgn*a]]
segs=[['S',300],['A',50,-90],['S',60],['A',28,45],['A',28,-90],['A',28,90],['A',28,-90],['A',28,45],['S',250],['A',40,-90],['S',140],['A',30,-90]]
# row1 E
segs+= [['S',40]]+ch(sgn=1)+[['S',30]]+ch(sgn=-1)+[['S',30]]+ch(sgn=1)+[['S',40]]
segs+= [['A',30,180]]
segs+= [['S',130]]+ch(sgn=-1)+[['S',170]]
segs+= [['A',30,-180]]
segs+= [['S',40]]+ch(sgn=-1)+[['S',30]]+ch(sgn=1)+[['S',30]]+ch(sgn=-1)+[['S',40]]
segs+= [['A',30,180]]
segs+= [['S',150]]+ch(sgn=1)+[['S',150]]
segs+= [['A',30,-180]]
segs+= [['S',100]]+ch(sgn=-1)+[['S',260]]
segs+= [['A',45,-90],['S',200]]
import json
print(json.dumps(segs))
for i,s in enumerate(segs): print(i,s, end=' | ')
