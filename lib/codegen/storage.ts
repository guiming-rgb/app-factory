import { getSupabaseAdmin } from "@/lib/supabase";

const DEFAULT_BUCKET = "codegen-artifacts";

let bucketEnsured = false;

export function getCodegenStorageBucket(): string {
  return (
    process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET
  );
}

export function isCodegenStorageEnabled(): boolean {
  return process.env.CODEGEN_STORAGE_DISABLED !== "1";
}

async function ensureCodegenBucket(): Promise<void> {
  if (bucketEnsured || !isCodegenStorageEnabled()) {
    return;
  }

  const bucket = getCodegenStorageBucket();
  const supabase = getSupabaseAdmin();
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Storage 列举 bucket 失败：${listError.message}`);
  }

  if (!buckets?.some((b) => b.name === bucket)) {
    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: false
    });
    if (createError && !/already exists/i.test(createError.message)) {
      throw new Error(`Storage 创建 bucket 失败：${createError.message}`);
    }
  }

  bucketEnsured = true;
}

export async function uploadCodegenArtifact(
  storageKey: string,
  buffer: Buffer,
  options?: { contentType?: string }
): Promise<void> {
  if (!isCodegenStorageEnabled()) {
    return;
  }

  await ensureCodegenBucket();
  const bucket = getCodegenStorageBucket();
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage.from(bucket).upload(storageKey, buffer, {
    contentType: options?.contentType ?? "application/zip",
    upsert: true
  });

  if (error) {
    throw new Error(`Storage 上传失败：${error.message}`);
  }
}

export async function downloadCodegenArtifact(
  storageKey: string
): Promise<Buffer | null> {
  if (!isCodegenStorageEnabled()) {
    return null;
  }

  const bucket = getCodegenStorageBucket();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.storage.from(bucket).download(storageKey);

  if (error) {
    if (/not found|does not exist/i.test(error.message)) {
      return null;
    }
    throw new Error(`Storage 下载失败：${error.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function codegenArtifactInStorage(
  storageKey: string
): Promise<boolean> {
  if (!isCodegenStorageEnabled()) {
    return false;
  }

  const bucket = getCodegenStorageBucket();
  const supabase = getSupabaseAdmin();
  const folder = storageKey.includes("/")
    ? storageKey.slice(0, storageKey.lastIndexOf("/"))
    : "";
  const name = storageKey.includes("/")
    ? storageKey.slice(storageKey.lastIndexOf("/") + 1)
    : storageKey;

  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    search: name,
    limit: 1
  });

  if (error) {
    return false;
  }

  return (data ?? []).some((item) => item.name === name);
}
