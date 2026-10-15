import {NavLink, Route, Routes, Link} from "react-router-dom";
import {ShieldCheck} from "lucide-react";
import {Home, Verify, Explorer, Method, About} from "./pages.jsx";
const links = [["/","Home"],["/verify","Verify a Claim"],["/explorer","Evidence Explorer"],["/methodology","Research Methodology"],["/about","About the Project"]];
export default function App() {
  return (<div className="min-h-screen bg-gradient-to-b from-navy to-[#0e1530]">
    <header className="sticky top-0 z-10 backdrop-blur bg-navy/80 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-lg"><ShieldCheck className="text-teal"/>HindiFact <span className="text-teal">AI</span></Link>
        <nav className="flex flex-wrap gap-1 text-sm">{links.map(([to,t]) =>
          <NavLink key={to} to={to} end={to==="/"} className={({isActive}) => "px-3 py-1.5 rounded-lg transition " + (isActive ? "bg-teal/15 text-teal" : "text-gray-400 hover:text-white")}>{t}</NavLink>)}</nav>
      </div></header>
    <main><Routes>
      <Route path="/" element={<Home/>}/><Route path="/verify" element={<Verify/>}/><Route path="/explorer" element={<Explorer/>}/>
      <Route path="/methodology" element={<Method/>}/><Route path="/about" element={<About/>}/>
    </Routes></main>
    <footer className="text-center text-xs text-gray-500 py-8">HindiFact AI · University research project · AI-generated assessments are not proof of factual truth.</footer>
  </div>);
}
