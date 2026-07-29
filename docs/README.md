# 文档导航

本目录记录当前架构、现场验收证据和历史回滚路径，均为中文。项目总览见根目录的
[README.md](../README.md)（英文，主文档）与 [README.zh-CN.md](../README.zh-CN.md)（中文翻译）。

## 使用与架构

- [Codex 受控接入](codex-setup.md)：watcher 与 supervisor 的启停方式、QQ 一次性绑定，以及不得触碰的生产边界。
- [QQ Bot 原生 Gateway](qqbot-native-gateway.md)：当前生产发送路径、内嵌 WebSocket 在线守护的安全契约与故障信号。
- [实施计划](implementation-plan.md)：目标管线（rollout JSONL → watcher → outbox → QQ）与各阶段门禁。
- [Windows 命令入口](../commands/README.md)：一键命令与诊断脚本分类。

## 验收与维护

- [现场验收记录](live-acceptance.md)：每个用例的捕获 / outbox / 发送 / 客户端确认四项证据，以及尚未验收的用例清单。
- [Codex / Claude 交接](claude-handoff.md)：接手代理必须先确认的当前事实与操作约束。

## 历史与回滚

- [QQ Bot 直连迁移计划](qqbot-migration-plan.md)：从微信路径迁移到 QQ Bot 的决策、实施顺序与证据要求。
- [微信 iLink 直连契约](verified-ilink-contract.md)：回滚 adapter 已验证的接口序列与保活方式。
- [微信公众号测试号契约](verified-wechat-test-account-contract.md)：备用 transport 已验证的发送路径、模板限制与安全边界。
- [微信公众号测试号接入](wechat-test-account-trial.md)：测试号平台配置步骤，以及长变量被卡片截断导致切换 transport 的经过。

根 README 描述当前稳定架构；现场数字、验收状态和历史过程以本目录的验收与迁移文档为准。
