import { defineConfig } from "vitepress";

export default defineConfig({
  title: "App 生产工厂",
  description: "AI 原生软件生产平台 — 输入 App 想法，自动完成立项、设计、架构、代码生成和三平台部署",
  lang: "zh-CN",
  base: "/docs/",
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ["link", { rel: "icon", href: "/docs/favicon.ico" }],
    ["meta", { name: "theme-color", content: "#0d9488" }],
    ["meta", { property: "og:title", content: "App 生产工厂" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "AI 原生软件生产平台 — 输入 App 想法，8 个 AI Agent 自动协作完成产品设计、架构、代码生成和三平台部署",
      },
    ],
  ],

  themeConfig: {
    logo: "/docs/logo.svg",
    siteTitle: "App 生产工厂",

    nav: [
      { text: "指南", link: "/guide/", activeMatch: "/guide/" },
      { text: "API 参考", link: "/api/", activeMatch: "/api/" },
      { text: "行业模板", link: "/guide/industries", activeMatch: "/guide/industries" },
      { text: "定价", link: "/guide/billing", activeMatch: "/guide/billing" },
      {
        text: "GitHub",
        link: "https://github.com/guiming-rgb/app-factory",
      },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "快速开始",
          collapsed: false,
          items: [
            { text: "简介", link: "/guide/" },
            { text: "App Spec 规范", link: "/guide/app-spec" },
          ],
        },
        {
          text: "平台指南",
          collapsed: false,
          items: [
            { text: "平台概览", link: "/guide/platforms" },
            { text: "发布指南", link: "/guide/publishing" },
          ],
        },
        {
          text: "行业模板",
          collapsed: false,
          items: [
            { text: "20 个行业模板", link: "/guide/industries" },
          ],
        },
        {
          text: "运营",
          collapsed: false,
          items: [
            { text: "定价与计费", link: "/guide/billing" },
          ],
        },
      ],

      "/api/": [
        {
          text: "API 参考",
          collapsed: false,
          items: [
            { text: "概述", link: "/api/" },
            { text: "Workspaces", link: "/api/workspaces" },
            { text: "Marketplace", link: "/api/marketplace" },
            { text: "Analytics", link: "/api/analytics" },
            { text: "Billing", link: "/api/billing" },
            { text: "Experiments", link: "/api/experiments" },
          ],
        },
      ],
    },

    search: {
      provider: "local",
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: "搜索文档",
                buttonAriaLabel: "搜索文档",
              },
              modal: {
                noResultsText: "未找到相关结果",
                resetButtonTitle: "清除搜索条件",
                footer: {
                  selectText: "选择",
                  navigateText: "切换",
                  closeText: "关闭",
                },
              },
            },
          },
        },
      },
    },

    editLink: {
      pattern: "https://github.com/guiming-rgb/app-factory/edit/main/docs-site/:path",
      text: "在 GitHub 上编辑此页",
    },

    footer: {
      message: "基于 MIT 许可证发布",
      copyright: `Copyright ${new Date().getFullYear()} App 生产工厂`,
    },

    docFooter: {
      prev: "上一页",
      next: "下一页",
    },

    outline: {
      label: "本页目录",
      level: "deep",
    },

    returnToTopLabel: "返回顶部",
    sidebarMenuLabel: "菜单",
    darkModeSwitchLabel: "主题",
    lightModeSwitchTitle: "切换到浅色模式",
    darkModeSwitchTitle: "切换到深色模式",

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/guiming-rgb/app-factory",
      },
    ],
  },

  markdown: {
    lineNumbers: true,
  },
});
