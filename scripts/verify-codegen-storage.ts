/**
 * 检查 codegen Storage bucket 是否可用
 * npm run verify:codegen:storage
 */
import "../lib/load-env-local";
import {
  getCodegenStorageBucket,
  isCodegenStorageEnabled
} from "../lib/codegen/storage";
import { getSupabaseAdmin } from "../lib/supabase";

async function main() {
  if (!isCodegenStorageEnabled()) {
    console.log("⏭ CODEGEN_STORAGE_DISABLED=1，Storage 已禁用");
    process.exit(0);
  }

  const bucket = getCodegenStorageBucket();
  console.log(`══ codegen Storage 验收 ══\n`);
  console.log(`bucket: ${bucket}\n`);

  const supabase = getSupabaseAdmin();
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error("❌ 列举 bucket 失败:", error.message);
    process.exit(1);
  }

  const exists = buckets?.some((b) => b.name === bucket);
  if (!exists) {
    console.log(`ℹ️  bucket「${bucket}」尚未创建（首次 codegen 上传时会自动创建）`);
  } else {
    console.log(`✅ bucket「${bucket}」已存在`);
  }

  console.log("\n✅ verify:codegen:storage 通过");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
