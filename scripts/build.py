# Builds dashboard datasets (JSON {rows, meta}) from data.json (output of extract.py)
import json, sys, os
d=json.load(open('data.json')); P,Y,F,R=d['prem'],d['pay'],d['fin'],d['prud']
B=lambda x: round(x/1e6,1)   # тыс. тенге -> млрд тенге
SRC=open(__file__,encoding='utf-8').read(); EXT=open('extract.py',encoding='utf-8').read()
periods=sorted(p for p in P if p.startswith('2026'))
last=periods[-1]
fin_last=sorted(F,key=lambda s:(s[6:8],s[3:5]))[-1]; prud_last=sorted(R,key=lambda s:(s[6:8],s[3:5]))[-1]
MON=['','янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']
cos=sorted(P[last],key=lambda c:-P[last][c]['total'])
def meta(inp): return [{"label":"build.py","value":SRC,"type":"code","lang":"python"},{"label":"extract.py","value":EXT,"type":"code","lang":"python"},{"label":"Input","value":inp}]
NBK='НБК: «Поступление страховых премий…» и «Страховые выплаты…» (по страхованию жизни)_2026.xlsx'
out={}
# monthly flows, market and by company
rows=[]
for c in ['Рынок']+cos:
    prevp=prevy=0
    for p in periods:
        if c=='Рынок': yp=sum(v['total'] for v in P[p].values()); yy=sum(v['total'] for v in Y[p].values())
        else: yp=P[p].get(c,{}).get('total',0); yy=Y[p].get(c,{}).get('total',0)
        rows.append(dict(company=c,period=p,month=MON[int(p[5:])],prem_month=B(yp-prevp),pay_month=B(yy-prevy),prem_ytd=B(yp),pay_ytd=B(yy)))
        prevp,prevy=yp,yy
out['monthly']=dict(rows=rows,meta=meta(NBK))
# companies scorecard
T=sum(P[last][c]['total'] for c in cos)
rows=[]
for c in cos:
    p,y=P[last][c],Y[last][c]; f=F[fin_last].get(c,{}); r=R[prud_last].get(c,{})
    rows.append(dict(company=c,prem=B(p['total']),share=round(p['total']/T*100,1),pay=B(y['total']),
      loss_ratio=round(y['total']/p['total']*100,1) if p['total'] else None,
      pension_share=round(p['pension_annuity']/p['total']*100,1),
      prem_2025=B(P['2025-12'].get(c,{}).get('total',0)),
      assets=B(r.get('assets',0)),margin=r.get('margin'),ndva=r.get('ndva'),
      prud_ok='да' if all(str(r.get(k,'')).strip().lower()=='да' for k in ('ok_margin','ok_div','ok_ndva')) else 'нет',
      net_profit=B(f.get('net_profit',0)),equity=B(f.get('equity',0))))
out['companies']=dict(rows=rows,meta=meta(NBK+'; «Основные финансовые показатели (по страхованию жизни)»; «Сведения о выполнении пруденциальных нормативов»'))
# classes
CL=[('pension_annuity','Пенсионное аннуитетное'),('life','Страхование жизни (накопительное/рисковое)'),('osns','ОСНС (обяз. страхование работника)'),('annuity_other','Прочее аннуитетное'),('accident','Несчастные случаи (добровольное)'),('health','Страхование на случай болезни'),('edu_savings','ГОНС (образовательные накопления)')]
rows=[]
for k,n in CL:
    pp=sum(P[last][c][k] for c in cos); yy=sum(Y[last][c].get(k,0) for c in cos)
    rows.append(dict(cls=n,prem=B(pp),prem_share=round(pp/T*100,1),pay=B(yy),loss_ratio=round(yy/pp*100,1) if pp else None))
out['classes']=dict(rows=rows,meta=meta(NBK))
# company x class
rows=[]
for c in cos:
    pt=P[last][c]['total']
    for k,n in CL:
        pp=P[last][c][k]; yy=Y[last][c].get(k,0); mk=sum(P[last][x][k] for x in cos)
        rows.append(dict(company=c,cls=n,prem=B(pp),share_in_company=round(pp/pt*100,1) if pt else 0,share_in_class=round(pp/mk*100,1) if mk else 0,pay=B(yy)+0.0,loss_ratio=round(yy/pp*100,1) if pp>=5e5 else None))  # уровень выплат только при премиях от 0,5 млрд
out['company_classes']=dict(rows=rows,meta=meta(NBK))
# KPIs
Tp=T; Ty=sum(Y[last][c]['total'] for c in cos)
a=sum(R[prud_last][c]['assets'] for c in R[prud_last]); npf=sum(v['net_profit'] for v in F[fin_last].values())
p25=sum(P['2025-12'][c]['total'] for c in P['2025-12'])
ln=int(last[5:])
out['kpi']=dict(rows=[dict(period_label=f'январь–{ ["","январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"][ln]} 2026',
   prem=B(Tp),pay=B(Ty),loss_ratio=round(Ty/Tp*100,1),assets=B(a),assets_date=prud_last,net_profit=B(npf),profit_date=fin_last,
   prem_2025=B(p25),pct_of_2025=round(Tp/p25*100,1),companies=len(cos),leader=cos[0],leader_share=round(P[last][cos[0]]['total']/Tp*100,1),
   top3_share=round(sum(P[last][c]['total'] for c in cos[:3])/Tp*100,1),pension_share=round(sum(P[last][c]['pension_annuity'] for c in cos)/Tp*100,1))],meta=meta(NBK))
os.makedirs('out',exist_ok=True)
for k,v in out.items(): json.dump(v,open(f'out/{k}.json','w'),ensure_ascii=False)
print(json.dumps(out['kpi']['rows'],ensure_ascii=False)); print(out['companies']['rows'][:2])
