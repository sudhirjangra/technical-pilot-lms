'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/shadcn/avatar';
import { Button } from '@repo/shadcn/button';
import {
  FileWithPath,
  FileWithPreview,
  ImageCropper,
  useDropzone,
} from '@repo/shadcn/image-cropper';
import { Camera } from '@repo/shadcn/lucide';
import { useCallback, useState } from 'react';

const accept = {
  'image/*': [],
};

const ProfileAvatarEditor = () => {
  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(
    null,
  );
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<null | string>(null);
  const onDrop = useCallback(<T extends File>(acceptedFiles: T[]) => {
    const file = acceptedFiles[0];
    if (!file) {
      alert('Selected image is too large!');
      return;
    }

    const fileWithPreview: FileWithPreview = Object.assign(file, {
      path: file.name,
      relativePath: file.name,
      preview: URL.createObjectURL(file),
    });

    setSelectedFile(fileWithPreview);
    setDialogOpen(true);
  }, []);
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept,
  });
  return (
    <div className="relative">
      <Avatar className="h-32 w-32 border-4 border-white">
        <AvatarImage
          src={previewUrl ?? '/assets/placeholder.svg'}
          alt={'placeholder'}
        />
        <AvatarFallback>User Name</AvatarFallback>
      </Avatar>
      <div>
        <ImageCropper
          dialogOpen={isDialogOpen}
          setDialogOpen={setDialogOpen}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          onCropDone={(file, previewUrl) => {
            if (previewUrl) {
              setPreviewUrl(previewUrl);
            }
          }}
        />
        <Button
          {...getRootProps()}
          size="icon"
          variant="secondary"
          className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
        >
          <input {...getInputProps()} />
          <Camera className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export default ProfileAvatarEditor;
