
import React, { useState } from 'react';
import { MessageCircle, Accessibility, X, Type, Eye, PauseCircle, RefreshCw, CalendarDays } from 'lucide-react';
import { ShareMenu } from './ShareMenu.tsx';

interface FloatingWidgetsProps {
  version?: string; // Kept for interface compatibility but optional/unused now
  dataVersion?: string;
}

export const FloatingWidgets: React.FC<FloatingWidgetsProps> = ({ dataVersion }) => {
  const [showAccess, setShowAccess] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [stopAnimations, setStopAnimations] = useState(false);

  const toggleClass = (className: string, active: boolean) => {
    if (active) {
        document.body.classList.add(className);
    } else {
        document.body.classList.remove(className);
    }
  };

  const handleLargeText = () => {
      const newState = !largeText;
      setLargeText(newState);
      toggleClass('a11y-large-text', newState);
  };

  const handleHighContrast = () => {
      const newState = !highContrast;
      setHighContrast(newState);
      toggleClass('a11y-high-contrast', newState);
  };

  const handleStopAnimations = () => {
      const newState = !stopAnimations;
      setStopAnimations(newState);
      toggleClass('a11y-stop-animations', newState);
  };

  const handleHardReset = () => {
      if (confirm("פעולה זו תרענן את האתר ותנקה זיכרון מקומי כדי לקבל את הגרסה האחרונה. להמשיך?")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  return (
    <div className="fixed bottom-2 left-2 md:bottom-4 md:left-4 z-50 flex flex-col gap-2 md:gap-3 items-start">
      {/* Last Updated Badge - Replaces Version */}
      {dataVersion && (
        <div className="flex flex-col gap-1 items-start mb-1">
             <div className="flex items-center gap-1 bg-slate-800 text-[9px] md:text-[10px] text-white py-0.5 px-1.5 md:py-1 md:px-2 rounded-md shadow-lg border border-slate-700 opacity-70 hover:opacity-100 cursor-default" title="עודכן לאחרונה">
                <CalendarDays size={10} className="text-[#2EB0D9]"/>
                <span dir="ltr">{dataVersion}</span>
                <button onClick={handleHardReset} className="ml-1 p-0.5 hover:bg-slate-700 rounded text-yellow-400" title="רענון מלא (נקה מטמון)">
                    <RefreshCw size={10} />
                </button>
            </div>
        </div>
      )}

      {/* WhatsApp */}
      <a 
        href="https://wa.me/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="bg-green-500 hover:bg-green-600 text-white p-2 md:p-3 rounded-full shadow-xl transition-transform hover:scale-110 flex items-center justify-center"
        aria-label="Contact on WhatsApp"
      >
        <MessageCircle size={20} className="md:w-7 md:h-7" />
      </a>

      {/* Share Widget */}
      <ShareMenu 
        title="MeLaw - משרד עורכי דין דיגיטלי" 
        text="היי, שווה להסתכל על האתר הזה:" 
        variant="floating"
      />

      {/* Accessibility Trigger */}
      <button 
        onClick={() => setShowAccess(!showAccess)}
        className="bg-blue-600 hover:bg-blue-700 text-white p-2 md:p-3 rounded-full shadow-xl transition-transform hover:scale-110 flex items-center justify-center"
        aria-label="Accessibility Menu"
      >
        <Accessibility size={20} className="md:w-7 md:h-7" />
      </button>

      {/* Accessibility Panel */}
      {showAccess && (
        <div className="absolute bottom-12 md:bottom-16 left-0 w-56 md:w-64 bg-slate-900 rounded-lg shadow-2xl p-3 md:p-4 border border-slate-700 animate-fade-in-up">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-white text-sm md:text-base">נגישות</h3>
                <button onClick={() => setShowAccess(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-1 md:space-y-2">
                <button onClick={handleLargeText} className={`w-full text-right text-xs md:text-sm p-2 rounded flex items-center gap-2 ${largeText ? 'bg-[#2EB0D9] text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
                    <Type size={14} /> הגדל טקסט
                </button>
                <button onClick={handleHighContrast} className={`w-full text-right text-xs md:text-sm p-2 rounded flex items-center gap-2 ${highContrast ? 'bg-[#2EB0D9] text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
                    <Eye size={14} /> ניגודיות גבוהה
                </button>
                <button onClick={handleStopAnimations} className={`w-full text-right text-xs md:text-sm p-2 rounded flex items-center gap-2 ${stopAnimations ? 'bg-[#2EB0D9] text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
                    <PauseCircle size={14} /> עצור אנימציות
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
