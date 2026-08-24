import sharp from "sharp";

type PreparedImageUpload = {
  body: Buffer | File;
  contentType: string;
  extension: string;
  size: number;
};

export async function prepareImageUpload(
  value: FormDataEntryValue | null,
  {
    allowedTypes,
    maxEdge,
    maxSize,
    quality,
    sizeError,
    typeError,
  }: {
    allowedTypes: Map<string, string>;
    maxEdge: number;
    maxSize: number;
    quality: number;
    sizeError: string;
    typeError: string;
  },
) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  const originalExtension = allowedTypes.get(value.type);

  if (!originalExtension) {
    throw new Error(typeError);
  }

  if (value.type === "image/gif" || value.type === "image/svg+xml") {
    return assertUploadSize(
      {
        body: value,
        contentType: value.type,
        extension: originalExtension,
        size: value.size,
      },
      maxSize,
      sizeError,
    );
  }

  try {
    const sourceBuffer = Buffer.from(await value.arrayBuffer());
    const outputBuffer = await sharp(sourceBuffer)
      .rotate()
      .resize({
        fit: "inside",
        height: maxEdge,
        width: maxEdge,
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ mozjpeg: true, quality })
      .toBuffer();

    return assertUploadSize(
      {
        body: outputBuffer,
        contentType: "image/jpeg",
        extension: "jpg",
        size: outputBuffer.byteLength,
      },
      maxSize,
      sizeError,
    );
  } catch {
    return assertUploadSize(
      {
        body: value,
        contentType: value.type,
        extension: originalExtension,
        size: value.size,
      },
      maxSize,
      sizeError,
    );
  }
}

function assertUploadSize(
  upload: PreparedImageUpload,
  maxSize: number,
  sizeError: string,
) {
  if (upload.size > maxSize) {
    throw new Error(sizeError);
  }

  return upload;
}
