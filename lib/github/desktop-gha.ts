import { Octokit } from "@octokit/rest";

import type { AppSpec } from "@/lib/app-spec/types";
import { getDesktopGhaConfig } from "@/lib/github/desktop-gha-config";

export type DesktopGhaTriggerResult = {
  workflowRunId: number;
  htmlUrl: string;
};

export type DesktopGhaPollResult = {
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | "skipped" | null;
  htmlUrl: string;
};

function createOctokit() {
  const cfg = getDesktopGhaConfig();
  if (!cfg) {
    throw new Error(
      "未配置 GITHUB_DESKTOP_GHA_TOKEN（或 GITHUB_PAT）与 GITHUB_DESKTOP_GHA_REPO"
    );
  }
  return { octokit: new Octokit({ auth: cfg.token }), cfg };
}

/** 触发 workflow_dispatch，并解析本次 workflow run id */
export async function triggerDesktopGhaWorkflow(input: {
  spec: AppSpec;
  runId: string;
  appName: string;
}): Promise<DesktopGhaTriggerResult> {
  const { octokit, cfg } = createOctokit();
  const spec_b64 = Buffer.from(JSON.stringify(input.spec), "utf8").toString(
    "base64"
  );
  const triggeredAt = Date.now();

  await octokit.rest.actions.createWorkflowDispatch({
    owner: cfg.owner,
    repo: cfg.repo,
    workflow_id: cfg.workflowFile,
    ref: cfg.ref,
    inputs: {
      spec_b64,
      run_id: input.runId,
      app_name: input.appName
    }
  });

  await sleep(4000);

  const { data } = await octokit.rest.actions.listWorkflowRuns({
    owner: cfg.owner,
    repo: cfg.repo,
    workflow_id: cfg.workflowFile,
    per_page: 8
  });

  const run = (data.workflow_runs ?? []).find((r) => {
    const created = new Date(r.created_at ?? 0).getTime();
    return created >= triggeredAt - 5000;
  });

  if (!run?.id) {
    throw new Error("已触发 GHA，但未找到对应 workflow run（请稍后刷新）");
  }

  return {
    workflowRunId: run.id,
    htmlUrl: run.html_url ?? ""
  };
}

export async function pollDesktopGhaWorkflow(
  workflowRunId: number
): Promise<DesktopGhaPollResult> {
  const { octokit, cfg } = createOctokit();
  const { data } = await octokit.rest.actions.getWorkflowRun({
    owner: cfg.owner,
    repo: cfg.repo,
    run_id: workflowRunId
  });

  const status = (data.status ?? "queued") as DesktopGhaPollResult["status"];
  const conclusion = (data.conclusion ?? null) as DesktopGhaPollResult["conclusion"];

  return {
    status: status === "completed" ? "completed" : status,
    conclusion,
    htmlUrl: data.html_url ?? ""
  };
}

export async function downloadDesktopGhaArtifacts(
  workflowRunId: number,
  codegenRunId: string,
  options?: { platforms?: Array<"macos" | "windows"> }
): Promise<{ macos?: Buffer; windows?: Buffer }> {
  const { octokit, cfg } = createOctokit();
  const { data } = await octokit.rest.actions.listWorkflowRunArtifacts({
    owner: cfg.owner,
    repo: cfg.repo,
    run_id: workflowRunId
  });

  const out: { macos?: Buffer; windows?: Buffer } = {};
  const artifacts = data.artifacts ?? [];
  const wantMac = !options?.platforms || options.platforms.includes("macos");
  const wantWin = !options?.platforms || options.platforms.includes("windows");

  const macArt = artifacts.find((a) => a.name === `macos-${codegenRunId}`);
  const winArt = artifacts.find((a) => a.name === `windows-${codegenRunId}`);

  if (wantMac && macArt?.id) {
    try {
      out.macos = await downloadArtifactZip(cfg.token, macArt.id, octokit, cfg);
    } catch (err: unknown) {
      console.warn(
        "[desktop-gha] macos artifact download failed:",
        err instanceof Error ? err.message : err
      );
    }
  }
  if (wantWin && winArt?.id) {
    try {
      out.windows = await downloadArtifactZip(cfg.token, winArt.id, octokit, cfg);
    } catch (err: unknown) {
      console.warn(
        "[desktop-gha] windows artifact download failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

  return out;
}

async function downloadArtifactZip(
  token: string,
  artifactId: number,
  octokit: Octokit,
  cfg: { owner: string; repo: string }
): Promise<Buffer> {
  const { data: artifact } = await octokit.rest.actions.getArtifact({
    owner: cfg.owner,
    repo: cfg.repo,
    artifact_id: artifactId
  });

  const url = artifact.archive_download_url;
  if (!url) {
    throw new Error("artifact 无 archive_download_url");
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(180_000)
  });

  if (!res.ok) {
    throw new Error(`下载 artifact HTTP ${res.status}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) {
    throw new Error(`artifact 过小（${buf.length} bytes）`);
  }
  return buf;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
