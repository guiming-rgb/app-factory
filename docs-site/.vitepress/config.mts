import { defineConfig } from "vitepress";

export default defineConfig({
  title: "App 生产工厂",
  description: "AI 原生软件生产平台 — 文档站",
  lang: "zh-CN",
  base: "/docs/",
  lastUpdated: true,

  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "架构", link: "/architecture" },
      { text: "开发", link: "/development" },
      { text: "部署", link: "/deployment" },
    ],

    sidebar: {
      "/": [
        {
          text: "概述",
          items: [
            { text: "项目简介", link: "/" },
            { text: "一页纸概述", link: "/one-pager" },
            { text: "路线图", link: "/roadmap" },
          ],
        },
        {
          text: "架构设计",
          items: [
            { text: "架构交接", link: "/architecture" },
            { text: "版本与分支", link: "/versions" },
            { text: "安全审计", link: "/security" },
          ],
        },
        {
          text: "核心功能",
          items: [
            { text: "App Spec IR", link: "/app-spec" },
            { text: "代码生成 (v2a)", link: "/codegen-v2a" },
            { text: "微信小程序 (v2b)", link: "/codegen-v2b" },
            { text: "沙箱 Docker (v2.1)", link: "/sandbox" },
            { text: "GitHub OAuth (C4)", link: "/github-oauth" },
            { text: "发版全链路 (S6)", link: "/release" },
            { text: "Auth & RLS (v4)", link: "/auth" },
            { text: "记忆与技能 (v5)", link: "/memories-skills" },
          ],
        },
        {
          text: "开发指南",
          items: [
            { text: "开发纲要", link: "/development" },
            { text: "本地运行", link: "/local-dev" },
            { text: "部署指南 (v3)", link: "/deployment" },
            { text: "验收指南", link: "/verification" },
          ],
        },
        {
          text: "参考",
          items: [
            { text: "模板能力矩阵", link: "/capability-matrix" },
            { text: "模板能力矩阵-微信", link: "/capability-wechat" },
            { text: "Flutter 模板目录", link: "/flutter-template" },
            { text: "微信模板目录", link: "/wechat-template" },
            { text: "桌面发行包", link: "/desktop-release" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com" }],
    search: { provider: "local" },
  },
});
