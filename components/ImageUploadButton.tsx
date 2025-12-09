import React, { useRef, useState } from 'react';
import { Upload, Loader2, Cloud, Database } from 'lucide-react';
import { Button } from './Button.tsx';
import { cloudService } from '../services/api.ts';
import { dbService } from '../services/supabase.ts';

interface ImageUploadButtonProps {
    onImageSelected: (url: string) => void;
    googleSheetsUrl?: string; // Legacy
    supabaseConfig?: { url: string; key: string }; // New
    className?: string;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({ onImageSelected, googleSheetsUrl, supabaseConfig, className = '' }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            alert('אנא בחר קובץ תמונה בלבד');
            return;
        }

        // 5MB Limit
        if (file.size > 5 * 1024 * 1024) {
            alert('הקובץ גדול מדי. נא לבחור תמונה עד 5MB.');
            return;
        }

        setIsLoading(true);

        try {
            // STRATEGY 1: SUPABASE STORAGE (Preferred)
            if (supabaseConfig && supabaseConfig.url && supabaseConfig.key) {
                const publicUrl = await dbService.uploadImage(supabaseConfig.url, supabaseConfig.key, file);
                if (publicUrl) {
                    onImageSelected(publicUrl);
                    alert("התמונה הועלתה בהצלחה (Supabase)!");
                    return; // Exit on success
                } else {
                    console.error("Supabase upload failed, falling back...");
                }
            }

            // STRATEGY 2: GOOGLE SCRIPT (Legacy Fallback)
            if (googleSheetsUrl && googleSheetsUrl.includes('script.google.com')) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const base64Data = e.target?.result as string;
                    const publicUrl = await cloudService.uploadImage(googleSheetsUrl, base64Data, file.name);
                    
                    if (publicUrl) {
                        onImageSelected(publicUrl);
                        alert("התמונה הועלתה בהצלחה ל-Google Drive!");
                    } else {
                        alert("העלאת התמונה נכשלה.");
                    }
                    setIsLoading(false);
                };
                reader.readAsDataURL(file);
                return; // Reader handles the rest
            }

            alert('שגיאה: לא הוגדר חיבור לאחסון (Supabase או Google). נא להגדיר בלשונית חיבורים.');

        } catch (error) {
            alert("שגיאה בהעלאה.");
            console.error(error);
        } finally {
            if (!googleSheetsUrl) setIsLoading(false); // If using reader, loading stops in onload
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const hasSupabase = supabaseConfig && supabaseConfig.url && supabaseConfig.key;

    return (
        <>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
            />
            <Button 
                onClick={() => fileInputRef.current?.click()} 
                variant="outline" 
                className={`bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 ${className}`}
                disabled={isLoading}
                title={hasSupabase ? "העלה ל-Supabase Storage" : "העלה ל-Google Drive"}
            >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : (hasSupabase ? <Database size={18} className="text-[#2EB0D9]"/> : <Upload size={18} />)}
                {isLoading && <span className="ml-2 text-xs">מעלה...</span>}
            </Button>
        </>
    );
};
