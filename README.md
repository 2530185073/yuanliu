# 源流 · AI 中转货源比价与验货

收录各渠道的 AI 中转「货」（某个中转站的某个分组），统一折算成**刀价**（每消耗 1 美元官方额度要付的人民币），并用持续探测和多项验真告诉你哪家真实、便宜、稳定。上游货源（云厂商渠道、企业账户、号池、批发分组）也在同一套体系里挂牌和验货。

> 当前是第 1 期**可点击原型**：没有后端，所有数据在构建时生成。渠道名与域名均为虚构，探测指标的分布参考了公开的中转监控数据。

## 页面

| 路由 | 内容 |
| --- | --- |
| `/` | 下游货：搜索、按模型族筛选、排序，一行一份货 |
| `/models`、`/models/[id]` | 按模型比价：价格 × 可用率散点图、真实单价排行 |
| `/channels/[slug]` | 渠道详情：在售 / 稳定性 / 验真 / 评价 四个标签页 |
| `/compare?ids=` | 最多 4 份货并排对比，每行高亮最优值 |
| `/check` | 一键验货：贴入 Base Url 与 Key，模拟逐项检测并出报告 |
| `/supply`、`/supply/offers/[id]`、`/supply/wanted/[id]` | 货源广场：上游供应、求购帖与报价 |

## 本地运行

```bash
pnpm install
pnpm dev        # http://localhost:3000，首次启动自动建表并导入演示数据
pnpm test       # 单元测试 + 基于本地模拟中转站的探测、验真、适配器测试
pnpm typecheck && pnpm lint
```

需要 Node.js 20.9+。技术栈：Next.js 16、React 19、Tailwind CSS 4、Drizzle ORM；数据库默认为内置 PGlite，设置 `DATABASE_URL` 即切换到 Postgres。

开发环境未配置邮件时，登录页会直接显示验证码；第一个登录的用户自动成为管理员。

## 部署

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start      # 监听 PORT，默认 3000；健康检查 GET /api/health
```

环境变量见 `.env.example`，生产环境至少需要：

- `APP_SECRET`：加密探测 Key、签名会话
- `DATABASE_URL`：Postgres。不设则数据写在 `.data/`，重新部署会丢失
- `ADMIN_EMAILS`：管理员邮箱
- `SMTP_URL`：登录验证码邮件。仅演示时可改设 `LOGIN_DEV_CODES=1`

探测调度默认随 Web 进程启动。多实例部署时，Web 进程设 `SCHEDULER=off`，另起一个 `pnpm worker`。

## 目录

```
data/relay-snapshot.json   匿名化的探测快照（81 份货的 24h 曲线与最近一次结果）
public/demo-iq/            可视化智商检测样例（模型生成的 SVG 动画，沙盒渲染）
src/lib/data.ts            把快照构建成 渠道 → 货 → 模型报价，并计算刀价、验真与综合分
src/lib/supply.ts          上游供应商、货源与求购帖
src/lib/verify.ts          9 项验真检查的生成规则
src/components/            卡片、图表、对比栏等组件
src/app/                   各页面
```

## 核心口径

- **刀价** = 生效倍率 × 充值比例（元 / 每 1 美元额度）。生效倍率优先使用平台自购账号的实测值。
- **真实单价** = 官方单价（美元 / 百万 token）× 刀价。
- **可用率** 只统计站点自身故障；探测密钥失效、额度用完、配置不匹配单独标注，不计入。
- **综合分** = 可用率 30% + 验真 25% + 真实单价 15% + 延迟与速度 15% + 口碑 10% + 站龄 5%。赞助位不影响自然排序。
