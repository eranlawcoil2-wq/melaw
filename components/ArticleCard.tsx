import React from 'react';
import { Article, CATEGORY_LABELS } from '../types.ts';
import { PlayCircle, ArrowLeft } from 'lucide-react';

interface ArticleCardProps {
  article: Article;
  onClick: () => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-slate-900 rounded-xl shadow-md overflow-hidden border border-slate-800 hover:border-[#2EB0D9]/50 hover:shadow-xl hover:shadow-[#2EB0D9]/10 transition-all duration-300 flex flex-col h-full cursor-pointer group transform hover:-translate-y-1"
    >
      {/* Media Header */}
      <div className="relative h-48 md:h-56 bg-slate-800 overflow-hidden flex-shrink-0">
        {/* Ken Burns Animation */}
        <img 
          src={article.imageUrl} 
          alt={article.title} 
          className="w-full h-full object-cover animate-ken-burns opacity-90 group-hover:opacity-100 transition-opacity" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
        
        {/* Category Label (Hebrew) */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 z-10 shadow-lg">
            {CATEGORY_LABELS[article.category]}
        </div>

        {article.videoUrl && (
            <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-md p-1.5 rounded-full text-white border border-white/20">
                <PlayCircle size={16} />
            </div>
        )}
      </div>

      {/* Content Preview */}
      <div className="p-5 flex-1 flex flex-col bg-slate-900">
          <h3 className="text-xl font-bold text-white mb-3 leading-tight line-clamp-2 group-hover:text-[#2EB0D9] transition-colors">
              {article.title}
          </h3>
          
          <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 mb-4 flex-1">
              {article.abstract}
          </p>

          <div className="flex items-center justify-end mt-auto pt-3 border-t border-slate-800">
               <ArrowLeft size={18} className="text-[#2EB0D9] group-hover:-translate-x-1 transition-transform"/>
          </div>
      </div>
    </div>
  );
};