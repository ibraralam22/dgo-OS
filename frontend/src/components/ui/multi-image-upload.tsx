'use client';

import { Button } from '@components/ui/button';
import { ImageUpload } from '@components/ui/image-upload';

import { Plus, Trash2 } from 'lucide-react';

interface ImageData {
  url: string;
  path?: string;
}

interface MultiImageUploadProps {
  values: ImageData[];
  onChange: (images: ImageData[]) => void;
  maxImages?: number;
  className?: string;
  category?: string;
  service?: string;
  bucket?: string;
  defaultMode?: 'url' | 'upload';
  title?: string;
  description?: string;
  acceptMultiple?: boolean;
  disabled?: boolean;
}

export function MultiImageUpload({
  values,
  onChange,
  maxImages = 5,
  className,
  category,
  service,
  bucket,
  defaultMode,
  title = 'Banner Images',
  description = `Add up to ${maxImages} banner images for marketing displays`,
  acceptMultiple = false,
  disabled = false,
}: MultiImageUploadProps) {
  const handleImageChange = (index: number, url: string, path?: string) => {
    const newValues = [...values];
    newValues[index] = { url, path };
    onChange(newValues);
  };

  const handleMultipleChange = (index: number, results: Array<{ url: string; path: string }>) => {
    const newValues = [...values];

    // Replace the current index with first result and add additional results
    if (results.length > 0) {
      newValues[index] = results[0];

      // Add additional results if there are more and we haven't reached max
      for (let i = 1; i < results.length && newValues.length < maxImages; i++) {
        newValues.push(results[i]);
      }

      onChange(newValues);
    }
  };

  const handleAddImage = () => {
    if (values.length < maxImages) {
      onChange([...values, { url: '' }]);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newValues = values.filter((_, i) => i !== index);
    // Ensure we always have at least one input
    if (newValues.length === 0) {
      onChange([{ url: '' }]);
    } else {
      onChange(newValues);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className='flex items-center justify-between'>
        <div>
          <h4 className='font-medium'>{title}</h4>
          <p className='text-sm text-muted-foreground'>{description}</p>
        </div>
        {values.length < maxImages && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleAddImage}
            className='shrink-0'
            disabled={disabled}
          >
            <Plus className='mr-2 h-4 w-4' />
            Add Image
          </Button>
        )}
      </div>

      <div className='space-y-3'>
        {values.map((image, index) => (
          <div key={index} className='flex items-start gap-3'>
            <div className='flex-1'>
              <ImageUpload
                value={image.url}
                onChange={(url, path) => handleImageChange(index, url, path)}
                onMultipleChange={acceptMultiple ? (results) => handleMultipleChange(index, results) : undefined}
                placeholder={`Image ${index + 1}`}
                category={category}
                service={service}
                bucket={bucket}
                defaultMode={defaultMode}
                acceptMultiple={acceptMultiple && index === 0} // Only allow multiple on first upload
                disabled={disabled}
              />
            </div>
            {values.length > 1 && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => handleRemoveImage(index)}
                className='mt-0 shrink-0 text-destructive hover:text-destructive'
                disabled={disabled}
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            )}
          </div>
        ))}
      </div>

      {values.length >= maxImages && (
        <p className='text-sm text-muted-foreground'>Maximum of {maxImages} images reached</p>
      )}

      {/* Image path info for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className='space-y-1 text-xs text-muted-foreground'>
          {values.map(
            (image, index) =>
              image.path && (
                <div key={index}>
                  Image {index + 1}: {image.path}
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
}
