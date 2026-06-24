# App Spec 规范

App Spec 是 App 生产工厂的**核心中间表示**（Intermediate Representation, IR）。它是一份结构化的 JSON 文档，完整描述了一个应用的所有页面、数据实体、导航结构和配置。Spec 指定了"应用应该长什么样、有什么功能"，然后由各平台的代码生成器自动翻译为原生代码。

## 顶层结构

```typescript
type AppSpec = {
  specVersion: string;
  appName: string;
  displayName: string;
  sourceProjectId?: string;
  targets?: Record<string, unknown>;
  entities?: AppSpecEntity[];
  screens: AppSpecScreen[];
  navigation?: { tabs?: string[] };
  roles?: unknown[];
  auth?: Record<string, unknown>;
  api?: unknown[];
  layoutRules?: Record<string, unknown>;
  complianceFlags?: Record<string, unknown>;
  limitations?: string[];
  metadata?: Record<string, unknown>;
};
```

### specVersion

Schema 版本号，当前为 `"0.1.0"`。用于向后兼容性判断。

### appName

应用的代码标识名，仅允许字母、数字和下划线。用于生成项目目录名、包名和路由前缀。

```json
"appName": "campus_market"
```

### displayName

应用的显示名称，用于在 UI 中展示、应用商店标题和 App 内的标题栏。

```json
"displayName": "校园二手市场"
```

---

## targets（目标平台）

定义代码生成的目标平台及其配置。

```typescript
type Targets = {
  flutter?: FlutterTargetSpec;
  wechatMiniProgram?: WechatMiniProgramTarget;
  harmony?: HarmonyTargetSpec;
  backend?: BackendTargetSpec;
};
```

### Flutter 目标

```json
{
  "flutter": {
    "enabled": true,
    "platforms": ["ios", "android", "web", "macos", "windows", "linux"],
    "formFactors": ["phone", "tablet"]
  }
}
```

### 微信小程序目标

```typescript
type WechatMiniProgramTarget = {
  enabled: boolean;
  tabBar?: string[];
  loginMethod?: "wechat" | "phone" | "both";
  subPackages?: WechatSubPackage[];
};
```

示例：

```json
{
  "wechatMiniProgram": {
    "enabled": true,
    "tabBar": ["home", "category_list", "cart", "profile"],
    "loginMethod": "wechat"
  }
}
```

### 鸿蒙目标

```json
{
  "harmony": {
    "enabled": true,
    "formFactors": ["phone", "tablet"]
  }
}
```

### 后端目标

```typescript
type BackendTargetSpec = {
  provider: "supabase" | "nest" | "custom";
  regionHint?: string;
};
```

```json
{
  "backend": {
    "provider": "supabase"
  }
}
```

---

## screens（页面定义）

`screens` 数组定义应用的所有页面。每个页面可以绑定一个实体（entity）来驱动其数据展示。

```typescript
type AppSpecScreen = {
  id: string;
  title: string;
  type: string;
  children?: string[];
  entity?: string;
};
```

### 页面 ID 规范

- 使用小写字母和下划线（snake_case）
- 在整个 Spec 中唯一
- 示例：`"home"`, `"product_list"`, `"user_profile"`

### 支持的页面类型

| 类型 | 说明 | 是否需要 entity |
|------|------|:---:|
| `tabRoot` | 底部 Tab 页容器 | 否 |
| `list` | 数据列表（支持搜索分页） | 是 |
| `detail` | 详情页 | 是 |
| `form` | 表单（创建/编辑/搜索） | 可选 |
| `dashboard` | 仪表盘 | 否 |
| `card_grid` | 卡片网格 | 可选 |
| `calendar` | 日历视图 | 可选 |
| `chart` | 图表报表 | 可选 |
| `chat` | 聊天列表 | 否 |
| `map` | 地图视图 | 可选 |
| `payment` | 支付页面 | 否 |
| `kanban` | 看板视图 | 可选 |
| `onboarding` | 引导页 | 否 |
| `iot` | IoT 控制面板 | 可选 |
| `call` | 音视频通话 | 否 |
| `game` | 游戏页面 | 可选 |
| `ar` | AR 增强现实 | 否 |
| `medical` | 医疗页面 | 可选 |
| `automotive` | 车载页面 | 可选 |
| `banking` | 银行页面 | 可选 |
| `insurance` | 保险页面 | 可选 |
| `kyc` | 实名认证 | 否 |
| `placeholder` | 占位页面 | 否 |

### 完整示例

```json
{
  "screens": [
    { "id": "home", "title": "首页", "type": "card_grid" },
    { "id": "product_list", "title": "商品列表", "type": "list", "entity": "product" },
    { "id": "product_detail", "title": "商品详情", "type": "detail", "entity": "product" },
    { "id": "cart", "title": "购物车", "type": "list", "entity": "cart_item" },
    { "id": "checkout", "title": "结算", "type": "payment" },
    { "id": "order_list", "title": "订单列表", "type": "list", "entity": "order" },
    { "id": "profile", "title": "我的", "type": "placeholder" }
  ]
}
```

---

## entities（数据实体定义）

`entities` 数组定义了应用中的数据结构模型，用于驱动列表、详情和表单页面的自动生成。

```typescript
type AppSpecEntity = {
  name: string;
  fields: AppSpecField[];
  relations?: EntityRelation[];
};

type AppSpecField = {
  name: string;
  type: string;
  primary?: boolean;
  required?: boolean;
};

type EntityRelation = {
  target: string;
  type: "belongs_to" | "has_many" | "has_one";
};
```

### 字段类型

| 字段类型 | TypeScript 类型 | SQL 类型 | 说明 |
|---------|:---:|:---:|------|
| `uuid` | `string` | `uuid default gen_random_uuid()` | 主键 |
| `string` | `string` | `text` | 文本 |
| `int` / `integer` | `number` | `integer` | 整数 |
| `float` / `number` | `number` | `double precision` | 浮点数 |
| `bool` / `boolean` | `boolean` | `boolean` | 布尔值 |
| `datetime` / `date` | `string` | `timestamptz` | 时间戳 |
| `json` | `Record<string, unknown>` | `jsonb` | JSON 对象 |
| `image` | `string` | `text` | 图片 URL |
| `file` | `string` | `text` | 文件 URL |

### 实体关系

支持三种实体关系：

- **belongs_to** — 多对一（外键在当前表）
- **has_many** — 一对多（外键在关联表）
- **has_one** — 一对一

### 完整示例

```json
{
  "entities": [
    {
      "name": "product",
      "fields": [
        { "name": "id", "type": "uuid", "primary": true },
        { "name": "name", "type": "string", "required": true },
        { "name": "category_id", "type": "uuid" },
        { "name": "price", "type": "float" },
        { "name": "original_price", "type": "float" },
        { "name": "images", "type": "json" },
        { "name": "description", "type": "string" },
        { "name": "sales", "type": "int" },
        { "name": "rating", "type": "float" },
        { "name": "stock", "type": "int" }
      ],
      "relations": [
        { "target": "category", "type": "belongs_to" }
      ]
    },
    {
      "name": "category",
      "fields": [
        { "name": "id", "type": "uuid", "primary": true },
        { "name": "name", "type": "string", "required": true },
        { "name": "icon", "type": "image" },
        { "name": "sort_order", "type": "int" }
      ]
    }
  ]
}
```

### 实体到数据库的映射

代码生成器自动将实体转换为 Supabase DDL：

```sql
CREATE TABLE products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id uuid REFERENCES categories(id),
  price DOUBLE PRECISION,
  original_price DOUBLE PRECISION,
  images JSONB,
  description TEXT,
  sales INTEGER,
  rating DOUBLE PRECISION,
  stock INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

### 实体到后端 API 的映射

每个实体自动生成完整的 REST API 路由：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/products` | 列表（支持 `?search=&limit=&offset=`） |
| GET | `/api/products/:id` | 详情 |
| POST | `/api/products` | 创建 |
| PUT | `/api/products/:id` | 更新 |
| DELETE | `/api/products/:id` | 删除 |

---

## navigation（导航配置）

配置应用的导航结构。目前支持底部 Tab 导航。

```json
{
  "navigation": {
    "tabs": ["home", "product_list", "cart", "profile"]
  }
}
```

`tabs` 数组中的每个值对应 `screens` 数组中的一个页面 `id`。通常配置 3-5 个 Tab。

---

## layoutRules（布局规则）

定义应用的整体视觉风格。

```json
{
  "layoutRules": {
    "theme": "teal",
    "density": "comfortable"
  }
}
```

支持的属性：

| 属性 | 说明 | 可选值 |
|------|------|--------|
| `theme` | 主题色 | `teal`, `blue`, `red`, `green`, `orange`, `purple`, `pink`, `indigo` |
| `density` | 内容密度 | `comfortable`, `compact` |

---

## auth（认证配置）

定义认证方式。

```json
{
  "auth": {
    "provider": "supabase",
    "methods": ["email", "phone", "wechat", "apple"],
    "sessionTimeout": 86400
  }
}
```

---

## limitations（限制声明）

列出应用的已知限制或依赖的外部服务。

```json
{
  "limitations": [
    "支付需 Stripe 配置",
    "商品图片需 CDN",
    "实时聊天需 Supabase Realtime"
  ]
}
```

---

## 完整的 App Spec 示例

一个完整的电商 App Spec：

```json
{
  "specVersion": "0.1.0",
  "appName": "shop",
  "displayName": "电商商城",
  "targets": {
    "flutter": {
      "enabled": true,
      "platforms": ["ios", "android", "web"],
      "formFactors": ["phone"]
    },
    "wechatMiniProgram": {
      "enabled": true
    },
    "harmony": {
      "enabled": true,
      "formFactors": ["phone"]
    },
    "backend": {
      "provider": "supabase"
    }
  },
  "screens": [
    { "id": "home", "title": "首页", "type": "card_grid" },
    { "id": "product_list", "title": "商品", "type": "list", "entity": "product" },
    { "id": "product_detail", "title": "详情", "type": "detail", "entity": "product" },
    { "id": "cart", "title": "购物车", "type": "list", "entity": "cart_item" },
    { "id": "profile", "title": "我的", "type": "placeholder" }
  ],
  "entities": [
    {
      "name": "category",
      "fields": [
        { "name": "id", "type": "uuid", "primary": true },
        { "name": "name", "type": "string" },
        { "name": "sort_order", "type": "int" }
      ]
    },
    {
      "name": "product",
      "fields": [
        { "name": "id", "type": "uuid", "primary": true },
        { "name": "category_id", "type": "uuid" },
        { "name": "name", "type": "string", "required": true },
        { "name": "price", "type": "float" },
        { "name": "images", "type": "json" },
        { "name": "description", "type": "string" },
        { "name": "stock", "type": "int" }
      ],
      "relations": [{ "target": "category", "type": "belongs_to" }]
    },
    {
      "name": "cart_item",
      "fields": [
        { "name": "id", "type": "uuid", "primary": true },
        { "name": "user_id", "type": "uuid" },
        { "name": "product_id", "type": "uuid" },
        { "name": "qty", "type": "int" }
      ],
      "relations": [{ "target": "product", "type": "belongs_to" }]
    }
  ],
  "navigation": {
    "tabs": ["home", "product_list", "cart", "profile"]
  },
  "layoutRules": {
    "theme": "teal"
  },
  "limitations": [
    "支付需 Stripe 配置",
    "商品图片需 CDN"
  ]
}
```

---

## Spec 校验

系统使用 AJV JSON Schema 验证器对输入的 App Spec 进行校验。校验规则包括：

- `specVersion` 必须存在且为合法版本号
- `screens` 至少包含一个页面
- 每个屏幕的 `type` 必须是支持的页面类型
- 实体字段的 `type` 必须在合法类型列表中
- 导航 Tab 必须引用已定义的页面 ID

校验结果：

```typescript
type AppSpecValidationResult =
  | { ok: true; spec: AppSpec }
  | { ok: false; errors: string[] };
```

---

## 相关 API

- [GET /api/projects/:id/spec](/api/#get-spec) — 获取 Spec
- [PUT /api/projects/:id/spec](/api/#update-spec) — 更新 Spec
- [DELETE /api/projects/:id/spec](/api/#reset-spec) — 重置 Spec
- [GET /api/projects/:id/spec/versions](/api/#list-spec-versions) — 版本列表
