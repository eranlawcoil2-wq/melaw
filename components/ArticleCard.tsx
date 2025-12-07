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
      className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-100 hover:shadow-2xl transition-all duration-300 flex flex-col h-full cursor-pointer group transform hover:-translate-y-1"
    >
      {/* Media Header */}
      <div className="relative h-48 md:h-60 bg-slate-200 overflow-hidden">
        <img 
          src={article.imageUrl} 
          alt={article.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent flex flex-col justify-end p-6">
           <h3 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight group-hover:text-amber-400 transition-colors">{article.title}</h3>
           <p className="text-slate-200 text-sm line-clamp-2 opacity-90">{article.abstract}</p>
        </div>
        {article.videoUrl && (
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white animate-pulse">
                <PlayCircle size={24} />
            </div>
        )}
      </div>

      {/* Content Preview */}
      <div className="p-5 flex-1 flex flex-col justify-between bg-white">
          <div>
            {article.quote && (
                <div className="mb-4 flex items-start gap-2 text-amber-600/80">
                    <Quote size={16} className="mt-1 flex-shrink-0" />
                    <p className="text-sm italic font-serif leading-relaxed">"{article.quote}"</p>
                </div>
            )}
            {/* Show first tab title as a teaser */}
            <div className="flex gap-2 mb-4">
                {article.tabs.slice(0, 2).map((tab, i) => (
                    <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{tab.title}</span>
                ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-amber-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
              <span>קרא את המאמר המלא</span>
              <ArrowLeft size={16} />
          </div>
      </div>
    </div>
  );
};