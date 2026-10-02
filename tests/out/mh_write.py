import json
segs=json.loads(open('C:/Users/kkm/Desktop/Claude Code/race3d/tests/out/mh.json').read())
def fmt(s): return "['S', %d]"%s[1] if s[0]=='S' else "['A', %d, %d]"%(s[1],s[2])
lines=[]
cm={0:'0 출발 직선 (가속 발판)',1:'1 오른쪽 90도',3:'3 지그재그 4연속',8:'8 도시 터널 (길이 자동)',9:'9 모퉁이',11:'11 안쪽 줄 진입',12:'12 1번째 줄 — 시케인 3연속',25:'25 U턴 1 — 안쪽 지름길',26:'26 2번째 줄 — 터널·시케인',31:'31 U턴 2 — 안쪽 지름길',32:'32 3번째 줄 — 시케인 3연속',45:'45 U턴 3',46:'46 4번째 줄 — 점프대·시케인',51:'51 U턴 4 — 안쪽 지름길',52:'52 5번째 줄 — 고가 구간',57:'57 출발 직선으로',58:'58 (길이 자동)'}
out=[]
for i,s in enumerate(segs):
    c=('  // '+cm[i]) if i in cm else ''
    out.append("    %s,%s"%(fmt(s),c))
open('C:/Users/kkm/Desktop/Claude Code/race3d/tests/out/mh_segs_text.txt','w',encoding='utf8').write('\n'.join(out))
