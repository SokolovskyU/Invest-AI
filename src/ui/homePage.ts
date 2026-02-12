export function renderHomePage(): string {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>T-Invest Pet</title>
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap");
      :root {
        --bg: #202433;
        --bg-2: #1a1f2d;
        --panel: #2b3040;
        --panel-2: #2f3547;
        --line: #48506a;
        --line-soft: #3a4258;
        --text: #f4f6fd;
        --muted: #9ca4bd;
        --cyan: #58d7ea;
        --blue: #6ea2ff;
        --violet: #7f59ff;
        --green: #53dc8f;
        --red: #ff7f73;
        --topbar: #24293a;
        font-family: "Manrope", "Segoe UI", sans-serif;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        color: var(--text);
        background:
          radial-gradient(1000px 520px at 100% -30%, #2a3048 0%, transparent 65%),
          radial-gradient(900px 460px at -10% -35%, #25304a 0%, transparent 63%),
          linear-gradient(180deg, var(--bg-2) 0%, var(--bg) 100%);
        min-height: 100vh;
      }
      .topbar {
        background: var(--topbar);
        border-bottom: 1px solid #31374d;
      }
      .topbar-inner {
        max-width: 1360px;
        margin: 0 auto;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        gap: 22px;
      }
      .nav {
        display: flex;
        gap: 8px;
      }
      .nav a {
        color: var(--muted);
        text-decoration: none;
        padding: 10px 15px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 15px;
      }
      .nav a.is-active {
        color: #fff;
        background: #3e455d;
      }
      .nav a:hover {
        color: #fff;
        background: #383f57;
      }
      .grow {
        flex: 1;
      }
      .ghost-btn {
        border: 2px solid #16afff;
        color: #eef6ff;
        background: transparent;
        border-radius: 8px;
        padding: 8px 14px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
      }
      .ghost-btn:hover {
        background: #1b2e4f;
      }
      .controls {
        display: none;
        max-width: 1360px;
        margin: 0 auto;
        padding: 10px 18px 16px;
        gap: 8px;
        grid-template-columns: 1fr 1fr 1fr auto auto;
      }
      .controls.is-open {
        display: grid;
      }
      .controls input,
      .controls button {
        border-radius: 8px;
        border: 1px solid var(--line);
        background: #262d3f;
        color: var(--text);
        padding: 10px 12px;
      }
      .controls button {
        cursor: pointer;
        font-weight: 700;
      }
      .page {
        max-width: 1360px;
        margin: 0 auto;
        padding: 28px 18px 24px;
      }
      h1 {
        margin: 0 0 18px;
        font-size: clamp(34px, 5.4vw, 48px);
        letter-spacing: -0.8px;
      }
      .kpis {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 20px;
      }
      .kpi {
        background: var(--panel-2);
        border: 1px solid #353d55;
        border-radius: 10px;
        padding: 22px 24px;
        min-height: 162px;
        position: relative;
      }
      .kpi-label {
        display: flex;
        gap: 9px;
        align-items: center;
        color: #c5cae0;
        font-size: 18px;
        font-weight: 700;
      }
      .dot {
        width: 11px;
        height: 11px;
        border-radius: 3px;
        display: inline-block;
      }
      .dot.cost { background: #2ea8ff; }
      .dot.profit { background: #4fd88d; }
      .dot.yield { background: #7f59ff; }
      .dot.passive { background: #3ed5ac; }
      .kpi-value {
        margin-top: 20px;
        font-size: clamp(26px, 3.3vw, 40px);
        font-weight: 800;
        letter-spacing: -1.3px;
        line-height: 0.98;
      }
      .kpi-sub {
        margin-top: 14px;
        font-size: 16px;
        color: #9fa7c1;
        font-weight: 700;
        display: none;
      }
      .kpi-change {
        color: var(--green);
        font-size: 22px;
        font-weight: 800;
        margin-left: 14px;
      }
      .board {
        margin-top: 22px;
        display: grid;
        grid-template-columns: 1fr 1.95fr;
        gap: 20px;
      }
      .panel {
        background: var(--panel);
        border: 1px solid #343c54;
        border-radius: 10px;
        min-height: 520px;
        padding: 22px 24px;
      }
      .panel-title {
        margin: 0 0 18px;
        font-size: 28px;
        font-weight: 700;
      }
      .donut-wrap {
        position: relative;
        display: grid;
        place-items: center;
        height: calc(100% - 52px);
      }
      .donut {
        width: min(460px, 92%);
        aspect-ratio: 1;
        border-radius: 50%;
        position: relative;
        border: 1px solid #4a5574;
        box-shadow:
          0 18px 38px rgba(0, 0, 0, 0.34),
          inset 0 0 0 1px rgba(129, 147, 191, 0.2);
        transform: translateZ(0);
        image-rendering: auto;
      }
      .donut::before {
        content: "";
        position: absolute;
        inset: 18%;
        border-radius: 50%;
        background: var(--panel);
        border: 1px solid #5a6688;
        box-shadow: inset 0 0 24px rgba(7, 11, 20, 0.45);
      }
      .donut::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 50%;
        pointer-events: none;
        background: radial-gradient(circle at 30% 22%, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 48%);
        opacity: 0.45;
      }
      .donut-tooltip {
        position: fixed;
        z-index: 30;
        pointer-events: none;
        min-width: 210px;
        max-width: 260px;
        border-radius: 10px;
        border: 1px solid #4c5777;
        background: rgba(28, 34, 50, 0.96);
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
        padding: 10px 12px;
      }
      .donut-tooltip[hidden] {
        display: none;
      }
      .donut-tooltip-name {
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 4px;
      }
      .donut-tooltip-amount {
        font-size: 13px;
        color: #dbe4fa;
      }
      .donut-tooltip-share {
        margin-top: 2px;
        font-size: 12px;
        color: #9eb0d6;
      }
      .table-wrap {
        overflow: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        text-align: left;
        border-bottom: 1px solid #414962;
        padding: 14px 10px;
        font-size: 24px;
      }
      th {
        color: #c7cee2;
        font-size: 26px;
      }
      td:first-child {
        width: 38%;
      }
      .asset-name {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        font-weight: 700;
      }
      .asset-row.is-active {
        background: #353e58;
      }
      .asset-note {
        display: block;
        margin-top: 4px;
        color: var(--muted);
        font-size: 21px;
      }
      .asset-color {
        width: 7px;
        height: 46px;
        border-radius: 4px;
        margin-top: 2px;
      }
      .value {
        font-weight: 800;
      }
      .sub {
        display: block;
        color: #aeb6cc;
        margin-top: 4px;
      }
      .up {
        color: var(--green);
        font-weight: 800;
      }
      .down {
        color: var(--red);
        font-weight: 800;
      }
      .footer-actions {
        margin-top: 16px;
        display: flex;
        justify-content: flex-end;
      }
      .load-btn {
        background: linear-gradient(140deg, #2480ff 0%, #2bb7ff 100%);
        border: none;
        color: white;
        border-radius: 8px;
        padding: 10px 16px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
      }
      .secondary-btn {
        border: 1px solid #4d5673;
        background: #2a3043;
        color: #dbe3fa;
        border-radius: 8px;
        padding: 10px 16px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
      }
      .load-btn:disabled {
        opacity: 0.65;
        cursor: default;
      }
      .secondary-btn:disabled {
        opacity: 0.65;
        cursor: default;
      }
      .status {
        margin-top: 10px;
        color: #a7b0cb;
        font-size: 14px;
      }
      .payout-grid {
        margin-top: 20px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 20px;
      }
      .payout-card {
        background: var(--panel);
        border: 1px solid #343c54;
        border-radius: 10px;
        padding: 18px 18px 16px;
      }
      .payout-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }
      .payout-title {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
      }
      .payout-meta {
        color: #a8b1cc;
        font-size: 13px;
      }
      .payout-metrics {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 12px;
      }
      .payout-metric {
        border-left: 3px solid #5aa7ff;
        padding-left: 8px;
      }
      .payout-metric.purple {
        border-left-color: #8f67ff;
      }
      .payout-caption {
        display: block;
        color: #a8b1cc;
        font-size: 12px;
      }
      .payout-value {
        display: block;
        margin-top: 3px;
        font-weight: 800;
      }
      .bar-chart {
        display: grid;
        grid-template-columns: repeat(8, minmax(0, 1fr));
        gap: 8px;
        align-items: end;
        min-height: 120px;
        border-top: 1px dashed #46506b;
        padding-top: 12px;
      }
      .bar-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }
      .bar-col {
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: flex-end;
        height: 82px;
      }
      .bar {
        width: 16px;
        border-radius: 8px 8px 0 0;
        min-height: 2px;
      }
      .bar.blue {
        background: #2f9cf2;
      }
      .bar.purple {
        background: #9367f5;
      }
      .bar-label {
        color: #a8b1cc;
        font-size: 11px;
      }
      .bar-value {
        color: #d7e0f7;
        font-size: 11px;
      }
      .events-card {
        margin-top: 20px;
        background: var(--panel);
        border: 1px solid #343c54;
        border-radius: 10px;
        padding: 18px;
      }
      .events-title {
        margin: 0 0 10px;
        font-size: 22px;
        font-weight: 700;
      }
      .events-list {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      .event-item {
        border: 1px solid #404a67;
        background: linear-gradient(145deg, #30374c 0%, #2a3042 100%);
        border-radius: 10px;
        padding: 12px 12px 10px;
        display: grid;
        gap: 10px;
      }
      .event-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }
      .event-name {
        font-size: 15px;
        font-weight: 700;
        line-height: 1.25;
      }
      .event-date {
        color: #9ea9c5;
        font-size: 12px;
        font-weight: 700;
      }
      .event-meta {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .event-type {
        border-radius: 999px;
        padding: 4px 8px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.02em;
        border: 1px solid transparent;
      }
      .event-type.dividend {
        color: #cde1ff;
        background: #304d79;
        border-color: #45689d;
      }
      .event-type.coupon {
        color: #d8fff1;
        background: #2d6457;
        border-color: #3e8272;
      }
      .event-type.redemption {
        color: #f3dcff;
        background: #5a3f79;
        border-color: #7a58a2;
      }
      .event-type.default {
        color: #d6deef;
        background: #3a435d;
        border-color: #526084;
      }
      .event-amount {
        font-size: 15px;
        font-weight: 800;
        color: #f3f7ff;
      }
      .events-empty {
        color: #9fa8c5;
        font-size: 14px;
        border: 1px dashed #47506b;
        border-radius: 10px;
        padding: 14px 12px;
      }
      .movers {
        margin-top: 20px;
        min-height: auto;
      }
      .movers-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .movers-col {
        border: 1px solid #3f4762;
        border-radius: 10px;
        background: #2b3144;
        padding: 10px;
      }
      .movers-col-title {
        margin: 0 0 8px;
        font-size: 14px;
        font-weight: 800;
        color: #d6def3;
      }
      .movers-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 8px;
      }
      .movers-item {
        display: grid;
        grid-template-columns: 1fr auto auto auto;
        gap: 14px;
        align-items: center;
        padding: 10px 12px;
        border: 1px solid #3f4762;
        border-radius: 8px;
        background: #2d3346;
      }
      .movers-name {
        font-weight: 700;
      }
      .movers-profit {
        color: #b6bfd8;
        font-size: 13px;
      }
      .profit-tooltip {
        position: absolute;
        right: 12px;
        top: 12px;
        width: 250px;
        border-radius: 10px;
        border: 1px solid #485270;
        background: rgba(26, 31, 45, 0.97);
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
        padding: 10px 12px;
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 0.16s ease, transform 0.16s ease;
        pointer-events: none;
        z-index: 15;
      }
      .kpi-profit-card:hover .profit-tooltip {
        opacity: 1;
        transform: translateY(0);
      }
      .profit-tooltip-title {
        font-size: 12px;
        color: #c9d4f0;
        font-weight: 800;
        margin-bottom: 6px;
      }
      .profit-tooltip-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-size: 12px;
        color: #c6d0ea;
        margin-top: 2px;
      }
      .profit-tooltip-row span:last-child {
        font-weight: 700;
        color: #f2f6ff;
      }
      .movers-prices {
        color: #9fa8c5;
        font-size: 12px;
      }
      .movers-empty {
        color: #9fa8c5;
        font-size: 14px;
      }
      @media (max-width: 1280px) {
        .kpis {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .board {
          grid-template-columns: 1fr;
        }
        .panel {
          min-height: 420px;
        }
        .payout-grid {
          grid-template-columns: 1fr;
        }
        .movers-grid {
          grid-template-columns: 1fr;
        }
        .events-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 840px) {
        .topbar-inner {
          flex-wrap: wrap;
          gap: 12px;
        }
        .nav {
          width: 100%;
          overflow: auto;
        }
        .controls {
          grid-template-columns: 1fr;
        }
        .events-list {
          grid-template-columns: 1fr;
        }
        .kpi {
          min-height: auto;
        }
        .kpi-label {
          font-size: 17px;
        }
        .kpi-value {
          font-size: 36px;
        }
        .kpi-sub {
          font-size: 18px;
        }
        th, td {
          font-size: 15px;
        }
        th {
          font-size: 16px;
        }
        .asset-note {
          font-size: 12px;
        }
      }
    </style>
  </head>
  <body>
    <header class="topbar">
      <div class="topbar-inner">
        <nav class="nav">
          <a class="is-active" href="/">Главная</a>
          <a href="/analytics">Аналитика</a>
          <a href="#">Портфель</a>
          <a href="#">Инструменты</a>
        </nav>
        <div class="grow"></div>
        <button id="tokenToggle" class="ghost-btn" type="button" aria-expanded="false">
          token
        </button>
      </div>
      <div id="controls" class="controls">
        <input id="token" type="password" placeholder="API \u0442\u043e\u043a\u0435\u043d (t.****)" />
        <input id="account" list="accounts" placeholder="account_id" />
        <datalist id="accounts"></datalist>
        <button id="load">Счета</button>
        <button id="rememberBtn">Запомнить токен</button>
      </div>
    </header>

    <main class="page">
      <h1>Портфель</h1>
      <section class="kpis">
        <article class="kpi">
          <div class="kpi-label"><span class="dot cost"></span>Стоимость</div>
          <div class="kpi-value" id="kpiTotal">-</div>
          <div class="kpi-sub" id="kpiInvested">Загрузите портфель</div>
        </article>
        <article class="kpi kpi-profit-card">
          <div class="kpi-label"><span class="dot profit"></span>\u041f\u0440\u0438\u0431\u044b\u043b\u044c</div>
          <div class="kpi-value"><span id="kpiProfit">-</span><span class="kpi-change" id="kpiProfitPct">-</span></div>
          <div class="kpi-sub" id="kpiDaily">\u0414\u0430\u043d\u043d\u044b\u0435 \u043f\u043e\u044f\u0432\u044f\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438</div>
          <div class="profit-tooltip">
            <div class="profit-tooltip-title">\u0424\u043e\u0440\u043c\u0443\u043b\u0430: \u0442\u0435\u043a\u0443\u0449\u0430\u044f + \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0441\u0434\u0435\u043b\u043e\u043a + \u043d\u0430\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u044f - \u043a\u043e\u043c\u0438\u0441\u0441\u0438\u0438 - \u043d\u0430\u043b\u043e\u0433\u0438</div>
            <div class="profit-tooltip-row"><span>\u0422\u0435\u043a\u0443\u0449\u0430\u044f \u0441\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u044c</span><span id="tipCurrentValue">-</span></div>
            <div class="profit-tooltip-row"><span>\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0441\u0434\u0435\u043b\u043e\u043a</span><span id="tipTradesNet">-</span></div>
            <div class="profit-tooltip-row"><span>\u041a\u0443\u043f\u043e\u043d\u044b</span><span id="tipCoupons">-</span></div>
            <div class="profit-tooltip-row"><span>\u0414\u0438\u0432\u0438\u0434\u0435\u043d\u0434\u044b</span><span id="tipDividends">-</span></div>
            <div class="profit-tooltip-row"><span>\u041a\u043e\u043c\u0438\u0441\u0441\u0438\u0438</span><span id="tipCommissions">-</span></div>
            <div class="profit-tooltip-row"><span>\u041d\u0430\u043b\u043e\u0433\u0438 (\u0434\u0438\u0432/\u043a\u0443\u043f)</span><span id="tipTaxes">-</span></div>
          </div>
        </article>
        <article class="kpi">
          <div class="kpi-label"><span class="dot yield"></span>Доходность</div>
          <div class="kpi-value" id="kpiYield">-</div>
          <div class="kpi-sub">Расчет по текущему портфелю</div>
        </article>
        <article class="kpi">
          <div class="kpi-label"><span class="dot passive"></span>Пассивный доход</div>
          <div class="kpi-value"><span id="kpiPassive">-</span><span class="kpi-change" id="kpiPassiveGrowth">-</span></div>
          <div class="kpi-sub" id="kpiPassiveYear">Ожидаю данные</div>
        </article>
      </section>

      <section class="board">
        <article class="panel">
          <h2 class="panel-title">Портфель</h2>
          <div id="donutWrap" class="donut-wrap">
            <div id="donut" class="donut"></div>
            <div id="donutTooltip" class="donut-tooltip" hidden>
              <div id="donutTooltipName" class="donut-tooltip-name"></div>
              <div id="donutTooltipAmount" class="donut-tooltip-amount"></div>
              <div id="donutTooltipShare" class="donut-tooltip-share"></div>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>\u0422\u0438\u043f \u0430\u043a\u0442\u0438\u0432\u0430</th>
                  <th>\u0421\u0443\u043c\u043c\u0430</th>
                  <th>\u0414\u043e\u043b\u044f</th>
                </tr>
              </thead>
              <tbody id="portfolioBody"></tbody>
            </table>
          </div>
          <div class="footer-actions">
            <button id="refreshCache" class="secondary-btn">Обновить кэш</button>
            <button id="portfolio" class="load-btn">Обновить портфель</button>
          </div>
          <div id="status" class="status">Ожидаю запрос...</div>
        </article>
      </section>

      <section class="panel movers">
        <div class="movers-grid">
          <div class="movers-col">
            <h3 class="movers-col-title">\u0422\u043e\u043f \u0440\u043e\u0441\u0442\u0430 \u0437\u0430 \u0434\u0435\u043d\u044c</h3>
            <ul id="moversListUp" class="movers-list"></ul>
          </div>
          <div class="movers-col">
            <h3 class="movers-col-title">\u0422\u043e\u043f \u043f\u0430\u0434\u0435\u043d\u0438\u0439 \u0437\u0430 \u0434\u0435\u043d\u044c</h3>
            <ul id="moversListDown" class="movers-list"></ul>
          </div>
        </div>
      </section>

      <section class="payout-grid">
        <article class="payout-card">
          <div class="payout-head">
            <h3 class="payout-title">\u0411\u0443\u0434\u0443\u0449\u0438\u0435 \u0432\u044b\u043f\u043b\u0430\u0442\u044b</h3>
            <span class="payout-meta">12 \u043c\u0435\u0441\u044f\u0446\u0435\u0432</span>
          </div>
          <div class="payout-metrics">
            <div class="payout-metric">
              <span class="payout-caption">\u0417\u0430 12 \u043c\u0435\u0441.</span>
              <span id="futureTotal" class="payout-value">-</span>
            </div>
            <div class="payout-metric">
              <span class="payout-caption">\u0412 \u0441\u0440\u0435\u0434\u043d\u0435\u043c \u0432 \u043c\u0435\u0441\u044f\u0446</span>
              <span id="futureAvg" class="payout-value">-</span>
            </div>
          </div>
          <div id="futureChart" class="bar-chart"></div>
        </article>

        <article class="payout-card">
          <div class="payout-head">
            <h3 class="payout-title">\u041f\u043e\u043b\u0443\u0447\u0435\u043d\u043d\u044b\u0435 \u0434\u0438\u0432\u0438\u0434\u0435\u043d\u0434\u044b</h3>
            <span class="payout-meta">12 \u043c\u0435\u0441\u044f\u0446\u0435\u0432</span>
          </div>
          <div class="payout-metrics">
            <div class="payout-metric purple">
              <span class="payout-caption">\u0412\u0441\u0435\u0433\u043e</span>
              <span id="divTotal" class="payout-value">-</span>
            </div>
            <div class="payout-metric purple">
              <span class="payout-caption">\u0412 \u0441\u0440\u0435\u0434\u043d\u0435\u043c \u0432 \u043c\u0435\u0441\u044f\u0446</span>
              <span id="divAvg" class="payout-value">-</span>
            </div>
          </div>
          <div id="divChart" class="bar-chart"></div>
        </article>
      </section>

      <section class="events-card">
        <h3 class="events-title">Ближайшие события (7 дней)</h3>
        <div id="upcomingEventsList" class="events-list"></div>
      </section>
    </main>

    <script>
      const state = {
        assetRows: [],
        positionRows: [],
        futureSeries: [],
        dividendSeries: [],
        upcomingEvents: [],
        donutSlices: [],
        donutSpanByType: {},
        donutRowsByType: {},
        donutAnimRaf: 0,
        movers: { up: [], down: [] },
        savedToken:
          localStorage.getItem("tinvest_token") ||
          sessionStorage.getItem("tinvest_token_session") ||
          "",
        portfolioTotalText: "-",
        portfolioTotalValue: 0,
        investedTotal: 0,
        profitTotal: 0,
        profitPct: 0,
        profitBreakdown: {
          currentValue: 0,
          tradesNet: 0,
          coupons: 0,
          dividends: 0,
          commissions: 0,
          taxes: 0
        },
        passiveIncomeTotal: 0,
        passiveIncomeYieldPct: 0,
        passiveIncomeBaseValue: 0,
        yieldPct: 0,
        hoveredAssetType: null
      };

      const CACHE_KEYS = {
        portfolio: "home_portfolio_cache_v12",
        accounts: "home_accounts_cache_v1"
      };

      const ASSET_ORDER = ["share", "bond", "etf", "currency"];
      const ASSET_META = {
        share: { label: "\u0410\u043a\u0446\u0438\u0438", color: "#64b4ff" },
        bond: { label: "\u041e\u0431\u043b\u0438\u0433\u0430\u0446\u0438\u0438", color: "#64d8e4" },
        etf: { label: "ETF", color: "#7f59ff" },
        currency: { label: "\u0412\u0430\u043b\u044e\u0442\u0430", color: "#3ed5c2" }
      };

      const tokenToggleBtn = document.getElementById("tokenToggle");
      const controls = document.getElementById("controls");
      const tokenInput = document.getElementById("token");
      const accountInput = document.getElementById("account");
      const accountsList = document.getElementById("accounts");
      const rememberBtn = document.getElementById("rememberBtn");
      const loadBtn = document.getElementById("load");
      const portfolioBtn = document.getElementById("portfolio");
      const refreshCacheBtn = document.getElementById("refreshCache");
      const statusEl = document.getElementById("status");
      const portfolioBody = document.getElementById("portfolioBody");
      const donut = document.getElementById("donut");
      const donutWrap = document.getElementById("donutWrap");
      const donutTooltip = document.getElementById("donutTooltip");
      const donutTooltipName = document.getElementById("donutTooltipName");
      const donutTooltipAmount = document.getElementById("donutTooltipAmount");
      const donutTooltipShare = document.getElementById("donutTooltipShare");
      const moversListUp = document.getElementById("moversListUp");
      const moversListDown = document.getElementById("moversListDown");
      const futureTotalEl = document.getElementById("futureTotal");
      const futureAvgEl = document.getElementById("futureAvg");
      const divTotalEl = document.getElementById("divTotal");
      const divAvgEl = document.getElementById("divAvg");
      const futureChartEl = document.getElementById("futureChart");
      const divChartEl = document.getElementById("divChart");
      const upcomingEventsListEl = document.getElementById("upcomingEventsList");
      const tipCouponsEl = document.getElementById("tipCoupons");
      const tipDividendsEl = document.getElementById("tipDividends");
      const tipCommissionsEl = document.getElementById("tipCommissions");
      const tipTaxesEl = document.getElementById("tipTaxes");
      const tipCurrentValueEl = document.getElementById("tipCurrentValue");
      const tipTradesNetEl = document.getElementById("tipTradesNet");

      function formatRub(value) {
        return new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + " \u20BD";
      }

      function formatSignedRub(value) {
        const sign = value > 0 ? "+" : value < 0 ? "-" : "";
        return sign + formatRub(Math.abs(value));
      }

      function formatPct(value) {
        return new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + "%";
      }

      function parseNumberFromText(value) {
        if (typeof value === "number") return Number.isFinite(value) ? value : 0;
        if (!value || typeof value !== "string") return 0;
        const prepared = value
          .replace(/\u00A0|\u202F/g, " ")
          .replace(/[\u2212\u2013\u2014]/g, "-");
        const cleaned = prepared.replace(/[^0-9,.\-]/g, "");
        if (!cleaned) return 0;
        const lastComma = cleaned.lastIndexOf(",");
        const lastDot = cleaned.lastIndexOf(".");
        let normalized;
        if (lastComma > lastDot) {
          normalized = cleaned.replace(/\./g, "").replace(",", ".");
        } else {
          normalized = cleaned.replace(/,/g, "");
        }
        normalized = normalized.replace(/(?!^)-/g, "");
        const n = Number(normalized);
        return Number.isFinite(n) ? n : 0;
      }

      function readCache(key) {
        try {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      }

      function writeCache(key, value) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // ignore storage errors
        }
      }

      function saveSessionToken(token) {
        if (token) {
          sessionStorage.setItem("tinvest_token_session", token);
        } else {
          sessionStorage.removeItem("tinvest_token_session");
        }
      }

      function mapPositionsToRows(positions) {
        const mapped = positions.slice(0, 50).map((position) => {
          const cost = parseNumberFromText(position.currentPrice);
          const profit = parseNumberFromText(position.profitRub);
          const dayChange = parseNumberFromText(
            position.dayPriceChangeRub || position.dayChangeRub
          );
          const closePrice24h = parseNumberFromText(position.dayClosePriceRub);
          const currentPriceNow = parseNumberFromText(position.dayLastPriceRub);
          const invested = Math.max(0, cost - profit);
          return {
            name: position.name || "\u041f\u043e\u0437\u0438\u0446\u0438\u044f",
            instrumentType: String(position.instrumentType || "").toLowerCase(),
            cost,
            invested,
            profit,
            profitPct: parseNumberFromText(position.profitPct),
            dayChange,
            dayChangePct: parseNumberFromText(position.dayChangePct),
            closePrice24h,
            currentPriceNow,
            dayPriceAvailable: Boolean(position.dayPriceAvailable)
          };
        });
        return mapped;
      }

      function mapAssetRowsFromAnalytics(analyticsBody) {
        const map = new Map();
        const rows = Array.isArray(analyticsBody?.assetBreakdown) ? analyticsBody.assetBreakdown : [];
        for (const row of rows) {
          const type = String(row?.type || "").toLowerCase();
          if (!type) continue;
          const value = Number(row?.value) || parseNumberFromText(row?.valueText || "");
          map.set(type, (map.get(type) || 0) + value);
        }

        const total = ASSET_ORDER.reduce((sum, type) => sum + (map.get(type) || 0), 0);
        return ASSET_ORDER.map((type) => {
          const amount = map.get(type) || 0;
          return {
            type,
            name: ASSET_META[type].label,
            color: ASSET_META[type].color,
            amount,
            share: total > 0 ? (amount / total) * 100 : 0
          };
        });
      }

      function mapAssetRowsFromPositions(positionRows) {
        const map = new Map();
        for (const row of positionRows) {
          const type = String(row?.instrumentType || "").toLowerCase();
          if (!ASSET_ORDER.includes(type)) continue;
          const value = Number(row?.cost) || 0;
          map.set(type, (map.get(type) || 0) + value);
        }

        const total = ASSET_ORDER.reduce((sum, type) => sum + (map.get(type) || 0), 0);
        return ASSET_ORDER.map((type) => {
          const amount = map.get(type) || 0;
          return {
            type,
            name: ASSET_META[type].label,
            color: ASSET_META[type].color,
            amount,
            share: total > 0 ? (amount / total) * 100 : 0
          };
        });
      }

      function mapMonthSeries(rows) {
        if (!Array.isArray(rows)) return [];
        return rows
          .map((row) => ({
            label: String(row?.month || ""),
            value:
              (typeof row?.value === "number" && Number.isFinite(row.value))
                ? row.value
                : parseNumberFromText(String(row?.amount || "0"))
          }))
          .filter((row) => Number.isFinite(row.value));
      }

      function renderBarChart(container, series, colorClass) {
        container.innerHTML = "";
        const points = series.slice(-8);
        const max = Math.max(0, ...points.map((p) => p.value));
        for (const point of points) {
          const item = document.createElement("div");
          item.className = "bar-item";

          const value = document.createElement("div");
          value.className = "bar-value";
          value.textContent = point.value > 0 ? formatRub(point.value) : "-";

          const col = document.createElement("div");
          col.className = "bar-col";

          const bar = document.createElement("div");
          bar.className = "bar " + colorClass;
          const h = max > 0 ? Math.max(2, Math.round((point.value / max) * 82)) : 2;
          bar.style.height = h + "px";
          col.appendChild(bar);

          const label = document.createElement("div");
          label.className = "bar-label";
          label.textContent = point.label || "-";

          item.appendChild(value);
          item.appendChild(col);
          item.appendChild(label);
          container.appendChild(item);
        }
      }

      function renderPayoutCards() {
        const futureTotal = state.futureSeries.reduce((sum, row) => sum + row.value, 0);
        const futureAvg = state.futureSeries.length ? futureTotal / state.futureSeries.length : 0;
        const divTotal = state.dividendSeries.reduce((sum, row) => sum + row.value, 0);
        const divAvg = state.dividendSeries.length ? divTotal / state.dividendSeries.length : 0;

        futureTotalEl.textContent = formatRub(futureTotal);
        futureAvgEl.textContent = formatRub(futureAvg);
        divTotalEl.textContent = formatRub(divTotal);
        divAvgEl.textContent = formatRub(divAvg);

        renderBarChart(futureChartEl, state.futureSeries, "blue");
        renderBarChart(divChartEl, state.dividendSeries, "purple");
      }

      function renderUpcomingEvents() {
        upcomingEventsListEl.innerHTML = "";
        if (!Array.isArray(state.upcomingEvents) || !state.upcomingEvents.length) {
          const empty = document.createElement("div");
          empty.className = "events-empty";
          empty.textContent = "\u041d\u0435\u0442 \u0441\u043e\u0431\u044b\u0442\u0438\u0439 \u043d\u0430 \u0431\u043b\u0438\u0436\u0430\u0439\u0448\u0438\u0435 7 \u0434\u043d\u0435\u0439.";
          upcomingEventsListEl.appendChild(empty);
          return;
        }

        for (const event of state.upcomingEvents.slice(0, 20)) {
          const typeRaw = String(event.eventType || "").toLowerCase();
          let typeClass = "default";
          if (typeRaw.includes("\u0434\u0438\u0432\u0438\u0434")) typeClass = "dividend";
          else if (typeRaw.includes("\u043a\u0443\u043f\u043e\u043d")) typeClass = "coupon";
          else if (typeRaw.includes("\u043f\u043e\u0433\u0430\u0448")) typeClass = "redemption";

          const card = document.createElement("article");
          card.className = "event-item";
          card.innerHTML =
            "<div class='event-row'>" +
              "<div class='event-name'>" + (event.name || "-") + "</div>" +
              "<div class='event-date'>" + (event.date || "-") + "</div>" +
            "</div>" +
            "<div class='event-row'>" +
              "<div class='event-meta'>" +
                "<span class='event-type " + typeClass + "'>" + (event.eventType || "-") + "</span>" +
              "</div>" +
              "<div class='event-amount'>" + (event.amount || "-") + "</div>" +
            "</div>";
          upcomingEventsListEl.appendChild(card);
        }
      }

      function applyKpis() {
        const totalText = state.portfolioTotalText && state.portfolioTotalText !== "-"
          ? state.portfolioTotalText
          : formatRub(state.assetRows.reduce((sum, row) => sum + row.amount, 0));

        if (!state.assetRows.length && !state.positionRows.length) {
          document.getElementById("kpiTotal").textContent = "-";
          document.getElementById("kpiInvested").textContent = "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043f\u043e\u0440\u0442\u0444\u0435\u043b\u044f";
          document.getElementById("kpiProfit").textContent = "-";
          document.getElementById("kpiProfitPct").textContent = "-";
          document.getElementById("kpiDaily").textContent = "\u0414\u0430\u043d\u043d\u044b\u0435 \u043f\u043e\u044f\u0432\u044f\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438";
          document.getElementById("kpiYield").textContent = "-";
          document.getElementById("kpiPassive").textContent = "-";
          document.getElementById("kpiPassiveGrowth").textContent = "-";
          document.getElementById("kpiPassiveYear").textContent = "\u041e\u0436\u0438\u0434\u0430\u044e \u0434\u0430\u043d\u043d\u044b\u0435";
          tipCouponsEl.textContent = "-";
          tipDividendsEl.textContent = "-";
          tipCommissionsEl.textContent = "-";
          tipTaxesEl.textContent = "-";
          tipCurrentValueEl.textContent = "-";
          tipTradesNetEl.textContent = "-";
          return;
        }

        const invested = state.investedTotal;
        const profit = state.profitTotal;
        const profitPct = state.profitPct;
        const passiveYear =
          Number.isFinite(state.passiveIncomeTotal) ? state.passiveIncomeTotal : 0;
        const fallbackPassiveYear =
          passiveYear > 0 ? passiveYear : state.futureSeries.reduce((sum, row) => sum + row.value, 0);
        const fallbackBaseValue = state.assetRows
          .filter((row) => row.type !== "currency")
          .reduce((sum, row) => sum + row.amount, 0);
        const passiveBase =
          Number.isFinite(state.passiveIncomeBaseValue) && state.passiveIncomeBaseValue > 0
            ? state.passiveIncomeBaseValue
            : fallbackBaseValue;
        const passivePct =
          Number.isFinite(state.passiveIncomeYieldPct)
            ? state.passiveIncomeYieldPct
            : passiveBase > 0
              ? (fallbackPassiveYear / passiveBase) * 100
              : 0;

        document.getElementById("kpiTotal").textContent = totalText;
        document.getElementById("kpiInvested").textContent = formatRub(invested) + " \u0432\u043b\u043e\u0436\u0435\u043d\u043e";
        document.getElementById("kpiProfit").textContent = (profit >= 0 ? "+" : "") + formatRub(profit);
        document.getElementById("kpiProfitPct").textContent = formatPct(profitPct);
        document.getElementById("kpiDaily").textContent = "\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435: " + formatPct(profitPct);
        document.getElementById("kpiYield").textContent = formatPct(state.yieldPct || 0);
        document.getElementById("kpiPassive").textContent = formatPct(passivePct);
        document.getElementById("kpiPassiveGrowth").textContent = formatPct(passivePct);
        document.getElementById("kpiPassiveYear").textContent =
          formatRub(fallbackPassiveYear) + " за 12 мес";
        tipCurrentValueEl.textContent = formatSignedRub(state.profitBreakdown.currentValue || 0);
        tipTradesNetEl.textContent = formatSignedRub(state.profitBreakdown.tradesNet || 0);
        tipCouponsEl.textContent = formatSignedRub(state.profitBreakdown.coupons || 0);
        tipDividendsEl.textContent = formatSignedRub(state.profitBreakdown.dividends || 0);
        tipCommissionsEl.textContent = formatSignedRub(-(state.profitBreakdown.commissions || 0));
        tipTaxesEl.textContent = formatSignedRub(-(state.profitBreakdown.taxes || 0));
      }

      function buildDonutSlices() {
        const rows = state.assetRows
          .filter((row) => Number.isFinite(row.amount) && row.amount > 0)
          .map((row) => ({ row, amount: Math.max(0, Number(row.amount) || 0) }));
        if (!rows.length) return [];

        const totalAmount = rows.reduce((sum, item) => sum + item.amount, 0);
        if (!(totalAmount > 0)) return [];

        const minVisibleAngle = 1.6;
        const draft = rows.map((item) => {
          const actualSpan = (item.amount / totalAmount) * 360;
          const visualSpan =
            actualSpan > 0 && actualSpan < minVisibleAngle ? minVisibleAngle : actualSpan;
          return {
            row: item.row,
            actualSpan,
            visualSpan,
            start: 0,
            end: 0
          };
        });

        const visualTotal = draft.reduce((sum, item) => sum + item.visualSpan, 0);
        if (visualTotal > 360) {
          const overflow = visualTotal - 360;
          const adjustable = draft
            .map((item, index) => ({ index, room: Math.max(0, item.visualSpan - minVisibleAngle) }))
            .filter((item) => item.room > 0);
          const totalRoom = adjustable.reduce((sum, item) => sum + item.room, 0);
          if (totalRoom > 0) {
            for (const item of adjustable) {
              const cut = overflow * (item.room / totalRoom);
              draft[item.index].visualSpan = Math.max(
                minVisibleAngle,
                draft[item.index].visualSpan - cut
              );
            }
          }
        }

        let cursor = 0;
        for (const item of draft) {
          item.start = cursor;
          cursor += item.visualSpan;
          item.end = cursor;
        }
        if (draft.length) {
          draft[draft.length - 1].end = 360;
        }
        return draft;
      }

      function buildTypeOrder(typeSet) {
        const ordered = [];
        for (const type of ASSET_ORDER) {
          if (typeSet.has(type)) ordered.push(type);
        }
        for (const type of typeSet) {
          if (!ordered.includes(type)) ordered.push(type);
        }
        return ordered;
      }

      function renderDonutSlices(slices) {
        state.donutSlices = slices;
        if (!slices.length) {
          donut.style.background = "conic-gradient(#4f5875 0deg 360deg)";
          return;
        }
        const chunks = slices.map((slice) =>
          slice.row.color +
          " " +
          slice.start.toFixed(4) +
          "deg " +
          slice.end.toFixed(4) +
          "deg"
        );
        donut.style.background = "conic-gradient(" + chunks.join(", ") + ")";
      }

      function buildSlicesFromSpanMap(spanByType, rowsByType, typeOrder) {
        const slices = [];
        let cursor = 0;
        for (const type of typeOrder) {
          const span = Math.max(0, Number(spanByType[type]) || 0);
          if (span <= 0.0001) continue;
          const row = rowsByType[type];
          if (!row) continue;
          const start = cursor;
          cursor += span;
          slices.push({
            row,
            actualSpan: span,
            visualSpan: span,
            start,
            end: cursor
          });
        }
        if (slices.length) slices[slices.length - 1].end = 360;
        return slices;
      }

      function applyDonut() {
        const targetSlices = buildDonutSlices();
        if (!targetSlices.length) {
          if (state.donutAnimRaf) {
            cancelAnimationFrame(state.donutAnimRaf);
            state.donutAnimRaf = 0;
          }
          state.donutSpanByType = {};
          state.donutRowsByType = {};
          renderDonutSlices([]);
          return;
        }

        const targetSpanByType = {};
        const targetRowsByType = {};
        for (const slice of targetSlices) {
          const type = String(slice?.row?.type || "");
          if (!type) continue;
          targetSpanByType[type] = Math.max(0, slice.end - slice.start);
          targetRowsByType[type] = slice.row;
        }

        const prevSpanByType = state.donutSpanByType || {};
        const prevRowsByType = state.donutRowsByType || {};
        const allTypes = new Set([
          ...Object.keys(prevSpanByType),
          ...Object.keys(targetSpanByType)
        ]);
        const typeOrder = buildTypeOrder(allTypes);

        if (state.donutAnimRaf) {
          cancelAnimationFrame(state.donutAnimRaf);
          state.donutAnimRaf = 0;
        }

        const hasPrev = Object.keys(prevSpanByType).length > 0;
        if (!hasPrev) {
          state.donutSpanByType = targetSpanByType;
          state.donutRowsByType = targetRowsByType;
          renderDonutSlices(targetSlices);
          return;
        }

        const durationMs = 520;
        const startTs = performance.now();
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        const animateFrame = (ts) => {
          const progress = Math.min(1, (ts - startTs) / durationMs);
          const eased = easeOutCubic(progress);
          const currentSpanByType = {};
          for (const type of typeOrder) {
            const fromSpan = Math.max(0, Number(prevSpanByType[type]) || 0);
            const toSpan = Math.max(0, Number(targetSpanByType[type]) || 0);
            currentSpanByType[type] = fromSpan + (toSpan - fromSpan) * eased;
          }
          const currentRowsByType = { ...prevRowsByType, ...targetRowsByType };
          const currentSlices = buildSlicesFromSpanMap(currentSpanByType, currentRowsByType, typeOrder);
          renderDonutSlices(currentSlices);

          if (progress < 1) {
            state.donutAnimRaf = requestAnimationFrame(animateFrame);
            return;
          }

          state.donutAnimRaf = 0;
          state.donutSpanByType = targetSpanByType;
          state.donutRowsByType = targetRowsByType;
          renderDonutSlices(targetSlices);
        };

        state.donutAnimRaf = requestAnimationFrame(animateFrame);
      }

      function setHoveredAssetType(type) {
        const normalized = type || null;
        if (state.hoveredAssetType === normalized) return;
        state.hoveredAssetType = normalized;
        renderTypeTable();
      }

      function resolveHoveredDonutAsset(clientX, clientY) {
        if (!Array.isArray(state.donutSlices) || !state.donutSlices.length) return null;
        const rect = donut.getBoundingClientRect();
        const radius = rect.width / 2;
        const cx = rect.left + radius;
        const cy = rect.top + radius;
        const dx = clientX - cx;
        const dy = clientY - cy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const innerRadius = radius * 0.64;

        if (distance < innerRadius || distance > radius) return null;

        let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;

        for (const slice of state.donutSlices) {
          if (angle >= slice.start && angle <= slice.end) {
            return slice.row;
          }
        }
        return null;
      }

      function hideDonutTooltip() {
        donutTooltip.hidden = true;
        setHoveredAssetType(null);
      }

      function showDonutTooltip(row, clientX, clientY) {
        donutTooltipName.textContent = row.name;
        donutTooltipAmount.textContent = formatRub(row.amount);
        donutTooltipShare.textContent = "Доля: " + formatPct(row.share);
        donutTooltip.style.left = clientX + 14 + "px";
        donutTooltip.style.top = clientY + 14 + "px";
        donutTooltip.hidden = false;
      }

      function handleDonutHover(event) {
        const row = resolveHoveredDonutAsset(event.clientX, event.clientY);
        if (!row) {
          hideDonutTooltip();
          return;
        }
        setHoveredAssetType(row.type);
        showDonutTooltip(row, event.clientX, event.clientY);
      }

      function renderTypeTable() {
        portfolioBody.innerHTML = "";
        if (!state.assetRows.length) {
          const tr = document.createElement("tr");
          tr.innerHTML = "<td colspan='3' class='movers-empty'>\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445. \u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u00ab\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043f\u043e\u0440\u0442\u0444\u0435\u043b\u044c\u00bb.</td>";
          portfolioBody.appendChild(tr);
          return;
        }

        for (const row of state.assetRows) {
          const tr = document.createElement("tr");
          tr.className = "asset-row" + (state.hoveredAssetType === row.type ? " is-active" : "");
          tr.innerHTML =
            "<td><div class='asset-name'><span class='asset-color' style='background:" + row.color + "'></span><div>" + row.name + "</div></div></td>" +
            "<td><span class='value'>" + formatRub(row.amount) + "</span></td>" +
            "<td><span class='value'>" + formatPct(row.share) + "</span></td>";
          portfolioBody.appendChild(tr);
        }
      }

      function buildMovers() {
        const sortable = state.positionRows
          .map((row) => {
            const closePrice24h = Number(row.closePrice24h) || 0;
            const currentPriceNow = Number(row.currentPriceNow) || 0;
            if (!(closePrice24h > 0 && currentPriceNow > 0)) return null;

            const dayChangeFromPrices = currentPriceNow - closePrice24h;
            const dayChangePctFromPrices = closePrice24h !== 0
              ? (dayChangeFromPrices / closePrice24h) * 100
              : 0;

            const rowPct = Number(row.dayChangePct) || 0;
            const rowChange = Number(row.dayChange) || 0;
            const dayChangePct =
              Math.abs(rowPct) > 0.000001 ? rowPct : dayChangePctFromPrices;
            const dayChange =
              Math.abs(rowChange) > 0.000001 ? rowChange : dayChangeFromPrices;

            return {
              name: row.name,
              dayChangePct,
              dayChange,
              closePrice24h,
              currentPriceNow
            };
          })
          .filter((row) => Boolean(row));

        const byGrowth = sortable
          .slice()
          .sort((a, b) => (b.dayChangePct - a.dayChangePct) || (b.dayChange - a.dayChange));
        const byDecline = sortable
          .slice()
          .sort((a, b) => (a.dayChangePct - b.dayChangePct) || (a.dayChange - b.dayChange));

        let up = byGrowth.filter((row) => row.dayChangePct > 0 || row.dayChange > 0).slice(0, 5);
        let down = byDecline.filter((row) => row.dayChangePct < 0 || row.dayChange < 0).slice(0, 5);

        if (!up.length) up = byGrowth.slice(0, 5);
        if (!down.length) down = byDecline.slice(0, 5);

        state.movers.up = up;
        state.movers.down = down;
      }

      function renderMoverList(container, items, emptyText) {
        container.innerHTML = "";
        if (!items.length) {
          const li = document.createElement("li");
          li.className = "movers-empty";
          li.textContent = emptyText;
          container.appendChild(li);
          return;
        }

        for (const item of items) {
          const li = document.createElement("li");
          li.className = "movers-item";
          const pctClass = item.dayChangePct >= 0 ? "up" : "down";
          const sign = item.dayChangePct >= 0 ? "+" : "";
          const rubSign = item.dayChange > 0 ? "+" : item.dayChange < 0 ? "-" : "";
          li.innerHTML =
            "<span class='movers-name'>" + item.name + "</span>" +
            "<span class='movers-profit'>" + rubSign + formatRub(Math.abs(item.dayChange)) + "</span>" +
            "<span class='movers-prices'>" + formatRub(item.closePrice24h) + " \u2192 " + formatRub(item.currentPriceNow) + "</span>" +
            "<span class='value " + pctClass + "'>" + sign + formatPct(item.dayChangePct) + "</span>";
          container.appendChild(li);
        }
      }

      function renderMovers() {
        renderMoverList(moversListUp, state.movers.up, "Нет данных по росту за день.");
        renderMoverList(moversListDown, state.movers.down, "Нет данных по падению за день.");
      }

      function refreshUI() {
        renderTypeTable();
        applyDonut();
        applyKpis();
        buildMovers();
        renderMovers();
        renderPayoutCards();
        renderUpcomingEvents();
      }

      function setLoading(isLoading) {
        loadBtn.disabled = isLoading;
        portfolioBtn.disabled = isLoading;
        refreshCacheBtn.disabled = isLoading;
      }

      function setStatus(text) {
        statusEl.textContent = text;
      }

      function renderAccounts(accounts) {
        accountsList.innerHTML = "";
        for (const acc of accounts) {
          const option = document.createElement("option");
          option.value = acc.id;
          option.label = (acc.name || "\u0421\u0447\u0435\u0442") + " (" + (acc.type || "-") + ")";
          accountsList.appendChild(option);
        }
        if (!accountInput.value && accounts[0]) accountInput.value = accounts[0].id;
        portfolioBtn.disabled = false;
      }

      function restoreFromCache() {
        let hasPortfolio = false;

        const accountsCache = readCache(CACHE_KEYS.accounts);
        if (accountsCache && Array.isArray(accountsCache.accounts)) {
          renderAccounts(accountsCache.accounts);
          if (!accountInput.value && accountsCache.accountId) {
            accountInput.value = accountsCache.accountId;
          }
        }

        const portfolioCache = readCache(CACHE_KEYS.portfolio);
        if (portfolioCache && Array.isArray(portfolioCache.assetRows) && portfolioCache.assetRows.length) {
          state.assetRows = portfolioCache.assetRows;
          state.positionRows = Array.isArray(portfolioCache.positionRows) ? portfolioCache.positionRows : [];
          state.futureSeries = Array.isArray(portfolioCache.futureSeries) ? portfolioCache.futureSeries : [];
          state.dividendSeries = Array.isArray(portfolioCache.dividendSeries) ? portfolioCache.dividendSeries : [];
          state.upcomingEvents = Array.isArray(portfolioCache.upcomingEvents) ? portfolioCache.upcomingEvents : [];
          state.portfolioTotalText = portfolioCache.portfolioTotalText || "-";
          state.portfolioTotalValue = Number(portfolioCache.portfolioTotalValue) || 0;
          state.investedTotal = Number(portfolioCache.investedTotal) || 0;
          state.profitTotal = Number(portfolioCache.profitTotal) || 0;
          state.profitPct = Number(portfolioCache.profitPct) || 0;
          state.profitBreakdown = {
            currentValue: Number(portfolioCache?.profitBreakdown?.currentValue) || 0,
            tradesNet: Number(portfolioCache?.profitBreakdown?.tradesNet) || 0,
            coupons: Number(portfolioCache?.profitBreakdown?.coupons) || 0,
            dividends: Number(portfolioCache?.profitBreakdown?.dividends) || 0,
            commissions: Number(portfolioCache?.profitBreakdown?.commissions) || 0,
            taxes: Number(portfolioCache?.profitBreakdown?.taxes) || 0
          };
          state.passiveIncomeTotal = Number(portfolioCache.passiveIncomeTotal) || 0;
          state.passiveIncomeBaseValue = Number(portfolioCache.passiveIncomeBaseValue) || 0;
          state.passiveIncomeYieldPct = Number(portfolioCache.passiveIncomeYieldPct) || 0;
          state.yieldPct = Number(portfolioCache.yieldPct) || 0;

          if (!accountInput.value && portfolioCache.accountId) {
            accountInput.value = portfolioCache.accountId;
          }

          refreshUI();
          setStatus("\u041f\u043e\u043a\u0430\u0437\u0430\u043d\u044b \u0434\u0430\u043d\u043d\u044b\u0435 \u0438\u0437 \u043a\u044d\u0448\u0430");
          hasPortfolio = true;
        }

        return hasPortfolio;
      }

      async function loadAccounts(options = {}) {
        const { silent = false } = options;
        if (!silent) setStatus("\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0441\u0447\u0435\u0442\u043e\u0432...");
        setLoading(true);
        try {
          const token = tokenInput.value.trim();
          const res = await fetch("/api/accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
          });
          const body = await res.json();
          if (res.ok && body && Array.isArray(body.accounts)) {
            renderAccounts(body.accounts);
            writeCache(CACHE_KEYS.accounts, {
              accounts: body.accounts,
              accountId: accountInput.value.trim() || null,
              updatedAt: Date.now()
            });
            if (!silent) setStatus("\u0421\u0447\u0435\u0442\u0430 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u044b");
            return true;
          }
          if (!silent) setStatus("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0441\u0447\u0435\u0442\u0430");
        } catch {
          if (!silent) setStatus("\u0421\u0435\u0442\u0435\u0432\u0430\u044f \u043e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0435 \u0441\u0447\u0435\u0442\u043e\u0432");
        } finally {
          setLoading(false);
        }
        return false;
      }

      async function loadPortfolio(options = {}) {
        const { silent = false } = options;
        if (!silent) setStatus("\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043f\u043e\u0440\u0442\u0444\u0435\u043b\u044f...");
        setLoading(true);

        try {
          const token = tokenInput.value.trim();
          let accountId = accountInput.value.trim();

          if (!token) {
            if (!silent) setStatus("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u043e\u043a\u0435\u043d");
            return false;
          }

          if (!accountId) {
            const loaded = await loadAccounts({ silent: true });
            if (!loaded && !accountInput.value.trim()) {
              if (!silent) setStatus("\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0447\u0435\u0442 \u0438\u043b\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0441\u043f\u0438\u0441\u043e\u043a \u0441\u0447\u0435\u0442\u043e\u0432");
              return false;
            }
            accountId = accountInput.value.trim();
          }

          const [portfolioRes, analyticsRes] = await Promise.all([
            fetch("/api/portfolio", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, accountId })
            }),
            fetch("/api/analytics", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, accountId })
            })
          ]);

          const portfolioBody = await portfolioRes.json();
          const analyticsBody = await analyticsRes.json();

          if (!(portfolioRes.ok && portfolioBody && Array.isArray(portfolioBody.positions))) {
            if (!silent) setStatus("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043f\u043e\u0440\u0442\u0444\u0435\u043b\u044c");
            return false;
          }

          state.positionRows = mapPositionsToRows(portfolioBody.positions);
          state.investedTotal = state.positionRows.reduce((sum, row) => sum + row.invested, 0);
          state.profitTotal = state.positionRows.reduce((sum, row) => sum + row.profit, 0);
          state.profitPct = state.investedTotal > 0 ? (state.profitTotal / state.investedTotal) * 100 : 0;

          state.portfolioTotalText = portfolioBody.total || "-";
          state.portfolioTotalValue = parseNumberFromText(portfolioBody.total || "");

          if (analyticsRes.ok && analyticsBody) {
            state.assetRows = mapAssetRowsFromAnalytics(analyticsBody);
            state.yieldPct = parseNumberFromText(analyticsBody.yieldPct || "0");
            state.profitTotal =
              (typeof analyticsBody.profitValue === "number" && Number.isFinite(analyticsBody.profitValue))
                ? analyticsBody.profitValue
                : parseNumberFromText(analyticsBody.profitRub || "0");
            state.profitPct = parseNumberFromText(analyticsBody.profitPct || "0");
            state.profitBreakdown = {
              currentValue:
                (typeof analyticsBody?.profitBreakdown?.currentValue === "number" &&
                  Number.isFinite(analyticsBody.profitBreakdown.currentValue))
                  ? analyticsBody.profitBreakdown.currentValue
                  : parseNumberFromText(analyticsBody?.profitBreakdown?.currentValueRub || "0"),
              tradesNet:
                (typeof analyticsBody?.profitBreakdown?.tradesNet === "number" &&
                  Number.isFinite(analyticsBody.profitBreakdown.tradesNet))
                  ? analyticsBody.profitBreakdown.tradesNet
                  : parseNumberFromText(analyticsBody?.profitBreakdown?.tradesNetRub || "0"),
              coupons:
                (typeof analyticsBody?.profitBreakdown?.coupons === "number" &&
                  Number.isFinite(analyticsBody.profitBreakdown.coupons))
                  ? analyticsBody.profitBreakdown.coupons
                  : parseNumberFromText(analyticsBody?.profitBreakdown?.couponsRub || "0"),
              dividends:
                (typeof analyticsBody?.profitBreakdown?.dividends === "number" &&
                  Number.isFinite(analyticsBody.profitBreakdown.dividends))
                  ? analyticsBody.profitBreakdown.dividends
                  : parseNumberFromText(analyticsBody?.profitBreakdown?.dividendsRub || "0"),
              commissions:
                (typeof analyticsBody?.profitBreakdown?.commissions === "number" &&
                  Number.isFinite(analyticsBody.profitBreakdown.commissions))
                  ? Math.abs(analyticsBody.profitBreakdown.commissions)
                  : Math.abs(parseNumberFromText(analyticsBody?.profitBreakdown?.commissionsRub || "0")),
              taxes:
                (typeof analyticsBody?.profitBreakdown?.taxes === "number" &&
                  Number.isFinite(analyticsBody.profitBreakdown.taxes))
                  ? Math.abs(analyticsBody.profitBreakdown.taxes)
                  : Math.abs(parseNumberFromText(analyticsBody?.profitBreakdown?.taxesRub || "0"))
            };
            state.passiveIncomeTotal =
              typeof analyticsBody?.passiveIncomeTotal === "number" &&
              Number.isFinite(analyticsBody.passiveIncomeTotal)
                ? analyticsBody.passiveIncomeTotal
                : 0;
            state.passiveIncomeBaseValue =
              typeof analyticsBody?.passiveIncomeBaseValue === "number" &&
              Number.isFinite(analyticsBody.passiveIncomeBaseValue)
                ? analyticsBody.passiveIncomeBaseValue
                : 0;
            state.passiveIncomeYieldPct = parseNumberFromText(analyticsBody.passiveIncomeYieldPct || "0");
            const totalFromAnalytics = parseNumberFromText(analyticsBody.total || "");
            if (totalFromAnalytics > 0) {
              state.portfolioTotalValue = totalFromAnalytics;
            }
            state.investedTotal = Math.max(0, state.portfolioTotalValue - state.profitTotal);
            state.futureSeries = mapMonthSeries(analyticsBody.incomeNext12);
            state.dividendSeries = mapMonthSeries(analyticsBody.receivedDividends12);
            state.upcomingEvents = Array.isArray(analyticsBody.upcomingEvents)
              ? analyticsBody.upcomingEvents
              : [];
          } else {
            state.assetRows = mapAssetRowsFromPositions(state.positionRows);
            state.yieldPct = 0;
            state.passiveIncomeTotal = 0;
            state.passiveIncomeBaseValue = 0;
            state.passiveIncomeYieldPct = 0;
            if (!state.futureSeries.length) state.futureSeries = [];
            if (!state.dividendSeries.length) state.dividendSeries = [];
            if (!state.upcomingEvents.length) state.upcomingEvents = [];
            state.profitBreakdown = {
              currentValue: 0,
              tradesNet: 0,
              coupons: 0,
              dividends: 0,
              commissions: 0,
              taxes: 0
            };
          }

          refreshUI();

          writeCache(CACHE_KEYS.portfolio, {
            assetRows: state.assetRows,
            positionRows: state.positionRows,
            futureSeries: state.futureSeries,
            dividendSeries: state.dividendSeries,
            upcomingEvents: state.upcomingEvents,
            portfolioTotalText: state.portfolioTotalText,
            portfolioTotalValue: state.portfolioTotalValue,
            investedTotal: state.investedTotal,
            profitTotal: state.profitTotal,
            profitPct: state.profitPct,
            profitBreakdown: state.profitBreakdown,
            yieldPct: state.yieldPct,
            passiveIncomeTotal: state.passiveIncomeTotal,
            passiveIncomeBaseValue: state.passiveIncomeBaseValue,
            passiveIncomeYieldPct: state.passiveIncomeYieldPct,
            accountId,
            updatedAt: Date.now()
          });

          if (!silent) setStatus("\u041f\u043e\u0440\u0442\u0444\u0435\u043b\u044c \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d");
          return true;
        } catch {
          if (!silent) setStatus("\u0421\u0435\u0442\u0435\u0432\u0430\u044f \u043e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0435 \u043f\u043e\u0440\u0442\u0444\u0435\u043b\u044f");
        } finally {
          setLoading(false);
        }

        return false;
      }

      async function refreshCacheData() {
        const token = tokenInput.value.trim();
        if (!token) {
          setStatus("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u043e\u043a\u0435\u043d \u0434\u043b\u044f \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f \u043a\u044d\u0448\u0430");
          return;
        }
        setStatus("\u041e\u0431\u043d\u043e\u0432\u043b\u044f\u044e \u043a\u044d\u0448...");
        const ok = await loadPortfolio({ silent: true });
        setStatus(ok ? "\u041a\u044d\u0448 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d" : "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043a\u044d\u0448");
      }

      async function bootstrap() {
        if (state.savedToken) tokenInput.value = state.savedToken;

        const hasCache = restoreFromCache();
        portfolioBtn.disabled = false;
        if (hasCache) return;

        if (!tokenInput.value.trim()) {
          setStatus("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u043e\u043a\u0435\u043d \u0434\u043b\u044f \u043f\u0435\u0440\u0432\u043e\u0439 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438");
          return;
        }

        setStatus("\u041f\u0435\u0440\u0432\u044b\u0439 \u0437\u0430\u043f\u0443\u0441\u043a: \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u044e \u0434\u0430\u043d\u043d\u044b\u0435...");
        const ok = await loadPortfolio({ silent: true });
        setStatus(ok ? "\u0414\u0430\u043d\u043d\u044b\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u044b" : "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435");
      }

      tokenToggleBtn.addEventListener("click", () => {
        const expanded = tokenToggleBtn.getAttribute("aria-expanded") === "true";
        tokenToggleBtn.setAttribute("aria-expanded", String(!expanded));
        controls.classList.toggle("is-open", !expanded);
      });

      rememberBtn.addEventListener("click", () => {
        const token = tokenInput.value.trim();
        if (!token) {
          localStorage.removeItem("tinvest_token");
          saveSessionToken("");
          setStatus("\u0422\u043e\u043a\u0435\u043d \u0443\u0434\u0430\u043b\u0435\u043d \u0438\u0437 localStorage");
          return;
        }
        saveSessionToken(token);
        localStorage.setItem("tinvest_token", token);
        setStatus("\u0422\u043e\u043a\u0435\u043d \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d \u0432 localStorage");
      });

      tokenInput.addEventListener("input", () => {
        saveSessionToken(tokenInput.value.trim());
      });

      loadBtn.addEventListener("click", () => loadAccounts());
      portfolioBtn.addEventListener("click", () => loadPortfolio());
      refreshCacheBtn.addEventListener("click", refreshCacheData);
      donut.addEventListener("mousemove", handleDonutHover);
      donut.addEventListener("mouseleave", hideDonutTooltip);
      donutWrap.addEventListener("mouseleave", hideDonutTooltip);

      accountInput.addEventListener("input", () => {
        portfolioBtn.disabled = false;
        const accountsCache = readCache(CACHE_KEYS.accounts);
        if (accountsCache && Array.isArray(accountsCache.accounts)) {
          writeCache(CACHE_KEYS.accounts, {
            accounts: accountsCache.accounts,
            accountId: accountInput.value.trim() || null,
            updatedAt: Date.now()
          });
        }
      });

      refreshUI();
      bootstrap();
    </script>
  </body>
</html>`;
}
