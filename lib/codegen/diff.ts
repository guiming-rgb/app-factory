/**
 * P2: 代码 Diff 对比
 * 比较两个版本的代码生成产物，高亮差异
 */

export type DiffLine = {
  type: "added" | "removed" | "unchanged";
  line: number;
  content: string;
};

export type FileDiff = {
  fileName: string;
  lines: DiffLine[];
  addedCount: number;
  removedCount: number;
};

/** 简单的行级 diff 算法（LCS） */
function lcs(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function backtrack(a: string[], b: string[], dp: number[][]): DiffLine[] {
  const lines: DiffLine[] = [];
  let i = a.length, j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      lines.unshift({ type: "unchanged", line: j, content: b[j - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      lines.unshift({ type: "added", line: j, content: b[j - 1] });
      j--;
    } else {
      lines.unshift({ type: "removed", line: i, content: a[i - 1] });
      i--;
    }
  }
  return lines;
}

export function diffFiles(oldContent: string, newContent: string): DiffLine[] {
  const a = oldContent.split("\n");
  const b = newContent.split("\n");
  const dp = lcs(a, b);
  return backtrack(a, b, dp);
}

export function compareCodeOutputs(
  oldFiles: Map<string, string>,
  newFiles: Map<string, string>
): FileDiff[] {
  const allNames = new Set([...oldFiles.keys(), ...newFiles.keys()]);
  const diffs: FileDiff[] = [];

  for (const name of allNames) {
    const old = oldFiles.get(name) ?? "";
    const current = newFiles.get(name) ?? "";
    const lines = diffFiles(old, current);
    diffs.push({
      fileName: name,
      lines,
      addedCount: lines.filter((l) => l.type === "added").length,
      removedCount: lines.filter((l) => l.type === "removed").length,
    });
  }

  return diffs.filter((d) => d.addedCount + d.removedCount > 0);
}
