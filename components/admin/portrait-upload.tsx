"use client";

import { useRef, useState, useTransition } from "react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop";
import { toast } from "sonner";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
import { setPortraitUrl } from "@/app/admin/actions";
import { initialsOf } from "@/lib/format";

const ASPECT = 4 / 5;
const OUTPUT_WIDTH = 1000; // 1000 x 1250 at the 4:5 ratio

/**
 * Portrait upload with a fixed 4:5 crop.
 *
 * The crop is enforced here as well as in CSS because the stored file feeds
 * the PDF exports too, where no CSS applies. The image is uploaded in colour:
 * the black-and-white treatment is a render-time filter and is never baked in.
 */
export function PortraitUpload({
  creatorId,
  creatorName,
  currentUrl,
}: {
  creatorId: string;
  creatorName: string;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const onSelectFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSource(String(reader.result));
    reader.readAsDataURL(file);
  };

  const onImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = event.currentTarget;
    setCrop(
      centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, ASPECT, width, height),
        width,
        height,
      ),
    );
  };

  const upload = async () => {
    const image = imageRef.current;
    if (!image || !completedCrop || completedCrop.width === 0) {
      toast.error("Set the crop first.");
      return;
    }

    setUploading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_WIDTH;
      canvas.height = Math.round(OUTPUT_WIDTH / ASPECT);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare the image.");

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.9),
      );
      if (!blob) throw new Error("Could not encode the image.");

      const supabase = createClient();
      const path = `portraits/${creatorId}-${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from("creator-media")
        .upload(path, blob, { contentType: "image/webp", upsert: true });
      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("creator-media").getPublicUrl(path);

      startTransition(async () => {
        const result = await setPortraitUrl(creatorId, publicUrl);
        if (result.error) toast.error(result.error);
        else {
          toast.success("Portrait saved.");
          setSource(null);
          router.refresh();
        }
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-6">
        <div className="aspect-[4/5] w-32 shrink-0 overflow-hidden rounded-xl bg-stone">
          {currentUrl ? (
            <NextImage
              src={currentUrl}
              alt={creatorName}
              width={128}
              height={160}
              className="size-full object-cover grayscale contrast-[1.08]"
            />
          ) : (
            <span className="flex size-full items-center justify-center font-display text-lg text-ink/45">
              {initialsOf(creatorName)}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm text-ink-muted">
            Portraits are cropped to 4:5 and stored in colour. The grid renders them in
            black and white.
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => onSelectFile(event.target.files?.[0])}
            className="block text-sm file:mr-3 file:rounded-md file:border file:border-hairline file:bg-surface file:px-3 file:py-1.5 file:text-sm"
          />
          {currentUrl ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await setPortraitUrl(creatorId, null);
                  toast.success("Portrait removed.");
                  router.refresh();
                })
              }
            >
              Remove portrait
            </Button>
          ) : null}
        </div>
      </div>

      {source ? (
        <div className="space-y-3 border border-hairline bg-surface p-4">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
            aspect={ASPECT}
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

          <div className="flex items-center gap-2">
            <Button onClick={upload} disabled={uploading || pending}>
              {uploading || pending ? "Uploading" : "Save portrait"}
            </Button>
            <Button variant="ghost" onClick={() => setSource(null)} disabled={uploading}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
