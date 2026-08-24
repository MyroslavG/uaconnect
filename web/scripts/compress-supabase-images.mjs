#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import WebSocket from "ws";

const buckets = {
  "business-content-images": {
    maxEdge: 1800,
    minBytes: 350 * 1024,
    preserveAlpha: false,
    quality: 76,
  },
  "business-logos": {
    maxEdge: 900,
    minBytes: 150 * 1024,
    preserveAlpha: true,
    quality: 78,
  },
  "profile-avatars": {
    maxEdge: 900,
    minBytes: 150 * 1024,
    preserveAlpha: false,
    quality: 78,
  },
};

const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const skippedExtensions = new Set([".gif", ".svg"]);

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  loadEnvFile(path.resolve(process.cwd(), "..", ".env.local"));

  const options = parseArgs(process.argv.slice(2));
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const selectedBuckets = options.bucket
    ? [options.bucket]
    : Object.keys(buckets);

  for (const bucket of selectedBuckets) {
    if (!buckets[bucket]) {
      throw new Error(
        `Unknown bucket "${bucket}". Valid buckets: ${Object.keys(buckets).join(", ")}`,
      );
    }
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
    realtime: {
      transport: WebSocket,
    },
  });

  const totals = {
    compressed: 0,
    downloadedBytes: 0,
    outputBytes: 0,
    scanned: 0,
    skipped: 0,
  };

  console.log(
    `${options.write ? "WRITE" : "DRY RUN"}: scanning ${selectedBuckets.join(", ")}`,
  );

  for (const bucket of selectedBuckets) {
    await walkBucket({
      bucket,
      bucketConfig: buckets[bucket],
      limit: options.limit,
      minSavingsRatio: options.minSavingsRatio,
      options,
      prefix: options.prefix,
      supabase,
      totals,
    });
  }

  const savedBytes = totals.downloadedBytes - totals.outputBytes;
  console.log("");
  console.log("Summary");
  console.log(`Scanned: ${totals.scanned}`);
  console.log(`Compressed: ${totals.compressed}`);
  console.log(`Skipped: ${totals.skipped}`);
  console.log(
    `Potential saved storage/egress: ${formatBytes(savedBytes)} (${formatPercent(
      totals.downloadedBytes ? savedBytes / totals.downloadedBytes : 0,
    )})`,
  );

  if (!options.write) {
    console.log("");
    console.log("No files were changed. Re-run with --write to overwrite storage files.");
  }
}

async function walkBucket({
  bucket,
  bucketConfig,
  limit,
  minSavingsRatio,
  options,
  prefix = "",
  supabase,
  totals,
}) {
  if (limit && totals.compressed >= limit) {
    return;
  }

  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: {
        column: "name",
        order: "asc",
      },
    });

    if (error) {
      throw new Error(`${bucket}/${prefix}: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return;
    }

    for (const item of data) {
      if (limit && totals.compressed >= limit) {
        return;
      }

      const objectPath = prefix ? `${prefix}/${item.name}` : item.name;

      if (item.id === null) {
        await walkBucket({
          bucket,
          bucketConfig,
          limit,
          minSavingsRatio,
          options,
          prefix: objectPath,
          supabase,
          totals,
        });
        continue;
      }

      await processObject({
        bucket,
        bucketConfig,
        listedSize: getListedSize(item),
        minSavingsRatio,
        objectPath,
        options,
        supabase,
        totals,
      });
    }

    offset += data.length;
  }
}

async function processObject({
  bucket,
  bucketConfig,
  listedSize,
  minSavingsRatio,
  objectPath,
  options,
  supabase,
  totals,
}) {
  totals.scanned += 1;

  const extension = path.extname(objectPath).toLowerCase();

  if (skippedExtensions.has(extension) || !supportedExtensions.has(extension)) {
    totals.skipped += 1;
    return;
  }

  if (listedSize && listedSize < bucketConfig.minBytes) {
    totals.skipped += 1;
    return;
  }

  const { data, error } = await supabase.storage.from(bucket).download(objectPath);

  if (error || !data) {
    totals.skipped += 1;
    console.warn(`SKIP download failed ${bucket}/${objectPath}: ${error?.message}`);
    return;
  }

  const input = Buffer.from(await data.arrayBuffer());

  if (input.byteLength < bucketConfig.minBytes) {
    totals.skipped += 1;
    return;
  }

  let output;

  try {
    output = await compressImage(input, bucketConfig);
  } catch (error) {
    totals.skipped += 1;
    console.warn(`SKIP invalid image ${bucket}/${objectPath}: ${getErrorMessage(error)}`);
    return;
  }

  const savedBytes = input.byteLength - output.buffer.byteLength;
  const savingsRatio = savedBytes / input.byteLength;

  if (savedBytes <= 0 || savingsRatio < minSavingsRatio) {
    totals.skipped += 1;
    return;
  }

  totals.compressed += 1;
  totals.downloadedBytes += input.byteLength;
  totals.outputBytes += output.buffer.byteLength;

  const message = [
    `${options.write ? "WRITE" : "DRY"} ${bucket}/${objectPath}`,
    `${formatBytes(input.byteLength)} -> ${formatBytes(output.buffer.byteLength)}`,
    `${formatPercent(savingsRatio)} saved`,
    `${output.width}x${output.height}`,
    output.contentType,
  ].join(" | ");

  console.log(message);

  if (!options.write) {
    return;
  }

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, output.buffer, {
      cacheControl: "31536000",
      contentType: output.contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed for ${bucket}/${objectPath}: ${uploadError.message}`);
  }
}

async function compressImage(input, bucketConfig) {
  const metadata = await sharp(input).metadata();
  const hasAlpha = Boolean(metadata.hasAlpha);
  const basePipeline = sharp(input)
    .rotate()
    .resize({
      fit: "inside",
      height: bucketConfig.maxEdge,
      width: bucketConfig.maxEdge,
      withoutEnlargement: true,
    });

  const pipeline =
    bucketConfig.preserveAlpha && hasAlpha
      ? basePipeline.png({ compressionLevel: 9, palette: true })
      : basePipeline
          .flatten({ background: "#ffffff" })
          .jpeg({ mozjpeg: true, quality: bucketConfig.quality });

  const buffer = await pipeline.toBuffer();
  const outputMetadata = await sharp(buffer).metadata();

  return {
    buffer,
    contentType: bucketConfig.preserveAlpha && hasAlpha ? "image/png" : "image/jpeg",
    height: outputMetadata.height ?? 0,
    width: outputMetadata.width ?? 0,
  };
}

function parseArgs(args) {
  const options = {
    bucket: "",
    limit: 0,
    minSavingsRatio: 0.1,
    prefix: "",
    write: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--write") {
      options.write = true;
      continue;
    }

    if (arg === "--bucket") {
      options.bucket = args[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg === "--prefix") {
      options.prefix = args[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg === "--limit") {
      options.limit = Number(args[index + 1] ?? 0);
      index += 1;
      continue;
    }

    if (arg === "--min-savings") {
      options.minSavingsRatio = Number(args[index + 1] ?? 10) / 100;
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function formatBytes(value) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function getListedSize(item) {
  const size = item?.metadata?.size;

  return typeof size === "number" ? size : 0;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function printHelp() {
  console.log(`
Compress Supabase Storage images in-place.

Required env:
  NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Usage:
  pnpm web:compress-images
  pnpm web:compress-images -- --bucket business-content-images
  pnpm web:compress-images -- --bucket business-content-images --limit 10
  pnpm web:compress-images -- --write

Options:
  --write                 overwrite storage objects. Without this, dry-run only.
  --bucket <name>         one of: ${Object.keys(buckets).join(", ")}
  --prefix <path>         only scan a storage folder/prefix.
  --limit <number>        stop after compressing this many candidates.
  --min-savings <percent> default 10. Skip files below this savings threshold.
`);
}
