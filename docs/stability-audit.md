# NewsHub 稳定性检查

检查日期：2026-10-02（America/New_York）。检查对象为当前工作区，包含尚未部署的刷新优化及现有 mascot 功能。本次未修改业务代码、未部署、未新增来源。

## 判断

正常桌面和手机阅读流程可运行；缓存并发保护和失败降级具备基础。尚不能认定为已完成稳定上线验收：存在可复现白屏、公开接口误拦截、默认质量检查失效和依赖安全告警。源站持续可用率及生产资源余量未取得监控证据。

## 已验证

- Node 25.2.1 环境：8 个测试文件、78 项测试全部通过。
- Cloudflare Pages 构建成功。
- 默认服务端类型检查失败：mascot 测试导入了项目文件列表外的源文件，并缺少 Vitest globals 类型；关闭 composite 并指定 vitest/globals 后服务端检查通过。应用类型检查通过。替代命令通过不等于默认 typecheck 已恢复。
- 默认 ESLint 失败：配置引用了当前 react-dom 插件不存在的 no-children-in-void-dom-elements 规则。
- 现有 SQLite 原生模块针对 Node ABI 141 编译，默认终端 Node 20（ABI 115）运行数据库测试失败；改用已有 Node 25 后通过。没有重装依赖。
- 本地 Cloudflare 预览：主页、即时页、latest、source-categories、source-overrides、search 返回 200；未知来源返回 404。
- 未配置 OAuth 时：custom-sources 返回 506；admin/check 返回 506。后者不能视为管理员权限绕过。
- Playwright：1440×900 桌面与 390×844 手机页面无 pageerror、无水平溢出。新闻读取接口使用固定样例响应，验证的是前端运行，不是所有源站抓取。
- Playwright 模拟 localStorage getter 抛 SecurityError：body 文本长度为 0，pageerror 为 Storage blocked，白屏可复现。
- 单次源站抽样：华尔街见闻、金十、香港电台国际返回 200；财联社旧路径返回 404（本次为未签名路径检查，上轮实际适配器 URL 也曾返回 404）。不等于完成全源健康验证。
- 生产域名当前访问出现 ECONNRESET；没有据此认定网站宕机。未查询生产 D1、Cron 部署状态、CPU/D1 额度、长期错误率。

## 优先问题

### P1：存储不可用导致白屏（已复现）

src/atoms/primitiveMetadataAtom.ts:11 在 try 之前调用 localStorage.getItem；模块导入时就读取。第 29 行写入也没有降级处理，其他登录和后台路径亦直接读写存储。

建议统一可失败的 storage 封装；读取异常使用默认值，写入异常保留内存状态。验证拒绝访问、配额满、损坏 JSON 三种场景。避免只修 mascot 而遗漏全局元数据。

### P1：依赖安全更新欠账（扫描结果，未做利用验证）

pnpm audit --prod --json：critical 1、high 45、moderate 75、low 10。告警包含传递依赖与重复关联，不能等同于 131 个可远程利用的网站漏洞。

值得先处理：

- fast-xml-parser 5.4.1：高危实体展开告警，直接位于外部 RSS 解析路径。审计同时存在其他告警，最终修复版本不能仅按一个最低补丁号选择。
- seroval 1.5.0：通过 TanStack Router 引入，critical 告警修复于 1.5.3。告警利用依赖不可信 fromJSON 输入与插件；本项目未验证暴露对应入口，不能宣称远程代码执行已成立。
- h3 1.15.1：多项路径/SSE/请求走私告警。Node 和 Cloudflare 的可达路径不同，须分别判断。package.json resolutions 也固定该版本，升级时需同步处理。

先做可控升级、锁文件审计与回归；不直接使用批量强制升级。

参考：
https://github.com/advisories/GHSA-8gc5-j5rx-235r
https://github.com/advisories/GHSA-mv8w-475r-vwqw
https://github.com/advisories/GHSA-mp2g-9vg9-f4cg

### P1：公开自定义来源接口被登录配置误拦截（已复现）

server/middleware/auth.ts:8-11：缺任一 OAuth 配置时，公开白名单未包含 /api/custom-sources。本地返回 506。useCustomSources 依赖此接口，所以部分动态来源功能受影响；source-categories 同时可用，不能简单描述成所有动态数据消失。

建议明确公开、用户和管理员路由清单，使用完整路径边界，避免以 /api/s 前缀偶然放行 search/source-categories。保留管理员校验，补齐登录配置完整／不完整的接口矩阵测试。

### P1：质量检查默认命令失效（已验证）

pnpm typecheck 与 pnpm lint 不能作为发布门禁。修正 tsconfig 项目边界、测试全局类型和 ESLint 配置／插件兼容性。固定 Node 版本及原生模块构建方式，确保干净安装可重现测试结果。

### P2：登录安全与会话交付（代码审查）

server/api/login.ts 未生成 state；OAuth 回调未校验 state。回调还把 60 天 JWT 放入重定向 URL 查询参数。登录不是游客新闻读取的前提，但管理员依赖这条链路。

建议补 state/PKCE；使用短期一次性交接凭证或经过部署验证的安全 Cookie，避免长期 JWT 出现在 URL；核验实际反向代理日志与浏览器历史处理，不假定当前已泄露。

GitHub 官方文档： https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps

### P2：抓取终止和体积边界不足（代码审查）

server/utils/refresh.ts 的 Promise.race 仅停止等待，不取消底层 fetch；fetch.ts timeout=10s、retry=3，RSS 无响应体大小限制，XML 同步解析。每批最多三源、租约与失败回退降低扩散，但不能防止单个超大响应消耗 CPU/内存。

建议把 AbortSignal 传到适配器；限制响应体、RSS 条目数；区分 429/403/404/5xx 的退避。不要用恶意大 XML 对生产执行验证。

### P2：搜索全表扫描与日期语义（代码审查／空库请求）

server/api/search.ts:158 每个非空搜索读取所有缓存 JSON，再逐条匹配；缺少公开请求限频。流量增长时会增加 D1 读量及解析 CPU。发布时间缺失时回退到缓存时间，可能让旧新闻看起来更新。

空数据库搜索返回 200，但后台日志有 no such table: cache；当前 catch 把失败表现为空结果。建议初始化一致化、输入长度限制、限频和索引／预建搜索数据，并区分“没有结果”和“查询失败”。

### P2：后台配置校验不足（代码审查）

admin/sources 的 PUT 在检查缺失 ID 之前已经生成随机 ID，因此缺 ID 更新可能表现为 404 而非 400。provider、URL、数值范围、静态 ID 冲突缺少统一验证。表迁移 catch 也可能隐藏实际 D1 错误。

建议 Zod 校验固定字段与长度、HTTP(S) URL、interval 数值、来源 ID 不与静态源冲突；对管理员发现 URL 限制内网目标。迁移仅忽略“列已存在”，其他失败应显式记录并允许重试。

### P2：限流和运维可观测性

游客限流与源租约采用原子 SQL，现有并发／过期测试通过。管理员强制刷新配额采用读取后写入，仍有竞争窗口；status 接口显示 limit=3 而管理员刷新允许 50，表达不一致。

自动刷新每分钟每打开页面约 60 次请求／小时，多个标签页未共享轮询领导者；同公网 IP 共享 3 次／分钟刷新额度。搜索／状态／分类读取没有统一预算。

Cloudflare 独立调度器已具备可部署代码，但本次没有验证已上线、成功执行和告警投递。共享数据库不可用时接口会返回 503，并不具备数据库故障下的独立边缘降级。建议部署后持续观察错误率、源内容年龄、deferred、CPU、D1 行读写，并维护回滚与备份恢复流程。

## 建议处理顺序

1. 存储异常白屏和公开接口白名单。
2. 直接运行路径的安全依赖升级；恢复默认 lint/typecheck 与固定运行环境。
3. OAuth state 与 JWT 交付。
4. 抓取取消／体积限制、源站适配器健康、后台配置校验。
5. 搜索与匿名请求预算、跨标签页轮询、生产监控与回滚验证。

目前没有生产并发负载测试、长时间 soak test、所有来源逐个验收或真实账号 OAuth 回归。报告的“通过”仅限上述验证范围。

## 2026-10-03 優化進度

上述問題是修正前的審查記錄。已落實：

- 全站直接存儲讀寫改用可降級的 safeStorage，禁止存儲或配額滿時保持記憶體狀態；主題 atom 使用同一封裝。
- 公開接口白名單使用完整路徑；無 OAuth 時 custom-sources 正常可讀，enable-login 返回 enable=false。
- 修正預設 TypeScript 項目邊界及 Vitest globals，ESLint 排除建置產物、移除已不存在的插件規則。lint 保留正確性檢查，純格式檢查不作發布門禁；保留管理員刪除前的原生確認。
- 升級直接及傳遞依賴；pnpm 移到開發依賴，指定 pnpm 10.34.6；.nvmrc 與 CI 指定 Node 22。此次本機驗證使用既有 Node 25.2.1，未安裝全域 Node 或改系統預設。
- OAuth 登入生成並校驗 state、PKCE，登入會話改用 HttpOnly/SameSite Cookie，Cloudflare 部署使用 Secure。保留舊 Bearer token 相容；不再把新 JWT 放入 URL，登出清除 Cookie。已用本地測試會話驗證 Cookie 鑑權及錯誤 state 拒絕，沒有使用真實 GitHub 帳號完成端到端授權。
- RSS 串流下載限制 512 KiB、10 秒超時、最多四次重導向；每跳驗證公開 HTTP(S) URL，拒絕私網字面地址。拒絕 DTD/ENTITY 宣告，解析最多 100 條。DNS 重綁定尚非完整防護；沒有宣稱能安全抓取所有任意網域。
- 取消訊號接入 RSS、金十、華爾街見聞、財聯社。其他舊適配器仍依靠每請求超時；重試減為一次，不自動重試 429/403/404。
- 搜尋輸入長度與每 IP 30 次／分鐘限頻，空庫初始化，缺發布時間不以抓取時間冒充。搜尋仍是快照全表查找，尚未建立全文索引。
- 管理員配額改成原子 SQL；後台來源增加 ID、URL、provider、間隔及字串長度校驗。遷移只忽略重複欄位錯誤。
- 前端自動檢查先讀共享快照，只對到期／缺失來源發起更新；讀取其他訪客結果不消耗刷新配額。多標籤頁尚未選出單一輪詢者。
- favicon 建置請求加入超時並移除重複下載。加入 CI：完整建置、typecheck、lint、測試及高危依賴審計。

驗證：87 項測試通過；預設 typecheck 通過；lint 零錯誤、10 項警告；完整 Cloudflare build 通過。2026-10-03 此次 pnpm audit --prod 結果為零告警，不能等同於整站不存在安全問題。桌面、手機、存儲禁止及存儲已滿四種場景無白屏。

尚未部署或查詢線上 D1／CPU 監控；財聯社舊接口健康、GitHub 真實授權、實際並發壓力與 CI 雲端執行仍需上線驗證。原有十項 lint 警告包含 Hook 依賴、列表 key 和靜態 JSON-LD 等，尚未全部消除。
