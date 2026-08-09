# EagMore

> I'm still waiting for you.

BrokenShine 的个人博客，记录生活、思考、Linux 与 AI 工作流的折腾笔记。文章以 [Org mode](https://orgmode.org/) 编写，站点为纯静态构建后部署到 Codeberg Pages。

线上地址：<https://BrokenShine.codeberg.page>

## 写作

所有文章是 `src/content/posts/` 下的 `.org` 文件。每篇文章以 Org 关键字作为元信息：

```org
#+TITLE: 文章标题
#+DATE: <2026-03-03 Tue 02:46>
#+FILETAGS: :生活:随笔:

正文从这里开始。
```

- `#+TITLE` —— 标题
- `#+DATE` —— 发布时间，用 Org 时间戳（`C-c .` 可在 Emacs 中插入）
- `#+FILETAGS` —— 标签，用冒号包围、冒号分隔（`:tag1:tag2:`）

新建文章可以手写，也可以用项目内的脚手架命令生成模板（见下文「命令」）。

## 命令

项目用 [just](https://github.com/casey/just) 包装常用操作，所有命令都在 Guix 环境内运行，因此开箱即用、无需手动配置 Node 版本：

| 命令              | 作用                                                        |
| ----------------- | ----------------------------------------------------------- |
| `just dev`        | 启动本地开发服务器（<http://localhost:4321>），改动实时生效 |
| `just build`      | 构建完整站点（页面 + 搜索索引）到 `dist/`                   |
| `just preview`    | 构建后本地预览 `dist/` 的成品效果                           |
| `just check`      | 类型与诊断检查                                              |
| `just new [名称]` | 生成一篇带好元信息模板的新 Org 文章                         |
| `just install`    | 安装 / 同步依赖                                             |

> 命令的具体调用方式（`guix shell --manifest=manifest.scm -- just <recipe>`）见 `AGENTS.md`。

## 项目结构

```
src/content/posts/   # 文章（.org）
src/                 # 组件、布局、样式、浏览器脚本
public/              # 字体等静态资源
```

构建产物 `dist/`、依赖目录 `node_modules/` 等均为本地生成，不纳入版本控制。

## 协议与署名

文章内容版权归 BrokenShine 所有。站点主题为自制的「ASCII Orbit」终端风格设计，保留了 ASCII 地球动画、多套 Base16 配色、Pagefind 全文搜索等特性。

---

更多面向开发与维护的说明（技术栈、内容管线、架构边界、Git 约定等）见 [`AGENTS.md`](./AGENTS.md)。
