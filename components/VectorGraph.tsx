
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Entity } from '../types';

interface VectorGraphProps {
  entities: Entity[];
  onNodeClick: (entity: Entity) => void;
  selectedId?: string;
  comparisonIds?: string[];
  theme: 'dark' | 'light';
}

export const VectorGraph: React.FC<VectorGraphProps> = ({ entities, onNodeClick, selectedId, comparisonIds = [], theme }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const isLight = theme === 'light';

  useEffect(() => {
    if (!svgRef.current || entities.length === 0) return;

    const width = containerRef.current?.clientWidth || 800;
    const height = 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");
    
    // Drop shadow for nodes
    const dropShadow = defs.append("filter")
      .attr("id", "shadow")
      .attr("x", "-20%")
      .attr("y", "-20%")
      .attr("width", "140%")
      .attr("height", "140%");
    dropShadow.append("feGaussianBlur").attr("in", "SourceAlpha").attr("stdDeviation", isLight ? "1.5" : "3");
    dropShadow.append("feOffset").attr("dx", "2").attr("dy", "2");
    dropShadow.append("feComponentTransfer").append("feFuncA").attr("type", "linear").attr("slope", isLight ? "0.1" : "0.3");
    dropShadow.append("feMerge").selectAll("feMergeNode").data(["", "SourceGraphic"]).enter().append("feMergeNode");

    // Glow for selected
    const glow = defs.append("filter")
      .attr("id", "nodeGlow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    glow.append("feGaussianBlur").attr("stdDeviation", isLight ? "3" : "4").attr("result", "blur");
    glow.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

    const mainGroup = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on("zoom", (event) => {
        mainGroup.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    const simulation = d3.forceSimulation<any>(entities)
      .force("link", d3.forceLink().id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(70))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05));

    const links: any[] = [];
    for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < Math.min(i + 4, entities.length); j++) {
            links.push({ source: entities[i].id, target: entities[j].id });
        }
    }

    const link = mainGroup.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", d => {
        const isRelated = (d.source === selectedId || d.target === selectedId) || 
                          (comparisonIds.includes(d.source) && comparisonIds.includes(d.target));
        if (isRelated) return isLight ? "#2563eb" : "#3b82f6";
        return isLight ? "#e2e8f0" : "#1e293b";
      })
      .attr("stroke-opacity", d => (d.source === selectedId || d.target === selectedId) ? 0.8 : 0.4)
      .attr("stroke-width", d => (d.source === selectedId || d.target === selectedId) ? 2 : 1)
      .attr("stroke-dasharray", "4,4");

    const node = mainGroup.append("g")
      .selectAll("g")
      .data(entities)
      .join("g")
      .attr("class", "cursor-pointer")
      .on("click", (event, d) => onNodeClick(d))
      .on("mouseenter", (e, d) => setHoveredNode(d.id))
      .on("mouseleave", () => setHoveredNode(null))
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    node.append("circle")
      .attr("r", (d) => {
        if (d.id === selectedId) return 26;
        if (comparisonIds.includes(d.id)) return 22;
        return 18;
      })
      .attr("fill", (d) => {
        if (d.id === selectedId) return isLight ? "#2563eb" : "#2563eb";
        if (comparisonIds.includes(d.id)) return isLight ? "#7c3aed" : "#7c3aed";
        return isLight ? "#ffffff" : "#0f172a";
      })
      .attr("stroke", (d, i) => {
        if (d.id === selectedId) return isLight ? "#3b82f6" : "#60a5fa";
        if (comparisonIds.includes(d.id)) return isLight ? "#8b5cf6" : "#a78bfa";
        return d3.interpolateTurbo(i / entities.length);
      })
      .attr("stroke-width", d => (d.id === selectedId || comparisonIds.includes(d.id)) ? 4 : 2)
      .style("filter", d => (d.id === selectedId || comparisonIds.includes(d.id)) ? "url(#nodeGlow)" : "url(#shadow)");

    node.append("text")
      .attr("dx", d => (d.id === selectedId ? 32 : 26))
      .attr("dy", 4)
      .text(d => d.label)
      .attr("fill", d => {
        if (d.id === selectedId || comparisonIds.includes(d.id)) return isLight ? (d.id === selectedId ? "#2563eb" : "#7c3aed") : "#fff";
        return isLight ? "#475569" : "#94a3b8";
      })
      .attr("font-size", d => (d.id === selectedId ? "16px" : "12px"))
      .attr("font-weight", d => (d.id === selectedId ? "800" : "600"))
      .attr("font-family", "Inter, sans-serif")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => simulation.stop();
  }, [entities, onNodeClick, selectedId, comparisonIds, theme]);

  return (
    <div ref={containerRef} className={`w-full h-[600px] rounded-[2.5rem] overflow-hidden relative border shadow-2xl group transition-colors duration-500 ${
      isLight ? 'bg-white border-slate-200' : 'glass border-slate-800/50'
    }`}>
      <div className="absolute top-8 left-8 z-10 pointer-events-none space-y-1">
        <h4 className={`text-[11px] font-black uppercase tracking-[0.4em] ${isLight ? 'text-blue-600' : 'text-blue-500'}`}>Semantic Manifold v2.0</h4>
        <p className={`text-[10px] font-medium ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Multi-dimensional force interaction</p>
      </div>
      
      <div className="absolute top-8 right-8 z-10 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-full text-[10px] font-bold uppercase tracking-wider ${
          isLight ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
        }`}>
           <div className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-blue-600' : 'bg-blue-500'}`} /> Selected
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-full text-[10px] font-bold uppercase tracking-wider ${
          isLight ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
        }`}>
           <div className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-purple-600' : 'bg-purple-500'}`} /> Comparison
        </div>
      </div>

      <svg ref={svgRef} className={`w-full h-full transition-colors duration-500 ${isLight ? 'bg-slate-50/30' : 'bg-[#020617]/40'}`} />
      
      <div className={`absolute inset-0 pointer-events-none border-[12px] opacity-40 rounded-[2.5rem] transition-colors ${
        isLight ? 'border-white' : 'border-[#020617]'
      }`} />
    </div>
  );
};
