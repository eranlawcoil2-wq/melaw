import React, { useRef, useState } from 'react';
import { Upload, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from './Button.tsx';

interface ImageUploadButtonProps {
    onImageSelected: (base64: string) => void;
    className?: string;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({ onImageSelected, className = '' }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            alert('אנא בחר קובץ תמונה בלבד');
            return;
        }

        // Size warning (Client-side performance check)
        if (file.size > 800 * 1024) { // 800KB
            if (!confirm(`התמונה שבחרת גדולה יחסית (${(file.size / 1024 / 1024).toFixed(2)}MB).\nתמונות כבדות עלולות להאט את האתר מכיוון שהן נשמרות בדפדפן.\n\nהאם להמשיך בכל זאת?`)) {
                return;
            }
        }

        setIsLoading(true);
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const result = e.target?.result as string;
            if (result) {
                onImageSelected(result);
            }
            setIsLoading(false);
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
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
                title="העלה תמונה מהמחשב"
            >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            </Button>
        </>
    );
};