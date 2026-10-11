"""Builds compact JSON for the new labs from the repos in /home/claude/ref (run: python3 tools/prep_new.py)."""
import json, re, pandas as pd, numpy as np
R='/home/claude/ref/'; O='/home/claude/portfolio/assets/data/'
def dump(name, obj):
    s=json.dumps(obj, separators=(',',':'), ensure_ascii=False); open(O+name,'w').write(s); print(name, len(s)//1024,'KB')

# Titanic: the 891 training passengers, the columns the notebook engineers from
t=pd.read_csv(R+'Titanic-Data_Science/train.csv')
t['Title']=t.Name.str.extract(r',\s*([^\.]+)\.')[0].replace({'Mlle':'Miss','Ms':'Miss','Mme':'Mrs'})
t.loc[~t.Title.isin(['Mr','Mrs','Miss','Master']),'Title']='Rare'
cols=['Survived','Pclass','Sex','Age','SibSp','Parch','Fare','Embarked','Title']
rows=[[int(r.Survived),int(r.Pclass),1 if r.Sex=='female' else 0,None if pd.isna(r.Age) else round(float(r.Age),1),int(r.SibSp),int(r.Parch),round(float(r.Fare),2),r.Embarked if isinstance(r.Embarked,str) else 'S',r.Title] for r in t.itertuples()]
dump('titanic.json',{'cols':cols,'rows':rows,'rec':[['Random Forest',88.78],['Decision Tree',88.78],['KNN',84.29],['Support Vector Machines',83.50]]})

# Ames housing: the features a listing card can show
h=pd.read_csv(R+'House_Prices-Data_Science/train.csv')
hc=['OverallQual','GrLivArea','YearBuilt','TotalBsmtSF','GarageCars','FullBath','LotArea','Neighborhood','SalePrice']
hh=h[hc].dropna()
nb=sorted(hh.Neighborhood.unique()); 
dump('housing.json',{'cols':hc,'nb':nb,'rows':[[int(r.OverallQual),int(r.GrLivArea),int(r.YearBuilt),int(r.TotalBsmtSF),int(r.GarageCars),int(r.FullBath),int(r.LotArea),nb.index(r.Neighborhood),int(r.SalePrice)] for r in hh.itertuples()],
 'rec':[['Decision Tree',100.00],['Random Forest',98.10],['KNN',88.66]]})

# Mobile prices: all 20 specs + tier
m=pd.read_csv(R+'Mobile_Prices-Data_Science/train.csv')
dump('mobile.json',{'cols':list(m.columns),'rows':[[int(v) if float(v).is_integer() else round(float(v),1) for v in row] for row in m.values.tolist()],
 'rec':[['Random Forest',99.75],['Decision Tree',99.75],['KNN',76.95],['SVC',76.05],['Naive Bayes',75.45],['SGD',65.35],['Perceptron',61.35]]})

# IPL: season scorecards, run-rate by over, player ratings
M=pd.read_csv(R+'IPL_Stats-Data_Science/IPL Matches 2008-2020.csv'); B=pd.read_csv(R+'IPL_Stats-Data_Science/IPL Ball-by-Ball 2008-2020.csv')
M['season']=pd.to_datetime(M.date).dt.year; B=B.merge(M[['id','season']],on='id')
seasons={}
for s,g in B.groupby('season'):
    mm=M[M.season==s]
    inn=g.groupby(['id','inning']).total_runs.sum().reset_index()
    first=inn[inn.inning==1].total_runs
    over=g.groupby('over').total_runs.sum()/g.groupby(['id','inning']).ngroups
    toss=(mm.toss_winner==mm.winner).mean()
    final=mm.sort_values('date').iloc[-1]
    six=(g.batsman_runs==6).sum(); four=(g.batsman_runs==4).sum()
    seasons[int(s)]={'matches':int(len(mm)),'avg1':round(float(first.mean()),1),'high':int(inn.total_runs.max()),'rr':[round(float(over.get(i,0)),2) for i in range(20)],'toss':round(float(toss),3),'champ':final.winner,'sixes':int(six),'fours':int(four),
      'fieldFirst':round(float((mm.toss_decision=='field').mean()),3)}
bat=B[B.extras_type!='wides'].groupby('batsman').agg(runs=('batsman_runs','sum'),balls=('ball','count'),inns=('id','nunique'),fours=('batsman_runs',lambda x:(x==4).sum()),sixes=('batsman_runs',lambda x:(x==6).sum())).reset_index()
outs=B[B.is_wicket==1].groupby('player_dismissed').size(); bat['outs']=bat.batsman.map(outs).fillna(0)
bat=bat[bat.balls>=600].copy(); bat['sr']=bat.runs/bat.balls*100; bat['avg']=bat.runs/bat.outs.clip(lower=1)
bw=B.copy(); bw['legal']=~bw.extras_type.isin(['wides','noballs'])
bw['bruns']=bw.total_runs-np.where(bw.extras_type.isin(['byes','legbyes']),bw.extra_runs,0)
bwl=bw.groupby('bowler').agg(balls=('legal','sum'),runs=('bruns','sum'),wk=('is_wicket',lambda x:0)).reset_index()
wk=B[(B.is_wicket==1)&(~B.dismissal_kind.isin(['run out','retired hurt','obstructing the field']))].groupby('bowler').size(); bwl['wk']=bwl.bowler.map(wk).fillna(0)
bwl=bwl[bwl.balls>=600].copy(); bwl['econ']=bwl.runs/bwl.balls*6; bwl['sr']=bwl.balls/bwl.wk.clip(lower=1)
dump('ipl.json',{'n':{'matches':int(len(M)),'balls':int(len(B))},'seasons':seasons,
 'bat':[[r.batsman,int(r.runs),int(r.balls),int(r.inns),round(r.sr,1),round(r.avg,1),int(r.fours),int(r.sixes)] for r in bat.sort_values('runs',ascending=False).head(60).itertuples()],
 'bowl':[[r.bowler,int(r.wk),int(r.balls),round(r.econ,2),round(r.sr,1)] for r in bwl.sort_values('wk',ascending=False).head(60).itertuples()]})

# COVID: data_agg exactly as the notebook builds it (cases/deaths to date, mean stringency, HDI, GDP/cap)
c=pd.read_csv(R+'COVID-19_Survival-Data_Science/raw_data.csv',encoding='utf-8-sig').iloc[:,:9]
c.columns=['code','country','date','cases','deaths','sti','pop','gdp','hdi']
g=c.groupby(['code','country']).agg(cases=('cases','max'),deaths=('deaths','max'),sti=('sti','mean'),pop=('pop','max'),gdp=('gdp','max'),hdi=('hdi','max')).reset_index().fillna(0)
g=g[g['pop']>0]
dump('covid.json',{'cols':['code','country','cases','deaths','sti','pop','gdp','hdi'],'rows':[[r.code,r.country,int(r.cases),int(r.deaths),round(r.sti,2),int(r.pop),round(r.gdp,1),round(r.hdi,3)] for r in g.itertuples()],'span':[c.date.min(),c.date.max()]})

# Suicide rates: global and per-country rates by year, sex and age
s=pd.read_csv(R+'Suicide_Rates-Data_Science/master.csv',encoding='utf-8-sig'); s.columns=[x.strip() for x in s.columns]
s=s[s.year<=2015]
ages=['5-14 years','15-24 years','25-34 years','35-54 years','55-74 years','75+ years']
def agg(d):
    y=d.groupby('year').agg(n=('suicides_no','sum'),p=('population','sum')); rate={int(k):round(v.n/v.p*1e5,1) for k,v in y.iterrows()}
    sx={sx_:{int(k):round(v.n/v.p*1e5,1) for k,v in d[d.sex==sx_].groupby('year').agg(n=('suicides_no','sum'),p=('population','sum')).iterrows()} for sx_ in ['male','female']}
    ag={a:round(float(d[d.age==a].suicides_no.sum()/d[d.age==a].population.sum()*1e5),2) for a in ages}
    return {'rate':rate,'sex':sx,'age':ag}
cy=s.groupby(['country','year']).agg(n=('suicides_no','sum'),p=('population','sum'),gdp=('gdp_per_capita ($)','first')).reset_index(); cy['r']=cy.n/cy.p*1e5
cnt={k:agg(d) for k,d in s.groupby('country') if d.year.nunique()>=22}
dump('suiciderates.json',{'global':agg(s),'countries':cnt,'gdp':[[r.country,int(r.year),int(r.gdp),round(r.r,2)] for r in cy.itertuples() if r.year%5==0],'ages':ages})

# Chatbot: the intents file as written
dump('chatbot_intents.json',json.load(open(R+'Chatbot-Machine_Learning/intents.json')))

# VADER lexicon (MIT): word -> mean valence
lex={}
for line in open('/tmp/claude-0/vader/vaderSentiment/vader_lexicon.txt',encoding='utf-8'):
    p=line.rstrip('\n').split('\t')
    if len(p)>=2:
        try: lex[p[0]]=round(float(p[1]),1)
        except: pass
dump('vader.json',lex)
