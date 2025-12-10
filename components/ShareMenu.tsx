
import React, { useState, useRef, useEffect } from 'react';
import { Share2, Copy, Mail, MessageCircle, X, Check } from 'lucide-react';

interface ShareMenuProps {
    title?: string;
    text?: string;
    url?: string;
    variant?: 'floating' | 'inline';
    colorClass?: string; // Optional override for text color in inline mode
}

export const ShareMenu: React.FC<ShareMenuProps> = ({ 
    title = document.title, 
    text = "מצאתי מידע משפטי מעניין שכדאי לך לראות:", 
    url = window.location.href,
    variant = 'floating',
    colorClass = 'text-slate-400'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(`${text} ${title} - ${url}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleWhatsApp = () => {
        const msg = encodeURIComponent(`${text}\n*${title}*\n${url}`);
        window.open(`https://wa.me/?text=${msg}`, '_blank');
        setIsOpen(false);
    };

    const handleEmail = () => {
        const subject = encodeURIComponent(title);
        const body = encodeURIComponent(`${text}\n\n${title}\n${url}`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        setIsOpen(false);
    };

    return (
        <div className="relative z-50" ref={menuRef}>
            {/* Trigger Button */}
            {variant === 'floating' ? (
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-slate-700 hover:bg-[#2EB0D9] text-white p-2 md:p-3 rounded-full shadow-xl transition-transform hover:scale-110 flex items-center justify-center"
                    aria-label="Share"
                    title="שתף"
                >
                    <Share2 size={20} className="md:w-7 md:h-7" />
                </button>
            ) : (
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className={`p-2 rounded-full hover:bg-black/10 transition-colors ${colorClass}`}
                    title="שתף מאמר"
                >
                    <Share2 size={20} />
                </button>
            )}

            {/* Dropdown Menu */}
            {isOpen && (
                <div className={`absolute ${variant === 'floating' ? 'bottom-12 md:bottom-16 left-0' : 'top-10 left-0'} w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 animate-fade-in-up flex flex-col gap-1`}>
                    <div className="flex justify-between items-center px-2 py-1 mb-1 border-b border-slate-800">
                        <span className="text-xs font-bold text-slate-400">שתף באמצעות</span>
                        <button onClick={() => setIsOpen(false)}><X size={14} className="text-slate-500 hover:text-white"/></button>
                    </div>

                    <button onClick={handleWhatsApp} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors text-right">
                        <div className="p-1 bg-green-500/20 text-green-500 rounded"><MessageCircle size={18}/></div>
                        <span className="text-sm">WhatsApp</span>
                    </button>

                    <button onClick={handleEmail} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors text-right">
                        <div className="p-1 bg-blue-500/20 text-blue-500 rounded"><Mail size={18}/></div>
                        <span className="text-sm">אימייל</span>
                    </button>

                    <button onClick={handleCopy} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors text-right">
                        <div className="p-1 bg-slate-500/20 text-slate-400 rounded">
                            {copied ? <Check size={18} className="text-green-500"/> : <Copy size={18}/>}
                        </div>
                        <span className="text-sm">{copied ? 'הועתק!' : 'העתק קישור'}</span>
                    </button>
                </div>
            )}
        </div>
    );
};
