
import React, { useRef, useState } from 'react';
import { Upload, Loader2, Database, Image as ImageIcon } from 'lucide-react';
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

    // Helper to resize image client-side to save space/bandwidth
    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800; // Limit width
                    const scaleSize = MAX_WIDTH / img.width;
                    const width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
                    const height = (img.width > MAX_WIDTH) ? img.height * scaleSize : img.height;

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    
                    // Compress to JPEG 0.7 quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('אנא בחר קובץ תמונה בלבד');
            return;
        }

        setIsLoading(true);

        try {
            // STRATEGY 1: SUPABASE STORAGE (Preferred)
            if (supabaseConfig && supabaseConfig.url && supabaseConfig.key && supabaseConfig.key.length > 20) {
                try {
                    const publicUrl = await dbService.uploadImage(supabaseConfig.url, supabaseConfig.key, file);
                    if (publicUrl) {
                        onImageSelected(publicUrl);
                        setIsLoading(false);
                        return; 
                    }
                } catch (e) {
                    console.warn("Supabase upload failed, trying next strategy...", e);
                }
            }

            // STRATEGY 2: GOOGLE SCRIPT (Legacy)
            if (googleSheetsUrl && googleSheetsUrl.includes('script.google.com')) {
                try {
                    const resizedBase64 = await resizeImage(file);
                    const publicUrl = await cloudService.uploadImage(googleSheetsUrl, resizedBase64, file.name);
                    if (publicUrl) {
                        onImageSelected(publicUrl);
                        setIsLoading(false);
                        return;
                    }
                } catch (e) {
                    console.warn("Google upload failed...", e);
                }
            }

            // STRATEGY 3: LOCAL FALLBACK (Works immediately)
            // If we are here, no cloud upload worked. We use the resized Base64 directly.
            const localBase64 = await resizeImage(file);
            onImageSelected(localBase64);
            // alert("התמונה נשמרה מקומית (שים לב: שמירה מרובה תכביד על הדפדפן).");

        } catch (error) {
            alert("שגיאה בעיבוד התמונה.");
            console.error(error);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const hasCloud = (supabaseConfig && supabaseConfig.key) || (googleSheetsUrl && googleSheetsUrl.includes('script'));

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
                title={hasCloud ? "העלה לענן" : "העלה תמונה (שמירה מקומית)"}
            >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : (hasCloud ? <Database size={18} className="text-[#2EB0D9]"/> : <ImageIcon size={18} />)}
                {isLoading && <span className="ml-2 text-xs">מעלה...</span>}
            </Button>
        </>
    );
};
