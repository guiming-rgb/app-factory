# App Spec IR — v0.1 草案

> **状态**：草案（Draft），用于阶段 B 设计与评审；**非**生产强约束 Schema。  
> **配套**： [多平台App生产工厂路线图.md](./多平台App生产工厂路线图.md)

---

## 一、设计原则

1. **版本化**：根字段 **`specVersion`**（如 `"0.1.0"`）。  
2. **可校验**：后续提供 **JSON Schema**（`schemas/app-spec-v0.1.json`）。  
3. **与模板能力矩阵对齐**：超出能力写入 **`limitations`** / **`complianceFlags`**，禁止静默夸大。  
4. **与现有工程衔接**：建议 **`sourceProjectId`** 可选，指向当前 `projects.id`（由方案流水线或用户填写衍生）。

---

## 二、根结构（逻辑模型）

```json
{
  "specVersion": "0.1.0",
  "appName": "FitnessBooking",
  "displayName": "健身预约",
  "sourceProjectId": "uuid-optional",

  "targets": {
    "flutter": {
      "enabled": true,
      "platforms": ["ios", "android"],
      "formFactors": ["phone", "tablet"]
    },
    "harmony": {
      "enabled": false,
      "formFactors": ["phone", "tablet"]
    },
    "backend": {
      "provider": "supabase",
      "regionHint": "ap-east-optional"
    }
  },

  "entities": [],
  "screens": [],
  "navigation": {},
  "roles": [],
  "api": [],
  "auth": {},
  "layoutRules": {},
  "complianceFlags": {},
  "limitations": [],
  "metadata": {}
}
```

---

## 三、字段说明（v0.1）

### 3.1 标识与溯源

| 字段 | 类型 | 说明 |
|------|------|------|
| `specVersion` | string | SemVer，如 `0.1.0` |
| `appName` | string | 机器友好标识（PascalCase / snake_case 约定后续统一） |
| `displayName` | string | 展示名称 |
| `sourceProjectId` | string \| null | 可选，关联 `projects` |

### 3.2 `targets`（三栈）

- **`flutter`**：`enabled`、`platforms[]`、`formFactors[]`（phone / tablet）。  
- **`harmony`**：独立开关与形态；**v0.1 可为 `enabled: false`**。  
- **`backend.provider`**：`supabase` | `nest` | `custom`（v0.1 建议仅实现 `supabase`）。

### 3.3 `entities`（领域模型草稿）

数组项示例（v0.1）：

```json
{
  "name": "Booking",
  "fields": [
    { "name": "id", "type": "uuid", "primary": true },
    { "name": "userId", "type": "uuid", "required": true },
    { "name": "startsAt", "type": "datetime", "required": true }
  ],
  "relations": [{ "type": "belongsTo", "entity": "User" }]
}
```

### 3.4 `screens`（界面规格草稿）

```json
{
  "id": "home",
  "title": "首页",
  "type": "tabRoot",
  "children": ["course_list", "profile"]
}
```

`type` 枚举 v0.1 建议限定为：`tabRoot` | `list` | `detail` | `form` | `placeholder`（超出模板能力用 `placeholder` + `limitations` 说明）。

### 3.5 `navigation`

描述 Tab 顺序、路由名、深链预留（v0.1 可为最小对象）。

### 3.6 `roles` 与 `auth`

```json
{
  "provider": "supabase",
  "methods": ["email"],
  "roles": ["user", "admin"]
}
```

### 3.7 `api`（抽象接口，非 OpenAPI 全文）

用于标注「需 Edge Function / RPC」的占位：

```json
{
  "name": "listCourses",
  "kind": "supabase_rpc",
  "entity": "Course"
}
```

### 3.8 `layoutRules`

响应式断点、平板侧栏策略等（v0.1 可仅 `{"tabletSidebar": "auto"}`）。

### 3.9 `complianceFlags` 与 `limitations`

```json
{
  "complianceFlags": {
    "templateLimited": false,
    "requiresManualPayment": true,
    "requiresContentModeration": false
  },
  "limitations": [
    "首版不包含应用内支付",
    "不包含实时音视频"
  ]
}
```

### 3.10 `metadata`

`createdAt`、`updatedAt`、`locale`（如 `zh-CN`）、`generatorHints` 等扩展位。

---

## 四、最小可用示例（MVP）

```json
{
  "specVersion": "0.1.0",
  "appName": "SmallRestaurantLoyalty",
  "displayName": "小餐馆会员",
  "targets": {
    "flutter": {
      "enabled": true,
      "platforms": ["ios", "android"],
      "formFactors": ["phone", "tablet"]
    },
    "harmony": { "enabled": false, "formFactors": ["phone"] },
    "backend": { "provider": "supabase" }
  },
  "entities": [
    {
      "name": "Member",
      "fields": [
        { "name": "id", "type": "uuid", "primary": true },
        { "name": "phone", "type": "string", "required": true },
        { "name": "points", "type": "int", "required": true }
      ],
      "relations": []
    }
  ],
  "screens": [
    { "id": "home", "title": "首页", "type": "tabRoot", "children": ["points", "coupons"] },
    { "id": "points", "title": "积分", "type": "list", "entity": "Member" },
    { "id": "coupons", "title": "优惠券", "type": "list", "entity": "Coupon" }
  ],
  "navigation": { "tabs": ["points", "coupons"] },
  "roles": [{ "name": "customer" }],
  "auth": { "provider": "supabase", "methods": ["phone_otp"], "roles": ["customer"] },
  "api": [],
  "layoutRules": { "tabletSidebar": "auto" },
  "complianceFlags": { "templateLimited": false },
  "limitations": ["首版不含支付"],
  "metadata": { "locale": "zh-CN" }
}
```

（注：`Coupon` 实体在完整 Spec 中应补齐，此处仅示意。）

---

## 五、后续工作项（非本文实现）

- [ ] 发布 `schemas/app-spec-v0.1.json`（JSON Schema Draft 2020-12 或团队选定版本）。  
- [ ] Spec Validator：与 **模板能力矩阵** 交叉校验。  
- [ ] 从现有 8-Agent Markdown 报告 **抽取 / 生成** Spec 的 Prompt 与流水线（Inngest 新事件）。  
- [ ] `app_specs` 表：存 `spec_json`、`schema_version`、`validation_errors`。

---

## 六、变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1 草案 | 2026-05-12 | 首版字段与示例 |
