import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell} from "recharts";
import {Search, Layers, Brain, FileSearch, ArrowRight, Loader2, AlertTriangle, X, FileText} from "lucide-react";
import {api} from "./api.js";

const card = "rounded-2xl bg-card border border-white/5 shadow-xl shadow-black/20";
const btn = "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";
const Page = ({title, sub, children}) => (<div className="max-w-5xl mx-auto px-5 py-10">
  <h1 className="text-3xl font-bold">{title}</h1>{sub && <p className="text-gray-400 mt-2 mb-8 max-w-2xl">{sub}</p>}{children}</div>);

function useHealth() {
  const [h, setH] = useState(null), [err, setErr] = useState(null);
  useEffect(() => { api("/api/health").then(setH).catch(e => setErr(e.message)); }, []);
  return {h, err};
}
const Setup = ({h, err}) => {
  const msgs = err ? [err] : h && !h.model_loaded ? ["Setup incomplete: the trained MuRIL checkpoint is not loaded. " + (h.errors.muril || "")] : [];
  if (h && h.errors.corpus) msgs.push("Evidence corpus not loaded: " + h.errors.corpus);
  return msgs.length ? <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200 flex gap-3"><AlertTriangle className="shrink-0" size={18}/><div>{msgs.map((m,i) => <p key={i}>{m}</p>)}</div></div> : null;
};
const Err = ({m}) => m ? <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200 flex gap-3"><AlertTriangle className="shrink-0" size={18}/>{m}</div> : null;

const Ev = ({e}) => (<div className={card + " p-5"}>
  <div className="flex flex-wrap gap-2 text-xs mb-3">
    <span className="px-2 py-1 rounded-full bg-teal/10 text-teal">Rank #{e.rank}</span>
    <span className="px-2 py-1 rounded-full bg-white/5 text-gray-300">{e.retrieval_method}</span>
    <span className="px-2 py-1 rounded-full bg-white/5 text-gray-300">score {e.score.toFixed(3)}</span>
    {e.source && <span className="px-2 py-1 rounded-full bg-white/5 text-gray-300">{e.source}</span>}</div>
  {e.title && <h3 className="hi font-semibold mb-1">{e.title}</h3>}
  <p className="hi text-gray-300 text-sm leading-7">{e.text}</p>
  {e.link && <a href={e.link} target="_blank" rel="noreferrer" className="text-volt text-sm mt-2 inline-block">Open source article</a>}
  <p className="text-xs text-gray-500 mt-3">Relevant evidence — stance not determined.</p></div>);
const NoEv = () => <p className={card + " p-5 text-gray-400 text-sm"}>No sufficiently relevant evidence was retrieved from the available corpus. The claim cannot be reliably assessed using the retrieved evidence alone.</p>;

export function Home() {
  const steps = [["Submit a Hindi Claim","Users enter a Hindi statement they want to investigate."],
    ["Retrieve Relevant Evidence","BM25 and multilingual Sentence-BERT retrieve relevant passages from the configured Hindi evidence corpus."],
    ["Analyze the Claim","Google MuRIL (google/muril-base-cased), using the actual trained checkpoint, generates a prediction from the claim using the exact input format used during training."]];
  const cards = [[Search,"BM25 Keyword Retrieval"],[Layers,"Sentence-BERT Semantic Retrieval"],[Brain,"Google MuRIL Claim Classification"],[FileSearch,"Evidence-Based Analysis"]];
  return (<div>
    <section className="max-w-6xl mx-auto px-5 pt-16 pb-12 grid md:grid-cols-2 gap-10 items-center">
      <div><p className="text-teal text-sm font-semibold tracking-widest uppercase mb-3">Verify Claims. Discover Evidence. Fight Misinformation.</p>
        <h1 className="text-5xl font-extrabold leading-tight">Truth Begins with <span className="text-teal">Evidence.</span></h1>
        <p className="text-gray-400 mt-5">An AI-powered Hindi fact-verification platform that combines evidence retrieval with transformer-based claim classification to help users investigate potentially misleading claims.</p>
        <div className="flex flex-wrap gap-3 mt-8">
          <Link to="/verify" className={btn + " bg-teal text-navy hover:brightness-110"}>Verify a Claim <ArrowRight size={16}/></Link>
          <Link to="/methodology" className={btn + " border border-white/15 hover:bg-white/5"}>Explore Methodology</Link></div></div>
      <div className={card + " p-6 space-y-3"} aria-hidden="true">
        {[["दावा","Claim","bg-volt/20 text-volt"],["BM25 + SBERT","Evidence retrieval","bg-teal/20 text-teal"],["MuRIL","Claim classification","bg-white/10 text-white"]].map(([a,b,c],i) =>
          <div key={i}><div className={"rounded-xl p-4 " + c}><div className="hi font-semibold">{a}</div><div className="text-xs opacity-70">{b}</div></div>
            {i<2 && <div className="text-center text-gray-500">↓</div>}</div>)}</div>
    </section>
    <section className="max-w-6xl mx-auto px-5 py-10"><h2 className="text-2xl font-bold mb-6">How It Works</h2>
      <div className="grid md:grid-cols-3 gap-5">{steps.map(([t,d],i) => <div key={i} className={card + " p-6"}>
        <div className="text-teal font-bold mb-2">Step {i+1}</div><h3 className="font-semibold mb-2">{t}</h3><p className="text-sm text-gray-400">{d}</p></div>)}</div></section>
    <section className="max-w-6xl mx-auto px-5 py-10 grid grid-cols-2 md:grid-cols-4 gap-5">
      {cards.map(([I,t]) => <div key={t} className={card + " p-5"}><I className="text-teal mb-3"/><p className="font-semibold text-sm">{t}</p></div>)}</section>
  </div>);
}

const INTERP = {"False":"The model places this claim closest to claims that fact-checkers rated False.",
  "Mostly False":"The model places this claim closest to claims rated Mostly False: largely inaccurate, possibly with some factual elements.",
  "Partly True / Misleading":"The model places this claim closest to claims rated Partly True or Misleading: mixing accurate and inaccurate information, or lacking context."};
const COLORS = ["#f87171","#fbbf24","#38D9C8"];
const SAMPLES = ["मुंबई के पूर्व पुलिस कमिश्नर अहमद जावेद ने 36 साल तक नौकरी के दौरान सिर्फ एक रुपया वेतन लिया.",
  "लॉकडाउन का उल्लंघन करने वालों की तस्वीर, जिनसे कर्नाटक पुलिस सजा के रूप में झील की सफाई करवा रही है."];

export function Verify() {
  const {h, err} = useHealth();
  const [claim, setClaim] = useState(""), [busy, setBusy] = useState(false), [res, setRes] = useState(null), [error, setError] = useState("");
  async function go() {
    if (busy) return;
    const c = claim.trim();
    if (!c) { setError("Please enter a claim first."); return; }
    setBusy(true); setError(""); setRes(null);
    try { setRes(await api("/api/verify", {claim: c})); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const data = res && Object.entries(res.probabilities).map(([name, p]) => ({name, p: +(p*100).toFixed(1)}));
  return (<Page title="Verify a Hindi Claim" sub="Enter a claim in Hindi to analyze its predicted category and explore relevant evidence.">
    <Setup h={h} err={err}/>
    <div className={card + " p-5"}>
      <textarea value={claim} onChange={e => setClaim(e.target.value)} rows={5} maxLength={1500} aria-label="Hindi claim"
        placeholder="यहाँ उस दावे को लिखें जिसकी सत्यता जाँचना चाहते हैं।"
        className="hi w-full bg-navy rounded-xl p-4 border border-white/10 focus:border-teal outline-none resize-y"/>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
        <span className="text-xs text-gray-500">{claim.length} / 1500</span>
        <div className="flex gap-2">
          <button onClick={() => {setClaim(""); setRes(null); setError("");}} className={btn + " border border-white/15 hover:bg-white/5"}><X size={16}/>Clear</button>
          <button onClick={go} disabled={busy} className={btn + " bg-teal text-navy hover:brightness-110"}>{busy ? <><Loader2 className="animate-spin" size={16}/>Retrieving evidence and running MuRIL…</> : "Verify Claim"}</button></div></div>
      <div className="mt-4 pt-4 border-t border-white/5"><p className="text-xs text-gray-500 mb-2">Example claims from the dataset (examples only, not verdicts):</p>
        <div className="flex flex-wrap gap-2">{SAMPLES.map(s => <button key={s} onClick={() => setClaim(s)} className="hi text-left text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 max-w-full">{s.slice(0,60)}…</button>)}</div></div>
    </div>
    <Err m={error}/>
    {res && <div className="mt-8 space-y-6">
      <div className={card + " p-6"}><p className="text-sm text-gray-400">Predicted label</p>
        <p className="text-3xl font-extrabold text-teal mt-1">{res.predicted_label}</p>
        <p className="text-xs text-gray-500 mt-1">Model: {res.model_name}</p>
        <p className="mt-4 text-gray-300">{INTERP[res.predicted_label]}</p>
        <p className="mt-4 text-xs text-gray-500">This is an AI-generated assessment, not definitive proof of factual truth. It is based on the claim text alone; the retrieved evidence below is shown separately and was not used to produce the prediction.</p></div>
      <div className={card + " p-6"}><h2 className="font-semibold mb-4">Model prediction probabilities</h2>
        <div style={{height:170}}><ResponsiveContainer><BarChart data={data} layout="vertical" margin={{left:20,right:30}}>
          <XAxis type="number" domain={[0,100]} unit="%" stroke="#6b7280"/><YAxis type="category" dataKey="name" width={170} stroke="#9ca3af" fontSize={12}/>
          <Tooltip formatter={v => v + "%"} contentStyle={{background:"#0B1020",border:"1px solid #333"}}/>
          <Bar dataKey="p" radius={6}>{data.map((_,i) => <Cell key={i} fill={COLORS[i]}/>)}</Bar></BarChart></ResponsiveContainer></div>
        <p className="text-xs text-gray-500 mt-2">Softmax of the model outputs. These are not calibrated probabilities of objective truth.</p></div>
      <div><h2 className="font-semibold mb-1">Evidence summary</h2>
        <p className="text-sm text-gray-400 mb-4">{res.evidence.length} passage(s) retrieved{res.evidence[0] && " · " + res.evidence[0].retrieval_method}</p>
        {res.evidence_error && <Err m={res.evidence_error}/>}
        <div className="space-y-4">{res.evidence.length ? res.evidence.map(e => <Ev key={e.rank} e={e}/>) : !res.evidence_error && <NoEv/>}</div></div>
    </div>}
  </Page>);
}

export function Explorer() {
  const {h, err} = useHealth();
  const [claim, setClaim] = useState(""), [method, setMethod] = useState("bm25"), [k, setK] = useState(5);
  const [busy, setBusy] = useState(false), [res, setRes] = useState(null), [error, setError] = useState("");
  const av = h?.retrieval || {};
  async function go() {
    if (busy) return;
    if (!claim.trim()) { setError("Please enter a claim to search for."); return; }
    setBusy(true); setError(""); setRes(null);
    try { setRes(await api("/api/evidence", {claim, method, top_k: k})); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const sel = "bg-navy border border-white/10 rounded-xl px-3 py-2.5 text-sm";
  return (<Page title="Evidence Explorer" sub="Search the Hindi evidence corpus directly. Only methods that are configured in the backend can be selected.">
    <Setup h={h} err={err}/>
    <div className={card + " p-5"}>
      <input value={claim} onChange={e => setClaim(e.target.value)} onKeyDown={e => e.key==="Enter" && go()} aria-label="Hindi claim"
        placeholder="यहाँ हिंदी दावा या खोज वाक्य लिखें" className="hi w-full bg-navy rounded-xl p-3 border border-white/10 focus:border-teal outline-none"/>
      <div className="flex flex-wrap gap-3 mt-3 items-center">
        <select value={method} onChange={e => setMethod(e.target.value)} className={sel} aria-label="Retrieval method">
          <option value="bm25" disabled={h && !av.bm25}>BM25{h && !av.bm25 ? " (unavailable)" : ""}</option>
          <option value="sbert" disabled={h && !av.sbert}>Sentence-BERT{h && !av.sbert ? " (unavailable)" : ""}</option>
          <option value="hybrid" disabled={h && !av.hybrid}>Hybrid{h && !av.hybrid ? " (unavailable)" : ""}</option></select>
        <select value={k} onChange={e => setK(+e.target.value)} className={sel} aria-label="Number of results">{[3,5,10].map(n => <option key={n} value={n}>Top {n}</option>)}</select>
        <button onClick={go} disabled={busy} className={btn + " bg-teal text-navy hover:brightness-110 ml-auto"}>{busy ? <Loader2 className="animate-spin" size={16}/> : <Search size={16}/>}Search evidence</button></div></div>
    <Err m={error}/>
    <div className="mt-6 space-y-4">{res && (res.evidence.length ? res.evidence.map(e => <Ev key={e.rank} e={e}/>) : <NoEv/>)}
      {!res && !error && <p className="text-gray-500 text-sm flex gap-2 items-center"><FileText size={16}/>Results will appear here.</p>}</div>
  </Page>);
}

export function Method() {
  const st = [["Hindi Claim Input","The user enters a Hindi claim."],
    ["Preprocessing","The same preprocessing as training: whitespace stripping only. Devanagari text is preserved with no destructive normalization."],
    ["Evidence Retrieval","BM25 ranks passages by lexical matching and term relevance. Multilingual Sentence-BERT embeds claims and passages to find semantically similar evidence. Hybrid fuses both rankings."],
    ["Claim Classification with Google MuRIL","MuRIL is a pretrained transformer designed for Indian languages. The project fine-tunes google/muril-base-cased, and the website loads that trained checkpoint, not the base model."],
    ["Results","Predicted category, model probabilities, and ranked evidence passages."]];
  return (<Page title="Research Methodology" sub="Evidence retrieval and claim classification are separate stages. The model does not prove a statement true or false.">
    <div className="flex flex-wrap items-center gap-2 text-xs mb-10">{["Hindi Claim","Preprocessing","BM25 / Sentence-BERT Retrieval","Google MuRIL Classification","Prediction and Evidence"].map((s,i,a) =>
      <span key={s} className="flex items-center gap-2"><span className="px-3 py-2 rounded-lg bg-card border border-teal/30">{s}</span>{i<a.length-1 && <ArrowRight size={14} className="text-gray-500"/>}</span>)}</div>
    <div className="space-y-4">{st.map(([t,d],i) => <div key={t} className={card + " p-5 flex gap-4"}><div className="text-teal font-bold text-xl">{i+1}</div><div><h3 className="font-semibold">{t}</h3><p className="text-sm text-gray-400 mt-1">{d}</p></div></div>)}</div>
  </Page>);
}

export function About() {
  const S = ({t, children}) => <section className={card + " p-6 mb-5"}><h2 className="font-semibold text-lg mb-2">{t}</h2><div className="text-gray-300 text-sm leading-7">{children}</div></section>;
  return (<Page title="About the Project" sub="Evidence Retrieval and Construction for Fact-Verification to Mitigate Misinformation in Hindi Language Context">
    <S t="Research Problem">Hindi misinformation can spread rapidly through digital platforms. Verifying Hindi claims can be challenging because of linguistic variation, limited evidence availability, and the difficulty of retrieving relevant information.</S>
    <S t="Research Objective">To investigate a Hindi-language fact-verification pipeline combining lexical and semantic evidence retrieval with transformer-based claim classification.</S>
    <S t="Project Components"><ul className="list-disc pl-5"><li>BM25-based evidence retrieval</li><li>Multilingual Sentence-BERT semantic retrieval</li><li>Google MuRIL-based claim classification</li><li>A user-facing interface for investigating claims and reviewing retrieved evidence</li></ul></S>
    <S t="Limitations"><ul className="list-disc pl-5"><li>The system depends on the coverage and quality of the Hindi evidence corpus.</li><li>Retrieved passages may be relevant without supporting the claim.</li><li>Model predictions may be incorrect.</li><li>The three-class classifier cannot necessarily handle every type of claim.</li><li>The system should assist human fact-checking rather than replace it.</li></ul></S>
  </Page>);
}
