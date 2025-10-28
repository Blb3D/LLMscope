# app.py – LLMscope Backend (Phase-6 + Ollama live + report export)
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from contextlib import contextmanager
from statistics import mean, stdev
import json, math, os, platform, sqlite3, csv
from io import StringIO
import urllib.request, urllib.error

import psutil
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

DATABASE = os.getenv("DATABASE_PATH", "data/llmscope.db")
os.makedirs(os.path.dirname(DATABASE) or ".", exist_ok=True)
API_KEY = os.getenv("LLMSCOPE_API_KEY", "dev-123")
DATA_RETENTION_DAYS = int(os.getenv("DATA_RETENTION_DAYS", "7"))
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

app = FastAPI(title="LLMscope", version="0.6.0-dev")
security = HTTPBearer()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

@app.get("/api/system")
def get_system_stats():
    try:
        cpu_percent = psutil.cpu_percent(interval=0.3)
        mem_percent = psutil.virtual_memory().percent
        return {
            "cpu": cpu_percent,
            "memory": mem_percent,
            "system": platform.system(),
            "release": platform.release(),
        }
    except Exception as e:
        return {"error": str(e)}

@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn; conn.commit()
    except Exception:
        conn.rollback(); raise
    finally:
        conn.close()

def init_db():
    with get_db() as c:
        c.execute('''
        CREATE TABLE IF NOT EXISTS requests(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          provider TEXT NOT NULL,
          model TEXT, latency REAL NOT NULL,
          tokens_in INT, tokens_out INT,
          cost REAL, success BOOLEAN DEFAULT 1,
          error_message TEXT, endpoint TEXT, metadata TEXT,
          mode TEXT DEFAULT 'simulated')''')
        c.execute("CREATE INDEX IF NOT EXISTS idx_ts ON requests(timestamp)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_provider ON requests(provider)")

class LogEntry(BaseModel):
    provider:str
    model:Optional[str]=None
    latency:float
    tokens_in:Optional[int]=None
    tokens_out:Optional[int]=None
    cost:Optional[float]=None
    success:bool=True
    error_message:Optional[str]=None
    endpoint:Optional[str]=None
    metadata:Optional[Dict[str,Any]]=None
    mode:Optional[str]="simulated"

def verify_api_key(c:HTTPAuthorizationCredentials=Depends(security)):
    if c.credentials!=API_KEY:
        raise HTTPException(status_code=401,detail="Invalid API key")
    return c.credentials

@app.on_event("startup")
def _start(): init_db()

@app.get("/health")
def health():
    with get_db() as conn:
        c=conn.execute("SELECT COUNT(*) c,MAX(timestamp)t FROM requests").fetchone()
    return {"ok":True,"total":c["c"],"last_ts":c["t"],"db":DATABASE}

@app.post("/api/log")
def log_req(e:LogEntry,_:str=Depends(verify_api_key)):
    ts=datetime.now(timezone.utc).isoformat()
    with get_db() as c:
        c.execute('''INSERT INTO requests(timestamp,provider,model,latency,
        tokens_in,tokens_out,cost,success,error_message,endpoint,metadata,mode)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)''',
        (ts,e.provider,e.model,float(e.latency),
         e.tokens_in,e.tokens_out,e.cost,1 if e.success else 0,
         e.error_message,e.endpoint,
         json.dumps(e.metadata) if e.metadata else None,e.mode))
    return {"logged":True,"ts":ts}

@app.get("/api/ollama/models")
def ollama_models(_:str=Depends(verify_api_key)):
    try:
        req=urllib.request.Request(f"{OLLAMA_URL}/api/tags",headers={"Content-Type":"application/json"})
        with urllib.request.urlopen(req,timeout=4) as r:
            data=json.loads(r.read().decode())
        names=[m.get("name") for m in data.get("models",[]) if m.get("name")]
        return {"provider":"ollama","models":sorted(set(names))}
    except Exception as e:
        return {"provider":"ollama","error":str(e),"models":[]}

def _pct(xs,p):
    if not xs: return 0.0
    n=len(xs); k=(n-1)*p; f=math.floor(k); c=math.ceil(k)
    if f==c: return xs[int(k)]
    return xs[f]*(c-k)+xs[c]*(k-f)

def _spc(xs):
    if not xs: return {"mean":0,"std":0,"p50":0,"p95":0,"p99":0,"min":0,"max":0,"ucl":0,"lcl":0,"count":0}
    n=len(xs); m=sum(xs)/n; sd=(sum((x-m)**2 for x in xs)/n)**0.5
    return {"mean":m,"std":sd,"p50":_pct(xs,0.5),"p95":_pct(xs,0.95),
            "p99":_pct(xs,0.99),"min":min(xs),"max":max(xs),
            "ucl":m+3*sd,"lcl":max(0,m-3*sd),"count":n}

def _violations(xs,mu,sd):
    if len(xs)<2 or sd<=0: return []
    v=[]; i=len(xs)-1; x=xs[i]
    if abs(x-mu)>3*sd: v.append({"rule":"R1","index":i,"msg":">3σ"})
    if len(xs)>=9 and (all(y>mu for y in xs[-9:]) or all(y<mu for y in xs[-9:])):
        v.append({"rule":"R2","index":i,"msg":"9 same side"})
    if len(xs)>=6:
        s=xs[-6:]; inc=all(s[j]<s[j+1] for j in range(5)); dec=all(s[j]>s[j+1] for j in range(5))
        if inc or dec: v.append({"rule":"R3","index":i,"msg":"6 trend"})
    return v

def _query(conn,hours,limit,prov,model):
    since=(datetime.now(timezone.utc)-timedelta(hours=hours)).isoformat()
    sql="SELECT timestamp,provider,model,latency,tokens_in,tokens_out,cost,success FROM requests WHERE timestamp>=?"
    p=[since]
    if prov: sql+=" AND provider=?"; p.append(prov)
    if model: sql+=" AND model=?"; p.append(model)
    sql+=" ORDER BY timestamp ASC LIMIT ?"; p.append(limit)
    return [dict(r) for r in conn.execute(sql,p).fetchall()]

@app.get("/api/stats/spc")
def stats_spc(_:str=Depends(verify_api_key),
              provider:Optional[str]=Query(None),
              model:Optional[str]=Query(None),
              hours:int=Query(24,ge=1,le=720),
              limit:int=Query(2000,ge=10,le=50000)):
    with get_db() as c: rows=_query(c,hours,limit,provider,model)
    lat=[float(r["latency"]) for r in rows]
    s=_spc(sorted(lat)); v=_violations(lat,s["mean"],s["std"])
    return {"series":[{"t":r["timestamp"],"y":float(r["latency"])} for r in rows],
            "stats":s,"violations":v,
            "filters":{"provider":provider,"model":model,"hours":hours}}

@app.get("/api/report.csv")
def report_csv(_:str=Depends(verify_api_key),
               provider:Optional[str]=Query(None),
               model:Optional[str]=Query(None),
               hours:int=Query(24,ge=1,le=720),
               limit:int=Query(10000,ge=10,le=200000)):
    with get_db() as c: rows=_query(c,hours,limit,provider,model)
    lat=[float(r["latency"]) for r in rows]; s=_spc(sorted(lat))
    buf=StringIO(); w=csv.writer(buf)
    w.writerow(["timestamp","provider","model","latency_s","tokens_in","tokens_out","cost","success"])
    for r in rows:
        w.writerow([r["timestamp"],r["provider"],r["model"],r["latency"],
                    r["tokens_in"],r["tokens_out"],r["cost"],r["success"]])
    w.writerow([]); w.writerow(["STATS"])
    for k,v in s.items(): w.writerow([k,v])
    return JSONResponse(content={"ok":True,"csv":buf.getvalue()})

@app.get("/_routes")
def _routes(): return [{"path":r.path,"methods":list(r.methods)} for r in app.router.routes]

if __name__=="__main__":
    import uvicorn; uvicorn.run(app,host="0.0.0.0",port=8000)
