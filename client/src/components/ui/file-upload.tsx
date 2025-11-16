import { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  value?: string[];
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
          multiple
          className="hidden"
          disabled={disabled || files.length >= maxFiles}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Preview Grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {previews.map((preview, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
            >
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white text-xs p-1 truncate">
                {files[index]?.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {previews.length === 0 && (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No images uploaded yet</p>
        </div>
      )}
    </div>
  );
}
