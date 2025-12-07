import React, { useState } from 'react';
import { MessageCircle, Accessibility, X } from 'lucide-react';

export const FloatingWidgets: React.FC = () => {
  const [showAccess, setShowAccess] = useState(false);

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
            <p className="text-xs text-slate-500 mb-2">הצהרת נגישות: אתר זה מותאם לקוראי מסך ותומך בניווט מקלדת.</p>
            <div className="space-y-2">
                <button className="w-full text-right text-sm hover:bg-slate-50 p-1 rounded">הגדל טקסט</button>
                <button className="w-full text-right text-sm hover:bg-slate-50 p-1 rounded">ניגודיות גבוהה</button>
                <button className="w-full text-right text-sm hover:bg-slate-50 p-1 rounded">עצור אנימציות</button>
            </div>
        </div>
      )}
    </div>
  );
};