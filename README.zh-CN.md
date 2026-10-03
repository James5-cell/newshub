![](/public/og-image.png)

[English](./README.md) | 简体中文 | [日本語](README.ja-JP.md)

***优雅地阅读实时热门新闻***

> [!NOTE]
> 当前版本为 DEMO，仅支持中文。正式版将提供更好的定制化功能和英文内容支持。
>

## 功能特性
- 优雅的阅读界面设计，实时获取最新热点新闻
- 支持 GitHub 登录及数据同步
- 游客无需登录即可刷新，所有读者共享缓存和来源更新间隔
- 根据内容源更新频率调整抓取间隔（最快每 5 分钟），避免重复抓取
- 支持 MCP server

```json
{
  "mcpServers": {
    "newsnow": {
      "command": "npx",
      "args": [
        "-y",
        "newsnow-mcp-server"
      ],
      "env": {
        "BASE_URL": "https://newsnow.busiyi.world"
      }
    }
  }
}
```

你可以将 `BASE_URL` 修改为你的域名。

## 部署指南

### 基础部署
登录是可选功能。新闻读取与游客刷新需要启用共享缓存并配置数据库；Cloudflare Pages 使用 D1，Vercel 需自行配置受支持的数据库：
1. Fork 本仓库
2. 导入至目标平台

### Cloudflare Pages 配置
- 构建命令：`pnpm run build`
- 输出目录：`dist/output/public`

### GitHub OAuth 配置
1. [创建 GitHub App](https://github.com/settings/applications/new)
2. 无需特殊权限
3. 回调 URL 设置为：`https://your-domain.com/api/oauth/github`（替换 your-domain 为实际域名）
4. 获取 Client ID 和 Client Secret

### 环境变量配置
参考 `example.env.server` 文件，本地运行时重命名为 `.env.server` 并填写以下配置：

```env
# Github Clien ID
G_CLIENT_ID=
# Github Clien Secret
G_CLIENT_SECRET=
# JWT Secret, 通常就用 Clien Secret
JWT_SECRET=
# 初始化数据库, 首次运行必须设置为 true，之后可以将其关闭
INIT_TABLE=true
# 是否启用缓存
ENABLE_CACHE=true
```

### 数据库支持
本项目主推 Cloudflare Pages 以及 Docker 部署， Vercel 需要你自行搞定数据库，其他支持的数据库可以查看 https://db0.unjs.io/connectors 。

1. 在 Cloudflare Worker 控制面板创建 D1 数据库
2. 在 `wrangler.toml` 中配置 `database_id` 和 `database_name`
3. 若无 `wrangler.toml` ，可将 `example.wrangler.toml` 重命名并修改配置
4. 重新部署生效

### 低流量运行模式

- 普通刷新不要求 GitHub 登录，也不会绕过来源冷却时间。来源间隔至少 5 分钟，原来更长的间隔继续保留；配置集中在 `shared/refresh-policy.ts`。
- 同一 IP 每分钟最多 3 次刷新操作，计数与来源更新锁存于数据库，多个 Cloudflare 实例共享。数据库不可用时停止新抓取，避免失去资源限制。
- 批量刷新每次最多抓取 3 个到期来源，优先处理最久未成功更新的来源，其余留待后续检查；页面只检查当前已加载的卡片。
- 页面可见且联网时，每 3 分钟批量检查一次；后台标签页暂停检查，返回页面且已满检查间隔时立即检查。没有访客时不轮询长尾来源。
- 失败后保留旧内容并显示真实更新时间，至少等待 5 分钟再重试。数据库锁避免不同实例同时抓取同一来源。
- 初始化完成后，每个数据库实例不再重复执行迁移 SQL。新增安全表自动创建（包括旧配置 `INIT_TABLE=false`），无需删除现有新闻缓存或用户数据。
- 全站更新和绕过冷却的 `force: true` 仅允许 `ADMIN_GITHUB_ID` 对应的管理员；Cloudflare 上需分批操作，每批最多 3 个来源。

这一模式主要依靠访问时到期更新，不保证无人访问时新闻持续更新。Cloudflare 环境仍需另接可靠调度才能主动预热首页核心来源；不要高频调用一次刷新全部源的接口。

### Docker 部署
对于 Docker 部署，只需要项目根目录 `docker-compose.yaml` 文件，同一目录下执行
```
docker compose up
```
同样可以通过 `docker-compose.yaml` 配置环境变量。

## 开发
> [!Note]
> 需要 Node.js >= 20

```bash
corepack enable
pnpm i
pnpm dev
```

你可能想要添加数据源，请关注 `shared/sources` `server/sources`，项目类型完备，结构简单，请自行探索。

## 路线图
- 添加 **多语言支持**（英语、中文，更多语言即将推出）
- 改进 **个性化选项**（基于分类的新闻、保存的偏好设置）
- 扩展 **数据源** 以涵盖多种语言的全球新闻

## 贡献指南
欢迎贡献代码！您可以提交 pull request 或创建 issue 来提出功能请求和报告 bug

## License

[MIT](./LICENSE) © ourongxing
