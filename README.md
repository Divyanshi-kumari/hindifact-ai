# HindiFact AI
React + Vite frontend, FastAPI backend. Predictions come from your fine-tuned MuRIL checkpoint; evidence from your corpus. Nothing is simulated.

## 1. Place your files
Unzip `artifacts_bundle.zip` (made by the last notebook cells) into `backend/artifacts/`:
```
backend/artifacts/muril/          # fine-tuned checkpoint + tokenizer (config.json, model.safetensors, vocab.txt...)
backend/artifacts/corpus.csv
backend/artifacts/corpus_emb.npy  # built with paraphrase-multilingual-mpnet-base-v2
```
## 2. Backend
```
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app:app --port 8000
```
Check `http://localhost:8000/api/health`: `model_loaded` must be `true`, and `errors` empty.
## 3. Frontend
```
cd frontend && npm install && cp .env.example .env && npm run dev
```
Open http://localhost:5173. For deployment, set `VITE_API_URL` and `CORS_ORIGINS`.

## Notes tied to your notebook
- Training input is the claim only (max length 256); inference does the same.
- Label mapping is read from the checkpoint's `config.json` (`id2label`).
- `LOGIT_BIAS=0,0.75,0` is the validation-tuned bias from your notebook. It is applied before softmax so the displayed probabilities match the predicted label.
- Sentence-BERT must be `paraphrase-multilingual-mpnet-base-v2`, because `corpus_emb.npy` was built with it. The MiniLM model from the brief would produce a dimension mismatch, and the backend refuses to start SBERT in that case.
- The classifier sees only the claim; evidence is shown alongside it, not fed to the model.
