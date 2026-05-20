# App Spec JSON Schemas

> 人类可读说明：[App-Spec-v0.1-草案.md](../App-Spec-v0.1-草案.md)  
> 落盘计划：[v2a-App-Spec-JSON-Schema-落盘计划.md](../v2a-App-Spec-JSON-Schema-落盘计划.md)

| 文件 | 版本 | 状态 |
|------|------|------|
| `app-spec-v0.1.schema.json` | 0.1.x | 草案，供 Validator PoC |

**本地校验（规划命令）**：

```bash
npm run validate:spec
npm run validate:spec -- path/to/spec.json
# 负例（应失败 exit 1）：
npm run validate:spec -- docs/schemas/examples/invalid-missing-version.json
```

**注意**：Schema 通过 **不等于** 能成功 codegen，还需通过 [模板能力矩阵.md](../模板能力矩阵.md)。
