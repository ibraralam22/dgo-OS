'use client';

import { useRef, useState } from 'react';

import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';

import { useStorage } from '@hooks/use-storage';
import { ImageIcon, Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string, path?: string) => void;
  placeholder?: string;
  className?: string;
  category?: string;
  service?: string;
  bucket?: string;
  defaultMode?: 'url' | 'upload';
  acceptMultiple?: boolean;
  onMultipleChange?: (results: Array<{ url: string; path: string }>) => void;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  placeholder = 'Upload image or enter URL',
  className,
  category,
  service,
  bucket,
  defaultMode = 'url',
  acceptMultiple = false,
  onMultipleChange,
  disabled = false,
}: ImageUploadProps) {
  const [inputMode, setInputMode] = useState<'url' | 'upload'>(defaultMode);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    uploading,
    uploadError,
    uploadCategoryImage,
    uploadCategoryImages,
    uploadServiceImage,
    uploadServiceImages,
    clearError,
  } = useStorage({ bucket });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    clearError();

    try {
      if (acceptMultiple && files.length > 1) {
        // Handle multiple file upload
        const fileArray = Array.from(files);
        let results;

        if (category && service) {
          results = await uploadServiceImages(fileArray, category, service);
        } else if (category) {
          results = await uploadCategoryImages(fileArray, category);
        } else {
          // Fallback to first file only if no category structure is defined
          const result = await uploadCategoryImage(fileArray[0], 'general');
          results = [result];
        }

        if (onMultipleChange) {
          const successfulUploads = results
            .filter((result) => !result.error)
            .map((result) => ({ url: result.url, path: result.path }));

          onMultipleChange(successfulUploads);
        }

        // Set the first successful upload as the main value
        const firstSuccess = results.find((result) => !result.error);
        if (firstSuccess) {
          onChange(firstSuccess.url, firstSuccess.path);
          setInputMode('url');
        }
      } else {
        // Handle single file upload
        const file = files[0];
        let result;

        if (category && service) {
          result = await uploadServiceImage(file, category, service);
        } else if (category) {
          result = await uploadCategoryImage(file, category);
        } else {
          result = await uploadCategoryImage(file, 'general');
        }

        if (!result.error) {
          onChange(result.url, result.path);
          setInputMode('url');
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
    clearError();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const toggleInputMode = () => {
    setInputMode(inputMode === 'url' ? 'upload' : 'url');
    clearError();
  };

  const clearImage = () => {
    onChange('');
    clearError();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className='flex items-center gap-2'>
        {inputMode === 'url' ? (
          <Input
            type='url'
            value={value || ''}
            onChange={handleUrlChange}
            placeholder={placeholder}
            className='flex-1 border-green-500 bg-white'
          />
        ) : (
          <div className='flex flex-1 items-center gap-2 rounded-md border border-input bg-white p-2'>
            <ImageIcon className='h-4 w-4 text-muted-foreground' />
            <span className='flex-1 text-sm text-muted-foreground'>
              {uploading ? 'Uploading...' : 'Click upload to select image'}
            </span>
          </div>
        )}

        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={inputMode === 'url' ? toggleInputMode : handleUploadClick}
          disabled={uploading}
          className='shrink-0 border-green-500 bg-white'
        >
          {uploading ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : inputMode === 'url' ? (
            <Upload className='h-4 w-4' />
          ) : (
            'Upload'
          )}
        </Button>

        {inputMode === 'upload' && (
          <Button type='button' variant='ghost' size='sm' onClick={toggleInputMode} className='shrink-0'>
            URL
          </Button>
        )}

        {value && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={clearImage}
            className='shrink-0 text-destructive hover:text-destructive'
          >
            <X className='h-4 w-4' />
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        multiple={acceptMultiple}
        onChange={handleFileSelect}
        className='hidden'
        disabled={disabled}
      />

      {/* Error message */}
      {uploadError && <p className='text-sm text-destructive'>{uploadError}</p>}

      {/* Image preview */}
      {value && value.startsWith('http') && (
        <div className='relative h-32 w-full overflow-hidden rounded-md border border-border bg-muted'>
          <Image
            src={value}
            alt='Preview'
            fill
            className='object-contain'
            onError={() => {
              // Image failed to load
            }}
          />
        </div>
      )}
    </div>
  );
}
