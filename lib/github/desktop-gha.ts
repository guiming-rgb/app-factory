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
  codegenRunId: string
): Promise<{ macos?: Buffer; windows?: Buffer }> {
  const { octokit, cfg } = createOctokit();
  const { data } = await octokit.rest.actions.listWorkflowRunArtifacts({
    owner: cfg.owner,
    repo: cfg.repo,
    run_id: workflowRunId
  });

  const out: { macos?: Buffer; windows?: Buffer } = {};
  const artifacts = data.artifacts ?? [];

  const macArt =
    artifacts.find((a) => a.name === `macos-${codegenRunId}`) ??
    artifacts.find((a) => a.name?.startsWith("macos-"));
  const winArt =
    artifacts.find((a) => a.name === `windows-${codegenRunId}`) ??
    artifacts.find((a) => a.name?.startsWith("windows-"));

  if (macArt?.id) {
    out.macos = await downloadArtifactZip(octokit, cfg.owner, cfg.repo, macArt.id);
  }
  if (winArt?.id) {
    out.windows = await downloadArtifactZip(
      octokit,
      cfg.owner,
      cfg.repo,
      winArt.id
    );
  }

  return out;
}

async function downloadArtifactZip(
  octokit: Octokit,
  owner: string,
  repo: string,
  artifactId: number
): Promise<Buffer> {
  const res = await octokit.rest.actions.downloadArtifact({
    owner,
    repo,
    artifact_id: artifactId,
    archive_format: "zip"
  });
  const data = res.data as ArrayBuffer | Buffer;
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
