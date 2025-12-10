
import React, { useState } from 'react';
import { Search, X, Loader2, Image as ImageIcon, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from './Button.tsx';

interface ImagePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
    initialQuery?: string;
    unsplashAccessKey?: string;
}

interface UnsplashImage {
    id: string;
    urls: {
        regular: string;
        small: string;
    };
    alt_description: string;
    user: {
        name: string;
    };
}

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({ 
    isOpen, 
    onClose, 
    onSelect, 
    initialQuery = '', 
    unsplashAccessKey 
}) => {
    const [query, setQuery] = useState(initialQuery);
    const [images, setImages] = useState<UnsplashImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    // Initial search when opened
    React.useEffect(() => {
        if (isOpen && initialQuery && !hasSearched) {
            handleSearch();
        }
    }, [isOpen]);

    const handleSearch = async () => {
        if (!query.trim()) return;
        
        setLoading(true);
        setError('');
        setImages([]);
        setHasSearched(true);

        try {
            // ENHANCEMENT: Auto-append relevant context keywords to improve results
            // This fixes the issue where searching for "contracts" might show something random
            const enhancedQuery = `${query} legal lawyer office business`;

            if (unsplashAccessKey) {
                // Real API Call
                const response = await fetch(`https://api.unsplash.com/search/photos?page=1&query=${encodeURIComponent(enhancedQuery)}&client_id=${unsplashAccessKey}&per_page=9&orientation=landscape`);
                
                if (!response.ok) {
                    if (response.status === 401) throw new Error("Unsplash API Key לא תקין");
                    if (response.status === 403) throw new Error("חריגה ממכסת השימוש ב-Unsplash");
                    throw new Error("שגיאה בטעינת תמונות");
                }

                const data = await response.json();
                setImages(data.results);
            } else {
                // MOCK Fallback (Simulate 9 images using seed)
                await new Promise(r => setTimeout(r, 800)); // Fake delay
                const mockImages: UnsplashImage[] = Array.from({ length: 9 }).map((_, i) => ({
                    id: `mock-${i}`,
                    urls: {
                        // Use picsum with seed based on query + index to get variety but consistent results for same query
                        regular: `https://picsum.photos/seed/${query}-${i}/800/600`,
                        small: `https://picsum.photos/seed/${query}-${i}/400/300`
                    },
                    alt_description: `Mock image for ${query}`,
                    user: { name: 'Demo User' }
                }));
                setImages(mockImages);
            }
        } catch (err: any) {
            setError(err.message || 'אירעה שגיאה בחיפוש');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 w-full max-w-4xl rounded-xl border border-slate-700 shadow-2xl flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950 rounded-t-xl">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ImageIcon className="text-[#2EB0D9]" /> חיפוש תמונה למאמר
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 bg-slate-900 border-b border-slate-800">
                    <div className="mb-2 text-xs text-slate-400">
                        טיפ: המערכת מוסיפה אוטומטית מילות מפתח משפטיות (Legal, Lawyer) לחיפוש שלך כדי למקד תוצאות.
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-[#2EB0D9] outline-none"
                            placeholder="נושא (למשל: חוזה, משרד, נדלן)..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Button onClick={handleSearch} disabled={loading} className="w-32">
                            {loading ? <Loader2 className="animate-spin" /> : <><Search size={18} className="ml-2"/> חפש</>}
                        </Button>
                    </div>
                    {!unsplashAccessKey && (
                        <div className="mt-2 text-xs text-blue-400 flex items-center gap-1 bg-blue-500/10 p-2 rounded border border-blue-500/20">
                            <Sparkles size={12} />
                            <span>מצב דמו פעיל: החיפוש עובד ומציג תמונות אילוסטרציה (Mock) גם ללא מפתח Unsplash.</span>
                        </div>
                    )}
                </div>

                {/* Grid Results */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-950 min-h-[400px]">
                    {error && (
                        <div className="text-center text-red-400 py-10">
                            <p>{error}</p>
                        </div>
                    )}

                    {!loading && !error && images.length === 0 && hasSearched && (
                        <div className="text-center text-slate-500 py-20">
                            לא נמצאו תמונות עבור "{query}". נסה מילות חיפוש אחרות באנגלית.
                        </div>
                    )}

                    {!loading && !error && !hasSearched && (
                        <div className="text-center text-slate-600 py-20 flex flex-col items-center">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p>הקלד נושא לחיפוש ולחץ על "חפש"</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {images.map((img) => (
                            <div 
                                key={img.id} 
                                onClick={() => { onSelect(img.urls.regular); onClose(); }}
                                className="group relative aspect-video cursor-pointer overflow-hidden rounded-lg border border-slate-800 hover:border-[#2EB0D9] transition-all"
                            >
                                <img 
                                    src={img.urls.small} 
                                    alt={img.alt_description} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white font-bold border-2 border-white px-4 py-2 rounded-full">בחר תמונה</span>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-[10px] text-slate-300 truncate px-2">
                                    by {img.user.name}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
