import React, { useRef, useState } from 'react';
import { Upload, Loader2, AlertTriangle, Cloud } from 'lucide-react';
import { Button } from './Button.tsx';
import { cloudService } from '../services/api.ts';

interface ImageUploadButtonProps {
    onImageSelected: (url: string) => void;
    googleSheetsUrl?: string; // Need this for uploading
    className?: string;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({ onImageSelected, googleSheetsUrl, className = '' }) => {
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

        // 5MB Limit for Drive Uploads via Script to prevent timeouts
        if (file.size > 5 * 1024 * 1024) {
            alert('הקובץ גדול מדי. נא לבחור תמונה עד 5MB.');
            return;
        }

        if (!googleSheetsUrl || !googleSheetsUrl.includes('script.google.com')) {
            alert('שגיאה: לא הוגדר חיבור לשרת (Google Script). לא ניתן להעלות תמונות לענן.\nנא להגדיר זאת ב"חיבורים ואינטגרציות".');
            return;
        }

        setIsLoading(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Data = e.target?.result as string;
            
            try {
                // Upload to Google Drive via Script
                const publicUrl = await cloudService.uploadImage(googleSheetsUrl, base64Data, file.name);
                
                if (publicUrl) {
                    onImageSelected(publicUrl);
                    alert("התמונה הועלתה בהצלחה ל-Google Drive!");
                } else {
                    alert("העלאת התמונה נכשלה. וודא שהסקריפט מעודכן.");
                }
            } catch (error) {
                alert("שגיאה בהעלאה.");
                console.error(error);
            } finally {
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.onerror = () => {
            alert('שגיאה בקריאת הקובץ');
            setIsLoading(false);
        };

        reader.readAsDataURL(file);
    };

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
                title="העלה תמונה ל-Google Drive"
            >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                {isLoading && <span className="ml-2 text-xs">מעלה...</span>}
            </Button>
        </>
    );
};