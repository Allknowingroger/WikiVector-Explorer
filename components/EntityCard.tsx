
import React from 'react';
import { Entity } from '../types';
import { Info, GitCompare, ChevronRight } from 'lucide-react';

interface EntityCardProps {
  entity: Entity;
  onSelect: (entity: Entity) => void;
  onCompareToggle: (entity: Entity) => void;
  isSelected: boolean;
  isComparison: boolean;
  theme: 'dark' | 'light';
}

export const EntityCard: React.FC<EntityCardProps> = ({ entity, onSelect, onCompareToggle, isSelected, isComparison, theme }) => {
  const isLight = theme === 'light';

  return (
    <div 
      className={`group relative p-4 rounded-2xl cursor-pointer transition-all duration-500 border ${
        isSelected ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/20 shadow-md' : 
        isComparison ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/20 shadow-md' : 
        isLight ? 'bg-white border-slate-200 hover:bg-slate-50 hover:border-blue-400 shadow-sm' :
        'glass hover:bg-slate-800/60 border-slate-800/50'
      }`}
      onClick={() => onSelect(entity)}
    >
      <div className="flex gap-4 items-start relative z-10">
        {entity.imageUrl ? (
          <div className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border transition-colors ${isLight ? 'border-slate-100 bg-slate-50' : 'border-slate-800 bg-slate-900 group-hover:border-slate-600'}`}>
            <img src={entity.imageUrl} alt={entity.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          </div>
        ) : (
          <div className={`w-16 h-16 rounded-xl flex-shrink-0 border flex items-center justify-center transition-colors ${isLight ? 'border-slate-100 bg-slate-50 text-slate-300' : 'border-slate-800 bg-slate-900 text-slate-700'}`}>
            <Info size={20} />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-0.5">
            <h3 className={`font-bold truncate transition-colors text-sm ${
              isSelected ? 'text-blue-500' : 
              isComparison ? 'text-purple-600' : 
              isLight ? 'text-slate-800' : 'text-slate-100'
            }`}>
              {entity.label}
            </h3>
          </div>
          <p className={`text-[11px] line-clamp-2 leading-relaxed mb-3 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            {entity.description || 'Global Knowledge Entity'}
          </p>
          
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-mono font-bold uppercase tracking-tighter ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>{entity.id}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); onCompareToggle(entity); }}
              className={`p-1.5 rounded-lg transition-all ${
                isComparison ? 'bg-purple-600 text-white' : isLight ? 'bg-slate-100 text-slate-400 hover:text-purple-600 hover:bg-purple-50' : 'bg-slate-900 text-slate-500 hover:text-purple-400 hover:bg-purple-500/10'
              }`}
              title="Add to comparison"
            >
              <GitCompare size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className={`absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'text-blue-500' : 'text-slate-400'}`}>
        <ChevronRight size={14} />
      </div>
      
      {(isSelected || isComparison) && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isSelected ? 'bg-blue-500' : 'bg-purple-500'}`} />
      )}
    </div>
  );
};
