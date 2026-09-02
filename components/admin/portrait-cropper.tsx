"use client";

import { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

/**
 * The crop surface, kept in its own module so that react-image-crop and its
 * stylesheet are fetched when someone actually picks a file rather than on
 * every load of the edit form. Nothing here holds state: the crop lives in
 * the form above so the upload can read it.
 */
export function PortraitCropper({
  source,
  aspect,
  crop,
  imageRef,
  onCropChange,
  onCropComplete,
}: {
  source: string;
  aspect: number;
  crop: Crop | undefined;
  imageRef: React.RefObject<HTMLImageElement | null>;
  onCropChange: (crop: Crop) => void;
  onCropComplete: (crop: PixelCrop) => void;
}) {
  const onImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = event.currentTarget;
    onCropChange(
      centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
        width,
        height,
      ),
    );
  };

  return (
    <ReactCrop
      crop={crop}
      onChange={(_, percentCrop) => onCropChange(percentCrop)}
      onComplete={onCropComplete}
      aspect={aspect}
      keepSelection
    >
      {/* Plain img: this is a local data URL being measured for cropping,
          which next/image cannot do. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={source}
        alt="Crop the portrait"
        onLoad={onImageLoad}
        className="max-h-[26rem] w-auto"
      />
    </ReactCrop>
  );
}
