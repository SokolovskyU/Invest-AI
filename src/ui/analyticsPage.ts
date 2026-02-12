export function renderAnalyticsPage(): string {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>T-Invest Pet - Analytics</title>
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
        font-size: 16px;
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
        grid-template-columns: 1.3fr 1fr auto auto auto;
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
      .controls input:focus {
        outline: none;
        border-color: #5f87d4;
      }
      .controls button {
        cursor: pointer;
        font-weight: 700;
      }
      .load-btn {
        background: linear-gradient(140deg, #2480ff 0%, #2bb7ff 100%);
        border: none;
      }
      .secondary-btn {
        border: 1px solid #4d5673;
        background: #2a3043;
        color: #dbe3fa;
      }
      .load-btn:disabled,
      .secondary-btn:disabled,
      .tab-btn:disabled {
        opacity: 0.65;
        cursor: default;
      }
      .page {
        max-width: 1360px;
        margin: 0 auto;
        padding: 28px 18px 24px;
      }
      h1 {
        margin: 0 0 12px;
        font-size: clamp(34px, 5.4vw, 48px);
        letter-spacing: -0.8px;
      }
      .subtle {
        margin: 0;
        color: #a8b1cc;
        font-size: 15px;
      }
      .analytics-intro-hidden {
        display: none !important;
      }
      .kpis {
        margin-top: 20px;
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
      }
      .kpi-change {
        color: var(--green);
        font-size: 22px;
        font-weight: 800;
        margin-left: 14px;
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
      .currency-row {
        margin-top: 20px;
        background: #2d3346;
        border: 1px solid #3f4762;
        border-radius: 10px;
        padding: 18px 20px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .currency-chevron {
        color: #8a95b7;
        font-size: 21px;
        line-height: 1;
      }
      .currency-label {
        font-size: 36px;
        font-weight: 800;
        letter-spacing: -0.6px;
      }
      .currency-value {
        color: #9fb0ce;
        font-size: 32px;
        font-weight: 700;
      }
      .panel {
        margin-top: 20px;
        background: var(--panel);
        border: 1px solid #343c54;
        border-radius: 10px;
        padding: 18px;
      }
      .actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .status {
        margin-top: 10px;
        color: #a7b0cb;
        font-size: 14px;
      }
      .hint {
        margin-top: 8px;
        color: #a7b0cb;
        font-size: 13px;
      }
      .section {
        margin-top: 16px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 14px;
      }
      .metric {
        border: 1px solid #3f4762;
        background: #2d3346;
        border-radius: 10px;
        padding: 14px;
      }
      .metric h4 {
        margin: 0 0 8px;
        font-size: 13px;
        color: #adb8d5;
      }
      .metric div {
        font-size: 20px;
        font-weight: 800;
        color: #f1f6ff;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 10px;
        border-bottom: 1px solid #414962;
        color: #dce4f9;
      }
      th {
        font-weight: 700;
        background: #31384d;
        color: #f2f6ff;
      }
      .pill {
        display: inline-block;
        background: #304d79;
        color: #cde1ff;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 12px;
        margin-left: 6px;
        font-weight: 700;
      }
      .bar {
        height: 10px;
        border-radius: 999px;
        background: #3a435d;
        overflow: hidden;
        margin-top: 8px;
      }
      .bar > span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #2480ff 0%, #2bb7ff 100%);
      }
      .card-block {
        border: 1px solid #3f4762;
        border-radius: 10px;
        padding: 14px;
        background: #2d3346;
      }
      .tabs {
        margin-top: 8px;
      }
      .tab-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-bottom: 20px;
        padding: 0 12px;
        border: 1px solid #3a435d;
        border-radius: 10px;
        background: #2d3346;
      }
      .tab-btn {
        padding: 14px 4px 13px;
        border: none;
        border-bottom: 3px solid transparent;
        background: transparent;
        color: #b7c2dc;
        cursor: pointer;
        font-weight: 700;
        font-size: 16px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .tab-btn.is-active {
        color: #2bb7ff;
        border-bottom-color: #2bb7ff;
      }
      .tab-btn:hover {
        color: #e6ecfb;
      }
      .tab-btn .tab-icon {
        font-size: 14px;
        opacity: 0.88;
      }
      .tab-panel {
        display: none;
      }
      .tab-panel.is-active {
        display: block;
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
      }
      #out {
        margin-top: 18px;
        min-height: 140px;
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
        .kpis {
          grid-template-columns: 1fr;
          gap: 14px;
        }
        .currency-label {
          font-size: 30px;
        }
        .currency-value {
          font-size: 25px;
        }
        .tab-btn {
          font-size: 14px;
          padding: 10px 2px;
        }
        .actions > button {
          flex: 1 1 100%;
        }
      }
    </style>
  </head>
  <body>
    <header class="topbar">
      <div class="topbar-inner">
        <nav class="nav">
          <a href="/">Главная</a>
          <a class="is-active" href="/analytics">Аналитика</a>
          <a href="#">Портфель</a>
          <a href="#">Инструменты</a>
        </nav>
        <div class="grow"></div>
        <button id="tokenToggle" class="ghost-btn" type="button" aria-expanded="false">
          token
        </button>
      </div>
      <div id="controls" class="controls">
        <input id="token" type="password" placeholder="API токен (t.****)" />
        <input id="account" list="accounts" placeholder="account_id" />
        <datalist id="accounts"></datalist>
        <button id="load" class="load-btn" type="button">Счета</button>
        <button id="analyze" class="load-btn" type="button" disabled>Аналитика</button>
        <button id="rememberBtn" class="secondary-btn" type="button">Запомнить токен</button>
      </div>
    </header>

    <main class="page">
      <h1 class="analytics-intro-hidden">Аналитика</h1>
      <p class="subtle analytics-intro-hidden">Локальная аналитика по портфелю и доходам.</p>

      <section class="panel analytics-intro-hidden">
        <div class="actions">
          <button id="refreshNames" class="secondary-btn" type="button">Обновить названия</button>
          <button id="refreshCache" class="secondary-btn" type="button">Сбросить кэш</button>
        </div>
        <div id="status" class="status">Ожидаю запрос...</div>
      </section>

      <section id="out" class="section">Ожидаю запрос...</section>
    </main>

    <script>
      const CACHE_KEYS = {
        portfolio: "home_portfolio_cache_v11",
        accounts: "home_accounts_cache_v1",
        analytics: "analytics_page_cache_v1"
      };

      const TOKEN_KEYS = {
        persistent: "tinvest_token",
        session: "tinvest_token_session"
      };

      const out = document.getElementById("out");
      const loadBtn = document.getElementById("load");
      const analyzeBtn = document.getElementById("analyze");
      const tokenInput = document.getElementById("token");
      const tokenToggleBtn = document.getElementById("tokenToggle");
      const controls = document.getElementById("controls");
      const accountInput = document.getElementById("account");
      const accountsList = document.getElementById("accounts");
      const rememberBtn = document.getElementById("rememberBtn");
      const refreshNamesBtn = document.getElementById("refreshNames");
      const refreshCacheBtn = document.getElementById("refreshCache");
      const statusEl = document.getElementById("status");

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

      function getSavedToken() {
        return (
          localStorage.getItem(TOKEN_KEYS.persistent) ||
          sessionStorage.getItem(TOKEN_KEYS.session) ||
          ""
        );
      }

      function saveSessionToken(token) {
        if (token) {
          sessionStorage.setItem(TOKEN_KEYS.session, token);
        } else {
          sessionStorage.removeItem(TOKEN_KEYS.session);
        }
      }

      function setStatus(text) {
        statusEl.textContent = text;
      }

      function setControlsVisible(isVisible) {
        controls.classList.toggle("is-open", isVisible);
        tokenToggleBtn.setAttribute("aria-expanded", String(isVisible));
      }

      function syncAccountsCache(accounts, accountId) {
        writeCache(CACHE_KEYS.accounts, {
          accounts: Array.isArray(accounts) ? accounts : [],
          accountId: accountId || null,
          updatedAt: Date.now()
        });
      }

      function syncAccountInSharedCache(accountId) {
        const normalizedAccountId = accountId || null;
        const accountsCache = readCache(CACHE_KEYS.accounts);
        const accounts = Array.isArray(accountsCache?.accounts) ? accountsCache.accounts : [];
        syncAccountsCache(accounts, normalizedAccountId);

        const portfolioCache = readCache(CACHE_KEYS.portfolio);
        if (portfolioCache && typeof portfolioCache === "object") {
          writeCache(CACHE_KEYS.portfolio, {
            ...portfolioCache,
            accountId: normalizedAccountId,
            updatedAt: Date.now()
          });
        }
      }

      function setLoading(isLoading) {
        loadBtn.disabled = isLoading;
        analyzeBtn.disabled = isLoading || !accountInput.value.trim();
      }

      tokenToggleBtn.addEventListener("click", () => {
        const expanded = tokenToggleBtn.getAttribute("aria-expanded") === "true";
        setControlsVisible(!expanded);
      });

      tokenInput.addEventListener("input", () => {
        saveSessionToken(tokenInput.value.trim());
      });

      rememberBtn.addEventListener("click", () => {
        const token = tokenInput.value.trim();
        if (!token) {
          localStorage.removeItem(TOKEN_KEYS.persistent);
          saveSessionToken("");
          setStatus("Токен удален из browser storage");
          return;
        }
        saveSessionToken(token);
        localStorage.setItem(TOKEN_KEYS.persistent, token);
        setStatus("Токен сохранен в localStorage");
      });

      accountInput.addEventListener("input", () => {
        const accountId = accountInput.value.trim();
        analyzeBtn.disabled = !accountId;
        syncAccountInSharedCache(accountId);
      });

      function renderAccounts(accounts) {
        accountsList.innerHTML = "";
        for (const acc of accounts) {
          const option = document.createElement("option");
          option.value = acc.id;
          option.label = (acc.name || "Счет") + " (" + (acc.type || "-") + ")";
          accountsList.appendChild(option);
        }
        if (!accountInput.value && accounts[0]) {
          accountInput.value = accounts[0].id;
        }
        const accountId = accountInput.value.trim();
        analyzeBtn.disabled = !accountId;
        syncAccountsCache(accounts, accountId);
        syncAccountInSharedCache(accountId);
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

      function formatRub(value) {
        return new Intl.NumberFormat("ru-RU", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(value) + " ₽";
      }

      function formatSignedRub(value) {
        const sign = value > 0 ? "+" : value < 0 ? "-" : "";
        return sign + formatRub(Math.abs(value));
      }

      function formatPct(value) {
        return new Intl.NumberFormat("ru-RU", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(value) + "%";
      }

      function metricNumber(value, fallbackText) {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        return parseNumberFromText(fallbackText || "0");
      }

      function buildSummary(body) {
        const totalText = body?.total || "-";
        const totalValue = metricNumber(
          body?.profitBreakdown?.currentValue,
          body?.profitBreakdown?.currentValueRub || totalText
        );
        const profitValue = metricNumber(body?.profitValue, body?.profitRub || "0");
        const invested = Math.max(0, totalValue - profitValue);
        const profitPct = parseNumberFromText(body?.profitPct || "0");
        const yieldPct = parseNumberFromText(body?.yieldPct || "0");
        const passivePct = parseNumberFromText(body?.passiveIncomeYieldPct || "0");
        const passiveTotal = metricNumber(body?.passiveIncomeTotal, body?.passiveIncomeTotalRub || "0");
        const breakdown = {
          currentValue: metricNumber(
            body?.profitBreakdown?.currentValue,
            body?.profitBreakdown?.currentValueRub || "0"
          ),
          tradesNet: metricNumber(body?.profitBreakdown?.tradesNet, body?.profitBreakdown?.tradesNetRub || "0"),
          coupons: metricNumber(body?.profitBreakdown?.coupons, body?.profitBreakdown?.couponsRub || "0"),
          dividends: metricNumber(body?.profitBreakdown?.dividends, body?.profitBreakdown?.dividendsRub || "0"),
          commissions: Math.abs(
            metricNumber(body?.profitBreakdown?.commissions, body?.profitBreakdown?.commissionsRub || "0")
          ),
          taxes: Math.abs(metricNumber(body?.profitBreakdown?.taxes, body?.profitBreakdown?.taxesRub || "0"))
        };
        const currencyRow = Array.isArray(body?.assetBreakdown)
          ? body.assetBreakdown.find((row) => String(row?.type || "").toLowerCase() === "currency")
          : null;
        const currencyValue = currencyRow
          ? metricNumber(currencyRow?.value, currencyRow?.valueText || "0")
          : 0;
        return {
          totalText,
          invested,
          profitValue,
          profitPct,
          yieldPct,
          passivePct,
          passiveTotal,
          currencyValue,
          currencyText: currencyRow?.valueText || formatRub(currencyValue),
          breakdown
        };
      }

      function renderKpis(summary) {
        const section = document.createElement("section");
        section.className = "kpis";
        section.innerHTML =
          "<article class='kpi'>" +
            "<div class='kpi-label'><span class='dot cost'></span>Стоимость</div>" +
            "<div class='kpi-value' data-kpi='total'>-</div>" +
            "<div class='kpi-sub' data-kpi='invested'>-</div>" +
          "</article>" +
          "<article class='kpi kpi-profit-card'>" +
            "<div class='kpi-label'><span class='dot profit'></span>Прибыль</div>" +
            "<div class='kpi-value'><span data-kpi='profit'>-</span><span class='kpi-change' data-kpi='profitPct'>-</span></div>" +
            "<div class='kpi-sub' data-kpi='daily'>-</div>" +
            "<div class='profit-tooltip'>" +
              "<div class='profit-tooltip-title'>Формула: текущая + результат сделок + начисления - комиссии - налоги</div>" +
              "<div class='profit-tooltip-row'><span>Текущая стоимость</span><span data-kpi='tipCurrentValue'>-</span></div>" +
              "<div class='profit-tooltip-row'><span>Результат сделок</span><span data-kpi='tipTradesNet'>-</span></div>" +
              "<div class='profit-tooltip-row'><span>Купоны</span><span data-kpi='tipCoupons'>-</span></div>" +
              "<div class='profit-tooltip-row'><span>Дивиденды</span><span data-kpi='tipDividends'>-</span></div>" +
              "<div class='profit-tooltip-row'><span>Комиссии</span><span data-kpi='tipCommissions'>-</span></div>" +
              "<div class='profit-tooltip-row'><span>Налоги (див/куп)</span><span data-kpi='tipTaxes'>-</span></div>" +
            "</div>" +
          "</article>" +
          "<article class='kpi'>" +
            "<div class='kpi-label'><span class='dot yield'></span>Доходность</div>" +
            "<div class='kpi-value' data-kpi='yield'>-</div>" +
            "<div class='kpi-sub'>Расчет по текущему портфелю</div>" +
          "</article>" +
          "<article class='kpi'>" +
            "<div class='kpi-label'><span class='dot passive'></span>Пассивный доход</div>" +
            "<div class='kpi-value'><span data-kpi='passive'>-</span><span class='kpi-change' data-kpi='passiveGrowth'>-</span></div>" +
            "<div class='kpi-sub' data-kpi='passiveYear'>-</div>" +
          "</article>";

        const set = (key, value) => {
          const el = section.querySelector("[data-kpi='" + key + "']");
          if (el) el.textContent = value;
        };

        set("total", summary.totalText);
        set("invested", formatRub(summary.invested) + " вложено");
        set("profit", (summary.profitValue >= 0 ? "+" : "") + formatRub(summary.profitValue));
        set("profitPct", formatPct(summary.profitPct));
        set("daily", "Изменение: " + formatPct(summary.profitPct));
        set("yield", formatPct(summary.yieldPct));
        set("passive", formatPct(summary.passivePct));
        set("passiveGrowth", formatPct(summary.passivePct));
        set("passiveYear", formatRub(summary.passiveTotal) + " за 12 мес");
        set("tipCurrentValue", formatSignedRub(summary.breakdown.currentValue));
        set("tipTradesNet", formatSignedRub(summary.breakdown.tradesNet));
        set("tipCoupons", formatSignedRub(summary.breakdown.coupons));
        set("tipDividends", formatSignedRub(summary.breakdown.dividends));
        set("tipCommissions", formatSignedRub(-summary.breakdown.commissions));
        set("tipTaxes", formatSignedRub(-summary.breakdown.taxes));

        return section;
      }

      function renderCurrencyRow(summary) {
        const row = document.createElement("section");
        row.className = "currency-row";
        row.innerHTML =
          "<span class='currency-chevron'>»</span>" +
          "<span class='currency-label'>Валюта</span>" +
          "<span class='currency-value'>" + (summary.currencyText || formatRub(summary.currencyValue)) + "</span>";
        return row;
      }

      function renderKeyValueTable(rows) {
        const table = document.createElement("table");
        for (const [k, v] of rows) {
          const tr = document.createElement("tr");
          const tdK = document.createElement("td");
          const tdV = document.createElement("td");
          tdK.textContent = k;
          tdK.style.fontWeight = "700";
          tdV.textContent = v;
          tr.appendChild(tdK);
          tr.appendChild(tdV);
          table.appendChild(tr);
        }
        return table;
      }

      function isCodeLike(value) {
        if (typeof value !== "string") return false;
        const trimmed = value.trim();
        if (!trimmed) return false;
        const upper = trimmed.toUpperCase();
        if (upper.startsWith("TCS00A") || upper.startsWith("RU")) return true;
        if (/^[A-Z0-9]{12}$/.test(upper)) return true;
        if (/^[A-Z0-9._-]{6,}$/i.test(trimmed)) {
          const hasDigit = /\\d/.test(trimmed);
          const noSpaces = !/\\s/.test(trimmed);
          if (noSpaces && (hasDigit || trimmed === upper)) return true;
        }
        return false;
      }

      function sanitizeDeep(value) {
        if (Array.isArray(value)) return value.map(sanitizeDeep);
        if (value && typeof value === "object") {
          const out = {};
          for (const [k, v] of Object.entries(value)) {
            out[k] = sanitizeDeep(v);
          }
          return out;
        }
        if (typeof value === "string" && isCodeLike(value)) {
          return "Название недоступно";
        }
        return value;
      }

      function renderRawJson(body) {
        const pre = document.createElement("pre");
        pre.textContent = JSON.stringify(sanitizeDeep(body), null, 2);
        return pre;
      }

      function renderAccountsPretty(accounts) {
        const wrapper = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = "Счета";
        title.style.margin = "0 0 8px";
        wrapper.appendChild(title);

        for (const acc of accounts) {
          const card = document.createElement("div");
          card.style.border = "1px solid #3f4762";
          card.style.borderRadius = "10px";
          card.style.padding = "10px 12px";
          card.style.marginBottom = "8px";
          card.style.background = "#2d3346";

          const rows = [
            ["Название", acc.name || ""],
            ["ID", acc.id || ""],
            ["Тип", acc.type || ""],
            ["Статус", acc.status || ""],
            ["Доступ", acc.access_level || ""],
          ];
          card.appendChild(renderKeyValueTable(rows));
          wrapper.appendChild(card);
        }
        return wrapper;
      }

      function renderMetrics(data) {
        const wrapper = document.createElement("div");
        wrapper.className = "grid";
        const metrics = [
          ["Стоимость портфеля", data.total || "-"],
          ["Прибыль/убыток", data.profitRub || "-"],
          ["Прибыль/убыток, %", data.profitPct || "-"],
          ["Купонная доходность, %", data.yieldPct || "-"],
        ];
        for (const [label, value] of metrics) {
          const el = document.createElement("div");
          el.className = "metric";
          const h4 = document.createElement("h4");
          h4.textContent = label;
          const v = document.createElement("div");
          v.textContent = value;
          el.appendChild(h4);
          el.appendChild(v);
          wrapper.appendChild(el);
        }
        return wrapper;
      }

      function renderSimpleTable(title, rows, columns) {
        const wrapper = document.createElement("div");
        wrapper.className = "section";
        const h3 = document.createElement("h3");
        h3.textContent = title;
        wrapper.appendChild(h3);

        if (!rows || !rows.length) {
          const empty = document.createElement("div");
          empty.textContent = "Нет данных.";
          wrapper.appendChild(empty);
          return wrapper;
        }

        const table = document.createElement("table");
        const header = document.createElement("tr");
        for (const col of columns) {
          const th = document.createElement("th");
          th.textContent = col;
          header.appendChild(th);
        }
        table.appendChild(header);

        for (const row of rows) {
          const tr = document.createElement("tr");
          for (const col of columns) {
            const td = document.createElement("td");
            td.textContent = row[col] || "";
            tr.appendChild(td);
          }
          table.appendChild(tr);
        }
        wrapper.appendChild(table);
        return wrapper;
      }

      function renderPieList(title, items, labelKey, valueKey, percentKey) {
        const wrapper = document.createElement("div");
        wrapper.className = "section";
        const h3 = document.createElement("h3");
        h3.textContent = title;
        wrapper.appendChild(h3);

        if (!items || !items.length) {
          const empty = document.createElement("div");
          empty.textContent = "Нет данных.";
          wrapper.appendChild(empty);
          return wrapper;
        }

        const list = document.createElement("div");
        list.className = "grid";
        for (const item of items) {
          const card = document.createElement("div");
          card.className = "card-block";
          const line = document.createElement("div");
          line.innerHTML =
            "<strong>" +
            item[labelKey] +
            "</strong> <span class=\\"pill\\">" +
            item[percentKey] +
            "</span>";
          const val = document.createElement("div");
          val.textContent = item[valueKey];
          const bar = document.createElement("div");
          bar.className = "bar";
          const span = document.createElement("span");
          span.style.width = item.percentOfTotal || item[percentKey];
          bar.appendChild(span);
          card.appendChild(line);
          card.appendChild(val);
          card.appendChild(bar);
          list.appendChild(card);
        }
        wrapper.appendChild(list);
        return wrapper;
      }

      function renderAssetsBreakdown(items) {
        const wrapper = document.createElement("div");
        wrapper.className = "section";
        const h3 = document.createElement("h3");
        h3.textContent = "Структура по типам";
        wrapper.appendChild(h3);

        if (!items || !items.length) {
          const empty = document.createElement("div");
          empty.textContent = "Нет данных.";
          wrapper.appendChild(empty);
          return wrapper;
        }

        for (const item of items) {
          const block = document.createElement("div");
          block.className = "card-block";
          block.style.marginBottom = "12px";
          const header = document.createElement("div");
          header.innerHTML =
            "<strong>" +
            item.typeLabel +
            "</strong> <span class=\\"pill\\">" +
            item.percentText +
            "</span>";
          const val = document.createElement("div");
          val.textContent = item.valueText;
          block.appendChild(header);
          block.appendChild(val);

          if (item.assets && item.assets.length) {
            const table = document.createElement("table");
            const head = document.createElement("tr");
            const cols = ["Актив", "Доля", "Сумма"];
            for (const c of cols) {
              const th = document.createElement("th");
              th.textContent = c;
              head.appendChild(th);
            }
            table.appendChild(head);

            for (const asset of item.assets) {
              const tr = document.createElement("tr");
              const tdName = document.createElement("td");
              tdName.textContent = asset.name;
              const tdPct = document.createElement("td");
              tdPct.textContent = asset.percentText;
              const tdValue = document.createElement("td");
              tdValue.textContent = asset.valueText;
              tr.appendChild(tdName);
              tr.appendChild(tdPct);
              tr.appendChild(tdValue);
              table.appendChild(tr);
            }
            block.appendChild(table);
          }

          wrapper.appendChild(block);
        }

        return wrapper;
      }

      function renderRedemptions(details) {
        const wrapper = document.createElement("div");
        wrapper.className = "section";
        const h3 = document.createElement("h3");
        h3.textContent = "Погашения по месяцам";
        wrapper.appendChild(h3);

        if (!details || !details.length) {
          const empty = document.createElement("div");
          empty.textContent = "Нет данных.";
          wrapper.appendChild(empty);
          return wrapper;
        }

        const table = document.createElement("table");
        const header = document.createElement("tr");
        const cols = ["Месяц", "Бонд", "Сумма"];
        for (const c of cols) {
          const th = document.createElement("th");
          th.textContent = c;
          header.appendChild(th);
        }
        table.appendChild(header);

        for (const row of details) {
          const tr = document.createElement("tr");
          const tdMonth = document.createElement("td");
          tdMonth.textContent = row.month;
          const tdName = document.createElement("td");
          tdName.textContent = row.name;
          const tdAmount = document.createElement("td");
          tdAmount.textContent = row.amount;
          tr.appendChild(tdMonth);
          tr.appendChild(tdName);
          tr.appendChild(tdAmount);
          table.appendChild(tr);
        }

        wrapper.appendChild(table);
        return wrapper;
      }

      function renderTabs(tabs) {
        const wrapper = document.createElement("div");
        wrapper.className = "tabs";

        const buttons = document.createElement("div");
        buttons.className = "tab-buttons";
        wrapper.appendChild(buttons);

        const content = document.createElement("div");
        wrapper.appendChild(content);

        const panels = [];
        const btns = [];
        let activeIndex = 0;

        function setActive(index) {
          activeIndex = index;
          btns.forEach((btn, i) => {
            btn.classList.toggle("is-active", i === activeIndex);
            btn.setAttribute("aria-selected", String(i === activeIndex));
          });
          panels.forEach((panel, i) => {
            panel.classList.toggle("is-active", i === activeIndex);
          });
        }

        tabs.forEach((tab, index) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "tab-btn";
          const icon = typeof tab.icon === "string" ? tab.icon : "";
          if (icon) {
            const iconEl = document.createElement("span");
            iconEl.className = "tab-icon";
            iconEl.textContent = icon;
            btn.appendChild(iconEl);
          }
          const labelEl = document.createElement("span");
          labelEl.textContent = tab.label;
          btn.appendChild(labelEl);
          btn.setAttribute("role", "tab");
          btn.addEventListener("click", () => setActive(index));
          buttons.appendChild(btn);
          btns.push(btn);

          const panel = document.createElement("div");
          panel.className = "tab-panel";
          panel.setAttribute("role", "tabpanel");
          panel.appendChild(tab.content);
          content.appendChild(panel);
          panels.push(panel);
        });

        setActive(0);
        return wrapper;
      }

      function showContent(node) {
        out.innerHTML = "";
        out.appendChild(node);
      }

      function renderAnalyticsDashboard(body) {
        const container = document.createElement("div");
        const summary = buildSummary(body);

        const common = document.createElement("div");
        common.appendChild(renderKpis(summary));
        common.appendChild(renderCurrencyRow(summary));

        const diversification = document.createElement("div");
        diversification.appendChild(
          renderPieList(
            "Структура по типам (pie)",
            body.assetPie,
            "label",
            "valueText",
            "percentText"
          )
        );
        diversification.appendChild(renderAssetsBreakdown(body.assetBreakdown));

        const dividends = document.createElement("div");
        dividends.appendChild(
          renderSimpleTable(
            "Будущие выплаты (12 месяцев)",
            body.incomeNext12,
            ["month", "amount"]
          )
        );
        dividends.appendChild(
          renderSimpleTable(
            "Полученные дивиденды (12 месяцев)",
            body.receivedDividends12,
            ["month", "amount"]
          )
        );

        const growth = document.createElement("div");
        const growthSection = document.createElement("div");
        growthSection.className = "section";
        const growthTitle = document.createElement("h3");
        growthTitle.textContent = "Динамика";
        growthSection.appendChild(growthTitle);
        growthSection.appendChild(
          renderKeyValueTable([
            ["Прибыль", (summary.profitValue >= 0 ? "+" : "") + formatRub(summary.profitValue)],
            ["Доходность", formatPct(summary.profitPct)],
            ["Купонная доходность", formatPct(summary.yieldPct)],
            ["Пассивный доход", formatPct(summary.passivePct)]
          ])
        );
        growth.appendChild(growthSection);
        growth.appendChild(
          renderSimpleTable("Ближайшие события (7 дней)", body.upcomingEvents, [
            "date",
            "eventType",
            "name",
            "amount"
          ])
        );

        const metrics = document.createElement("div");
        metrics.appendChild(renderMetrics(body));
        const formula = document.createElement("div");
        formula.className = "section";
        const formulaTitle = document.createElement("h3");
        formulaTitle.textContent = "Детализация прибыли";
        formula.appendChild(formulaTitle);
        formula.appendChild(
          renderKeyValueTable([
            ["Текущая стоимость", formatSignedRub(summary.breakdown.currentValue)],
            ["Результат сделок", formatSignedRub(summary.breakdown.tradesNet)],
            ["Купоны", formatSignedRub(summary.breakdown.coupons)],
            ["Дивиденды", formatSignedRub(summary.breakdown.dividends)],
            ["Комиссии", formatSignedRub(-summary.breakdown.commissions)],
            ["Налоги", formatSignedRub(-summary.breakdown.taxes)]
          ])
        );
        metrics.appendChild(formula);

        const report = document.createElement("div");
        const reportWrap = document.createElement("div");
        reportWrap.className = "section";
        const reportTitle = document.createElement("h3");
        reportTitle.textContent = "Отчет (сырой ответ API)";
        reportWrap.appendChild(reportTitle);
        reportWrap.appendChild(renderRawJson(body));
        report.appendChild(reportWrap);

        const bonds = document.createElement("div");
        bonds.appendChild(
          renderPieList(
            "Облигации по компаниям",
            body.bondCompanies,
            "name",
            "valueText",
            "percentText"
          )
        );
        if (body.bondCompaniesCount) {
          const count = document.createElement("div");
          count.className = "hint";
          count.textContent = body.bondCompaniesCount;
          bonds.appendChild(count);
        }
        bonds.appendChild(
          renderSimpleTable(
            "График погашений (12 месяцев)",
            body.redemptionsNext12,
            ["month", "amount"]
          )
        );
        bonds.appendChild(renderRedemptions(body.redemptionsDetails));

        container.appendChild(
          renderTabs([
            { label: "Общее", icon: "◼", content: common },
            { label: "Диверсификация", icon: "◔", content: diversification },
            { label: "Дивиденды", icon: "◉", content: dividends },
            { label: "Рост", icon: "◢", content: growth },
            { label: "Метрики", icon: "◫", content: metrics },
            { label: "Отчет", icon: "▤", content: report },
            { label: "Облигации", icon: "◍", content: bonds }
          ])
        );
        showContent(container);
      }

      function restoreFromSharedCache() {
        let hasAccount = false;
        const accountsCache = readCache(CACHE_KEYS.accounts);
        if (accountsCache && Array.isArray(accountsCache.accounts)) {
          renderAccounts(accountsCache.accounts);
          if (!accountInput.value && accountsCache.accountId) {
            accountInput.value = accountsCache.accountId;
            hasAccount = true;
          }
        }

        const portfolioCache = readCache(CACHE_KEYS.portfolio);
        if (!accountInput.value && portfolioCache?.accountId) {
          accountInput.value = portfolioCache.accountId;
          hasAccount = true;
        }

        hasAccount = hasAccount || Boolean(accountInput.value.trim());
        analyzeBtn.disabled = !accountInput.value.trim();
        return hasAccount;
      }

      function restoreAnalyticsCache() {
        const analyticsCache = readCache(CACHE_KEYS.analytics);
        if (!analyticsCache || typeof analyticsCache !== "object" || !analyticsCache.body) {
          return false;
        }

        const cachedAccountId =
          typeof analyticsCache.accountId === "string" ? analyticsCache.accountId : "";
        const currentAccountId = accountInput.value.trim();
        if (cachedAccountId && currentAccountId && cachedAccountId !== currentAccountId) {
          return false;
        }

        if (!currentAccountId && cachedAccountId) {
          accountInput.value = cachedAccountId;
          analyzeBtn.disabled = false;
        }

        renderAnalyticsDashboard(analyticsCache.body);
        setStatus("Показаны данные аналитики из кэша");
        return true;
      }

      async function loadAccounts(options = {}) {
        const { silent = false } = options;
        const token = tokenInput.value.trim();
        if (!token) {
          if (!silent) setStatus("Введите токен");
          return false;
        }

        if (!silent) {
          out.textContent = "Запрос...";
          setStatus("Загрузка счетов...");
        }

        setLoading(true);
        try {
          const res = await fetch("/api/accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
          });
          const body = await res.json();
          if (res.ok && body && Array.isArray(body.accounts)) {
            showContent(renderAccountsPretty(body.accounts));
            renderAccounts(body.accounts);
            if (!silent) setStatus("Счета загружены");
            return true;
          }
          showContent(renderRawJson(body));
          if (!silent) setStatus("Не удалось загрузить счета");
        } catch (err) {
          out.textContent = String(err);
          if (!silent) setStatus("Сетевая ошибка при загрузке счетов");
        } finally {
          setLoading(false);
        }
        return false;
      }

      async function loadAnalytics(options = {}) {
        const { silent = false } = options;
        const token = tokenInput.value.trim();
        let accountId = accountInput.value.trim();

        if (!token) {
          if (!silent) setStatus("Введите токен");
          return false;
        }

        if (!accountId) {
          const loaded = await loadAccounts({ silent: true });
          if (!loaded || !accountInput.value.trim()) {
            if (!silent) setStatus("Выберите счет");
            return false;
          }
          accountId = accountInput.value.trim();
        }

        if (!silent) {
          out.textContent = "Запрос...";
          setStatus("Загрузка аналитики...");
        }

        setLoading(true);
        try {
          const res = await fetch("/api/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, accountId })
          });
          const body = await res.json();
          if (res.ok && body) {
            renderAnalyticsDashboard(body);
            writeCache(CACHE_KEYS.analytics, {
              body,
              accountId,
              updatedAt: Date.now()
            });
            syncAccountInSharedCache(accountId);
            if (!silent) setStatus("Аналитика обновлена");
            return true;
          }
          showContent(renderRawJson(body));
          if (!silent) setStatus("Не удалось получить аналитику");
        } catch (err) {
          out.textContent = String(err);
          if (!silent) setStatus("Сетевая ошибка при загрузке аналитики");
        } finally {
          setLoading(false);
        }

        return false;
      }

      loadBtn.addEventListener("click", () => {
        void loadAccounts();
      });

      analyzeBtn.addEventListener("click", () => {
        void loadAnalytics();
      });

      refreshCacheBtn.addEventListener("click", async () => {
        setStatus("Сбрасываю кэш...");
        refreshCacheBtn.disabled = true;
        try {
          await fetch("/api/cache/refresh", { method: "POST" });
          setStatus("Кэш очищен");
        } catch {
          setStatus("Ошибка сброса кэша");
        } finally {
          refreshCacheBtn.disabled = false;
        }
      });

      refreshNamesBtn.addEventListener("click", async () => {
        setStatus("Обновляю названия...");
        refreshNamesBtn.disabled = true;
        try {
          const res = await fetch("/api/names/refresh", { method: "POST" });
          if (res.ok) {
            const data = await res.json();
            setStatus("Обновлено: " + (data.updated || 0));
          } else {
            setStatus("Ошибка обновления названий");
          }
        } catch {
          setStatus("Ошибка обновления названий");
        } finally {
          refreshNamesBtn.disabled = false;
        }
      });

      async function bootstrap() {
        const savedToken = getSavedToken();
        if (savedToken) {
          tokenInput.value = savedToken;
          saveSessionToken(savedToken);
        }

        setControlsVisible(false);
        const hasAccount = restoreFromSharedCache();
        const hasCachedAnalytics = restoreAnalyticsCache();
        if (hasCachedAnalytics) return;

        if (!tokenInput.value.trim()) {
          setStatus("Введите токен для загрузки аналитики");
          return;
        }

        if (hasAccount) {
          setStatus("Загружаю аналитику...");
          const ok = await loadAnalytics({ silent: true });
          setStatus(ok ? "Аналитика обновлена" : "Не удалось загрузить аналитику");
          return;
        }

        setStatus("Загружаю счета...");
        const loaded = await loadAccounts({ silent: true });
        if (!loaded || !accountInput.value.trim()) {
          setStatus("Выберите счет и нажмите «Аналитика»");
          return;
        }

        const ok = await loadAnalytics({ silent: true });
        setStatus(ok ? "Аналитика обновлена" : "Не удалось загрузить аналитику");
      }

      bootstrap();
    </script>
  </body>
</html>`;
}


