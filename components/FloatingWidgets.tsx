import React, { useState } from 'react';
import { MessageCircle, Accessibility, X, Type, Eye, PauseCircle } from 'lucide-react';

export const FloatingWidgets: React.FC = () => {
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
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-3">
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
        <div className="absolute bottom-16 left-0 w-64 bg-white rounded-lg shadow-2xl p-4 border border-slate-200 animate-fade-in-up">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-800">נגישות</h3>
                <button onClick={() => setShowAccess(false)}><X size={18} /></button>
            </div>
            <p className="text-xs text-slate-500 mb-4">הצהרת נגישות: אתר זה מותאם לקוראי מסך ותומך בניווט מקלדת.</p>
            <div className="space-y-2">
                <button 
                    onClick={handleLargeText}
                    className={`w-full text-right text-sm p-2 rounded flex items-center gap-2 ${largeText ? 'bg-[#2EB0D9] text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                    <Type size={16} /> הגדל טקסט
                </button>
                <button 
                    onClick={handleHighContrast}
                    className={`w-full text-right text-sm p-2 rounded flex items-center gap-2 ${highContrast ? 'bg-[#2EB0D9] text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                    <Eye size={16} /> ניגודיות גבוהה
                </button>
                <button 
                    onClick={handleStopAnimations}
                    className={`w-full text-right text-sm p-2 rounded flex items-center gap-2 ${stopAnimations ? 'bg-[#2EB0D9] text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                    <PauseCircle size={16} /> עצור אנימציות
                </button>
            </div>
        </div>
      )}
    </div>
  );
};