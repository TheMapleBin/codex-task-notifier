# Codex 通知现场验收记录

每项必须分别证明：事件捕获、持久 outbox、发送成功、客户端实际收到。测试绿灯、进程运行或 `delivered` 不能单独替代收件确认。

## 已通过

| 用例 | 捕获 | outbox | 发送 | 客户端确认 | 说明 |
| --- | --- | --- | --- | --- | --- |
| Codex Desktop 正常完成（直接 iLink） | 通过 | 通过 | 通过 | 通过 | 两条 pending 转 delivered，用户确认收到；其中一条包含最终输出 |
| Codex 正常完成（微信公众号测试号生产路径） | 通过 | 通过 | 通过 | 通过 | 用户确认连续收到两条“Codex 通知”；现场计数 Pending 0 / Delivered 40 / Failed 2 |
| 测试号模板正文渲染 | 通过 | 不适用 | 通过 | 通过 | 固定标签模板显示变量；单行分隔可显示多字段，但长变量会被卡片截断且不能展开 |
| ClawBot 单次保活协议 | 不适用 | 不适用 | 通过 | 不适用 | 最新 DPAPI context 下 getconfig、typing、cancel 均 ret=0；不产生聊天消息 |
| ClawBot 保活跨短期失效窗口 | 不适用 | 不适用 | 通过 | 通过 | 未重新绑定，约 4 分钟内每 30 秒保活；随后发送返回 message ID，用户确认收到 |
| QQ Bot 原生 Gateway 独立实发 | 不适用 | 不适用 | 通过 | 通过 | Gateway online、API 返回 message ID，用户确认 QQ 客户端收到 |
| QQ Bot watcher 同进程 adapter 实发 | 不适用 | 不适用 | 通过 | 通过 | adapter 等待 Gateway READY 后发送并关闭，用户第二次确认 QQ 客户端收到 |
| Codex 根任务正常完成（QQ Bot 生产路径） | 通过 | 通过 | 通过 | 通过 | 唯一 watcher 捕获本任务终态并通过同进程 Gateway 主动发送；用户确认 QQ 客户端实际收到 |

直接 iLink 验收期间未修改 `C:\Users\TheMapleBin\.codex\config.toml`、`base_url` 或 `15722`。

用户报告真实消息尾部包含 `<oai-mem-citation>` 内部元数据且部分输出过早截断。统一净化层会在 2400 字符截断前清除完整、残缺和转义的内部元数据，并保留安全任务名称与真实 `session_meta` 子代理过滤。citation/rollout 清理曾通过现场复验，但随后真实通知又暴露了末尾独立行 `::git-commit{...}`。现已增加仅针对末尾 `::git-commit`、`::created-thread`、`::code-comment` 的白名单清理，47/47 自动化测试通过（该数字是 2026-07-28 当时的套件规模；当前套件为 82 项，以 `npm test` 实时结果为准）；该新增规则仍需下一条真实根任务通知确认。

## 尚未通过

| 用例 | 状态 |
| --- | --- |
| Desktop API 错误 | 未验收；不得通过修改全局配置或认证制造 |
| CLI 非零或 API 错误 | 未验收 |
| 用户中断 | 未验收 |
| QQ Gateway/API 暂时离线后恢复 | 未验收；自动化已证明 watcher 继续入队、发送等待 READY |
| ClawBot 长周期与整机冷启动后投递 | 未验收；短窗口约 4 分钟已通过，不外推为无限期有效 |

2026-07-29 生产 selector 已切换为 QQ Bot：唯一 watcher 内嵌原生 QQ Gateway，唯一 `CodexWeChatNotifierLifecycle` supervisor 正常运行，iLink keepalive 为 `not used`。不得启用代理、hook、wrapper、第二个 watcher、OpenClaw Gateway、服务或其他计划任务。微信 iLink 与微信公众号测试号配置保留为回滚。

切换现场旧 outbox 为 `legacy=79`、`ilink=5`、`qqbot=0`；transport pinning 保证这 84 条历史 pending 原地保留且不会通过 QQ 重放。根任务验收时仍为 `Pending=84`、`Failed=2`，其中 `Delivered=70`（`legacy=68`、`qqbot=2`），没有历史通知洪发。QQ Gateway 状态为 `online`、`active messages: allowed`；用户已确认真实 Codex 根任务结束通知在 QQ 客户端收到，因此 watcher 生产端到端正常完成用例通过。

两条 failed 是切换前已经耗尽最大尝试次数的旧 iLink 记录，outbox 在调用测试号 adapter 前即将其移入 failed。它们不构成测试号发送失败证据；未经用户明确授权，不读取正文、不重放、不删除。

稳定 UIN、更新游标和最新 context 已使用 DPAPI 整体加密持久化。完整停止 PID `23684`、启动 PID `25248` 后，未重新绑定即成功发送“重启免绑定复测”，用户确认微信实际收到。基于该证据，生命周期恢复为轻量 supervisor 跟随 `codex.exe`：任一 Desktop/CLI 运行时启动 watcher，全部退出 30 秒后停止。

2026-07-28 实测省略 context 的主动消息虽然 HTTP 200，但用户确认微信未收到；随后发送“绑定”后，两条 pending 自动补发。最新会话状态下 `getconfig`、`typing`、`cancel` 均返回成功，现已将 30 秒保活加入唯一 supervisor。未再次绑定并连续保活约 4 分钟后，测试消息返回 message ID，用户确认微信实际收到。整机冷启动和更长周期仍未验收。

## 从根 README 归档的历史事实（2026-07-29 迁移）

根 README 于 2026-07-29 改写为英文开源首页，以下原本记录在首页的、易过期或属于验收范畴的事实迁移至此，仅作追加保留，不作新的完成声明。

### 从未启用的路径

从未启用：OpenClaw（及其 Gateway）、端口 `15722`、`base_url` 切换、Stop hook、生产 CLI wrapper，以及任何新服务。唯一计划任务 `CodexWeChatNotifierLifecycle` 在当前用户登录时启动轻量 supervisor；watcher 只在 Codex Desktop/CLI 运行时存在。QQ Bot 生产路径同样不需要 OpenClaw 或 `account/target`。

### ClawBot 保活适用范围

ClawBot 保活仅在回滚到 iLink transport 时启用；QQ 生产路径下 iLink/ClawBot keepalive 状态为 `not used`，不会发起微信保活请求。ClawBot 保活已通过短窗口真实验收：未重新发送“绑定”，连续保活约 4 分钟后主动发送成功，用户确认微信实际收到。整机冷启动和更长周期仍需后续观察，不得外推为长期有效。

### 自动化验证覆盖范围

自动化测试覆盖：直接 iLink、微信公众号测试号备用 adapter、DPAPI 配置、加密会话恢复、ClawBot 心跳相关控制脚本路径、outbox 重试、终态识别、子代理过滤、跟随 Codex 的生命周期、待发终态合并、敏感信息净化、残缺/转义内部元数据、尾部 Codex UI 指令清理和安全任务名称。注意：ClawBot 本身没有独立的 `src/` 模块或专用测试文件，相关覆盖来自 `scripts/*-control.ps1` 的 keepalive 路径测试，不能等同于端到端保活验收。

### 历史 pending 记录与 transport pinning

outbox 记录固定到入队时的 transport。2026-07-29 切换现场为 `legacy=79`、`ilink=5`、`qqbot=0`，共 84 条历史 pending；它们保留原地，不会通过 QQ 重放，新 QQ 记录只由 QQ adapter 处理。未标记 transport 的旧记录仅在 `ilink` 下才会继续出队。微信 iLink 与微信公众号测试号 DPAPI 配置保留为回滚，不删除、不自动重放。

### 2026-07-28 输出净化复验

2026-07-28 已完成 2400 字符输出与 citation/rollout 尾部净化复验，并增加末尾 Codex UI 指令（`::git-commit`、`::created-thread`、`::code-comment`）的受限白名单清理。该限额与净化规则通过了真实微信显示验收，不得在缺少新回归用例的情况下降低限额或移除过滤。

### QQ 生产路径运行语义

QQ Bot adapter 与最小原生 Gateway 接入同一个 watcher 生命周期：Codex 启动时跟随 watcher 启动，Codex 全部退出 30 秒后一起停止；DPAPI 绑定跨重启保留。Gateway 离线时任务仍进入 outbox，恢复 `READY` 后重试。状态判定以 `notifier-status.cmd` 实时结果为准：QQ transport 下 `QQ Gateway: online` 仅表示发送门禁就绪，客户端是否收件仍以用户确认为准。
