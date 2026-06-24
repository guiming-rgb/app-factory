# 平台指南

App 生产工厂支持从同一份 App Spec 同步生成 **Flutter**、**微信小程序** 和 **鸿蒙** 三套原生代码。本文档涵盖各平台的开发环境搭建、构建、发布和常见问题。

---

## Flutter

### 开发环境搭建

Flutter 生成的代码运行在 iOS / Android / Web / macOS / Windows / Linux 六大平台上。

#### 1. 安装 Flutter SDK

从 [Flutter 官网](https://flutter.dev) 下载并安装 Flutter 3.x：

```bash
# macOS（推荐使用 Homebrew）
brew install flutter

# 查看 Flutter 版本
flutter --version

# 运行环境检查
flutter doctor
```

#### 2. 配置平台工具

根据 `flutter doctor` 的提示安装缺失的组件：

**iOS 开发：**

```bash
# 安装 CocoaPods
sudo gem install cocoapods

# 安装 Xcode（从 Mac App Store）
```

**Android 开发：**

```bash
# 安装 Android Studio
# 在 Android Studio 中安装 Android SDK（API 33+）
```

**Web 开发：**

Flutter Web 无需额外工具，直接 `flutter build web` 即可。

**桌面开发（macOS/Windows/Linux）：**

```bash
# macOS 桌面开发无需额外工具
# Windows 需要 Visual Studio 2022（含"使用 C++ 的桌面开发"工作负载）
# Linux 需要 GTK 3 开发库
```

### 下载生成的项目

在 App 生产工厂中完成 Flutter 代码生成后：

1. 在项目页面点击 **Flutter 下载**
2. 解压下载的 ZIP 包
3. 进入项目目录

### 本地构建

```bash
cd your-app-name

# 获取依赖
flutter pub get

# 运行在连接的设备/模拟器
flutter run

# 构建 iOS（需要 Xcode）
flutter build ios

# 构建 Android APK
flutter build apk

# 构建 Android App Bundle
flutter build appbundle

# 构建 Web
flutter build web

# 构建 macOS 桌面
flutter build macos

# 构建 Windows 桌面
flutter build windows
```

### 发布到 App Store

#### iOS App Store

1. 在 Xcode 中打开 `ios/Runner.xcworkspace`
2. 配置签名（Team、Bundle Identifier）
3. 在 App Store Connect 创建应用
4. 构建并归档：

```bash
flutter build ipa
```

5. 在 Xcode Organizer 中上传到 App Store Connect
6. 在 App Store Connect 填写元数据并提交审核

#### Google Play

1. 构建签名 AAB：

```bash
flutter build appbundle
```

2. 在 Google Play Console 创建应用
3. 上传 `build/app/outputs/bundle/release/app-release.aab`
4. 填写商店信息并提交审核

#### 桌面应用

生成的 macOS DMG 和 Windows EXE/MSI 安装包可以直接分发。

### 常见问题

**问题：`flutter pub get` 失败**

```bash
# 清理缓存后重试
flutter clean
flutter pub cache repair
flutter pub get
```

**问题：iOS 构建签名错误**

检查 Xcode 中的 Team 和 Bundle Identifier 设置，确保已登录有效的 Apple Developer 账号。

**问题：Android 构建 Gradle 版本不兼容**

检查 `android/gradle/wrapper/gradle-wrapper.properties` 中的 Gradle 版本与本地 Android Studio 兼容。

---

## 微信小程序

### 开发环境搭建

#### 1. 注册微信小程序

访问 [微信公众平台](https://mp.weixin.qq.com/) 注册小程序账号，获取 **AppID**。

#### 2. 安装微信开发者工具

从 [微信开发者工具下载页面](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 下载并安装。

#### 3. 配置开发者工具

- 打开微信开发者工具
- 使用小程序账号扫码登录
- 在"设置 → 安全设置"中开启"服务端口"

### 下载生成的项目

在 App 生产工厂中完成微信小程序代码生成后：

1. 点击 **微信小程序下载**
2. 解压 ZIP 包
3. 使用微信开发者工具打开项目目录

### 构建和预览

```bash
# 项目目录结构
wechat-miniprogram/
├── app.js          # 应用入口
├── app.json        # 应用配置
├── app.wxss        # 全局样式
├── project.config.json  # 项目配置
├── pages/          # 页面目录
│   ├── home/
│   │   ├── index.wxml
│   │   ├── index.js
│   │   ├── index.wxss
│   │   └── index.json
│   └── ...
├── components/     # 公共组件
└── utils/         # 工具函数
```

#### 在开发者工具中预览

1. 打开微信开发者工具
2. 点击"导入项目"
3. 选择项目目录并填写 AppID
4. 点击"编译"即可在模拟器中预览

#### 使用真机调试

1. 在开发者工具中点击"预览"
2. 使用微信扫码
3. 在手机上查看和调试

### 提交审核

1. 在开发者工具中点击"上传"
2. 填写版本号和备注
3. 登录微信公众平台
4. 进入"版本管理 → 提交审核"
5. 填写审核信息并提交

### 常见问题

**问题：app.json 中页面路径错误**

检查 `app.json` 的 `pages` 字段，确保所有页面路径正确。

**问题：微信开发者工具无法启动**

尝试以管理员权限运行，或检查是否安装了最新版本。

**问题：审核被拒**

常见原因：
- 缺少必要的类目资质文件
- 存在未登录可操作的内容
- 功能不完整（如"正在开发中"页面）
- 隐私政策链接不可访问

---

## 鸿蒙（HarmonyOS）

### 开发环境搭建

#### 1. 安装 DevEco Studio

从 [华为开发者联盟](https://developer.harmonyos.com/) 下载 **DevEco Studio**（推荐 5.x 版本）。

#### 2. 配置 SDK

在 DevEco Studio 中：

1. 打开 **Settings → SDK Manager**
2. 安装 HarmonyOS SDK（API 12+）
3. 安装 ArkTS 编译工具链

#### 3. 注册华为开发者账号

访问 [华为开发者联盟](https://developer.huawei.com/consumer/cn/) 注册账号并完成实名认证。

### 下载生成的项目

在 App 生产工厂中完成鸿蒙代码生成后：

1. 点击 **鸿蒙下载**
2. 解压 ZIP 包
3. 用 DevEco Studio 打开项目目录

### 项目结构

```
harmony-app/
├── AppScope/
│   └── app.json5          # 应用全局配置
├── entry/
│   └── src/
│       └── main/
│           ├── module.json5    # 模块配置
│           ├── resources/      # 资源文件
│           └── ets/
│               ├── pages/
│               │   └── Index.ets   # 入口页面
│               └── entryability/
│                   └── EntryAbility.ets
├── oh-package.json5       # 包依赖
├── build-profile.json5    # 构建配置
├── hvigorfile.ts          # 构建脚本
└── oh_modules/            # 依赖模块
```

### 构建和运行

```bash
# 通过 DevEco Studio 运行
# 1. 打开项目
# 2. 选择设备（模拟器或真机）
# 3. 点击 Run

# 命令行构建（需要配置 hvigor）
cd harmony-app
hvigorw assembleHap
```

#### 在模拟器中运行

1. 在 DevEco Studio 中打开 **Tools → Device Manager**
2. 创建 HarmonyOS 模拟器
3. 选择模拟器并启动
4. 点击 Run 按钮

#### 在真机上运行

1. 开启开发者模式：设置 → 关于手机 → 连续点击版本号 7 次
2. 开启 USB 调试
3. 用 USB 连接电脑
4. 在 DevEco Studio 中选择设备并运行

### 发布到华为应用市场

#### 1. 签名配置

```bash
# 使用 DevEco Studio 生成签名文件
# Build → Generate Key and CSR
# 或使用命令行生成
keytool -genkey -alias appfactory -keyalg RSA \
  -keysize 2048 -keystore appfactory.keystore \
  -validity 3650
```

#### 2. 构建 HAP 包

```bash
# 在 DevEco Studio 中
Build → Build HAP(s) / APP Bundle(s)

# 或命令行
hvigorw assembleHap --mode release
```

#### 3. 提交应用市场

1. 登录 [AppGallery Connect](https://developer.huawei.com/consumer/cn/service/josp/agc/index.html)
2. 创建应用并填写基本信息
3. 上传 HAP 包
4. 填写应用描述、截图、隐私政策
5. 提交审核

### 常见问题

**问题：DevEco Studio 无法识别设备**

- 检查 USB 连接
- 确认开启了开发者模式和 USB 调试
- 安装必要的 USB 驱动

**问题：构建报错 API 版本不兼容**

检查 `build-profile.json5` 中的 `compileSdkVersion` 和 `compatibleSdkVersion` 与本地 SDK 版本匹配。

**问题：模拟器启动失败**

- 确认已启用 CPU 虚拟化（Intel VT-x / AMD-V）
- 尝试创建新的模拟器实例
- 检查内存分配是否充足

---

## 多平台对比

| 特性 | Flutter | 微信小程序 | 鸿蒙 |
|------|:-------:|:--------:|:----:|
| 开发语言 | Dart | JS + WXML + WXSS | ArkTS |
| UI 框架 | Widget | 原生组件 | ArkUI |
| 支持平台 | iOS/Android/Web/Desktop | 微信 | HarmonyOS |
| 包大小 | ~5-20 MB | ~2-5 MB | ~3-10 MB |
| 热重载 | 支持 | 支持 | 支持 |
| 第三方包 | pub.dev | npm | ohpm |
| 发布渠道 | App Store / Google Play / Web | 微信公众平台 | AppGallery |
| 审核周期 | 1-7 天 | 1-7 天 | 1-5 天 |
| 国内可用性 | 需特殊处理 | 完全可用 | 完全可用 |

## 选择建议

- **优先 Flutter** — 需要跨平台（iOS + Android + Web + 桌面）时首选
- **微信小程序** — 目标用户在中国大陆、需要微信生态（支付、分享、社交裂变）
- **鸿蒙** — 需要覆盖华为设备用户、利用鸿蒙原生能力
- **三平台同时生成** — 需要最大用户覆盖时，三个平台可同时生成
