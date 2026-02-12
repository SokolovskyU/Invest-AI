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
        --bg-1: #e5ece7;
        --bg-2: #dbe5de;
        --bg-3: #cfdad1;
        --panel: #f8fbf9f0;
        --line: #d8e5df;
        --text: #182224;
        --muted: #526569;
        --accent: #0c8b77;
        --accent-2: #0b6f8a;
        --error: #b00020;
        color-scheme: light;
        font-family: "Manrope", "Segoe UI", sans-serif;
        color: var(--text);
      }
      body {
        margin: 0;
        min-height: 100vh;
        padding: 34px 22px 56px;
        background:
          radial-gradient(1200px 600px at -10% -25%, #dbe7e0 0%, transparent 58%),
          radial-gradient(1000px 700px at 120% -20%, #cfded6 0%, transparent 62%),
          linear-gradient(165deg, var(--bg-1) 0%, var(--bg-3) 100%);
      }
      .card {
        max-width: 980px;
        margin: 0 auto;
        background: var(--panel);
        border-radius: 24px;
        padding: 28px;
        backdrop-filter: blur(8px);
        box-shadow: 0 18px 42px rgba(51, 74, 65, 0.1);
        border: 1px solid #eef3f0;
      }
      h1 {
        margin: 0 0 12px;
        font-size: clamp(28px, 4vw, 34px);
        letter-spacing: -0.6px;
        line-height: 1.05;
      }
      p {
        margin: 0 0 16px;
        color: var(--muted);
      }
      label {
        display: block;
        font-weight: 700;
        margin-bottom: 8px;
        color: #213135;
      }
      input, button, select {
        font-size: 14px;
        padding: 11px 13px;
        border-radius: 12px;
        border: 1px solid var(--line);
        transition: all 0.16s ease;
      }
      input, select {
        width: 100%;
        box-sizing: border-box;
        margin-bottom: 12px;
        background: #f9fcfb;
        color: var(--text);
      }
      input:focus, select:focus {
        outline: none;
        border-color: #83c7ba;
        box-shadow: 0 0 0 4px rgba(12, 139, 119, 0.12);
        background: #ffffff;
      }
      button {
        background: linear-gradient(140deg, var(--accent) 0%, var(--accent-2) 100%);
        color: #fff;
        border: none;
        cursor: pointer;
        box-shadow: 0 10px 20px rgba(11, 111, 138, 0.22);
      }
      button:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 14px 24px rgba(11, 111, 138, 0.26);
      }
      button:disabled {
        opacity: 0.6;
        cursor: default;
        box-shadow: none;
      }
      .row {
        display: flex;
        gap: 12px;
        align-items: flex-end;
        flex-wrap: wrap;
      }
      .row > input {
        flex: 1 1 260px;
        margin-bottom: 0;
      }
      .row > button {
        white-space: nowrap;
        min-height: 42px;
      }
      .hint {
        font-size: 12px;
        color: #657b80;
      }
      .token-toggle {
        margin-bottom: 10px;
        background: #eff6f4;
        color: #214248;
        border: 1px solid #d3e2de;
        box-shadow: none;
      }
      .token-toggle:hover:not(:disabled) {
        box-shadow: none;
        transform: none;
        background: #e8f1ef;
      }
      .token-panel {
        display: grid;
        gap: 10px;
        overflow: hidden;
        transition: max-height 0.2s ease, opacity 0.2s ease;
        max-height: 220px;
        opacity: 1;
      }
      .token-panel.is-collapsed {
        max-height: 0;
        opacity: 0;
        pointer-events: none;
      }
      .remember-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-weight: 600;
      }
      .remember-row input {
        width: auto;
        margin: 0;
      }
      .section {
        margin-top: 24px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 14px;
      }
      .metric {
        border: 1px solid #e2ece8;
        background: linear-gradient(180deg, #ffffff 0%, #f8fcfb 100%);
        border-radius: 14px;
        padding: 14px;
      }
      .metric h4 {
        margin: 0 0 8px;
        font-size: 13px;
        color: #556a70;
      }
      .metric div {
        font-size: 20px;
        font-weight: 700;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        border-radius: 12px;
        overflow: hidden;
      }
      th, td {
        text-align: left;
        padding: 8px 10px;
        border-bottom: 1px solid #e8f0ed;
      }
      th {
        font-weight: 700;
        border-bottom: 1px solid #dce8e4;
        background: #f2f8f6;
        color: #294047;
      }
      .pill {
        display: inline-block;
        background: #e8f4ef;
        color: var(--accent);
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 12px;
        margin-left: 6px;
        font-weight: 700;
      }
      a {
        color: var(--accent-2);
        text-decoration: none;
        font-weight: 700;
      }
      a:hover {
        text-decoration: underline;
      }
      .subtle {
        color: #64797f;
      }
      .bar {
        height: 10px;
        border-radius: 999px;
        background: #e8f1ef;
        overflow: hidden;
        margin-top: 8px;
      }
      .bar > span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, var(--accent) 0%, #20b69c 100%);
      }
      .card-block {
        border: 1px solid #e2ece8;
        border-radius: 14px;
        padding: 14px;
        background: #ffffff;
      }
      .actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
      }
      .tabs {
        margin-top: 18px;
      }
      .tab-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
      }
      .tab-btn {
        background: #eaf3f0;
        color: #29515a;
        border: 1px solid #d6e5e1;
        box-shadow: none;
      }
      .tab-btn:hover:not(:disabled) {
        transform: none;
        box-shadow: none;
        background: #dfece8;
      }
      .tab-btn.is-active {
        background: linear-gradient(140deg, var(--accent) 0%, var(--accent-2) 100%);
        color: #fff;
        border-color: transparent;
      }
      .tab-panel {
        display: none;
      }
      .tab-panel.is-active {
        display: block;
      }
      .error {
        color: var(--error);
      }
      .right {
        text-align: right;
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
      }
      #out {
        background: #fbfefd;
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 14px;
      }
      @media (max-width: 760px) {
        body {
          padding: 20px 12px 28px;
        }
        .card {
          border-radius: 18px;
          padding: 16px;
        }
        .row > input,
        .row > button {
          flex: 1 1 100%;
          width: 100%;
        }
        .actions > button {
          flex: 1 1 100%;
        }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Аналитика</h1>
      <p class="subtle">Локальная аналитика по портфелю и доходам.</p>
      <p><a href="/">Вернуться к портфелю</a></p>
      <button id="tokenToggle" class="token-toggle" type="button" aria-expanded="false">Show API token</button>
      <div id="tokenPanel" class="token-panel is-collapsed">
        <label for="token">API token</label>
        <input id="token" type="password" placeholder="t.********" />
        <label class="remember-row">
          <input id="remember" type="checkbox" />
          Remember token in browser (localStorage)
        </label>
      </div>
      <div class="row">
        <button id="load">Accounts</button>
        <button id="analyze" disabled>Analytics</button>
      </div>
      <label for="account">Счет</label>
      <input id="account" list="accounts" placeholder="account_id" />
      <datalist id="accounts"></datalist>
      <div class="actions">
        <button id="refreshNames">Обновить названия</button>
        <button id="refreshCache">Сбросить кэш</button>
      </div>
      <div id="progress" class="hint"></div>

      <div id="out" class="section">Ожидаю запрос...</div>
    </div>

    <script>
      const out = document.getElementById("out");
      const btn = document.getElementById("load");
      const analyzeBtn = document.getElementById("analyze");
      const tokenInput = document.getElementById("token");
      const tokenToggleBtn = document.getElementById("tokenToggle");
      const tokenPanel = document.getElementById("tokenPanel");
      const rememberInput = document.getElementById("remember");
      const accountInput = document.getElementById("account");
      const accountsList = document.getElementById("accounts");
      const refreshNamesBtn = document.getElementById("refreshNames");
      const refreshCacheBtn = document.getElementById("refreshCache");
      const nameProgressEl = document.getElementById("progress");

      const savedToken = localStorage.getItem("tinvest_token");
      if (savedToken) {
        tokenInput.value = savedToken;
        rememberInput.checked = true;
      }

      function setTokenPanelVisible(isVisible) {
        tokenPanel.classList.toggle("is-collapsed", !isVisible);
        tokenToggleBtn.setAttribute("aria-expanded", String(isVisible));
        tokenToggleBtn.textContent = isVisible
          ? "Hide API token"
          : "Show API token";
      }

      setTokenPanelVisible(Boolean(savedToken));

      tokenToggleBtn.addEventListener("click", () => {
        const expanded = tokenToggleBtn.getAttribute("aria-expanded") === "true";
        setTokenPanelVisible(!expanded);
      });

      rememberInput.addEventListener("change", () => {
        if (!rememberInput.checked) {
          localStorage.removeItem("tinvest_token");
        } else if (tokenInput.value.trim()) {
          localStorage.setItem("tinvest_token", tokenInput.value.trim());
        }
      });

      tokenInput.addEventListener("input", () => {
        if (rememberInput.checked) {
          localStorage.setItem("tinvest_token", tokenInput.value.trim());
        }
      });

      function setLoading(isLoading) {
        btn.disabled = isLoading;
        analyzeBtn.disabled = isLoading || !accountInput.value.trim();
      }

      accountInput.addEventListener("input", () => {
        analyzeBtn.disabled = !accountInput.value.trim();
      });

      function renderAccounts(accounts) {
        accountsList.innerHTML = "";
        for (const acc of accounts) {
          const option = document.createElement("option");
          option.value = acc.id;
          option.label = acc.name + " (" + acc.type + ")";
          accountsList.appendChild(option);
        }
        if (!accountInput.value && accounts[0]) {
          accountInput.value = accounts[0].id;
        }
        analyzeBtn.disabled = !accountInput.value.trim();
      }

      function renderKeyValueTable(rows) {
        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        for (const [k, v] of rows) {
          const tr = document.createElement("tr");
          const tdK = document.createElement("td");
          const tdV = document.createElement("td");
          tdK.textContent = k;
          tdK.style.fontWeight = "600";
          tdK.style.padding = "6px 8px";
          tdK.style.borderBottom = "1px solid #eee";
          tdV.textContent = v;
          tdV.style.padding = "6px 8px";
          tdV.style.borderBottom = "1px solid #eee";
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
          card.style.border = "1px solid #e6e6e6";
          card.style.borderRadius = "10px";
          card.style.padding = "10px 12px";
          card.style.marginBottom = "8px";

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
          btn.textContent = tab.label;
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

      btn.addEventListener("click", async () => {
        out.textContent = "Запрос...";
        setLoading(true);
        const token = tokenInput.value.trim();

        try {
          const res = await fetch("/api/accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          const body = await res.json();
          if (res.ok && body && Array.isArray(body.accounts)) {
            showContent(renderAccountsPretty(body.accounts));
            renderAccounts(body.accounts);
          } else {
            showContent(renderRawJson(body));
          }
        } catch (err) {
          out.textContent = String(err);
        } finally {
          setLoading(false);
        }
      });

      analyzeBtn.addEventListener("click", async () => {
        out.textContent = "Запрос...";
        setLoading(true);
        const token = tokenInput.value.trim();
        const accountId = accountInput.value.trim();

        try {
          const res = await fetch("/api/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, accountId }),
          });
          const body = await res.json();
          if (res.ok && body) {
            const container = document.createElement("div");
            const overview = document.createElement("div");
            overview.appendChild(renderMetrics(body));
            overview.appendChild(
              renderPieList(
                "Структура по типам (pie)",
                body.assetPie,
                "label",
                "valueText",
                "percentText"
              )
            );
            overview.appendChild(renderAssetsBreakdown(body.assetBreakdown));

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

            const income = document.createElement("div");
            income.appendChild(
              renderSimpleTable(
                "Купоны/дивиденды по месяцам (12 месяцев)",
                body.incomeNext12,
                ["month", "amount"]
              )
            );
            income.appendChild(
              renderSimpleTable(
                "График погашений (12 месяцев)",
                body.redemptionsNext12,
                ["month", "amount"]
              )
            );
            income.appendChild(renderRedemptions(body.redemptionsDetails));

            container.appendChild(
              renderTabs([
                { label: "Overview", content: overview },
                { label: "Income", content: income },
                { label: "Bonds", content: bonds },
              ])
            );
            showContent(container);
          } else {
            showContent(renderRawJson(body));
          }
        } catch (err) {
          out.textContent = String(err);
        } finally {
          setLoading(false);
        }
      });

      refreshCacheBtn.addEventListener("click", async () => {
        nameProgressEl.textContent = "Сбрасываю кэш...";
        refreshCacheBtn.disabled = true;
        try {
          await fetch("/api/cache/refresh", { method: "POST" });
          nameProgressEl.textContent = "Кэш очищен";
        } catch {
          nameProgressEl.textContent = "Ошибка сброса кэша";
        } finally {
          refreshCacheBtn.disabled = false;
        }
      });

      refreshNamesBtn.addEventListener("click", async () => {
        nameProgressEl.textContent = "Обновляю названия...";
        refreshNamesBtn.disabled = true;
        try {
          const res = await fetch("/api/names/refresh", { method: "POST" });
          if (res.ok) {
            const data = await res.json();
            nameProgressEl.textContent =
              "Обновлено: " + (data.updated || 0);
          } else {
            nameProgressEl.textContent = "Ошибка обновления названий";
          }
        } catch {
          nameProgressEl.textContent = "Ошибка обновления названий";
        } finally {
          refreshNamesBtn.disabled = false;
        }
      });
    </script>
  </body>
</html>`;
}


