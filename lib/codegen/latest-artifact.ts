import { readArtifactFile } from "@/lib/codegen/artifacts";
import { listCodegenRuns, type CodegenTarget } from "@/lib/codegen/runs";

export type LatestCompletedArtifact = {
  runId: string;
  buffer: Buffer;
  fileName: string;
  displayName?: string;
};

/** 若存在 completed run 且 artifact 可读，则返回缓存产物（加速「快速下载」） */
export async function tryReadLatestCompletedArtifact(input: {
  projectId: string;
  target: CodegenTarget;
  /**
   * 为 true 时仅返回 metadata.codegenTodoMvp 的 run（避免 E2 前旧占位 ZIP）
   * 用于小程序/Flutter 同步快速下载。
   */
  requireTodoMvp?: boolean;
}): Promise<LatestCompletedArtifact | null> {
  const runs = await listCodegenRuns(input.projectId, 25);
  const row = runs.find((r) => {
    if (r.target !== input.target || r.status !== "completed") {
      return false;
    }
    if (!r.artifact_path?.trim()) {
      return false;
    }
    if (input.requireTodoMvp) {
      const meta = (r.metadata ?? {}) as { codegenTodoMvp?: boolean };
      return meta.codegenTodoMvp === true;
    }
    return true;
  });
  if (!row?.artifact_path) {
    return null;
  }

  try {
    const buffer = await readArtifactFile(row.artifact_path);
    const meta = (row.metadata ?? {}) as {
      fileName?: string;
      displayName?: string;
    };
    return {
      runId: row.id,
      buffer,
      fileName: meta.fileName?.trim() || `${input.target}.zip`,
      displayName: meta.displayName
    };
  } catch {
    return null;
  }
}
