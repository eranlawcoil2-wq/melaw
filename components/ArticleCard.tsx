import React from 'react';
import { Article } from '../types.ts';
import { Quote, PlayCircle, ArrowLeft } from 'lucide-react';

interface ArticleCardProps {
  article: Article;
  onClick: () => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 flex flex-col h-full cursor-pointer group transform hover:-translate-y-1"
    >
      {/* Media Header - Reduced height for compact view */}
      <div className="relative h-48 md:h-56 bg-slate-200 overflow-hidden flex-shrink-0">
        {/* Ken Burns Animation */}
        <img 
          src={article.imageUrl} 
          alt={article.title} 
          className="w-full h-full object-cover animate-ken-burns" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
        {article.videoUrl && (
            <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-md p-1.5 rounded-full text-white">
                <PlayCircle size={16} />
            </div>
        )}
      </div>

      {/* Content Preview */}
      <div className="p-5 flex-1 flex flex-col bg-white">
          {/* Increased Font Size */}
          <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight line-clamp-2 group-hover:text-[#2EB0D9] transition-colors">
              {article.title}
          </h3>
          
          {/* Increased Font Size */}
          <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-4 flex-1">
              {article.abstract}
          </p>

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
               {/* Category Tag */}
               <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                   {article.category}
               </span>
               <ArrowLeft size={18} className="text-[#2EB0D9] group-hover:-translate-x-1 transition-transform"/>
          </div>
      </div>
    </div>
  );
};