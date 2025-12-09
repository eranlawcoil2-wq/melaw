import React, { useState } from 'react';
import { MessageCircle, Accessibility, X, Type, Eye, PauseCircle } from 'lucide-react';
import { ShareMenu } from './ShareMenu.tsx';

interface FloatingWidgetsProps {
  version?: string;
}

export const FloatingWidgets: React.FC<FloatingWidgetsProps> = ({ version }) => {
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

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-3 items-start">
      {/* Version Badge - Temporary */}
      {version && (
        <div className="bg-slate-800 text-[10px] text-white py-1 px-2 rounded-md shadow-lg border border-slate-700 mb-1 opacity-80 hover:opacity-100 cursor-default">
            {version}
        </div>
      )}

      {/* WhatsApp */}
      <a 
        href="https://wa.me/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-xl transition-transform hover:scale-110 flex items-center justify-center"
        aria-label="Contact on WhatsApp"
      >
        <MessageCircle size={28} />
      </a>

      {/* Share Widget */}
      <ShareMenu 
        title="MeLaw - משרד עורכי דין דיגיטלי" 
        text="היי, שווה להסתכל על האתר הזה:" 
      />

      {/* Accessibility Trigger */}
      <button 
        onClick={() => setShowAccess(!showAccess)}
        className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-xl transition-transform hover:scale-110 flex items-center justify-center"
        aria-label="Accessibility Menu"
      >
        <Accessibility size={28} />
      </button>

      {/* Accessibility Panel */}
      {showAccess && (
        <div className="absolute bottom-16 left-0 w-64 bg-slate-900 rounded-lg shadow-2xl p-4 border border-slate-700 animate-fade-in-up">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-white">נגישות</h3>
                <button onClick={() => setShowAccess(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-xs text-slate-400 mb-4">הצהרת נגישות: אתר זה מותאם לקוראי מסך ותומך בניווט מקלדת.</p>
            <div className="space-y-2">
                <button 
                    onClick={handleLargeText}
                    className={`w-full text-right text-sm p-2 rounded flex items-center gap-2 ${largeText ? 'bg-[#2EB0D9] text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                >
                    <Type size={16} /> הגדל טקסט
                </button>
                <button 
                    onClick={handleHighContrast}
                    className={`w-full text-right text-sm p-2 rounded flex items-center gap-2 ${highContrast ? 'bg-[#2EB0D9] text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                >
                    <Eye size={16} /> ניגודיות גבוהה
                </button>
                <button 
                    onClick={handleStopAnimations}
                    className={`w-full text-right text-sm p-2 rounded flex items-center gap-2 ${stopAnimations ? 'bg-[#2EB0D9] text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                >
                    <PauseCircle size={16} /> עצור אנימציות
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
