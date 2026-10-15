import os, re
import numpy as np, pandas as pd, torch
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

load_dotenv()
ART = os.getenv("ARTIFACTS_DIR", "./artifacts")
MURIL_DIR = os.getenv("MURIL_DIR", f"{ART}/muril")
SBERT = os.getenv("SBERT_MODEL", "sentence-transformers/paraphrase-multilingual-mpnet-base-v2")
MAX_LEN = int(os.getenv("MAX_LENGTH", "256"))
BIAS = np.array([float(x) for x in os.getenv("LOGIT_BIAS", "0,0.75,0").split(",")])
MIN_SIM = float(os.getenv("MIN_SIM", "0.25"))
S = {"errors": {}}
TOKEN_RE = re.compile(r"[\u0900-\u0963\u0966-\u097F\w]+")  # same tokenizer as the notebook's BM25
tok = lambda t: TOKEN_RE.findall(str(t).lower())

def load():
    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        S["tok"] = AutoTokenizer.from_pretrained(MURIL_DIR)
        m = AutoModelForSequenceClassification.from_pretrained(MURIL_DIR).eval()
        if m.config.num_labels != 3 or m.config.model_type != "bert":
            raise ValueError(f"Expected a 3-label BERT/MuRIL checkpoint, got {m.config.model_type}/{m.config.num_labels}")
        S["model"], S["labels"] = m, {int(k): v for k, v in m.config.id2label.items()}
        S["model_name"] = "google/muril-base-cased (fine-tuned)"
    except Exception as e:
        S["errors"]["muril"] = f"{type(e).__name__}: {e}"
    try:
        from rank_bm25 import BM25Okapi
        df = pd.read_csv(f"{ART}/corpus.csv").fillna("")
        S["df"], S["bm25"] = df, BM25Okapi([tok(t) for t in df["index_text"]])
    except Exception as e:
        S["errors"]["corpus"] = f"{type(e).__name__}: {e}"
        return
    try:
        from sentence_transformers import SentenceTransformer
        emb = np.load(f"{ART}/corpus_emb.npy")
        sb = SentenceTransformer(SBERT)
        if emb.shape != (len(S["df"]), sb.get_sentence_embedding_dimension()):
            raise ValueError(f"corpus_emb.npy shape {emb.shape} does not match corpus/SBERT model")
        S["emb"], S["sbert"] = emb, sb
    except Exception as e:
        S["errors"]["sbert"] = f"{type(e).__name__}: {e}"

@asynccontextmanager
async def lifespan(_):
    load(); yield

app = FastAPI(title="HindiFact AI", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
                   allow_methods=["*"], allow_headers=["*"])

def err(code, msg, status): return JSONResponse({"error": code, "message": msg}, status_code=status)
def methods(): return {"bm25": "bm25" in S, "sbert": "sbert" in S, "hybrid": "bm25" in S and "sbert" in S}

def check_hindi(c):
    letters = re.findall(r"[A-Za-z\u0900-\u097F]", c)
    deva = re.findall(r"[\u0900-\u097F]", c)
    if not letters or len(deva) / len(letters) < 0.3:
        return "This system supports Hindi (Devanagari) claims. Please enter the claim in Hindi."

def retrieve(q, method, k):
    sc = {}
    if method != "sbert": sc["BM25"] = S["bm25"].get_scores(tok(q))
    if method != "bm25": sc["Sentence-BERT"] = S["emb"] @ S["sbert"].encode([q], normalize_embeddings=True)[0]
    ok = np.zeros(len(S["df"]), bool)
    if "BM25" in sc: ok |= sc["BM25"] > 0
    if "Sentence-BERT" in sc: ok |= sc["Sentence-BERT"] >= MIN_SIM
    if method == "hybrid":  # reciprocal rank fusion
        final, name = np.zeros(len(ok)), "Hybrid (BM25 + Sentence-BERT, RRF)"
        for s in sc.values(): final[np.argsort(-s)[:100]] += 1 / (60 + np.arange(1, 101))
    else:
        name, final = next(iter(sc.items()))
    out = []
    for i in np.argsort(-final):
        if len(out) >= k: break
        if not ok[i]: continue
        d = S["df"].iloc[i]
        out.append(dict(text=d["evidence_snippet"] or d["claim"], rank=len(out) + 1, retrieval_method=name,
                        score=float(final[i]), source=d["source_dataset"] or None, title=d["title"] or None, link=d["link"] or None))
    return out

def classify(c):
    x = S["tok"](c, truncation=True, max_length=MAX_LEN, return_tensors="pt")  # claim-only, as in training
    with torch.no_grad(): lg = S["model"](**x).logits[0].numpy() + BIAS
    p = np.exp(lg - lg.max()); p /= p.sum(); i = int(p.argmax())
    return i, {S["labels"][j]: float(p[j]) for j in range(3)}

class VerifyReq(BaseModel): claim: str
class EvReq(BaseModel): claim: str; method: str = "hybrid"; top_k: int = 5

@app.get("/api/health")
def health():
    return {"status": "ok" if not S["errors"] else "degraded", "model_loaded": "model" in S,
            "retrieval": methods(), "labels": S.get("labels"), "errors": S["errors"]}

@app.post("/api/verify")
def verify(r: VerifyReq):
    c = r.claim.strip()
    if not c: return err("empty_claim", "Please enter a claim.", 422)
    if m := check_hindi(c): return err("not_hindi", m, 422)
    if "model" not in S: return err("model_missing", f"Trained MuRIL checkpoint not loaded from {os.path.basename(MURIL_DIR)}/. {S['errors'].get('muril','')}", 503)
    i, probs = classify(c)
    m = "hybrid" if methods()["hybrid"] else "bm25" if "bm25" in S else None
    ev, ev_err = [], None
    if m: ev = retrieve(c, m, 5)
    else: ev_err = "Evidence corpus not loaded."
    return {"claim": c, "predicted_label": S["labels"][i], "label_id": i, "probabilities": probs,
            "model_name": S["model_name"], "evidence": ev, "evidence_error": ev_err}

@app.post("/api/evidence")
def evidence(r: EvReq):
    c = r.claim.strip()
    if not c: return err("empty_claim", "Please enter a claim.", 422)
    if m := check_hindi(c): return err("not_hindi", m, 422)
    if not methods().get(r.method): return err("method_unavailable", f"'{r.method}' is not available. {S['errors']}", 503)
    return {"claim": c, "method": r.method, "evidence": retrieve(c, r.method, min(max(r.top_k, 1), 10))}
