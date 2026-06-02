import { parseEntities, entityTableName, primaryKeyField, listTitleField, supabaseSelectColumns, type AppSpecEntity } from "./entity-scaffold";
import type { AppSpec } from "./types";

/**
 * P0: 后端 API 代码生成（TypeScript + Supabase Client）
 * 从 entities 自动生成完整的 REST API 端点
 */

export type BackendApiBundle = {
  apiRoutes: string;        // Express/NestJS 风格的 API 路由
  supabaseTypes: string;    // TypeScript 类型定义
  envTemplate: string;      // .env 模板
  packageJson: string;      // package.json 模板
  readme: string;           // README
  routeCount: number;
};

function esc(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

function pascalCase(str: string): string {
  return str.split(/[_-]+/).filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

/** 生成单实体 CRUD 路由 */
function generateEntityRoutes(entity: AppSpecEntity): string {
  const table = entityTableName(entity);
  const pk = primaryKeyField(entity);
  const titleField = listTitleField(entity);
  const select = supabaseSelectColumns(entity);
  const name = entity.name;

  return `// ─── ${name} CRUD ───
router.get("/${name.toLowerCase()}s", async (req, res) => {
  try {
    const { search, limit = 20, offset = 0, order = "created_at" } = req.query;
    let query = supabase.from("${table}").select("${select}").order(order as string, { ascending: false }).range(Number(offset), Number(offset) + Number(limit) - 1);
    if (search) query = query.ilike("${titleField}", \`%\${search}%\`);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ data, count: data?.length ?? 0 });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/${name.toLowerCase()}s/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("${table}").select("${select}").eq("${pk}", req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "${name} 不存在" });
    res.json({ data });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/${name.toLowerCase()}s", async (req, res) => {
  try {
    const { data, error } = await supabase.from("${table}").insert(req.body).select("${select}").single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.put("/${name.toLowerCase()}s/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("${table}").update(req.body).eq("${pk}", req.params.id).select("${select}").single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "${name} 不存在" });
    res.json({ data });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/${name.toLowerCase()}s/:id", async (req, res) => {
  try {
    const { error } = await supabase.from("${table}").delete().eq("${pk}", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});`;
}

/** 生成 TypeScript 类型定义 */
function generateTypes(entities: AppSpecEntity[]): string {
  return entities.map((e) => {
    const fields = e.fields.map((f) => {
      const tsType = f.type === "int" || f.type === "integer" || f.type === "float" || f.type === "number" ? "number" :
        f.type === "bool" || f.type === "boolean" ? "boolean" :
        f.type === "json" || f.type === "location" ? "Record<string, unknown>" :
        "string";
      return `  ${f.name}?: ${tsType};`;
    }).join("\n");
    return `export interface ${pascalCase(e.name)} {\n${fields}\n}`;
  }).join("\n\n");
}

export function generateBackendApi(spec: AppSpec): BackendApiBundle {
  const entities = parseEntities(spec);
  const routeCount = entities.length;

  const apiRoutes = entities.map(generateEntityRoutes).join("\n\n");

  // 组装完整 Express 服务
  const fullServer = `import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Health check
app.get("/health", (_, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

const router = express.Router();
${apiRoutes}
app.use("/api", router);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(\`API server running on port \${PORT}\`));
`;

  const types = generateTypes(entities);

  const envTemplate = `SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PORT=4000
`;

  const packageJson = `{
  "name": "${spec.appName}-api",
  "version": "1.0.0",
  "description": "Backend API for ${esc(spec.displayName)}",
  "scripts": {
    "dev": "tsx watch server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.48.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
`;

  const readme = `# ${esc(spec.displayName)} — 后端 API

## 快速开始

\`\`\`bash
npm install
cp .env.example .env  # 填入 Supabase URL 和 Service Role Key
npm run dev           # 启动在 http://localhost:4000
\`\`\`

## API 端点

${entities.map((e) => {
  const name = e.name.toLowerCase();
  return `| \`${name}s\` | GET /api/${name}s | 列表（支持 ?search=&limit=&offset=） |
| \`${name}s\` | GET /api/${name}s/:id | 详情 |
| \`${name}s\` | POST /api/${name}s | 创建 |
| \`${name}s\` | PUT /api/${name}s/:id | 更新 |
| \`${name}s\` | DELETE /api/${name}s/:id | 删除 |`;
}).join("\n")}

## 部署

\`\`\`bash
# Vercel/Railway 部署：直接 push，自动检测 Node.js 项目
# Docker 部署：docker build -t api . && docker run -p 4000:4000 api
\`\`\`
`;

  return {
    apiRoutes: fullServer,
    supabaseTypes: types,
    envTemplate,
    packageJson,
    readme,
    routeCount,
  };
}
