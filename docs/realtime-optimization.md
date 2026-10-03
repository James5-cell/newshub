# 即时板块优化与上线说明

保留即时／最热／新闻的现有含义与排版；明报及其他自定义订阅地址不变。

## 已实现

- 金十绝对时间按 Asia/Shanghai 转成毫秒时间戳，正文直接展示，不再只显示括号内标题。
- 明显未来的时间显示“时间待校准”，来源卡片时间标注“检查”，与新闻发布时间区分。
- RSS 字符串 GUID、Atom published 与 alternate link 正确解析；自定义 RSS/JSON Feed 每次采集只请求一次。
- 来源内按 ID（缺失时按 URL）去重；静态别名统一使用实际来源缓存，不额外采集。
- 金十、华尔街见闻快讯、财联社电报共享冷却为两分钟；其他来源保留各自间隔及五分钟下限。
- 可见页面每分钟检查已加载卡片；隐藏页面暂停。访客共用 D1 缓存、原子租约和失败退避。
- 新增香港电台国际与财经即时 RSS，默认五分钟检查，可在现有管理后台隐藏。
- Node 后台每分钟处理最多三个到期即时来源；Cloudflare 使用下述独立调度 Worker。

两分钟是来源最短采集间隔，不是所有来源两分钟内必达的承诺。多个来源到期会分批处理；源站错误保持旧缓存并退避五分钟。财联社旧接口曾返回 404，降低冷却不能修复这个接口。

## Cloudflare 启用持续更新

先部署网站代码。Pages 设置 CRON_SECRET，并启用共享缓存（ENABLE_CACHE 不得为 false）；不要把密钥写入仓库。

进入 deploy/realtime，确认 wrangler.jsonc 的 NEWSHUB_URL 为实际网站地址。使用 `wrangler secret put CRON_SECRET` 设置与 Pages 相同的密钥，然后 `wrangler deploy` 部署独立调度 Worker。

Worker 每分钟调用受密钥保护的 `/api/cron/realtime`，最多刷新三个到期即时源。它复用网站原有 D1 连接、来源配置、缓存和租约；不另建数据库。缺少密钥返回 503，错误密钥返回 401。HTTP 超时与非成功响应在 Worker 日志体现，部分来源错误输出告警。

本次未部署网站或调度 Worker。Cloudflare 上无人访问时持续更新，需要完成上述启用步骤。部署后检查 Cron 日志、来源成功检查时间、D1 行读写及 Pages CPU 用量。该方案仍在 Pages 执行解析工作，不保证重型 HTML 来源在免费 CPU 限制内。

## 可选新增资源

2026-10-02（用户所在时区）单次验证，以下官方 RSS 返回 200 且内容为 RSS；这不是长期可用率保证：

- 香港电台国际： https://rthk.hk/rthk/news/rss/c_expressnews_cinternational.xml （已接入）
- 香港电台财经： https://rthk.hk/rthk/news/rss/c_expressnews_cfinance.xml （已接入）
- 美联储货币政策： https://www.federalreserve.gov/feeds/press_monetary.xml （可在管理后台新增，provider=rss、type=realtime、interval_ms=600000；英文事件源，发布频率较低）

官方目录：https://news.rthk.hk/rthk/ch/rss.feed 、 https://www.federalreserve.gov/feeds/feeds.htm 。

优先保持小规模稳定接入。每分钟自动检查会增加访客请求；当前约千次请求/日不能直接等同于访客人数。隐藏页暂停、共享来源冷却、三源批次和失败退避限制重复抓取；仍需按实际累计页面打开时长观察免费额度。
