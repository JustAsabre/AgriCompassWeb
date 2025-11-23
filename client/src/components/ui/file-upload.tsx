import { useCallback, useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  value?: string[] | string; // accept existing image URL(s) or a single image URL
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  accept?: string;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  value = [],
  onChange,
  maxFiles = 5,
  maxSize = 5,
  accept = 'image/*',
  disabled = false,
  className
}: FileUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles || disabled) return;

    const fileArray = Array.from(newFiles);
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    fileArray.forEach(file => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max size is ${maxSize}MB`);
        return;
      }

      // Check max files
      if (files.length + validFiles.length >= maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`);
        return;
      }

      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === validFiles.length) {
          setPreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (validFiles.length > 0) {
      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      onChange(updatedFiles);
    }
  }, [files, maxFiles, maxSize, onChange, disabled]);

  const removeFile = useCallback((index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
    onChange(newFiles);
  }, [files, previews, onChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // Reset previews if the external value is a string or an array of URLs (for remote image urls)
  useEffect(() => {
    // If provided a single string or array of strings, set preview images
    if (typeof value === 'string' && value) {
      setPreviews([value]);
      setFiles([]);
      return;
    }
    if (Array.isArray(value) && value.length > 0) {
      setPreviews(value);
      setFiles([]);
      return;
    }
    // If value is empty, clear internal states
    if ((!value || (Array.isArray(value) && value.length === 0))) {
      setFiles([]);
      setPreviews([]);
    }
  }, [value]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging && 'border-primary bg-primary/5',
          !isDragging && 'border-muted-foreground/25 hover:border-muted-foreground/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground">
              Max {maxFiles} files, up to {maxSize}MB each
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || files.length >= maxFiles}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose Files
          </Button>
        </div>
        <input
          id="file-input"
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          className="hidden"
          disabled={disabled || files.length >= maxFiles}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
