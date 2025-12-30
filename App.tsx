
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GeminiService } from './services/geminiService';
import { Entity, VectorAnalysis, GroundingChunk, ComparisonResult } from './types';
import { EntityCard } from './components/EntityCard';
import { VectorGraph } from './components/VectorGraph';
import { Search, Brain, Sparkles, Loader2, ArrowRight, Code, Globe, MessageSquare, Layers, GitCompare, RefreshCw, X, Zap, Sun, Moon } from 'lucide-react';

const gemini = new GeminiService();

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [comparisonEntity, setComparisonEntity] = useState<Entity | null>(null);
  const [entityInsight, setEntityInsight] = useState<{ text: string, grounding: GroundingChunk[] } | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [analysis, setAnalysis] = useState<VectorAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const neuralCanvasRef = useRef<HTMLCanvasElement>(null);

  // Neural Background Animation
  useEffect(() => {
    const canvas = neuralCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number, y: number, vx: number, vy: number }[] = [];
    const particleCount = 40;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isLight = theme === 'light';
      ctx.strokeStyle = isLight ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)';
      ctx.fillStyle = isLight ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)';

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 200) {
            ctx.lineWidth = 1 - dist / 200;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  const fetchWikidataImage = async (id: string) => {
    try {
      const res = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${id}&property=P18&format=json&origin=*`);
      const data = await res.json();
      const fileName = data.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (fileName) {
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=400`;
      }
    } catch (e) { return undefined; }
    return undefined;
  };

  const performSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setEntities([]);
    setAnalysis(null);
    setSelectedEntity(null);
    setComparisonEntity(null);
    setComparisonResult(null);

    try {
      const wdResponse = await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&format=json&origin=*&limit=15`);
      const data = await wdResponse.json();
      
      const rawResults = data.search || [];
      const resultsWithImages = await Promise.all(rawResults.map(async (item: any) => {
        const imageUrl = await fetchWikidataImage(item.id);
        return {
          id: item.id,
          label: item.display?.label?.value || item.label,
          description: item.display?.description?.value || item.description,
          type: 'Wikidata Item',
          imageUrl,
          relevance: 1
        };
      }));

      setEntities(resultsWithImages);

      if (resultsWithImages.length > 0) {
        const vectorAnalysis = await gemini.analyzeSearch(query, resultsWithImages);
        setAnalysis(vectorAnalysis);
      }
    } catch (err) {
      setError("Search service unavailable. Please check your connectivity.");
    } finally {
      setLoading(false);
    }
  };

  const selectEntity = useCallback(async (entity: Entity) => {
    setSelectedEntity(entity);
    setEntityInsight(null);
    try {
      const insight = await gemini.getEntityInsights(entity);
      setEntityInsight(insight);
    } catch (err) {
      setEntityInsight({ text: "Contextual reasoning failed.", grounding: [] });
    }
  }, []);

  const toggleComparison = useCallback(async (entity: Entity) => {
    if (comparisonEntity?.id === entity.id) {
      setComparisonEntity(null);
      setComparisonResult(null);
    } else {
      setComparisonEntity(entity);
      if (selectedEntity) {
        setComparisonResult(null);
        try {
          const result = await gemini.compareEntities(selectedEntity, entity);
          setComparisonResult(result);
        } catch (e) {
          console.error("Comparison failed", e);
        }
      }
    }
  }, [comparisonEntity, selectedEntity]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <div className={`min-h-screen transition-colors duration-500 selection:bg-blue-500/30 ${theme === 'dark' ? 'bg-[#020617] text-slate-300' : 'bg-[#f8fafc] text-slate-800'}`}>
      <canvas ref={neuralCanvasRef} className="fixed inset-0 pointer-events-none z-0" />

      <header className={`sticky top-0 z-50 px-6 py-6 backdrop-blur-3xl border-b transition-colors duration-500 ${theme === 'dark' ? 'border-slate-800/40 bg-[#020617]/70' : 'border-slate-200 bg-white/70'}`}>
        <div className="max-w-screen-2xl mx-auto flex flex-col xl:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 group">
              <Zap className="w-8 h-8 text-white group-hover:scale-125 transition-transform duration-500" />
            </div>
            <div>
              <h1 className={`text-3xl font-black tracking-tighter flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                WIKIVECTOR <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">ULTRA</span>
              </h1>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {[...Array(3)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </div>
                <span className={`text-[11px] uppercase tracking-[0.2em] font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Semantic Discovery Engine</span>
              </div>
            </div>
          </div>

          <form onSubmit={performSearch} className="relative flex-1 max-w-2xl w-full group">
            <div className={`absolute inset-0 blur-xl group-focus-within:bg-blue-600/10 transition-all rounded-full ${theme === 'dark' ? 'bg-blue-600/5' : 'bg-blue-600/5'}`} />
            <Search className={`absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 transition-all ${theme === 'dark' ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-600'}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Map the unknown. Enter a concept..."
              className={`relative w-full border rounded-3xl py-5 pl-16 pr-6 text-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                theme === 'dark' 
                ? 'bg-slate-900/40 border-slate-800/50 text-white placeholder-slate-600 focus:bg-slate-900/80' 
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-slate-50 shadow-sm'
              }`}
            />
            {loading && <RefreshCw className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-blue-500 animate-spin" />}
          </form>

          <div className="flex items-center gap-6">
            <button 
              onClick={toggleTheme}
              className={`p-3 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="hidden 2xl:flex items-center gap-8">
              <div className={`text-right border-r pr-6 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Knowledge Points</p>
                <p className={`text-lg font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{entities.length || '-'}</p>
              </div>
              <div className="text-right">
                <p className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Active Model</p>
                <p className="text-lg font-mono text-blue-500">Gemini Pro 3</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-screen-2xl mx-auto p-6 grid grid-cols-1 xl:grid-cols-12 gap-10 mt-6">
        
        {/* Navigation Sidebar */}
        <aside className="xl:col-span-3 space-y-8">
          <div className="flex items-center justify-between px-3">
            <h2 className={`text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              <Layers className="w-4 h-4 text-blue-500" /> Manifold Projection
            </h2>
            {entities.length > 0 && <button onClick={() => setEntities([])} className="text-slate-600 hover:text-red-400 transition-colors"><X size={14}/></button>}
          </div>
          
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-3 scrollbar-custom">
            {entities.map((entity) => (
              <EntityCard 
                key={entity.id} 
                entity={entity} 
                onSelect={selectEntity}
                onCompareToggle={toggleComparison}
                isSelected={selectedEntity?.id === entity.id}
                isComparison={comparisonEntity?.id === entity.id}
                theme={theme}
              />
            ))}
            
            {!loading && entities.length === 0 && (
              <div className={`text-center py-20 px-8 rounded-[2rem] border-dashed border-2 transition-all group ${
                theme === 'dark' ? 'glass border-slate-800/50 hover:border-blue-500/30' : 'bg-white border-slate-200 hover:border-blue-400 shadow-sm'
              }`}>
                <Globe className={`w-16 h-16 mx-auto mb-6 transition-colors ${theme === 'dark' ? 'text-slate-800 group-hover:text-blue-900' : 'text-slate-100 group-hover:text-blue-100'}`} />
                <h3 className={`font-black text-sm tracking-tight ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>System Idle</h3>
                <p className={`text-xs mt-3 leading-relaxed ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>Enter a query to materialize the latent knowledge graph vectors.</p>
              </div>
            )}
          </div>
        </aside>

        {/* Dynamic Canvas Space */}
        <div className="xl:col-span-9 space-y-10 pb-20">
          <section className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2.6rem] opacity-20 blur group-hover:opacity-30 transition duration-1000" />
            <VectorGraph 
                entities={entities} 
                onNodeClick={selectEntity} 
                selectedId={selectedEntity?.id} 
                comparisonIds={comparisonEntity ? [comparisonEntity.id] : []}
                theme={theme}
            />
          </section>

          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-10">
            {/* Logic & Comparison Section */}
            <div className="space-y-10">
              {comparisonResult && selectedEntity && comparisonEntity && (
                <div className={`rounded-[2rem] p-8 space-y-8 border-l-[10px] shadow-2xl animate-in zoom-in-95 duration-500 ${
                  theme === 'dark' ? 'glass border-purple-500/30' : 'bg-white border-purple-400 border shadow-md'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                      <GitCompare className="w-7 h-7 text-purple-400" />
                    </div>
                    <div>
                      <h2 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Semantic Bridge</h2>
                      <p className="text-xs text-purple-500 font-bold uppercase tracking-widest">{selectedEntity.label} vs {comparisonEntity.label}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800/50' : 'bg-slate-50 border-slate-100'}`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Common Ground</p>
                      <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{comparisonResult.commonGround}</p>
                    </div>
                    <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800/50' : 'bg-slate-50 border-slate-100'}`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Divergence</p>
                      <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{comparisonResult.divergence}</p>
                    </div>
                    <div className={`p-6 rounded-2xl border col-span-full ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800/50' : 'bg-slate-50 border-slate-100'}`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Relational Distance</p>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>{comparisonResult.semanticDistance}</p>
                    </div>
                  </div>
                </div>
              )}

              {analysis && (
                <div className={`rounded-[2.5rem] p-10 space-y-8 shadow-2xl relative overflow-hidden transition-colors ${
                  theme === 'dark' ? 'glass border-slate-800/50' : 'bg-white border-slate-200 border'
                }`}>
                  <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] rounded-full -mr-32 -mt-32 ${theme === 'dark' ? 'bg-blue-500/5' : 'bg-blue-500/10'}`} />
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                      <Brain className="w-7 h-7 text-blue-400" />
                    </div>
                    <h2 className={`text-2xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>System Synthesis</h2>
                  </div>
                  
                  <p className={`leading-relaxed text-base italic border-l-4 pl-6 py-2 relative z-10 ${theme === 'dark' ? 'text-slate-400 border-blue-500/30' : 'text-slate-600 border-blue-400'}`}>
                    "{analysis.summary}"
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                    {analysis.semanticClusters.map((cluster, idx) => (
                      <div key={idx} className={`p-6 rounded-3xl border transition-all group/cluster ${
                        theme === 'dark' 
                        ? 'bg-slate-950/60 border-slate-800/60 hover:bg-slate-900/60 hover:border-blue-500/20' 
                        : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-blue-400 hover:shadow-lg'
                      }`}>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className={`font-bold text-sm tracking-wide transition-colors ${theme === 'dark' ? 'text-white group-hover/cluster:text-blue-400' : 'text-slate-800 group-hover/cluster:text-blue-600'}`}>{cluster.name}</h3>
                          <span className="text-[9px] text-blue-500 font-black bg-blue-500/10 px-3 py-1 rounded-full uppercase tracking-widest">Dimension {idx + 1}</span>
                        </div>
                        <p className={`text-xs mb-5 leading-relaxed ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{cluster.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {cluster.entities.map((e, i) => (
                            <span key={i} className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                              theme === 'dark' ? 'bg-slate-900 text-slate-400 border-slate-800 group-hover/cluster:border-blue-500/10' : 'bg-white text-slate-600 border-slate-200 group-hover/cluster:border-blue-200'
                            }`}>
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {analysis.sparqlSuggestion && (
                    <div className={`p-8 rounded-3xl border font-mono text-xs relative z-10 ${theme === 'dark' ? 'bg-black/40 border-slate-800/80' : 'bg-slate-950 border-slate-900 shadow-xl shadow-slate-200'}`}>
                      <div className="flex items-center gap-3 text-slate-500 mb-5 text-[10px] font-black uppercase tracking-[0.2em]">
                        <Code className="w-5 h-5 text-blue-500" /> Automated SPARQL Discovery
                      </div>
                      <div className="relative group/code">
                        <pre className="text-blue-400/90 overflow-x-auto p-5 bg-slate-950/80 rounded-2xl border border-slate-900 max-h-48 scrollbar-custom">
                          {analysis.sparqlSuggestion}
                        </pre>
                        <button className="absolute top-4 right-4 text-[10px] bg-slate-800 px-3 py-1.5 rounded-lg opacity-0 group-hover/code:opacity-100 transition-opacity hover:bg-slate-700 text-white">COPY</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Entity Context Panel */}
            <div className="space-y-10">
              {selectedEntity ? (
                <div className={`rounded-[2.5rem] p-10 shadow-2xl animate-in slide-in-from-right-10 duration-700 sticky top-32 border ${
                  theme === 'dark' ? 'glass border-slate-800' : 'bg-white border-slate-200 shadow-lg'
                }`}>
                  <div className="flex flex-col md:flex-row items-start gap-8 mb-10">
                    {selectedEntity.imageUrl && (
                      <div className="relative group/img">
                        <div className="absolute -inset-2 bg-blue-500/20 blur-xl opacity-0 group-hover/img:opacity-100 transition-opacity" />
                        <img src={selectedEntity.imageUrl} className={`relative w-32 h-32 rounded-3xl object-cover ring-8 border shadow-2xl ${theme === 'dark' ? 'ring-slate-900 border-slate-800' : 'ring-slate-50 border-slate-100'}`} />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                         <h2 className={`text-3xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedEntity.label}</h2>
                         <a href={`https://www.wikidata.org/wiki/${selectedEntity.id}`} target="_blank" className={`p-3 rounded-2xl transition-all ${theme === 'dark' ? 'bg-slate-900 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10' : 'bg-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                           <Globe size={20} />
                         </a>
                      </div>
                      <p className="text-sm text-blue-500 font-mono font-bold tracking-widest">{selectedEntity.id}</p>
                      <p className={`text-base mt-4 leading-relaxed font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{selectedEntity.description}</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center gap-3">
                       <MessageSquare className="w-5 h-5 text-blue-400" />
                       <span className={`text-[11px] font-black uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Multimodal Insight Synthesis</span>
                    </div>

                    <div className={`rounded-[2rem] p-8 min-h-[300px] border relative ${theme === 'dark' ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-100'}`}>
                      {!entityInsight ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6">
                          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                          <div className="text-center">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Querying Knowledge Store</p>
                            <p className="text-slate-700 text-[9px] mt-1 font-mono">GEMINI-PRO-INSIGHT-V3</p>
                          </div>
                        </div>
                      ) : (
                        <div className="animate-in fade-in duration-1000">
                          <div className={`leading-loose text-sm whitespace-pre-wrap ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            {entityInsight.text}
                          </div>
                          {entityInsight.grounding.length > 0 && (
                            <div className={`mt-10 pt-10 border-t ${theme === 'dark' ? 'border-slate-800/50' : 'border-slate-200'}`}>
                               <p className={`text-[10px] font-black uppercase tracking-widest mb-5 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                                 <Sparkles size={12} className="text-blue-500"/> Citations & Web Context
                               </p>
                               <div className="flex flex-wrap gap-3">
                                  {entityInsight.grounding.map((chunk, i) => chunk.web && (
                                    <a key={i} href={chunk.web.uri} target="_blank" className={`text-[10px] font-bold px-4 py-2.5 rounded-2xl transition-all border truncate max-w-[240px] ${
                                      theme === 'dark' 
                                      ? 'bg-blue-900/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20' 
                                      : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                                    }`}>
                                      {chunk.web.title}
                                    </a>
                                  ))}
                                </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`h-[500px] flex flex-col items-center justify-center p-16 rounded-[3rem] opacity-40 sticky top-32 transition-colors ${
                  theme === 'dark' ? 'glass border-slate-800/50' : 'bg-white border-slate-200 border shadow-sm'
                }`}>
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner transition-colors ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
                    <ArrowRight className={theme === 'dark' ? 'text-slate-800' : 'text-slate-200'} size={32} />
                  </div>
                  <h3 className={`font-black uppercase text-xs tracking-[0.4em] ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>Node Analysis Pending</h3>
                  <p className={`text-[10px] mt-3 italic ${theme === 'dark' ? 'text-slate-700' : 'text-slate-400'}`}>Select a coordinate in the semantic space</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className={`relative mt-20 border-t py-24 px-10 transition-colors duration-500 z-20 overflow-hidden ${theme === 'dark' ? 'glass bg-[#020617]/80 border-slate-800/50' : 'bg-white border-slate-200'}`}>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600" />
        <div className="max-w-screen-2xl mx-auto flex flex-col xl:flex-row justify-between items-start gap-20">
          <div className="max-w-xl space-y-8">
            <div className="flex items-center gap-3">
               <Zap className="w-10 h-10 text-blue-500" />
               <h4 className={`text-3xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>WikiVector Explorer Ultra</h4>
            </div>
            <p className={`text-lg leading-relaxed font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
              The world's most advanced workbench for the Wikidata Knowledge Graph. Engineered to reveal the invisible architecture of human knowledge through the lens of multimodal Large Language Models.
            </p>
            <div className="flex gap-4">
              <span className={`text-[10px] font-black px-4 py-2 rounded-xl tracking-widest uppercase border ${theme === 'dark' ? 'text-blue-500 bg-blue-500/10 border-blue-500/10' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>SPARQL V1.4</span>
              <span className={`text-[10px] font-black px-4 py-2 rounded-xl tracking-widest uppercase border ${theme === 'dark' ? 'text-purple-500 bg-purple-500/10 border-purple-500/10' : 'text-purple-600 bg-purple-50 border-purple-100'}`}>GEMINI 3 PRO</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-24">
            <div>
              <p className={`text-[11px] font-black uppercase tracking-[0.3em] mb-8 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`}>Platform</p>
              <ul className={`text-sm space-y-5 font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                <li className="hover:text-blue-500 cursor-pointer transition-colors">Vector Engine</li>
                <li className="hover:text-blue-500 cursor-pointer transition-colors">Semantic Projection</li>
                <li className="hover:text-blue-500 cursor-pointer transition-colors">Manifold Discovery</li>
                <li className="hover:text-blue-500 cursor-pointer transition-colors">Graph Comparison</li>
              </ul>
            </div>
            <div>
              <p className={`text-[11px] font-black uppercase tracking-[0.3em] mb-8 ${theme === 'dark' ? 'text-purple-500' : 'text-purple-600'}`}>Theory</p>
              <ul className={`text-sm space-y-5 font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                <li className="hover:text-purple-500 cursor-pointer transition-colors">Ontology Maps</li>
                <li className="hover:text-purple-500 cursor-pointer transition-colors">Latent Bridges</li>
                <li className="hover:text-purple-500 cursor-pointer transition-colors">RDF Integration</li>
                <li className="hover:text-purple-500 cursor-pointer transition-colors">Grounding Logic</li>
              </ul>
            </div>
          </div>
        </div>
        <div className={`max-w-screen-2xl mx-auto mt-24 pt-10 border-t flex flex-col md:flex-row justify-between items-center gap-6 ${theme === 'dark' ? 'border-slate-900/50' : 'border-slate-100'}`}>
           <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>© 2025 Neural Knowledge Systems • Experimental Build</p>
           <div className={`flex gap-8 text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
              <span className="hover:text-blue-500 cursor-pointer">Security</span>
              <span className="hover:text-blue-500 cursor-pointer">API Status</span>
              <span className="hover:text-blue-500 cursor-pointer">Model Weights</span>
           </div>
        </div>
      </footer>

      <style>{`
        .scrollbar-custom::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-custom::-webkit-scrollbar-track {
          background: ${theme === 'dark' ? 'rgba(15, 23, 42, 0.1)' : 'rgba(241, 245, 249, 1)'};
        }
        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: ${theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.3)'};
          border-radius: 10px;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: ${theme === 'dark' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.5)'};
        }
      `}</style>
    </div>
  );
}
