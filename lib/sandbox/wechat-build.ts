import {
  runWechatCompilerValidate,
  type WechatCompileResult
} from "./wechat-compile";
import {
  runWechatStructureValidate,
  type WechatValidateResult
} from "./wechat-validate";

export type WechatFullBuildStatus = "passed" | "failed" | "skipped";

export type WechatFullBuildResult = {
  status: WechatFullBuildStatus;
  structure: WechatValidateResult;
  compile: WechatCompileResult;
  reason?: string;
  output?: string;
};

export function runWechatFullBuildValidate(options: {
  appDir: string;
}): WechatFullBuildResult {
  const structure = runWechatStructureValidate({ appDir: options.appDir });

  if (structure.status === "failed") {
    return {
      status: "failed",
      structure,
      compile: {
        status: "skipped",
        reason: "结构门禁未通过，跳过 WXML/WXSS 编译"
      },
      reason: structure.reason,
      output: structure.output
    };
  }

  if (structure.status === "skipped") {
    return {
      status: "skipped",
      structure,
      compile: {
        status: "skipped",
        reason: "结构门禁已跳过"
      },
      reason: structure.reason,
      output: structure.output
    };
  }

  const compile = runWechatCompilerValidate({ appDir: options.appDir });

  if (compile.status === "failed") {
    return {
      status: "failed",
      structure,
      compile,
      reason: compile.reason,
      output: [structure.output, compile.output].filter(Boolean).join("\n\n")
    };
  }

  if (compile.status === "skipped") {
    return {
      status: "passed",
      structure,
      compile,
      output: [structure.output, compile.reason].filter(Boolean).join("\n\n")
    };
  }

  return {
    status: "passed",
    structure,
    compile,
    output: [structure.output, compile.output].filter(Boolean).join("\n\n")
  };
}

export function shouldFailCodegenOnWechatBuild(
  result: WechatFullBuildResult
): boolean {
  if (result.status === "failed") {
    if (process.env.CODEGEN_WECHAT_BUILD_STRICT === "0") {
      return false;
    }
    return true;
  }
  return false;
}
