import { useState, useRef, DragEvent } from 'react';
import { Card } from '@/components/ui/card';
import { Upload, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  accept: string;
  onFileChange: (file: File | null) => void;
  file: File | null;
  placeholder: string;
  description: string;
  className?: string;
}

export function FileUpload({ 
  accept, 
  onFileChange, 
  file, 
  placeholder, 
  description,
  className 
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const droppedFile = files[0];
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const fileExtension = `.${droppedFile.name.split('.').pop()?.toLowerCase()}`;
      
      if (acceptedTypes.some(type => type === fileExtension)) {
        onFileChange(droppedFile);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileChange(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCardClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card
      className={cn(
        "relative border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer",
        isDragOver && "border-primary bg-primary/5",
        file && "border-green-500/50 bg-green-500/5",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCardClick}
    >
      <div className="p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {file ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">{placeholder}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}