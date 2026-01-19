# Ritmex DEX Funding Monitor

一个基于 React 构建的强大的加密货币资金费率监控工具，提供 **CLI（命令行）** 和 **Web（网页）** 两种界面。实时监控多个衍生品交易所的资金费率，自动计算 8 小时标准化费率，并分析最佳的跨交易所套利机会。

---

## 🔗 交易所注册链接

通过以下推荐链接注册可享受交易手续费折扣：

- **Aster** - [30% 手续费折扣](https://www.asterdex.com/zh-CN/referral/4665f3)
- **Binance** - [手续费折扣](https://www.binance.com/join?ref=KNKCA9XC)
- **GRVT** - [手续费折扣](https://grvt.io/exchange/sign-up?ref=sea)
- **Backpack** - [手续费折扣](https://backpack.exchange/join/41d60948-2a75-4d16-b7e9-523df74f2904)
- **EdgeX** - [手续费折扣](https://pro.edgex.exchange/referral/BULL)

---

## 🚀 核心功能

### 多交易所支持
- **EdgeX**: WebSocket 实时推送
- **Lighter**: HTTP API
- **Binance**: HTTP API (动态 8 小时标准化)
- **GRVT**: HTTP API
- **Aster**: HTTP API
- **Backpack**: HTTP API
- **Hyperliquid**: 预测资金费率
- **Variational**: HTTP API
- **Paradex**: HTTP API (8 小时基准费率)
- **Ethereal**: HTTP API (1 小时标准化为 8 小时)
- **dYdX**: HTTP API (1 小时标准化为 8 小时)

### 高级特性
- **实时监控**: 聚合 WebSocket 和 HTTP 轮询数据，确保数据时效性。
- **标准化数据**: 所有费率统一转换为 **8 小时等效利率**，便于直接比较。
- **套利分析**:
    - 自动计算所有（或选中）交易所之间的**最大费率差 (Max Arb Spread)**。
    - 提供明确的 **多/空 (Long/Short)** 策略建议。
    - 支持按费率差排序，快速发现机会。
- **双端界面**:
    - **CLI**: 极客风格的终端表格，支持键盘交互。
    - **Web**: 现代化网页界面，支持交易所过滤、排序和可视化图表（红跌绿涨）。

## 📦 安装与设置

本项目使用 [Bun](https://bun.sh/) 作为运行时和包管理器。

### 1. 安装 Bun
```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. 克隆与安装
```bash
git clone <repository-url>
cd ritmex-dex-cli
bun install
```

## 🎯 使用方法

### 方式一：Web 监控界面 (推荐)

启动 Web 界面需要同时运行后端 API 服务和前端页面。建议打开两个终端窗口。

**窗口 1: 启动后端 API**
```bash
bun run server
```
*服务将在 http://localhost:3001 启动，负责数据采集和处理。*

**窗口 2: 启动前端页面**
```bash
bun run web
```
*服务将在 http://localhost:5173 启动，请在浏览器中访问此地址。*

**Web 功能:**
- 勾选/取消勾选顶部的交易所，仅计算选定交易所之间的套利差。
- 点击表头可对任意列进行排序。
- 策略列显示 `↓ 交易所A | ↑ 交易所B`，直观指示开仓方向。

---

### 方式二：CLI 命令行界面

直接在终端查看实时数据。

```bash
# 启动主监控
bun start

# 指定本金进行利润估算 (例如 $5000)
bun start -- --capital 5000
```

**CLI 操作:**
- **← →**: 切换排序列
- **数字键**: 快速跳转到特定列
- **Enter**: 切换升序/降序

---

### 历史数据分析 (Lighter 交易所)

```bash
bun run lighter-history
```

## ⚙️ 配置

编辑根目录下的 `config.json` 文件以启用或禁用特定交易所：

```json
{
  "enabledExchanges": [
    "variational",
    "lighter",
    "binance",
    "grvt",
    "aster",
    "backpack",
    "hyperliquid",
    "paradex"
  ]
}
```

## 🏗️ 技术栈

- **Runtime**: Bun
- **CLI Framework**: React + Ink
- **Web Framework**: React + Vite
- **Language**: TypeScript

## ⚠️ 免责声明

本工具仅供数据监控和研究使用，不构成任何投资建议。加密货币衍生品交易具有高风险，请确保您完全理解其中的风险并遵守相关法律法规。
