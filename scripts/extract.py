import openpyxl, json, re, sys
D=sys.argv[1]
def num(v):
    try: return float(str(v).replace(' ','').replace(',','.'))
    except: return 0.0
SHORT={'Nomad':'Nomad Life','Народн':'Halyk-Life','Freedom':'Freedom Life','Евразия':'Евразия (КСЖ)','KM Life':'KM Life','Standard':'Standard Life','Centras':'Centras Life','Коммеск':'Centras Life','Европейская':'ЕСК (Европейская СК)','аннуит':'ГАК (Гос. аннуитетная)','BCC':'BCC Life'}
def short(n):
    for k,v in SHORT.items():
        if k in str(n): return v
    return None
def period(sh): # '01.11.26' -> '2026-10' (YTD through previous month)
    d,m,y=re.match(r'(\d\d)\.(\d\d)\.(\d\d)',sh).groups(); m=int(m); y=2000+int(y)
    if m==1: return f'{y-1}-12'
    return f'{y}-{m-1:02d}'
PREM_COLS={'life':2,'unit_linked':3,'pension_annuity':4,'annuity_other':5,'edu_savings':6,'accident':7,'health':8,'other_vol':10,'vol_total':11,'osns':41,'total':44}
PAY_COLS={'life':2,'pension_annuity':3,'annuity_other':4,'edu_savings':5,'accident':6,'health':7,'other_vol':9,'vol_total':10,'osns':40,'total':43}
def classfile(f,cols):
    wb=openpyxl.load_workbook(f,data_only=True); out={}
    for ws in wb.worksheets:
        p=period(ws.title); out[p]={}
        for r in ws.iter_rows(values_only=True):
            c=short(r[1]) if len(r)>1 else None
            if c and str(r[0]).strip().isdigit():
                out[p][c]={k:num(r[i]) for k,i in cols.items()}
    return out
prem=classfile(f'{D}/6Страховые премии по отраслям и классам страхования2026 КСЖ.xlsx',PREM_COLS)
pay=classfile(f'{D}/9 Страховые выплаты по отраслям и классам страхования2026 КСЖ.xlsx',PAY_COLS)
fin={}
wb=openpyxl.load_workbook(f'{D}/Основные финансовые показатели2026 КСЖ.xlsx',data_only=True)
for ws in wb.worksheets:
    d=re.match(r'(\d\d\.\d\d\.\d\d)',ws.title).group(1); fin[d]={}
    for r in ws.iter_rows(values_only=True):
        c=short(r[1]) if len(r)>1 else None
        if c and str(r[0]).strip().isdigit():
            fin[d][c]=dict(assets=num(r[2]),reserves=num(r[3]),equity=num(r[4]),net_profit=num(r[5]),premiums=num(r[6]),net_premiums=num(r[7]),claims_exp=num(r[8]),net_claims_exp=num(r[9]))
prud={}
wb=openpyxl.load_workbook(f'{D}/10 Сведения о выполнении пн CПО РК2026.xlsx',data_only=True)
for ws in wb.worksheets:
    d=ws.title; prud[d]={}; sect=None
    for r in ws.iter_rows(values_only=True):
        if r[0] and 'По общему' in str(r[0]): break
        c=short(r[1]) if len(r)>1 else None
        if c and str(r[0]).strip().isdigit():
            prud[d][c]=dict(assets=num(r[2]),margin=num(r[3]),ndva=num(r[18]),ok_margin=r[19],ok_div=r[20],ok_ndva=r[21])
json.dump(dict(prem=prem,pay=pay,fin=fin,prud=prud),open('/home/claude/kz/data.json','w'),ensure_ascii=False,indent=1)
for p in sorted(prem): print(p,len(prem[p]),round(sum(v['total'] for v in prem[p].values())/1e6,1),'bn prem;',round(sum(v['total'] for v in pay[p].values())/1e6,1),'bn pay')
print({d:len(v) for d,v in fin.items()},{d:len(v) for d,v in prud.items()})
