/* ── Navigation confirmation modal ─────────────────────────────────────────── */
let _pendingNav = null;

function confirmNav(type, name) {
  _pendingNav = { type, name };
  const existing = document.getElementById("nav-modal");
  if (existing) existing.remove();
  const typeKeys = { kata: "col.kata", karateka: "col.athlete", tournament: "col.tournament", country: "col.country" };
  const typeLabel = typeKeys[type] ? t(typeKeys[type]) : "";
  const dispName = displayName(type, name);
  const jp = (typeof lang !== "undefined" && lang === "jp");
  const msg = jp
    ? `<strong>${dispName}</strong> の${typeLabel}詳細へ移動しますか？`
    : `Navigate to <strong>${dispName}</strong> ${typeLabel} Details?`;
  const overlay = document.createElement("div");
  overlay.id = "nav-modal";
  overlay.className = "nav-modal-overlay";
  overlay.innerHTML = `<div class="nav-modal-box">
    <p class="nav-modal-msg">${msg}</p>
    <div class="nav-modal-btns">
      <button class="nav-modal-cancel" onclick="document.getElementById('nav-modal').remove()">${t("nav.cancel")}</button>
      <button class="nav-modal-go" onclick="document.getElementById('nav-modal').remove();_doNav()">${t("nav.go")}</button>
    </div>
  </div>`;
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function _doNav() {
  if (!_pendingNav) return;
  const { type, name } = _pendingNav;
  _pendingNav = null;
  /* save current state to history */
  const activeTab = document.querySelector(".tab-btn.active")?.dataset.tab;
  _navHistory.push({ tab: activeTab, card: _currentCard ? { ..._currentCard } : null });
  _updateBackBtn();
  if (type === "kata") {
    switchToTab("kata");
    setTimeout(() => {
      const row = DATA.kata[gender].find(r => r.Kata === name);
      if (row) { showKataCard(row); highlightRow("kata-tbody", "data-kata", name); scrollToCard("kata-card"); }
    }, 80);
  } else if (type === "karateka") {
    switchToTab("karateka");
    setTimeout(() => {
      const row = DATA.karateka[gender].find(r => r.Karateka === name);
      if (row) { showKaratekaCard(row); highlightRow("karateka-tbody", "data-karateka", name); scrollToCard("karateka-card"); }
    }, 80);
  } else if (type === "tournament") {
    switchToTab("tournaments");
    setTimeout(() => {
      const row = (DATA.tournaments || []).find(r => r.Tournament === name);
      if (row) { showTournamentCard(row); scrollToCard("tournaments-card"); }
    }, 80);
  } else if (type === "country") {
    switchToTab("countries");
    setTimeout(() => {
      const all = buildCountryStats();
      const row = all.find(r => r.Country === name);
      if (row) { showCountryCard(row, all); highlightRow("countries-tbody", "data-country", name); scrollToCard("countries-card"); }
    }, 80);
  }
  /* update hash */
  window.location.hash = `${type}/${encodeURIComponent(name)}`;
}

function _updateBackBtn() {
  const btn = document.getElementById("nav-back-btn");
  if (btn) btn.style.display = _navHistory.length > 0 ? "block" : "none";
}

function scrollToCard(cardId) {
  const el = document.getElementById(cardId);
  if (!el || el.classList.contains("hidden")) return;
  const sticky = document.querySelector(".sticky-top");
  const offset = sticky ? sticky.offsetHeight + 12 : 80;
  const y = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
}

function _navBack() {
  if (!_navHistory.length) return;
  const prev = _navHistory.pop();
  _updateBackBtn();
  switchToTab(prev.tab);
  if (prev.card) {
    setTimeout(() => {
      const { type, name } = prev.card;
      if (type === "kata") {
        const row = DATA.kata[gender].find(r => r.Kata === name);
        if (row) { showKataCard(row); highlightRow("kata-tbody", "data-kata", name); scrollToCard("kata-card"); }
      } else if (type === "karateka") {
        const row = DATA.karateka[gender].find(r => r.Karateka === name);
        if (row) { showKaratekaCard(row); highlightRow("karateka-tbody", "data-karateka", name); scrollToCard("karateka-card"); }
      } else if (type === "tournament") {
        const row = (DATA.tournaments || []).find(r => r.Tournament === name && r.Gender.toLowerCase() === gender);
        if (row) { showTournamentCard(row); scrollToCard("tournaments-card"); }
      } else if (type === "country") {
        const all = buildCountryStats();
        const row = all.find(r => r.Country === name);
        if (row) { showCountryCard(row, all); highlightRow("countries-tbody", "data-country", name); scrollToCard("countries-card"); }
      }
    }, 80);
  }
  /* update hash */
  if (prev.card) {
    window.location.hash = `${prev.card.type}/${encodeURIComponent(prev.card.name)}`;
  } else {
    window.location.hash = prev.tab ? `tab/${prev.tab}` : "";
  }
}

function navLink(type, name, display) {
  const navType = type === "tournaments" ? "tournament" : type === "countries" ? "country" : type;
  const d = display !== undefined ? display : esc(displayName(navType, name));
  return `<a class="nav-link" data-nav-type="${type}" data-nav-name="${esc(name)}">${d}</a>`;
}

document.addEventListener("click", e => {
  const link = e.target.closest(".nav-link");
  if (!link || !link.dataset.navType) return;
  const activeTab = document.querySelector(".tab-btn.active")?.dataset.tab;
  const sameTab = { kata: "kata", karateka: "karateka", tournaments: "tournament", countries: "country" };
  // Only skip modal for same-type links in the main table, not inside detail cards
  const inCard = !!e.target.closest(".card-table-wrap, .card-section, .card-body");
  if (!inCard && sameTab[activeTab] === link.dataset.navType) return;
  e.stopPropagation();
  e.preventDefault();
  confirmNav(link.dataset.navType, link.dataset.navName);
});

/* ── State ─────────────────────────────────────────────────────────────────── */
let DATA   = null;
let gender = "male";
let lang   = (() => { try { return localStorage.getItem("kata-lang") === "jp" ? "jp" : "en"; } catch (e) { return "en"; } })();
let theme  = (() => { try { return localStorage.getItem("kata-theme") === "dark" ? "dark" : "light"; } catch (e) { return "light"; } })();
let _navHistory  = [];
let _currentCard = null;
let _kataHistChart = null;
let _karHistChart  = null;
let _timelineRendered = "";
let _mapRendered = "";

const sortState = {
  kata:        { col: "Performances", dir: "desc" },
  karateka:    { col: "Performances", dir: "desc" },
  tournaments: { col: "Tourn_Order",  dir: "asc"  },
  countries:   { col: "Athletes",     dir: "desc" },
};

const searchQuery = { kata: "", karateka: "", countries: "" };
let compareShared     = [];   // cached for re-sort
let compareIncomplete = [];   // shared kata missing a score for one gender
let compareSortCol  = "Diff";
let compareSortDir  = "desc";
let lastTournCard = "";

/* ── Country → flag emoji ──────────────────────────────────────────────────── */
const ISO2 = {
  "Japan":"JP","USA":"US","Turkey":"TR","Italy":"IT","Spain":"ES","France":"FR",
  "Germany":"DE","Kuwait":"KW","England":"GB","Brazil":"BR","Venezuela":"VE",
  "Indonesia":"ID","Hong Kong":"HK","Switzerland":"CH","Algeria":"DZ",
  "Slovakia":"SK","Ukraine":"UA","Hungary":"HU","Romania":"RO","Morocco":"MA",
  "Jordan":"JO","Egypt":"EG","Sweden":"SE","Canada":"CA","Senegal":"SN",
  "Azerbaijan":"AZ","Greece":"GR","Belgium":"BE","Czech Republic":"CZ",
  "Portugal":"PT","Philippines":"PH","Australia":"AU","New Zealand":"NZ",
  "China":"CN","South Korea":"KR","Montenegro":"ME","Singapore":"SG",
  "Mexico":"MX","Colombia":"CO","Iran":"IR","Austria":"AT","Taiwan":"TW",
  "Nigeria":"NG","Argentina":"AR","Burundi":"BI","Nepal":"NP","Malaysia":"MY",
  "Dominican Republic":"DO","Burkina Faso":"BF","Slovenia":"SI",
  "Netherlands":"NL","Saudi Arabia":"SA","UAE":"AE",
};
/* Medal emoji wrapped with a localized hover tooltip (e.g. "Gold - 1st place") */
function medalIcon(place) {
  const e   = place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";
  const tip = place === 1 ? t("medal.goldTip") : place === 2 ? t("medal.silverTip") : t("medal.bronzeTip");
  return `<span title="${tip}">${e}</span>`;
}

/* Compact medal tally, e.g. "🥇5 🥈3 🥉2" (only nonzero places shown) */
function medalTally(medals) {
  if (!medals || !medals.length) return "";
  const c = { 1: 0, 2: 0, 3: 0 };
  medals.forEach(m => { c[m.Place] = (c[m.Place] || 0) + 1; });
  return [c[1] && `${medalIcon(1)}${c[1]}`, c[2] && `${medalIcon(2)}${c[2]}`, c[3] && `${medalIcon(3)}${c[3]}`].filter(Boolean).join(" ");
}

/* WKF ranking points per medal, used to rank athletes/countries by medal haul. */
const MEDAL_POINTS = { 1: 990, 2: 690, 3: 490 };
function medalPoints(medals) {
  return (medals || []).reduce((s, m) => s + (MEDAL_POINTS[m.Place] || 0), 0);
}

/* Medals sorted by when the tournament happened (earliest first) */
function medalsChrono(medals) {
  return [...(medals || [])].sort((a, b) =>
    (TOURN_ORDER[a.Tournament] ?? 99) - (TOURN_ORDER[b.Tournament] ?? 99));
}

function flagOf(country) {
  const iso = ISO2[country];
  if (!iso) return "";
  return `<img src="https://flagcdn.com/16x12/${iso.toLowerCase()}.png" width="16" height="12" alt="${iso}" title="${country}" style="vertical-align:middle;margin-right:4px;border-radius:1px">`;
}
function flagEmoji(country) {
  const iso = ISO2[country];
  if (!iso) return "";
  return [...iso.toUpperCase()].map(c => String.fromCodePoint(c.codePointAt(0) + 127397)).join("");
}

/* ── Tournament metadata ───────────────────────────────────────────────────── */
const TOURN_META = {
  "2024 Paris":      { city:"Paris",      country:"France",  flag:"🇫🇷", date:"Jan 26–28, 2024"    },
  "2024 Antalya":    { city:"Antalya",    country:"Turkey",  flag:"🇹🇷", date:"Mar 15–17, 2024"    },
  "2024 Cairo":      { city:"Cairo",      country:"Egypt",   flag:"🇪🇬", date:"Apr 19–21, 2024"    },
  "2024 Casablanca": { city:"Casablanca", country:"Morocco", flag:"🇲🇦", date:"May 31–Jun 2, 2024"  },
  "2025 Paris":      { city:"Paris",      country:"France",  flag:"🇫🇷", date:"Jan 24–26, 2025"    },
  "2025 Hangzhou":   { city:"Hangzhou",   country:"China",   flag:"🇨🇳", date:"Mar 14–16, 2025"    },
  "2025 Cairo":      { city:"Cairo",      country:"Egypt",   flag:"🇪🇬", date:"Apr 18–20, 2025"    },
  "2025 Rabat":      { city:"Rabat",      country:"Morocco", flag:"🇲🇦", date:"May 30–Jun 1, 2025"  },
  "2025 Worlds":     { city:"Cairo",      country:"Egypt",   flag:"🇪🇬", date:"Nov 27–30, 2025"    },
};

/* Chronological index for each tournament name (0 = earliest) */
const TOURN_ORDER = Object.fromEntries(Object.keys(TOURN_META).map((k, i) => [k, i]));

const charts = {};

/* ── Boot ──────────────────────────────────────────────────────────────────── */
fetch("data/data.json")
  .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
  .then(d => { DATA = d; init(); })
  .catch(err => {
    console.error(err);
    const stack = err && err.stack ? "<pre style='font-size:11px;white-space:pre-wrap;margin-top:12px'>" + err.stack + "</pre>" : "";
    document.body.innerHTML = "<div style='padding:40px'><p style='color:#9a1c1c;font-weight:700'>Error: " + (err && err.message ? err.message : String(err)) + "</p>" + stack + "</div>";
  });

function addKataDiffs() {
  for (const g of ["male", "female"]) {
    const diffMap = Object.fromEntries((DATA.kata_vs_karateka_avg[g] || []).map(d => [d.Kata, d.Diff]));
    (DATA.kata[g] || []).forEach(k => { k.Diff = diffMap[k.Kata] ?? null; });
  }
}

/* For every performance, find the opponent's score in that same match and
   compute the score difference. Also roll those up into each athlete's overall
   differential (mean of score − opponent score across all matched performances). */
function addAthleteDifferentials() {
  for (const g of ["male", "female"]) {
    const rows = DATA.karateka[g] || [];
    /* key: Tournament|Round|Karateka|Opponent -> that athlete's score in the match */
    const scoreByMatch = new Map();
    for (const r of rows) {
      for (const p of (r.Performances_Detail || [])) {
        if (p.Avg_Score == null) continue;
        scoreByMatch.set(`${p.Tournament}|${p.Round}|${r.Karateka}|${p.Opponent}`, p.Avg_Score);
      }
    }
    for (const r of rows) {
      let sum = 0, n = 0;
      for (const p of (r.Performances_Detail || [])) {
        const oppScore = p.Opponent != null
          ? scoreByMatch.get(`${p.Tournament}|${p.Round}|${p.Opponent}|${r.Karateka}`)
          : undefined;
        if (p.Avg_Score != null && oppScore != null) {
          p._oppScore = oppScore;
          p._diff = +(p.Avg_Score - oppScore).toFixed(2);
          sum += p.Avg_Score - oppScore;
          n++;
        } else {
          p._oppScore = null;
          p._diff = null;
        }
      }
      r.Differential = n ? +(sum / n).toFixed(3) : null;
    }
  }
}

function init() {
  setupThemeToggle();
  setupGlobalToggle();
  setupLangToggle();
  setupTabs();
  setupKataTab();
  setupKaratekaTab();
  setupSortableTable("tournaments-table", "tournaments", renderTournamentsTable);
  setupSortableTable("countries-table",   "countries",   renderCountriesTable);
  document.getElementById("countries-search").addEventListener("input", e => {
    searchQuery.countries = e.target.value.trim().toLowerCase();
    renderCountriesTable();
  });
  buildMissingTables();
  addKataDiffs();
  addAthleteDifferentials();
  setupBackButton();
  setupGlobalSearch();
  applyI18n();            // translate static chrome (and capture English originals) before how-to is transformed
  renderAll();
  renderWelcomeTimeline();
  initHowToCards();
  parseDeepLink();
}

/* ── Theme (dark mode) toggle ──────────────────────────────────────────────── */
const SUN_SVG  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.4 19.6l1.6-1.6M18 6l1.6-1.6"/></svg>`;
const MOON_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21 12.9A9 9 0 1 1 11.1 3a7 7 0 0 0 9.9 9.9z"/></svg>`;

function applyThemeIcon() {
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.innerHTML = theme === "dark" ? MOON_SVG : SUN_SVG;
}

function setupThemeToggle() {
  document.documentElement.setAttribute("data-theme", theme);
  refreshChartColors();   // seed chart colors for the very first render
  applyThemeIcon();
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("kata-theme", theme); } catch (e) {}
    document.documentElement.setAttribute("data-theme", theme);
    applyThemeIcon();
    refreshChartColors();
    renderAll();          // rebuild all charts/tables with the new palette
    const activeTab = document.querySelector(".tab-btn.active")?.dataset.tab;
    if (activeTab === "compare") renderCompareTab();
    if (activeTab === "medals")  renderMedalsTab();
  });
}

function setupLangToggle() {
  document.querySelectorAll("#global-lang .gender-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
    btn.addEventListener("click", () => {
      if (lang === btn.dataset.lang) return;
      lang = btn.dataset.lang;
      try { localStorage.setItem("kata-lang", lang); } catch (e) {}
      document.querySelectorAll("#global-lang .gender-btn").forEach(b => b.classList.toggle("active", b.dataset.lang === lang));
      applyLanguage();
    });
  });
}

/* Re-translate everything after a language switch. */
function applyLanguage() {
  applyI18n();           // static chrome + how-to bodies (resets how-to structure)
  initHowToCards();      // rebuild how-to expand/collapse structure for the new text
  buildMissingTables();  // re-render missing-data table rows in the new language
  ["kata-card", "karateka-card", "countries-card", "tournaments-card"].forEach(clearCard);
  const mc = document.getElementById("medals-content"); if (mc) mc.dataset.built = "";  // allow medal titles to re-render
  const wtl = document.getElementById("welcome-timeline-wrap"); if (wtl) wtl.innerHTML = "";  // force timeline pills to re-render in new language
  renderAll();           // re-render dynamic content (findings, subtitles, tables) in the new language
  renderWelcomeTimeline();
  const activeTab = document.querySelector(".tab-btn.active")?.dataset.tab;
  if (activeTab === "compare") renderCompareTab();
  if (activeTab === "medals") renderMedalsTab();
}

function splitTableScroll(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const wrapper = table.closest('.table-wrapper--sticky, .card-table-wrap');
  if (!wrapper || wrapper.dataset.split === tableId) return;
  const thead = table.querySelector('thead');
  if (!thead) return;

  const ths = Array.from(thead.querySelectorAll('th'));

  // Measure each column's natural width with content unconstrained and never
  // wrapped, so the fixed-layout columns below stay wide enough to never
  // collide (desktop) or overlap (mobile). When the viewport is narrower than
  // the total, the body scrolls horizontally and the header follows.
  table.classList.add('dt-measuring');
  const widths = ths.map(th => Math.ceil(th.getBoundingClientRect().width));
  table.classList.remove('dt-measuring');
  if (widths.every(w => w === 0)) return; // not yet laid out

  const totalW = Math.ceil(widths.reduce((s, w) => s + w, 0));
  // In detail cards, pin the # column to a fixed px width (matching the master
  // table) so its gap to the next column stays consistent instead of tracking
  // each card's largest row number. The remaining columns split the leftover
  // width proportionally via calc() so the fixed column never gets stretched.
  const ROWNUM_W = 28;
  const isCard = wrapper.classList.contains('card-table-wrap');
  const rowNumIdx = ths.findIndex(th => th.classList.contains('row-num'));
  const pinRowNum = isCard && rowNumIdx >= 0;
  const restW = totalW - (pinRowNum ? widths[rowNumIdx] : 0);
  const makeColGroup = () => {
    const cg = document.createElement('colgroup');
    widths.forEach((w, i) => {
      const c = document.createElement('col');
      if (pinRowNum && i === rowNumIdx) c.style.width = ROWNUM_W + 'px';
      else if (pinRowNum) c.style.width = `calc((100% - ${ROWNUM_W}px) * ${(w / restW).toFixed(4)})`;
      else c.style.width = (w / totalW * 100).toFixed(3) + '%';
      cg.appendChild(c);
    });
    return cg;
  };

  // Build non-scrolling header table (move actual thead to keep onclick handlers)
  const headerTable = document.createElement('table');
  headerTable.className = table.className;
  headerTable.style.cssText = `width:100%;table-layout:fixed;border-collapse:collapse;min-width:${totalW}px;`;
  headerTable.appendChild(makeColGroup());
  headerTable.appendChild(thead);

  const headerWrap = document.createElement('div');
  headerWrap.className = 'dt-fixed-header';
  headerWrap.appendChild(headerTable);

  // Body table keeps colgroup for alignment
  table.insertBefore(makeColGroup(), table.firstChild);
  table.style.cssText += `width:100%;table-layout:fixed;min-width:${totalW}px;`;

  const bodyWrap = document.createElement('div');
  bodyWrap.className = 'dt-scroll-body';
  bodyWrap.appendChild(table);

  // Sync horizontal scroll: body → header
  bodyWrap.addEventListener('scroll', () => { headerWrap.scrollLeft = bodyWrap.scrollLeft; });

  wrapper.insertBefore(headerWrap, wrapper.firstChild);
  wrapper.appendChild(bodyWrap);
  wrapper.dataset.split = tableId;
}

/* Figure id for the current gender: male keeps the base (e.g. "K-1"),
   female gets an "F" prefix (e.g. "FK-1"). Used for labels and in-text refs. */
function figName(base) {
  return (gender === "female" ? "F" : "") + base;
}
function updateFigureLabels() {
  document.querySelectorAll(".fig-label[data-fig]").forEach(el => {
    el.textContent = t("fig.figure") + " " + figName(el.dataset.fig);
  });
}

function renderAll() {
  updateFigureLabels();
  updateHeaderSub();
  renderWelcomeStats();
  renderWelcomeVideo();
  renderKataTable();
  renderKaratekaTable();
  renderTournamentsTable();
  renderCountriesTable();
  renderKataFindings();
  renderKaratekaFindings();
  /* re-render gender-dependent tabs if currently active */
  _timelineRendered = "";
  _mapRendered = "";
  const activeTab = document.querySelector(".tab-btn.active")?.dataset.tab;
  if (activeTab === "tournaments") renderTournamentTimeline();
  if (activeTab === "countries")   renderWorldMap();
  if (activeTab === "medals")      renderMedalsTab();
}

function renderWelcomeVideo() {
  const videos = {
    male:   { id: "B8jNtZaZbgY", title: "2024 K1 Premier League Casablanca, Male Kata, Gold Medal Match", titleJp: "2024 K1プレミアリーグ カサブランカ 男子型 金メダルマッチ" },
    female: { id: "NDp3JTglEKM", title: "2024 K1 Premier League Antalya, Female Kata, Gold Medal Match", titleJp: "2024 K1プレミアリーグ アンタルヤ 女子型 金メダルマッチ"  },
  };
  const v = videos[gender];
  document.getElementById("welcome-video-section").innerHTML = `
    <p class="video-header">${lang === "jp" ? v.titleJp : v.title}</p>
    <div style="display:flex;justify-content:center">
      <a href="https://www.youtube.com/watch?v=${v.id}${gender === "female" ? "&t=424s" : ""}" target="_blank" rel="noopener"
         style="display:block;width:50%;border-radius:var(--radius);overflow:hidden;border:1px solid var(--border);position:relative;aspect-ratio:16/9">
        <img src="https://img.youtube.com/vi/${v.id}/hqdefault.jpg"
             alt="Kata performance video"
             style="width:100%;height:100%;object-fit:cover;object-position:center;display:block">
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                    background:rgba(0,0,0,0.65);border-radius:50%;width:52px;height:52px;
                    display:flex;align-items:center;justify-content:center">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff"><polygon points="9,7 19,12 9,17"/></svg>
        </div>
      </a>
    </div>`;
}

/* ── Header ────────────────────────────────────────────────────────────────── */
function updateHeaderSub() {
  const m = DATA.meta;
  const mKata = (DATA.kata.male || []).length;
  const fKata = (DATA.kata.female || []).length;
  const mCountries = new Set((DATA.karateka.male || []).map(k => k.Country)).size;
  const fCountries = new Set((DATA.karateka.female || []).map(k => k.Country)).size;
  const mText = lang === "jp"
    ? `男子型 · ${m.male_performances} 演武 · ${mKata} 型 · ${m.male_karateka} 選手 · 9 大会 · ${mCountries} か国`
    : `Male Kata · ${m.male_performances} Performances · ${mKata} Unique Kata · ${m.male_karateka} Athletes · 9 Tournaments · ${mCountries} Countries`;
  const fText = lang === "jp"
    ? `女子型 · ${m.female_performances} 演武 · ${fKata} 型 · ${m.female_karateka} 選手 · 9 大会 · ${fCountries} か国`
    : `Female Kata · ${m.female_performances} Performances · ${fKata} Unique Kata · ${m.female_karateka} Athletes · 9 Tournaments · ${fCountries} Countries`;
  const mBtn = document.querySelector('#global-gender .gender-btn[data-gender="male"]');
  const fBtn = document.querySelector('#global-gender .gender-btn[data-gender="female"]');
  if (mBtn) mBtn.title = mText;
  if (fBtn) fBtn.title = fText;
}

/* ── Tab switch helper ─────────────────────────────────────────────────────── */
/* The site credit only shows on the Home (welcome) tab. */
function _updateSiteCredit(tabId) {
  const credit = document.getElementById("site-credit");
  if (credit) credit.style.display = tabId === "welcome" ? "" : "none";
}

/* Close any open tab dropdown menus. */
function _closeTabDropdowns() {
  document.querySelectorAll(".tab-group.open").forEach(g => {
    g.classList.remove("open");
    g.querySelector(".tab-group-btn")?.setAttribute("aria-expanded", "false");
  });
}

/* Mark the given tab active in the nav: highlight its button and, if it lives
   inside a dropdown group, highlight that group's top-level button too. */
function _markActiveTab(tabId) {
  document.querySelectorAll(".tab-btn, .tab-group-btn").forEach(b => b.classList.remove("active"));
  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (btn) {
    btn.classList.add("active");
    btn.closest(".tab-group")?.querySelector(".tab-group-btn")?.classList.add("active");
  }
}

function switchToTab(tabId) {
  _closeTabDropdowns();
  _markActiveTab(tabId);
  document.querySelectorAll(".tab-content").forEach(s => { s.classList.remove("active"); s.classList.add("hidden"); });
  const sec = document.getElementById(`tab-${tabId}`);
  if (sec) { sec.classList.remove("hidden"); sec.classList.add("active"); }
  _updateSiteCredit(tabId);
  window.scrollTo(0, 0);
  /* Set up the sticky-header split scroll for tabs whose master table needs it,
     so programmatic navigation (welcome boxes, card links) gets a scrollable
     table just like clicking the tab button does. */
  const tabTableMap = {
    kata: "kata-table", karateka: "karateka-table",
    tournaments: "tournaments-table", countries: "countries-table",
    compare: "compare-shared-table"
  };
  const tid = tabTableMap[tabId];
  if (tid) setTimeout(() => splitTableScroll(tid), 0);
}

/* ── Welcome stats ─────────────────────────────────────────────────────────── */
function renderWelcomeStats() {
  const m = DATA.meta;
  const g = gender === "male";
  document.getElementById("welcome-stats").innerHTML = [
    [g ? m.male_performances : m.female_performances, t("col.performances"), "kata"],
    [g ? m.male_karateka : m.female_karateka,         t("col.athletes"),     "karateka"],
    [9,                                               t("col.tournaments"),  "tournaments"],
  ].map(([n, label, tab]) => `
    <button class="welcome-stat-card" onclick="switchToTab('${tab}')">
      <div class="stat-num">${n.toLocaleString()}</div>
      <div class="stat-label">${label}</div>
    </button>
  `).join("");
}

/* ── Global gender toggle ──────────────────────────────────────────────────── */
function setupGlobalToggle() {
  document.querySelectorAll("#global-gender .gender-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#global-gender .gender-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      gender = btn.dataset.gender;
      clearCard("kata-card");
      clearCard("karateka-card");
      clearCard("countries-card");
      searchQuery.kata = "";
      searchQuery.karateka = "";
      document.getElementById("kata-search").value = "";
      document.getElementById("karateka-search").value = "";
      renderAll();
    });
  });
}

/* ── Tabs ──────────────────────────────────────────────────────────────────── */
function setupTabs() {
  /* Top-level group buttons (Data / Analysis / Other) toggle their dropdown. */
  document.querySelectorAll(".tab-group-btn").forEach(gb => {
    gb.addEventListener("click", e => {
      e.stopPropagation();
      const group = gb.closest(".tab-group");
      const willOpen = !group.classList.contains("open");
      _closeTabDropdowns();
      if (willOpen) {
        group.classList.add("open");
        gb.setAttribute("aria-expanded", "true");
      }
    });
  });
  /* Click anywhere else closes any open dropdown. */
  document.addEventListener("click", _closeTabDropdowns);

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      _closeTabDropdowns();
      _markActiveTab(btn.dataset.tab);
      document.querySelectorAll(".tab-content").forEach(s => {
        s.classList.remove("active"); s.classList.add("hidden");
      });
      const sec = document.getElementById("tab-" + btn.dataset.tab);
      sec.classList.remove("hidden");
      sec.classList.add("active");
      _updateSiteCredit(btn.dataset.tab);
      /* close any open detail cards when switching tabs */
      ["kata-card", "karateka-card", "tournaments-card", "countries-card"].forEach(id => clearCard(id));
      _currentCard = null;
      _navHistory = []; _updateBackBtn();
      /* update URL so reload stays on the current tab */
      const tabId = btn.dataset.tab;
      history.replaceState(null, "", tabId === "welcome" ? window.location.pathname : `#tab/${tabId}`);
      /* jump back to the top so each tab starts at its beginning */
      window.scrollTo(0, 0);
      if (btn.dataset.tab === "compare") renderCompareTab();
      if (btn.dataset.tab === "medals") renderMedalsTab();
      if (btn.dataset.tab === "tournaments") renderTournamentTimeline();
      if (btn.dataset.tab === "countries") renderWorldMap();
      const tabTableMap = {
        kata: "kata-table", karateka: "karateka-table",
        tournaments: "tournaments-table", countries: "countries-table",
        compare: "compare-shared-table"
      };
      const tid = tabTableMap[btn.dataset.tab];
      if (tid) setTimeout(() => splitTableScroll(tid), 0);
    });
  });
}

function renderCompareTab() {
  const mkata = DATA.kata.male   || [];
  const fkata = DATA.kata.female || [];
  const mSet = new Set(mkata.map(k => k.Kata));
  const fSet = new Set(fkata.map(k => k.Kata));

  const mOnly = mkata.filter(k => !fSet.has(k.Kata)).sort((a,b) => b.Performances - a.Performances);
  const fOnly = fkata.filter(k => !mSet.has(k.Kata)).sort((a,b) => b.Performances - a.Performances);

  const mTop10 = [...mkata].sort((a,b) => b.Performances - a.Performances).slice(0,10);
  const fTop10 = [...fkata].sort((a,b) => b.Performances - a.Performances).slice(0,10);

  const mKarAll = DATA.karateka.male || [];
  const fKarAll = DATA.karateka.female || [];
  const wtAvgKata = kataArr => {
    const scored = kataArr.filter(r => r.Mean_Score != null);
    const tw = scored.reduce((s,r) => s + r.Performances, 0);
    return tw ? scored.reduce((s,r) => s + r.Mean_Score * r.Performances, 0) / tw : null;
  };
  const mAvgScore = wtAvgKata(mkata);
  const fAvgScore = wtAvgKata(fkata);

  /* derived counts for findings */
  const trueSharedCount = mkata.length - mOnly.length;  // shared by set membership (before score filter)
  const mTop1 = mTop10[0];
  const fTop1 = fTop10[0];
  const mTotalPerfs = mKarAll.reduce((s,k) => s + (k.Performances||0), 0);
  const fTotalPerfs = fKarAll.reduce((s,k) => s + (k.Performances||0), 0);

  /* athlete spotlight */
  const minPerfs = 3;
  const mByScore = [...mKarAll].filter(k => k.Mean_Score != null && k.Performances >= minPerfs).sort((a,b) => b.Mean_Score - a.Mean_Score);
  const fByScore = [...fKarAll].filter(k => k.Mean_Score != null && k.Performances >= minPerfs).sort((a,b) => b.Mean_Score - a.Mean_Score);
  const mKakeru = mKarAll.find(k => k.Karateka === "Kakeru Nishiyama");
  const fGrace  = fKarAll.find(k => k.Karateka === "Grace Lau");
  const fMaho   = fKarAll.find(k => k.Karateka === "Maho Ono");
  const mNo2    = mByScore.find(k => k.Karateka !== "Kakeru Nishiyama");
  const medalCount = k => (k?.Medals || []).length;
  const goldCount  = k => (k?.Medals || []).filter(m => m.Place === 1).length;
  const fmtWR = k => k?.Win_Rate != null ? (k.Win_Rate * 100).toFixed(1) + "%" : "—";

  /* avg score comparison for shared kata */
  compareShared = mkata.filter(k => fSet.has(k.Kata) && k.Mean_Score != null).map(mk => {
    const fk = fkata.find(k => k.Kata === mk.Kata);
    return fk && fk.Mean_Score != null
      ? { Kata: mk.Kata, Male: mk.Mean_Score, Female: fk.Mean_Score, Diff: mk.Mean_Score - fk.Mean_Score }
      : null;
  }).filter(Boolean);
  compareIncomplete = mkata.filter(k => fSet.has(k.Kata)).filter(mk => {
    const fk = fkata.find(k => k.Kata === mk.Kata);
    return mk.Mean_Score == null || !fk || fk.Mean_Score == null;
  }).map(mk => {
    const fk = fkata.find(k => k.Kata === mk.Kata);
    return { Kata: mk.Kata, Male: mk.Mean_Score ?? null, Female: fk?.Mean_Score ?? null, Diff: null };
  });
  compareSortCol = "Diff"; compareSortDir = "desc";

  /* min/max findings */
  const fSortedByMin = [...fkata].filter(k => k.Min_Score != null).sort((a,b) => a.Min_Score - b.Min_Score);
  const mSortedByMin = [...mkata].filter(k => k.Min_Score != null).sort((a,b) => a.Min_Score - b.Min_Score);
  const fMin1 = fSortedByMin[0], fMin2 = fSortedByMin[1], fMin3 = fSortedByMin[2];
  const mMin1 = mSortedByMin[0];
  const fMaxKata = [...fkata].filter(k => k.Max_Score != null).sort((a,b) => b.Max_Score - a.Max_Score)[0];
  const mMaxKata = [...mkata].filter(k => k.Max_Score != null).sort((a,b) => b.Max_Score - a.Max_Score)[0];
  const fTop2 = fTop10[1];

  /* IQR-based outlier detection on individual performance scores */
  const iqrOutliers = (karArr) => {
    const entries = karArr.flatMap(k =>
      (k.Performances_Detail || []).filter(p => p.Avg_Score != null)
        .map(p => ({ score: p.Avg_Score, kata: p.Kata, karateka: k.Karateka }))
    );
    const scores = entries.map(e => e.score).sort((a,b) => a-b);
    const n = scores.length;
    const q1 = scores[Math.floor(n * 0.25)];
    const q3 = scores[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const lo = q1 - 1.5 * iqr;
    const hi = q3 + 1.5 * iqr;
    const low  = entries.filter(e => e.score < lo).sort((a,b) => a.score - b.score);
    const high = entries.filter(e => e.score > hi).sort((a,b) => a.score - b.score);
    return { low, high };
  };
  const mOut = iqrOutliers(mKarAll);
  const fOut = iqrOutliers(fKarAll);
  const fmtOutList = arr => arr.map(e => `<strong style="color:var(--text)">${e.score.toFixed(2)}</strong>`).join(", ");

  const sign = v => (v >= 0 ? "+" : "") + v.toFixed(3);
  const diffColor = v => v > 0 ? POS : v < 0 ? "var(--red)" : "inherit";
  const jp = lang === "jp";
  const kn = k => esc(displayName("kata", k));   // localized kata name

  const top5Row = (k, i) => `<tr><td>${i+1}</td><td class="name-cell">${navLink("kata", k.Kata)}</td><td class="num">${k.Performances}</td><td class="num">${k.Mean_Score != null ? k.Mean_Score.toFixed(3) : "—"}</td></tr>`;
  const onlyPills = arr => arr.map(k => `<span class="pill nav-link" data-nav-type="kata" data-nav-name="${esc(k.Kata)}" style="cursor:pointer">${tierBadge(k.Kata_Tier)} ${esc(k.Kata)} <span class="pill-count">${k.Performances}×</span></span>`).join("");

  document.getElementById("compare-content").innerHTML = `
    <!-- Findings -->
    <div>
      <details class="finding-block finding-collapsible" style="margin-top:0">
      <summary class="compare-head finding-summary"><span>${jp ? "分析" : "Analysis"}<em class="finding-hint">${jp ? "クリックして開く。" : "Click to open."}</em></span></summary>
        <ul style="font-size:13px;color:var(--text-muted);line-height:2.2;padding-left:20px">
          ${jp
            ? `<li>男子選手は2024–25シーズンを通じて<strong style="color:var(--text)">${mkata.length}</strong>種類の型を演武しました。女子選手も同数の<strong style="color:var(--text)">${fkata.length}</strong>種類を演武しました。</li>
          <li>そのうち<strong style="color:var(--text)">${trueSharedCount}</strong>型は男女両方で演武されました。<strong style="color:var(--text)">${mOnly.length}</strong>型は男子のみ、<strong style="color:var(--text)">${fOnly.length}</strong>型は女子のみが演武しました。詳しい内訳は<em>図 G-2</em>、性別限定の型は<em>図 G-3</em>をご覧ください。</li>
          <li>女子の演武は上位数型に強く集中していました。単一の型<strong style="color:var(--text)">${fTop1 ? kn(fTop1.Kata) : "—"}</strong>が<strong style="color:var(--text)">${fTop1 ? fTop1.Performances : "—"}</strong>回で突出し${fTop1 && fTop2 ? `、2番目に多い<strong style="color:var(--text)">${kn(fTop2.Kata)}</strong>（<strong style="color:var(--text)">${fTop2.Performances}</strong>回）を<strong style="color:var(--text)">${fTop1.Performances - fTop2.Performances}</strong>回も上回りました。男子側に同様の突出した型はなく、上位3型は僅差で並んでいます（${mTop10.slice(0,3).map(k => k.Performances).join(" / ")}）` : ""}。下の<em>図 G-1</em>をご覧ください。</li>
          <li>男子型の演武は女子型より平均で<strong style="color:var(--text)">${(mAvgScore != null && fAvgScore != null) ? (mAvgScore - fAvgScore).toFixed(3) : "—"}</strong>点高く得点されました。男子型演武の平均スコアは<strong style="color:var(--text)">${mAvgScore != null ? mAvgScore.toFixed(3) : "—"}</strong>、女子型演武では<strong style="color:var(--text)">${fAvgScore != null ? fAvgScore.toFixed(3) : "—"}</strong>でした。</li>
          <li>IQR法によると、男子型スコアには低い外れ値が<strong style="color:var(--text)">${mOut.low.length}</strong>個、高い外れ値が<strong style="color:var(--text)">${mOut.high.length}</strong>個あります。女子スコアには低い外れ値が<strong style="color:var(--text)">${fOut.low.length}</strong>個、高い外れ値が<strong style="color:var(--text)">${fOut.high.length}</strong>個あります。女子のデータはより極端な低スコアを含む一方、男子のスコアは下側でより密集し、上側ではより高いピークに達します。</li>
          <li>女子競技で記録された単独最高スコアは<strong style="color:var(--text)">${fMaxKata ? fMaxKata.Max_Score.toFixed(2) : "—"}</strong>（${fMaxKata ? kn(fMaxKata.Kata) : "—"}）で、男子のピーク<strong style="color:var(--text)">${mMaxKata ? mMaxKata.Max_Score.toFixed(2) : "—"}</strong>（${mMaxKata ? kn(mMaxKata.Kata) : "—"}）にほぼ匹敵します。</li>
          <li>女子の型は、型ごとのスコアのばらつきがより小さいものでした。典型的な女子型のスコア標準偏差は約<strong style="color:var(--text)">0.23</strong>で、男子型の<strong style="color:var(--text)">0.33</strong>より小さく（<em>図 FK-6</em>）、同じ型であれば女子選手のスコアはより近い範囲に収まったことを意味します。</li>
          <li>女子選手は中級の型をほとんど演武しませんでした。女子の演武のうち中級型はわずか<strong style="color:var(--text)">1.6%</strong>（962回中15回）で、わずか<strong style="color:var(--text)">5</strong>種類にとどまりました。男子選手はより多く中級型を演武し、演武の<strong style="color:var(--text)">9.4%</strong>（947回中89回）を<strong style="color:var(--text)">9</strong>種類で占めました。最高峰のレベルでは、女子は男子以上に上級の型へ集中していました。</li>
          <li>シーズンを通じて、男子選手は計<strong style="color:var(--text)">${mTotalPerfs.toLocaleString()}</strong>回の型演武を記録し、女子選手は<strong style="color:var(--text)">${fTotalPerfs.toLocaleString()}</strong>回でした。</li>`
            : `<li>Male athletes performed <strong style="color:var(--text)">${mkata.length}</strong> unique kata across the 2024–25 season. Female athletes performed the same number: <strong style="color:var(--text)">${fkata.length}</strong> unique kata.</li>
          <li>Of those, <strong style="color:var(--text)">${trueSharedCount}</strong> kata were performed by both genders. <strong style="color:var(--text)">${mOnly.length}</strong> kata were performed exclusively by males, and <strong style="color:var(--text)">${fOnly.length}</strong> exclusively by females. See <em>Figure G-2</em> for the full breakdown and <em>Figure G-3</em> for the exclusive kata.</li>
          <li>The female field showed much greater concentration at the top. A single kata, <strong style="color:var(--text)">${fTop1 ? esc(fTop1.Kata) : "—"}</strong>, dominated with <strong style="color:var(--text)">${fTop1 ? fTop1.Performances : "—"}</strong> performances${fTop1 && fTop2 ? `, dwarfing the next most performed, <strong style="color:var(--text)">${esc(fTop2.Kata)}</strong>, by <strong style="color:var(--text)">${fTop1.Performances - fTop2.Performances}</strong> (<strong style="color:var(--text)">${fTop2.Performances}</strong>). No comparable outlier exists on the male side, where the three most performed kata cluster closely together (${mTop10.slice(0,3).map(k => k.Performances).join(" / ")})` : ""}. See <em>Figure G-1</em>.</li>
          <li>Male kata performances scored <strong style="color:var(--text)">${(mAvgScore != null && fAvgScore != null) ? (mAvgScore - fAvgScore).toFixed(3) : "—"}</strong> higher on average than female kata performances. The mean score for a male kata performance was <strong style="color:var(--text)">${mAvgScore != null ? mAvgScore.toFixed(3) : "—"}</strong>, versus <strong style="color:var(--text)">${fAvgScore != null ? fAvgScore.toFixed(3) : "—"}</strong> for female kata.</li>
          <li>Using the IQR method, male kata performance scores have <strong style="color:var(--text)">${mOut.low.length}</strong> low ${mOut.low.length === 1 ? "outlier" : "outliers"} and <strong style="color:var(--text)">${mOut.high.length}</strong> high ${mOut.high.length === 1 ? "outlier" : "outliers"}; female scores have <strong style="color:var(--text)">${fOut.low.length}</strong> low ${fOut.low.length === 1 ? "outlier" : "outliers"} and <strong style="color:var(--text)">${fOut.high.length}</strong> high ${fOut.high.length === 1 ? "outlier" : "outliers"}. The female dataset contains more extreme lows, while male scores cluster more tightly at the bottom but reach higher peaks at the top.</li>
          <li>The single highest score recorded in female competition was <strong style="color:var(--text)">${fMaxKata ? fMaxKata.Max_Score.toFixed(2) : "—"}</strong> (${fMaxKata ? esc(fMaxKata.Kata) : "—"}), nearly matching the male peak of <strong style="color:var(--text)">${mMaxKata ? mMaxKata.Max_Score.toFixed(2) : "—"}</strong> (${mMaxKata ? esc(mMaxKata.Kata) : "—"}).</li>
          <li>Female kata scores were more tightly clustered within each kata. The typical female kata had a score standard deviation of about <strong style="color:var(--text)">0.23</strong>, compared to <strong style="color:var(--text)">0.33</strong> for the typical male kata (<em>Figure FK-6</em>), meaning that for any given female kata, athletes' scores landed closer together.</li>
          <li>Female athletes almost entirely avoided Intermediate kata. Just <strong style="color:var(--text)">1.6%</strong> of female performances (<strong style="color:var(--text)">15 of 962</strong>) were Intermediate kata, spread across only <strong style="color:var(--text)">5</strong> different kata. Male athletes leaned on Intermediate kata noticeably more, at <strong style="color:var(--text)">9.4%</strong> of their performances (<strong style="color:var(--text)">89 of 947</strong>), across <strong style="color:var(--text)">9</strong> different kata. At the elite level, the female field concentrated even more heavily on Advanced kata than the male field did.</li>
          <li>Across the season, male athletes recorded <strong style="color:var(--text)">${mTotalPerfs.toLocaleString()}</strong> total kata performances, compared to <strong style="color:var(--text)">${fTotalPerfs.toLocaleString()}</strong> for female athletes.</li>`}
        </ul>

        <p style="font-size:13px;font-weight:700;color:var(--text);margin:20px 0 6px">${jp ? "アスリート・スポットライト" : "Athlete Spotlight"}</p>
        <ul style="font-size:13px;color:var(--text-muted);line-height:2.2;padding-left:20px">
          ${!mKakeru ? "" : jp
            ? `<li>男子型競技は主に<strong style="color:var(--text)">Kakeru Nishiyama</strong>（日本）が支配しました。彼は<strong style="color:var(--text)">${mKakeru.Performances}</strong>演武で平均<strong style="color:var(--text)">${mKakeru.Mean_Score?.toFixed(3) ?? "—"}</strong>、勝率<strong style="color:var(--text)">${fmtWR(mKakeru)}</strong>、シーズンで<strong style="color:var(--text)">${medalCount(mKakeru)}</strong>個のメダル（うち金<strong style="color:var(--text)">${goldCount(mKakeru)}</strong>個）を記録しました。${mNo2 ? `2番目に平均が高い男子選手<strong style="color:var(--text)">${esc(mNo2.Karateka)}</strong>は平均<strong style="color:var(--text)">${mNo2.Mean_Score.toFixed(3)}</strong>で、Nishiyamaに<strong style="color:var(--text)">${(mKakeru.Mean_Score - mNo2.Mean_Score).toFixed(3)}</strong>及びませんでした。` : "2番目に平均が高い男子選手も好成績を残しました。"}</li>`
            : `<li>Male kata competition was largely dominated by <strong style="color:var(--text)">Kakeru Nishiyama</strong> (Japan), who averaged <strong style="color:var(--text)">${mKakeru.Mean_Score?.toFixed(3) ?? "—"}</strong> across <strong style="color:var(--text)">${mKakeru.Performances}</strong> performances, with a win rate of <strong style="color:var(--text)">${fmtWR(mKakeru)}</strong> and <strong style="color:var(--text)">${medalCount(mKakeru)}</strong> medal${medalCount(mKakeru) !== 1 ? "s" : ""} on the season, including <strong style="color:var(--text)">${goldCount(mKakeru)}</strong> gold${goldCount(mKakeru) !== 1 ? "s" : ""}. The next-highest averaging male athlete${mNo2 ? `, <strong style="color:var(--text)">${esc(mNo2.Karateka)}</strong>, averaged <strong style="color:var(--text)">${mNo2.Mean_Score.toFixed(3)}</strong>, a gap of <strong style="color:var(--text)">${(mKakeru.Mean_Score - mNo2.Mean_Score).toFixed(3)}</strong> below Nishiyama` : " also posted a strong season"}.</li>`}
          ${!(fGrace && fMaho) ? "" : jp
            ? `<li>女子型は上位の争いがより激しく、<strong style="color:var(--text)">Grace Lau</strong>（香港）と<strong style="color:var(--text)">Maho Ono</strong>（日本）が明確な2強でした。Lauは<strong style="color:var(--text)">${fGrace.Performances}</strong>演武で平均<strong style="color:var(--text)">${fGrace.Mean_Score?.toFixed(3) ?? "—"}</strong>（勝率<strong style="color:var(--text)">${fmtWR(fGrace)}</strong>、メダル<strong style="color:var(--text)">${medalCount(fGrace)}</strong>個・金<strong style="color:var(--text)">${goldCount(fGrace)}</strong>個）。Onoは<strong style="color:var(--text)">${fMaho.Performances}</strong>演武で平均<strong style="color:var(--text)">${fMaho.Mean_Score?.toFixed(3) ?? "—"}</strong>（勝率<strong style="color:var(--text)">${fmtWR(fMaho)}</strong>、メダル<strong style="color:var(--text)">${medalCount(fMaho)}</strong>個・金<strong style="color:var(--text)">${goldCount(fMaho)}</strong>個）。${fGrace.Mean_Score != null && fMaho.Mean_Score != null ? `平均スコアの差は<strong style="color:var(--text)">${Math.abs(fGrace.Mean_Score - fMaho.Mean_Score).toFixed(3)}</strong>で、${fGrace.Mean_Score > fMaho.Mean_Score ? "Lau" : "Ono"}がリードしました。` : ""}</li>`
            : `<li>Female kata saw a more competitive dynamic at the top, with <strong style="color:var(--text)">Grace Lau</strong> (Hong Kong) and <strong style="color:var(--text)">Maho Ono</strong> (Japan) as the two clear frontrunners. Lau averaged <strong style="color:var(--text)">${fGrace.Mean_Score?.toFixed(3) ?? "—"}</strong> across <strong style="color:var(--text)">${fGrace.Performances}</strong> performances (win rate: <strong style="color:var(--text)">${fmtWR(fGrace)}</strong>; <strong style="color:var(--text)">${medalCount(fGrace)}</strong> medal${medalCount(fGrace) !== 1 ? "s" : ""}, <strong style="color:var(--text)">${goldCount(fGrace)}</strong> gold${goldCount(fGrace) !== 1 ? "s" : ""}). Ono averaged <strong style="color:var(--text)">${fMaho.Mean_Score?.toFixed(3) ?? "—"}</strong> across <strong style="color:var(--text)">${fMaho.Performances}</strong> performances (win rate: <strong style="color:var(--text)">${fmtWR(fMaho)}</strong>; <strong style="color:var(--text)">${medalCount(fMaho)}</strong> medal${medalCount(fMaho) !== 1 ? "s" : ""}, <strong style="color:var(--text)">${goldCount(fMaho)}</strong> gold${goldCount(fMaho) !== 1 ? "s" : ""}). ${fGrace.Mean_Score != null && fMaho.Mean_Score != null ? `The gap between them was <strong style="color:var(--text)">${Math.abs(fGrace.Mean_Score - fMaho.Mean_Score).toFixed(3)}</strong> in average score, with ${fGrace.Mean_Score > fMaho.Mean_Score ? "Lau" : "Ono"} leading.` : ""}</li>`}
        </ul>
      </details>
    </div>

    <!-- Top 10 side by side -->
    <div style="margin-top:64px">
      <span class="fig-label">${t("fig.figure")} G-1</span>
      <div class="compare-grid">
        <div class="compare-col">
          <h3 class="compare-head">${jp ? "演武数トップ10：男子" : "Top 10 Most Performed: Male"}</h3>
          <div class="table-wrapper">
            <table class="data-table"><thead><tr><th>#</th><th>${t("col.kata")}</th><th class="num">${t("col.performances")}</th><th class="num">${t("col.avgScore")}</th></tr></thead>
            <tbody>${mTop10.map((k,i) => top5Row(k,i)).join("")}</tbody></table>
          </div>
        </div>
        <div class="compare-col">
          <h3 class="compare-head">${jp ? "演武数トップ10：女子" : "Top 10 Most Performed: Female"}</h3>
          <div class="table-wrapper">
            <table class="data-table"><thead><tr><th>#</th><th>${t("col.kata")}</th><th class="num">${t("col.performances")}</th><th class="num">${t("col.avgScore")}</th></tr></thead>
            <tbody>${fTop10.map((k,i) => top5Row(k,i)).join("")}</tbody></table>
          </div>
        </div>
      </div>
    </div>

    <!-- Kata status + exclusive kata (combined G-2) -->
    ${(() => {
      const mts = DATA.tier_summary.male   || {};
      const fts = DATA.tier_summary.female || {};
      const mAdvSet  = new Set(mts.adv_performed   || []);
      const fAdvSet  = new Set(fts.adv_performed   || []);
      const mIntSet  = new Set(mts.interm_performed || []);
      const fIntSet  = new Set(fts.interm_performed || []);
      const allAdv   = [...new Set([...(mts.adv_performed || []), ...(mts.adv_unperformed || [])])].sort();
      const allInt   = [...new Set([...(mts.interm_performed || []), ...(fts.interm_performed || [])])].sort();
      const mid      = Math.ceil(allAdv.length / 2);
      const L = { both: jp ? "両方" : "Both", men: jp ? "男子のみ" : "Men only", women: jp ? "女子のみ" : "Women only", none: jp ? "未演武" : "Not performed" };
      const statusOf = (inM, inF) => (inM && inF) ? "both" : inM ? "men" : inF ? "women" : "none";
      const counts = { both: 0, men: 0, women: 0, none: 0 };
      allAdv.forEach(k => counts[statusOf(mAdvSet.has(k), fAdvSet.has(k))]++);
      allInt.forEach(k => counts[statusOf(mIntSet.has(k), fIntSet.has(k))]++);
      const pill = (inM, inF) => {
        if (inM && inF) return `<span class="ks-pill ks-pill-both">${L.both}</span>`;
        if (inM)        return `<span class="ks-pill ks-pill-male">${L.men}</span>`;
        if (inF)        return `<span class="ks-pill ks-pill-female">${L.women}</span>`;
        return `<span class="ks-pill ks-pill-none">${L.none}</span>`;
      };
      const rows = (list, mSet, fSet, offset = 0) => list.map((k, i) =>
        `<tr><td class="num row-num">${offset + i + 1}</td><td>${navLink("kata", k)}</td><td>${pill(mSet.has(k), fSet.has(k))}</td></tr>`
      ).join("");
      const col = (header, bodyRows) => `<div class="table-wrapper"><table class="data-table">
        <thead><tr><th class="num row-num">#</th><th>${header}</th><th>${jp ? "状態" : "Status"}</th></tr></thead>
        <tbody>${bodyRows}</tbody></table></div>`;
      return `<div id="fig-g2" style="margin-top:64px">
        <span class="fig-label">${t("fig.figure")} G-2</span>
        <h3 class="compare-head">${jp ? "性別ごとに演武された型" : "Kata Performed by Gender"}</h3>
        <div class="ks-legend">
          <span class="ks-pill ks-pill-both">${L.both} <span class="ks-pill-count">${counts.both}</span></span>
          <span class="ks-pill ks-pill-male">${L.men} <span class="ks-pill-count">${counts.men}</span></span>
          <span class="ks-pill ks-pill-female">${L.women} <span class="ks-pill-count">${counts.women}</span></span>
          <span class="ks-pill ks-pill-none">${L.none} <span class="ks-pill-count">${counts.none}</span></span>
        </div>
        <div class="ks-three-col">
          ${col(t("tier.Advanced"), rows(allAdv.slice(0, mid), mAdvSet, fAdvSet, 0))}
          ${col(jp ? "上級（続き）" : "Advanced (cont.)", rows(allAdv.slice(mid), mAdvSet, fAdvSet, mid))}
          ${col(jp ? "中級（演武分のみ）" : "Intermediate (performed only)", rows(allInt, mIntSet, fIntSet, 0))}
        </div>
      </div>`;
    })()}

    <!-- Exclusive kata + Venn diagram -->
    <div style="margin-top:64px">
      <span class="fig-label">${t("fig.figure")} G-3</span>
      <h3 class="compare-head">${jp ? "性別限定の型" : "Exclusive Kata by Gender"}</h3>
      <p style="text-align:center;font-size:13px;color:var(--text-muted);margin:0 0 12px">${jp ? "演武された型の総数：" : "Total unique kata performed: "}<strong style="color:var(--text)">${mOnly.length + fOnly.length + trueSharedCount}</strong></p>
      <svg viewBox="0 0 480 210" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:520px;display:block;margin:0 auto 32px">
        <circle cx="185" cy="105" r="100" fill="#bfdbfe" fill-opacity="0.65" stroke="#2563eb" stroke-width="1.5"/>
        <circle cx="295" cy="105" r="100" fill="#e9d5ff" fill-opacity="0.65" stroke="#9333ea" stroke-width="1.5"/>
        <text x="135" y="98" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="#1e40af">${jp ? "男子のみ" : "Men only"}</text>
        <text x="135" y="128" text-anchor="middle" font-family="system-ui,sans-serif" font-size="34" font-weight="700" fill="#1e40af">${mOnly.length}</text>
        <text x="240" y="98" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="#374151">${jp ? "両方" : "Both"}</text>
        <text x="240" y="128" text-anchor="middle" font-family="system-ui,sans-serif" font-size="34" font-weight="700" fill="#374151">${trueSharedCount}</text>
        <text x="345" y="98" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="#6b21a8">${jp ? "女子のみ" : "Women only"}</text>
        <text x="345" y="128" text-anchor="middle" font-family="system-ui,sans-serif" font-size="34" font-weight="700" fill="#6b21a8">${fOnly.length}</text>
      </svg>
      <div class="compare-grid">
        <div class="compare-col">
          <h3 class="compare-head">${jp ? `男子のみが演武 (${mOnly.length})` : `Performed by Males Only (${mOnly.length})`}</h3>
          ${mOnly.length ? `<div class="table-wrapper"><table class="data-table">
            <thead><tr><th class="num row-num">#</th><th>${t("col.kata")}</th><th>${t("col.tier")}</th><th class="num">${t("col.performances")}</th></tr></thead>
            <tbody>${mOnly.map((k, i) => `<tr>
              <td class="num row-num">${i + 1}</td>
              <td class="name-cell">${navLink("kata", k.Kata)}</td>
              <td>${tierBadge(k.Kata_Tier)}</td>
              <td class="num">${k.Performances}</td>
            </tr>`).join("")}</tbody>
          </table></div>` : `<em style='color:var(--text-muted)'>${t("lbl.none")}</em>`}
        </div>
        <div class="compare-col">
          <h3 class="compare-head">${jp ? `女子のみが演武 (${fOnly.length})` : `Performed by Females Only (${fOnly.length})`}</h3>
          ${fOnly.length ? `<div class="table-wrapper"><table class="data-table">
            <thead><tr><th class="num row-num">#</th><th>${t("col.kata")}</th><th>${t("col.tier")}</th><th class="num">${t("col.performances")}</th></tr></thead>
            <tbody>${fOnly.map((k, i) => `<tr>
              <td class="num row-num">${i + 1}</td>
              <td class="name-cell">${navLink("kata", k.Kata)}</td>
              <td>${tierBadge(k.Kata_Tier)}</td>
              <td class="num">${k.Performances}</td>
            </tr>`).join("")}</tbody>
          </table></div>` : `<em style='color:var(--text-muted)'>${t("lbl.none")}</em>`}
        </div>
      </div>
    </div>

    <!-- Avg score comparison -->
    <div style="margin-top:64px">
      <span class="fig-label">${t("fig.figure")} G-4</span>
      <h3 class="compare-head">${jp ? `平均スコア比較：共通の型 (${compareShared.length + compareIncomplete.length})` : `Average Score Comparison: Shared Kata (${compareShared.length + compareIncomplete.length})`}</h3>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${jp ? "列見出しをクリックして並べ替え。差 = 男子 − 女子。緑＝男子が高い、赤＝女子が高い。" : "Click any column header to sort. Diff = Male − Female. Green = males scored higher; red = females scored higher."}</p>
      <div style="position:relative;height:${Math.max(300, compareShared.length * 22)}px;margin-bottom:24px">
        <canvas id="chart-compare-diff"></canvas>
      </div>
      <div class="table-wrapper table-wrapper--sticky">
        <table class="data-table" id="compare-shared-table">
          <thead><tr>
            <th class="num row-num">#</th>
            <th data-ccol="Kata"   style="cursor:pointer" onclick="sortCompareTable('Kata')">${t("col.kata")}</th>
            <th data-ccol="Male"   class="num" style="cursor:pointer" onclick="sortCompareTable('Male')">${jp ? "男子平均" : "Male Avg"}</th>
            <th data-ccol="Female" class="num" style="cursor:pointer" onclick="sortCompareTable('Female')">${jp ? "女子平均" : "Female Avg"}</th>
            <th data-ccol="Diff"   class="num" style="cursor:pointer" onclick="sortCompareTable('Diff')">${jp ? "差（男−女）" : "Diff (M−F)"} ↓</th>
          </tr></thead>
          <tbody id="compare-shared-tbody"></tbody>
        </table>
      </div>
    </div>

    `;
  renderCompareSharedTable();
  renderCompareDiffChart();
}

function renderCompareDiffChart() {
  destroyChart("chart-compare-diff");
  const ctx = document.getElementById("chart-compare-diff"); if (!ctx) return;
  const sorted = [...compareShared].sort((a, b) => b.Diff - a.Diff);
  const bgColors = sorted.map(r => r.Diff >= 0 ? "rgba(58,110,58,0.8)" : RED);
  const bdColors = sorted.map(r => r.Diff >= 0 ? "rgba(40,85,40,1)"   : RED_BORDER);
  const diffLabelPlugin = {
    id: "diffLabels",
    afterDatasetsDraw(chart) {
      const c = chart.ctx;
      c.save();
      c.font = `9px ${CHART_FONT}`;
      c.textBaseline = "middle";
      const meta = chart.getDatasetMeta(0);
      sorted.forEach((row, i) => {
        const el = meta.data[i]; if (!el) return;
        if (row.Diff >= 0) {
          c.textAlign = "left"; c.fillStyle = POS;
          c.fillText(row.Kata, el.x + 5, el.y);
        } else {
          c.textAlign = "right"; c.fillStyle = NEG;
          c.fillText(row.Kata, el.x - 5, el.y);
        }
      });
      c.restore();
    },
  };
  charts["chart-compare-diff"] = new Chart(ctx, {
    type: "bar",
    data: { labels: sorted.map(r => displayName("kata", r.Kata)), datasets: [{ data: sorted.map(r => r.Diff), backgroundColor: bgColors, borderColor: bdColors, borderWidth: 1, borderRadius: 3 }] },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      layout: { padding: { left: 160, right: 160 } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.raw >= 0 ? "+" : ""}${c.raw.toFixed(3)} (M ${(compareShared.find(r=>r.Kata===sorted[c.dataIndex]?.Kata)?.Male??0).toFixed(3)} / F ${(compareShared.find(r=>r.Kata===sorted[c.dataIndex]?.Kata)?.Female??0).toFixed(3)})` } },
        diffLabels: {},
      },
      scales: {
        x: { grid: { color: c => c.tick.value === 0 ? ZERO_LINE : GRID, lineWidth: c => c.tick.value === 0 ? 1.5 : 1 }, ticks: { font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT }, title: { display: true, text: lang === "jp" ? "男子平均 − 女子平均" : "Male Avg − Female Avg", font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT } },
        y: { grid: { display: false }, ticks: { display: false } },
      },
    },
    plugins: [diffLabelPlugin],
  });
}

function sortCompareTable(col) {
  if (compareSortCol === col) {
    compareSortDir = compareSortDir === "asc" ? "desc" : "asc";
  } else {
    compareSortCol = col;
    compareSortDir = col === "Kata" ? "asc" : "desc";
  }
  /* update header arrows */
  document.querySelectorAll("#compare-shared-table th[data-ccol]").forEach(th => {
    const base = th.textContent.replace(/ [↑↓]$/, "");
    th.textContent = th.dataset.ccol === col ? base + (compareSortDir === "asc" ? " ↑" : " ↓") : base;
  });
  renderCompareSharedTable();
}

function renderCompareSharedTable() {
  const sign      = v => (v >= 0 ? "+" : "") + v.toFixed(3);
  const diffColor = v => v > 0 ? POS : v < 0 ? "var(--red)" : "inherit";
  const sorted = [...compareShared].sort((a, b) => {
    const av = a[compareSortCol], bv = b[compareSortCol];
    if (typeof av === "string") return compareSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return compareSortDir === "asc" ? av - bv : bv - av;
  });
  const tbody = document.getElementById("compare-shared-tbody");
  if (!tbody) return;
  const missingTip = g => lang === "jp"
    ? `title="この型の${g === "male" ? "男子" : "女子"}演武には平均スコアが記録されていません"`
    : `title="No average score recorded for ${g} performances of this kata"`;
  const diffTip = lang === "jp"
    ? `title="スコア差は利用できません。片方の性別の平均スコアが欠損しています"`
    : `title="Score differential not available; average score is missing for one gender"`;
  const incompleteRows = compareIncomplete.map((r, j) => `<tr>
    <td class="num row-num" style="color:var(--text-muted)">${sorted.length + j + 1}</td>
    <td class="name-cell">${navLink("kata", r.Kata)}</td>
    <td class="num">${r.Male != null ? r.Male.toFixed(3) : `<span style="color:var(--text-muted);cursor:help" ${missingTip("male")}>—</span>`}</td>
    <td class="num">${r.Female != null ? r.Female.toFixed(3) : `<span style="color:var(--text-muted);cursor:help" ${missingTip("female")}>—</span>`}</td>
    <td class="num"><span style="color:var(--text-muted);cursor:help" ${diffTip}>—</span></td>
  </tr>`).join("");
  tbody.innerHTML = sorted.map((r, i) => `<tr>
    <td class="num row-num">${i + 1}</td>
    <td class="name-cell">${navLink("kata", r.Kata)}</td>
    <td class="num">${r.Male.toFixed(3)}</td>
    <td class="num">${r.Female.toFixed(3)}</td>
    <td class="num" style="color:${diffColor(r.Diff)};font-weight:600">${sign(r.Diff)}</td>
  </tr>`).join("") + incompleteRows;
}

/* ── Sorting ───────────────────────────────────────────────────────────────── */
function sortData(rows, col, dir) {
  return [...rows].sort((a, b) => {
    let av = a[col], bv = b[col];
    if (av == null) av = dir === "asc" ? Infinity  : -Infinity;
    if (bv == null) bv = dir === "asc" ? Infinity  : -Infinity;
    if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return dir === "asc" ? av - bv : bv - av;
  });
}

function setupSortableTable(tableId, stateKey, renderFn) {
  document.querySelectorAll(`#${tableId} thead th`).forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.col; if (!col) return;
      const s = sortState[stateKey];
      s.dir = s.col === col ? (s.dir === "asc" ? "desc" : "asc") : "asc";
      s.col = col;
      // Clear via the header row (th.parentElement), not `#${tableId} thead th`:
      // splitTableScroll moves the thead out of the table, so the id selector
      // would match nothing and stale arrows would pile up across columns.
      th.parentElement.querySelectorAll("th").forEach(h => h.classList.remove("sort-asc","sort-desc"));
      th.classList.add(s.dir === "asc" ? "sort-asc" : "sort-desc");
      renderFn();
    });
  });
}

/* ── Sortable card tables ────────────────────────────────────────────────── */
const _cardSort = {};
const _cardData = {};

function _refreshCardTable(tableId) {
  const entry = _cardData[tableId]; if (!entry) return;
  const { rows, renderRow } = entry;
  const { col, dir } = _cardSort[tableId];
  const sorted = [...rows].sort((a, b) => {
    let av = a[col], bv = b[col];
    if (av == null) av = dir === "asc" ?  Infinity : -Infinity;
    if (bv == null) bv = dir === "asc" ?  Infinity : -Infinity;
    if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return dir === "asc" ? av - bv : bv - av;
  });
  const tbl = document.getElementById(tableId); if (!tbl) return;
  tbl.querySelectorAll("thead th[data-sort]").forEach(th => {
    th.textContent = th.dataset.sort === col
      ? th.dataset.label + (dir === "asc" ? " ↑" : " ↓")
      : th.dataset.label;
  });
  const tbody = tbl.querySelector("tbody");
  if (tbody) tbody.innerHTML = sorted.map((r, i) => renderRow(r, i)).join("");
}

function sortCardTable(tableId, col) {
  const s = _cardSort[tableId]; if (!s) return;
  const firstVal = (_cardData[tableId]?.rows ?? []).find(r => r[col] != null)?.[col];
  const isStr = typeof firstVal === "string";
  s.dir = s.col === col ? (s.dir === "asc" ? "desc" : "asc") : (isStr ? "asc" : "desc");
  s.col = col;
  _refreshCardTable(tableId);
}

function initCardTable(tableId, rows, defaultCol, defaultDir, renderRow) {
  _cardData[tableId] = { rows, renderRow };
  _cardSort[tableId] = { col: defaultCol, dir: defaultDir };
  _refreshCardTable(tableId);
  setTimeout(() => splitTableScroll(tableId), 0);
}

/* ── Formatting ────────────────────────────────────────────────────────────── */
const fmt2    = v => v != null ? v.toFixed(2) : "—";
const fmt3    = v => v != null ? v.toFixed(3) : "—";
const fmtPct  = v => v != null ? (v * 100).toFixed(1) + "%" : "—";
const esc     = s => s == null ? "" : String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const tierBadge = tier => tier ? `<span class="tier-badge tier-${tier}">${t("tier." + tier)}</span>` : "";

/* Athlete headshot filename convention: lowercase, diacritics stripped, every
   run of non-alphanumerics collapsed to a single hyphen. e.g.
   "Ortiz Aquino Jefferson" -> images/athletes/ortiz-aquino-jefferson.jpg
   Drop a matching .jpg into images/athletes/ and the card picks it up; if the
   file is absent the <img> onerror removes the cell (leaving the empty space). */
const photoSlug = name => (name == null ? "" : String(name)
  .normalize("NFD").replace(/[̀-ͯ]/g, "")   // strip accents
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));

/* ════════════════════════════════════════════════════════════════ KATA TAB */
function setupKataTab() {
  setupSortableTable("kata-table", "kata", renderKataTable);
  document.getElementById("kata-search").addEventListener("input", e => {
    searchQuery.kata = e.target.value.trim().toLowerCase();
    if (!searchQuery.kata) clearCard("kata-card");
    renderKataTable();
  });
}

function renderKataTable() {
  const s = sortState.kata;
  const q = searchQuery.kata;
  let rows = sortData(DATA.kata[gender], s.col, s.dir);
  if (q) rows = rows.filter(r => r.Kata && r.Kata.toLowerCase().includes(q));
  if (!rows.length) {
    document.getElementById("kata-tbody").innerHTML = `<tr><td colspan="13" style="text-align:center;padding:32px;color:var(--text-muted)">${lang === "jp" ? `「${esc(q)}」に一致する型はありません` : `No kata match "${esc(q)}"`}</td></tr>`;
    return;
  }
  document.getElementById("kata-tbody").innerHTML = rows.map((r, i) => `
    <tr data-kata="${esc(r.Kata)}">
      <td class="num row-num">${i + 1}</td>
      <td class="name-cell">${navLink("kata", r.Kata)}</td>
      <td>${tierBadge(r.Kata_Tier)}</td>
      <td class="num">${r.Performances}</td>
      <td class="num">${r.Unique_Karateka}</td>
      <td class="num">${fmt3(r.Mean_Score)}</td>
      <td class="num">${fmt2(r.Median_Score)}</td>
      <td class="num">${fmt2(r.Min_Score)}</td>
      <td class="num">${fmt2(r.Max_Score)}</td>
      <td class="num">${r.Max_Score != null && r.Min_Score != null ? fmt2(r.Max_Score - r.Min_Score) : "—"}</td>
      <td class="num">${fmt3(r.Std_Dev)}</td>
      <td class="num">${fmtPct(r.Win_Rate)}</td>
      <td class="num" style="${r.Diff != null ? (r.Diff >= 0 ? 'color:var(--pos)' : 'color:var(--red)') : ''}">${r.Diff != null ? (r.Diff >= 0 ? '+' : '') + r.Diff.toFixed(3) : '—'}</td>
    </tr>`).join("");
  /* averages row */
  const allKata = DATA.kata[gender];
  const avg = field => {
    const vals = allKata.map(r => r[field]).filter(v => v != null);
    return vals.length ? vals.reduce((s,v) => s+v, 0) / vals.length : null;
  };
  const medianOf = vals => {
    if (!vals.length) return null;
    const s = [...vals].sort((a,b) => a-b);
    const m = Math.floor(s.length/2);
    return s.length % 2 ? s[m] : (s[m-1]+s[m])/2;
  };
  const medianPerfsKata = medianOf(allKata.map(r => r.Performances).filter(v => v != null));
  const absMin = allKata.map(r => r.Min_Score).filter(v => v != null).reduce((m,v) => Math.min(m,v), Infinity);
  const absMax = allKata.map(r => r.Max_Score).filter(v => v != null).reduce((m,v) => Math.max(m,v), -Infinity);
  const totalPerfsK = allKata.reduce((s,r) => s + (r.Performances || 0), 0);
  const totalWinsK  = allKata.reduce((s,r) => s + (r.Win_Rate != null ? r.Win_Rate * r.Performances : 0), 0);
  const weightedWR  = totalPerfsK ? totalWinsK / totalPerfsK : null;
  const avgDiff = (() => {
    const vals = allKata.map(r => r.Diff).filter(v => v != null);
    return vals.length ? vals.reduce((s,v) => s+v, 0) / vals.length : null;
  })();
  const avgRange = avg("Max_Score") != null && avg("Min_Score") != null ? fmt2(avg("Max_Score") - avg("Min_Score")) : "—";
  const diffDisp = avgDiff != null ? (avgDiff >= 0 ? "+" : "") + avgDiff.toFixed(3) : "—";
  const stb = document.getElementById("kata-summary-tbody"); if (stb) stb.innerHTML = `<tr>
    <td class="num row-num"></td>
    <td class="name-cell">${t("summary.avgAllKata")}</td>
    <td></td>
    <td class="num" title="Median performances per kata: half of all kata were performed more than this, half fewer">${medianPerfsKata ?? "—"}</td>
    <td class="num" title="Mean number of unique athletes who performed each kata">${fmt2(avg("Unique_Karateka"))}</td>
    <td class="num" title="Performance-weighted average score across all kata and performances">${fmt3((() => { const sp = allKata.filter(r => r.Mean_Score != null); const tw = sp.reduce((s,r) => s + r.Performances, 0); return tw ? sp.reduce((s,r) => s + r.Mean_Score * r.Performances, 0) / tw : null; })())}</td>
    <td class="num" title="Mean of each kata's median score">${fmt2(avg("Median_Score"))}</td>
    <td class="num" title="Absolute lowest score recorded for any kata this season">${fmt2(isFinite(absMin) ? absMin : null)}</td>
    <td class="num" title="Absolute highest score recorded for any kata this season">${fmt2(isFinite(absMax) ? absMax : null)}</td>
    <td class="num" title="Mean of each kata's range (Max − Min): the average spread of scores within a kata">${avgRange}</td>
    <td class="num" title="Mean standard deviation across all kata: the average score consistency">${fmt3(avg("Std_Dev"))}</td>
    <td class="num" title="Weighted win rate across all kata, always near 50% since every match has a winner and a loser">${fmtPct(weightedWR)}</td>
    <td class="num" title="Mean score differential: how much kata scores deviate from their performers' personal averages, on average (kata avg score − athlete avg score)">${diffDisp}</td>
  </tr>`;
  document.querySelectorAll("#kata-tbody tr").forEach(tr => {
    tr.addEventListener("click", () => {
      const row = DATA.kata[gender].find(r => r.Kata === tr.dataset.kata);
      if (row) { showKataCard(row); highlightRow("kata-tbody", "data-kata", row.Kata); }
    });
  });
}

function showKataCard(r) {
  const allDiffs  = [...(DATA.kata_vs_karateka_avg[gender] || [])].sort((a, b) => b.Diff - a.Diff);
  const diffEntry = allDiffs.find(d => d.Kata === r.Kata);
  const diffVal   = diffEntry ? diffEntry.Diff : null;
  const myDiff    = diffVal;
  const diffBetter = myDiff != null ? allDiffs.filter(d => d.Diff > myDiff).length : 0;
  const diffTied   = myDiff != null ? allDiffs.filter(d => d.Diff === myDiff).length : 0;
  const rank       = diffBetter + 1;
  const total     = allDiffs.length;
  const diffColor = diffVal != null ? (diffVal >= 0 ? POS : "var(--red)") : "inherit";
  const diffNum   = diffVal != null
    ? `<span style="color:${diffColor};font-weight:700">${diffVal >= 0 ? "+" : ""}${diffVal.toFixed(3)}</span>`
    : "—";
  const rankStr   = rank > 0 ? ` &nbsp;·&nbsp; ${rank}/${total} among all kata` : "";
  /* find karateka who got the min and max score for this kata */
  let minK = null, maxK = null, minS = Infinity, maxS = -Infinity;
  for (const k of (DATA.karateka[gender] || [])) {
    for (const p of (k.Performances_Detail || [])) {
      if (p.Kata === r.Kata && p.Avg_Score != null) {
        if (p.Avg_Score < minS) { minS = p.Avg_Score; minK = k.Karateka; }
        if (p.Avg_Score > maxS) { maxS = p.Avg_Score; maxK = k.Karateka; }
      }
    }
  }

  /* rank helper: competition-style (tied values share the same rank) */
  const kataAll = DATA.kata[gender] || [];
  const rankOf = (field, asc = false) => {
    const vals = kataAll.filter(d => d[field] != null);
    const total = vals.length;
    const myVal = r[field];
    if (myVal == null || !total) return null;
    const better = vals.filter(d => asc ? d[field] < myVal : d[field] > myVal).length;
    const tied   = vals.filter(d => d[field] === myVal).length;
    const suffix = tied > 1 ? " (T)" : "";
    return `${better + 1}/${total}${suffix}`;
  };
  const rk = (field, asc) => { const v = rankOf(field, asc); return v ? `<div class="stat-rank">${v}</div>` : ""; };
  const rkFig = (field, asc, tab, figId) => {
    const v = rankOf(field, asc);
    return v ? `<div class="stat-rank"><a href="#" onclick="switchToTab('${tab}');setTimeout(()=>document.getElementById('${figId}')?.scrollIntoView({behavior:'smooth',block:'start'}),80);return false;" style="color:var(--red);text-decoration:none;font-weight:700;font-size:13px" title="See Figure ${figName(figId.replace('finding-','').replace(/([a-z]+)(\d+)/i,'$1-$2').toUpperCase())}">${v}</a></div>` : "";
  };

  const scoreMissing = r.Performances > 0 && r.Mean_Score == null;
  const dash = scoreMissing
    ? `<span title="Score missing" style="cursor:help">—</span>`
    : "—";
  const fmtS3 = v => v != null ? fmt3(v) : dash;
  const fmtS2 = v => v != null ? fmt2(v) : dash;

  /* country lookup for athlete table */
  const karCountry = Object.fromEntries((DATA.karateka[gender] || []).map(k => [k.Karateka, k.Country]));

  const athleteFlat = (r.All_Karateka || []).map(k => ({
    _name:    k.Karateka,
    _country: karCountry[k.Karateka] || "",
    Karateka:     k.Karateka,
    Country:      karCountry[k.Karateka] || "",
    Performances: k.Performances,
    Avg_Score:    k.Avg_Score,
  }));

  const diffStat = diffVal != null ? `
    <div class="stat-box">
      <div class="stat-label">
        <a href="#" onclick="switchToTab('kata-findings');setTimeout(()=>document.getElementById('finding-kk-avg')?.scrollIntoView({behavior:'smooth'}),60);return false;"
           style="color:inherit;text-decoration:none" title="Go to chart">Score Diff ↗</a>
      </div>
      <div class="stat-value" style="color:${diffColor};font-size:16px">${diffVal >= 0 ? "+" : ""}${diffVal.toFixed(3)}</div>
      ${rank > 0 ? `<div class="stat-rank">${rank}/${total}${diffTied > 1 ? " (T)" : ""}</div>` : ""}
    </div>` : "";

  document.getElementById("kata-card").innerHTML = `
    <button class="card-close-btn" onclick="document.getElementById('kata-card').classList.add('hidden')" title="Close">✕</button>
    <div class="card-header">
      <span class="card-title">${esc(displayName("kata", r.Kata))}</span>${tierBadge(r.Kata_Tier)}
      ${compareBtn("kata", r.Kata)}
    </div>
    ${scoreMissing ? `<p style="font-size:12px;color:var(--text-muted);background:var(--bg);border:1px solid var(--border);border-left:3px solid var(--red);border-radius:var(--radius);padding:8px 12px;margin-bottom:12px">The score for this kata's performance${r.Performances === 1 ? "" : "s"} was not recorded and is missing from the dataset. Score-related statistics are unavailable and shown as —.</p>` : ""}
    <div class="card-section-title">${t("sec.statistics")}</div>
    <div class="card-stats">
      <div class="stat-box">
        <div class="stat-label">${t("col.performances")}</div><div class="stat-value">${r.Performances}</div>${rkFig('Performances', false, 'kata-findings', 'finding-k1')}
      </div>
      <div class="stat-box">
        <div class="stat-label">${t("col.athletes")}</div><div class="stat-value">${r.Unique_Karateka}</div>${rk('Unique_Karateka')}
      </div>
      <div class="stat-box">
        <div class="stat-label">${t("col.avgScore")}</div><div class="stat-value">${fmtS3(r.Mean_Score)}</div>${rkFig('Mean_Score', false, 'kata-findings', 'finding-k2')}
      </div>
      <div class="stat-box">
        <div class="stat-label">${t("col.median")}</div><div class="stat-value">${fmtS2(r.Median_Score)}</div>${rk('Median_Score')}
      </div>
      <div class="stat-box">
        <div class="stat-label">${t("col.min")}</div><div class="stat-value">${fmtS2(r.Min_Score)}</div>${rk('Min_Score')}
        ${minK ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">${t("lbl.athleteColon")}: <strong>${navLink("karateka", minK)}</strong></div>` : ""}
      </div>
      <div class="stat-box">
        <div class="stat-label">${t("col.max")}</div><div class="stat-value">${fmtS2(r.Max_Score)}</div>${rk('Max_Score')}
        ${maxK ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">${t("lbl.athleteColon")}: <strong>${navLink("karateka", maxK)}</strong></div>` : ""}
      </div>
      <div class="stat-box">
        <div class="stat-label">${t("col.stdDev")}</div><div class="stat-value">${fmtS3(r.Std_Dev)}</div>${rk('Std_Dev', true)}
      </div>
      <div class="stat-box">
        <div class="stat-label">${t("col.winRate")}</div><div class="stat-value">${fmtPct(r.Win_Rate)}</div>${rkFig('Win_Rate', false, 'kata-findings', 'finding-k3')}
      </div>
      ${diffStat}
    </div>
    ${r.Mean_Score != null ? `
    <div class="card-section-title" style="margin-top:48px">${t("sec.scoreDistribution")}</div>
    <div style="height:140px;position:relative;margin-bottom:14px"><canvas id="chart-kata-histogram"></canvas></div>` : ""}
    ${athleteFlat.length ? `
    <div class="card-section-title">${t("sec.allAthletes")}</div>
    <div class="card-table-wrap">
      <table class="data-table" id="card-kata-athletes">
        <thead><tr>
          <th class="num row-num">#</th>
          <th data-sort="Karateka" data-label="${t('col.athlete')}" style="cursor:pointer" onclick="sortCardTable('card-kata-athletes','Karateka')">Karateka</th>
          <th data-sort="Performances" data-label="${t('col.performances')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-kata-athletes','Performances')">Performances</th>
          <th data-sort="Avg_Score" data-label="${t('col.avgScore')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-kata-athletes','Avg_Score')">Avg Score ↓</th>
        </tr></thead>
        <tbody></tbody>
      </table>
    </div>` : ""}`;
  if (athleteFlat.length) initCardTable("card-kata-athletes", athleteFlat, "Avg_Score", "desc",
    (k, i) => `<tr>
      <td class="num row-num">${i + 1}</td>
      <td class="name-cell">${flagOf(k._country)} ${navLink("karateka", k.Karateka)}</td>
      <td class="num">${k.Performances}</td>
      <td class="num">${k.Avg_Score != null ? k.Avg_Score.toFixed(3) : dash}</td>
    </tr>`);
  document.getElementById("kata-card").classList.remove("hidden");
  _currentCard = { type: "kata", name: r.Kata };
  window.location.hash = `kata/${encodeURIComponent(r.Kata)}`;
  scrollToCard("kata-card");
  /* score histogram */
  const allScores = [];
  for (const k of (DATA.karateka[gender] || [])) {
    for (const p of (k.Performances_Detail || [])) {
      if (p.Kata === r.Kata && p.Avg_Score != null) allScores.push(p.Avg_Score);
    }
  }
  renderScoreHistogram("chart-kata-histogram", allScores, "_kataHistChart");
}

/* ════════════════════════════════════════════════════════════════ KARATEKA TAB */
function setupKaratekaTab() {
  setupSortableTable("karateka-table", "karateka", renderKaratekaTable);
  document.getElementById("karateka-search").addEventListener("input", e => {
    searchQuery.karateka = e.target.value.trim().toLowerCase();
    if (!searchQuery.karateka) clearCard("karateka-card");
    renderKaratekaTable();
  });
}

function renderKaratekaTable() {
  const s = sortState.karateka;
  const q = searchQuery.karateka;
  DATA.karateka[gender].forEach(r => {
    r.Range = (r.Max_Score != null && r.Min_Score != null) ? r.Max_Score - r.Min_Score : null;
    r.Medal_Points = medalPoints(r.Medals);
  });
  let rows = sortData(DATA.karateka[gender], s.col, s.dir);
  if (q) rows = rows.filter(r => r.Karateka && r.Karateka.toLowerCase().includes(q));
  if (!rows.length) {
    document.getElementById("karateka-tbody").innerHTML = `<tr><td colspan="13" style="text-align:center;padding:32px;color:var(--text-muted)">${lang === "jp" ? `「${esc(q)}」に一致する選手はいません` : `No athletes match "${esc(q)}"`}</td></tr>`;
    return;
  }
  document.getElementById("karateka-tbody").innerHTML = rows.map((r, i) => `
    <tr data-karateka="${esc(r.Karateka)}">
      <td class="num row-num">${i + 1}</td>
      <td class="name-cell">${navLink("karateka", r.Karateka)}</td>
      <td>${flagOf(r.Country)} ${navLink("country", r.Country)}</td>
      <td class="num" style="white-space:nowrap">${medalTally(r.Medals)}</td>
      <td class="num">${r.Performances}</td>
      <td class="num">${r.Tournaments_Attended}</td>
      <td class="num">${fmt2(r.Mean_Score)}</td>
      <td class="num">${fmt2(r.Median_Score)}</td>
      <td class="num">${fmt2(r.Min_Score)}</td>
      <td class="num">${fmt2(r.Max_Score)}</td>
      <td class="num">${r.Max_Score != null && r.Min_Score != null ? fmt2(r.Max_Score - r.Min_Score) : "—"}</td>
      <td class="num">${fmtPct(r.Win_Rate)}</td>
      <td class="num" style="color:${r.Differential == null ? "inherit" : r.Differential > 0 ? POS : r.Differential < 0 ? "var(--red)" : "inherit"};font-weight:600">${r.Differential == null ? "—" : (r.Differential > 0 ? "+" : "") + r.Differential.toFixed(3)}</td>
    </tr>`).join("");
  /* averages row */
  const allKar = DATA.karateka[gender];
  const avgK = field => {
    const vals = allKar.map(r => r[field]).filter(v => v != null);
    return vals.length ? vals.reduce((s,v) => s+v, 0) / vals.length : null;
  };
  const medianOfK = vals => {
    if (!vals.length) return null;
    const s = [...vals].sort((a,b) => a-b);
    const m = Math.floor(s.length/2);
    return s.length % 2 ? s[m] : (s[m-1]+s[m])/2;
  };
  const medianPerfsKar = medianOfK(allKar.map(r => r.Performances).filter(v => v != null));
  const absMinK = allKar.map(r => r.Min_Score).filter(v => v != null).reduce((m,v) => Math.min(m,v), Infinity);
  const absMaxK = allKar.map(r => r.Max_Score).filter(v => v != null).reduce((m,v) => Math.max(m,v), -Infinity);
  const totPerfsKar  = allKar.reduce((s,r) => s + (r.Performances || 0), 0);
  const totWinsKar   = allKar.reduce((s,r) => s + (r.Win_Rate != null ? r.Win_Rate * r.Performances : 0), 0);
  const wWRKar       = totPerfsKar ? totWinsKar / totPerfsKar : null;
  const absRangeK = isFinite(absMinK) && isFinite(absMaxK) ? fmt2(absMaxK - absMinK) : "—";
  const kstb = document.getElementById("karateka-summary-tbody"); if (kstb) kstb.innerHTML = `<tr>
    <td class="num row-num"></td>
    <td class="name-cell">${t("summary.avgAllAthletes")}</td>
    <td></td>
    <td></td>
    <td class="num" title="Median performances per athlete: half of all athletes competed more than this, half fewer">${medianPerfsKar ?? "—"}</td>
    <td class="num" title="Mean number of tournaments attended per athlete">${fmt2(avgK("Tournaments_Attended"))}</td>
    <td class="num" title="Mean of each athlete's average score: the overall average score across all athletes">${fmt2(avgK("Mean_Score"))}</td>
    <td class="num" title="Mean of each athlete's median score">${fmt2(avgK("Median_Score"))}</td>
    <td class="num" title="Absolute lowest score recorded by any athlete in any single performance this season">${fmt2(isFinite(absMinK) ? absMinK : null)}</td>
    <td class="num" title="Absolute highest score recorded by any athlete in any single performance this season">${fmt2(isFinite(absMaxK) ? absMaxK : null)}</td>
    <td class="num" title="Difference between the season's absolute highest and lowest scores">${absRangeK}</td>
    <td class="num" title="Weighted win rate across all athletes, always near 50% since every match has a winner and a loser">${fmtPct(wWRKar)}</td>
    <td class="num" title="Mean of each athlete's differential, close to zero since every match's winner and loser cancel out">${(() => { const d = avgK("Differential"); return d == null ? "—" : (d > 0 ? "+" : "") + d.toFixed(3); })()}</td>
  </tr>`;
  document.querySelectorAll("#karateka-tbody tr").forEach(tr => {
    tr.addEventListener("click", () => {
      const row = DATA.karateka[gender].find(r => r.Karateka === tr.dataset.karateka);
      if (row) { showKaratekaCard(row); highlightRow("karateka-tbody", "data-karateka", row.Karateka); }
    });
  });
}

function showKaratekaCard(r) {
  const perfs = r.Performances_Detail || [];
  const scoredPerfs = perfs.filter(p => p.Avg_Score != null && p.Kata);
  const bestPerf  = scoredPerfs.reduce((best, p)  => (p.Avg_Score > (best?.Avg_Score  ?? -Infinity) ? p : best),  null);
  const worstPerf = scoredPerfs.reduce((worst, p) => (p.Avg_Score < (worst?.Avg_Score ??  Infinity) ? p : worst), null);
  const roundLabel = new Proxy({}, { get: (_, code) => roundName(code) });
  const perfRows = perfs.map((p, i) => `
    <tr>
      <td class="num row-num">${i + 1}</td>
      <td>${esc(p.Tournament || "—")}</td>
      <td>${esc(roundLabel[p.Round] || p.Round || "—")}</td>
      <td class="name-cell">${esc(p.Kata || "—")}</td>
      <td class="num">${p.Avg_Score != null ? p.Avg_Score.toFixed(2) : "—"}</td>
      <td class="num" style="color:${p.Won ? POS : "var(--red)"}; font-weight:600">${p.Won == null ? "—" : p.Won ? t("res.win") : t("res.loss")}</td>
    </tr>`).join("");
  /* avg score per kata from Performances_Detail */
  const kataAvgMap = {};
  for (const p of (r.Performances_Detail || [])) {
    if (p.Kata && p.Avg_Score != null) {
      if (!kataAvgMap[p.Kata]) kataAvgMap[p.Kata] = { sum: 0, n: 0 };
      kataAvgMap[p.Kata].sum += p.Avg_Score;
      kataAvgMap[p.Kata].n++;
    }
  }
  const repertoireFlat = (r.Kata_Repertoire || []).map(k => {
    const kData = DATA.kata[gender]?.find(d => d.Kata === k.Kata);
    const winEntry = kataAvgMap[k.Kata];
    const avgScore = winEntry ? winEntry.sum / winEntry.n : null;
    const kWins = (r.Performances_Detail || []).filter(p => p.Kata === k.Kata && p.Won === true).length;
    const kPerfs = k.count;
    return {
      Kata:         k.Kata,
      Kata_Tier:    kData?.Kata_Tier || "",
      Performances: kPerfs,
      Avg_Score:    avgScore,
      Win_Rate:     kPerfs ? kWins / kPerfs : null,
      _tier:        kData ? tierBadge(kData.Kata_Tier) : "",
    };
  });
  const perfsFlat = perfs.map((p, i) => ({
    Tournament:  p.Tournament || "",
    Tourn_Order: TOURN_ORDER[p.Tournament] ?? 99,
    Round:       roundLabel[p.Round] || p.Round || "",
    Kata:        p.Kata || "",
    Avg_Score:   p.Avg_Score,
    Won_Sort:    p.Won === true ? "0_win" : p.Won === false ? "1_loss" : "2_none",
    Opponent:    p.Opponent || "",
    Score_Diff:  p._diff,
    _oppScore:   p._oppScore,
    _won:        p.Won,
    _flag:       flagOf((TOURN_META[p.Tournament] || {}).country),
  }));

  /* medal count summary */
  const medalCounts = { 1: 0, 2: 0, 3: 0 };
  (r.Medals || []).forEach(m => medalCounts[m.Place] = (medalCounts[m.Place] || 0) + 1);
  const medalSummaryParts = [];
  if (medalCounts[1]) medalSummaryParts.push(`${medalCounts[1]}× ${t("medal.gold")}`);
  if (medalCounts[2]) medalSummaryParts.push(`${medalCounts[2]}× ${t("medal.silver")}`);
  if (medalCounts[3]) medalSummaryParts.push(`${medalCounts[3]}× ${t("medal.bronze")}`);

  /* rank among all karateka — competition-style (ties share same rank) */
  const karAll = DATA.karateka[gender] || [];
  const rkKFig = (field, asc, tab, figId) => {
    const vals  = karAll.filter(d => d[field] != null);
    const total = vals.length;
    const myVal = r[field];
    if (myVal == null || !total) return "";
    const better = vals.filter(d => asc ? d[field] < myVal : d[field] > myVal).length;
    const tied   = vals.filter(d => d[field] === myVal).length;
    const suffix = tied > 1 ? " (T)" : "";
    const v = `${better + 1}/${total}${suffix}`;
    return `<div class="stat-rank"><a href="#" onclick="switchToTab('${tab}');setTimeout(()=>document.getElementById('${figId}')?.scrollIntoView({behavior:'smooth',block:'start'}),80);return false;" style="color:var(--red);text-decoration:none;font-weight:700;font-size:13px" title="See Figure ${figName(figId.replace('finding-','').replace(/([a-z]+)(\d+)/i,'$1-$2').toUpperCase())}">${v}</a></div>`;
  };
  const rkK = (field, asc = false) => {
    const vals  = karAll.filter(d => d[field] != null);
    const total = vals.length;
    const myVal = r[field];
    if (myVal == null || !total) return "";
    const better = vals.filter(d => asc ? d[field] < myVal : d[field] > myVal).length;
    const tied   = vals.filter(d => d[field] === myVal).length;
    const suffix = tied > 1 ? " (T)" : "";
    return `<div class="stat-rank">${better + 1}/${total}${suffix}</div>`;
  };

  document.getElementById("karateka-card").innerHTML = `
    <button class="card-close-btn" onclick="document.getElementById('karateka-card').classList.add('hidden')" title="Close">✕</button>
    <div class="card-header">
      <span class="card-title">${esc(r.Karateka)}</span>
      <span class="card-subtitle">${flagOf(r.Country)} ${esc(displayName("country", r.Country) || "")}</span>
      ${compareBtn("karateka", r.Karateka)}
    </div>
    <div class="card-section-title">${t("sec.statistics")}</div>
    <div class="card-stats-row">
    <div class="card-stats">
      <div class="stat-box"><div class="stat-label">${t("col.performances")}</div><div class="stat-value">${r.Performances}</div>${rkK('Performances')}</div>
      <div class="stat-box"><div class="stat-label">${t("col.tournaments")}</div><div class="stat-value">${r.Tournaments_Attended}</div>${rkK('Tournaments_Attended')}</div>
      <div class="stat-box"><div class="stat-label">${t("col.avgScore")}</div><div class="stat-value">${fmt2(r.Mean_Score)}</div>${rkKFig('Mean_Score', false, 'karateka-findings', 'finding-a1')}</div>
      <div class="stat-box"><div class="stat-label">${t("col.median")}</div><div class="stat-value">${fmt2(r.Median_Score)}</div>${rkK('Median_Score')}</div>
      <div class="stat-box"><div class="stat-label">${t("stat.worstScore")}</div><div class="stat-value">${fmt2(r.Min_Score)}</div>${rkK('Min_Score', true)}${worstPerf ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">${t("lbl.kataColon")}: <strong>${navLink("kata", worstPerf.Kata)}</strong></div>` : ""}</div>
      <div class="stat-box"><div class="stat-label">${t("col.bestScore")}</div><div class="stat-value">${fmt2(r.Max_Score)}</div>${rkK('Max_Score')}${bestPerf ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">${t("lbl.kataColon")}: <strong>${navLink("kata", bestPerf.Kata)}</strong></div>` : ""}</div>
      <div class="stat-box"><div class="stat-label">${t("col.winRate")}</div><div class="stat-value">${fmtPct(r.Win_Rate)}</div>${rkKFig('Win_Rate', false, 'karateka-findings', 'finding-a2')}</div>
      <div class="stat-box" title="${esc(t("tip.athleteDiff"))}"><div class="stat-label">${t("col.differential")}</div><div class="stat-value" style="color:${r.Differential == null ? "inherit" : r.Differential > 0 ? POS : r.Differential < 0 ? "var(--red)" : "inherit"}">${_diffFmt(r.Differential)}</div>${rkK('Differential')}</div>
    </div>
      <div class="stat-photo" title="${esc(r.Karateka)}"><img src="images/athletes/${photoSlug(r.Karateka)}.jpg" alt="${esc(r.Karateka)}" loading="lazy" onerror="this.remove()"></div>
    </div>
    ${r.Medals && r.Medals.length ? `
    <div class="card-section-title">${t("sec.medals")}</div>
    ${medalSummaryParts.length ? `<p style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">${medalSummaryParts.join(" &nbsp;·&nbsp; ")}</p>` : ""}
    <div class="pill-list" style="margin-bottom:14px">
      ${medalsChrono(r.Medals).map(m => `<span class="pill">${medalIcon(m.Place)} ${navLink("tournament", m.Tournament)}</span>`).join("")}
    </div>` : ""}
    ${r.Mean_Score != null ? `
    <div class="card-section-title">${t("sec.scoreDistribution")}</div>
    <div style="height:140px;position:relative;margin-bottom:14px"><canvas id="chart-kar-histogram"></canvas></div>` : ""}
    ${repertoireFlat.length ? `
    <div class="card-section-title">${t("sec.kataRepertoire")}</div>
    <div class="card-table-wrap" style="margin-bottom:14px">
      <table class="data-table" id="card-kar-repertoire">
        <thead><tr>
          <th class="num row-num">#</th>
          <th data-sort="Kata" data-label="${t('col.kata')}" style="cursor:pointer" onclick="sortCardTable('card-kar-repertoire','Kata')">Kata</th>
          <th data-sort="Performances" data-label="${t('col.performances')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-kar-repertoire','Performances')">Performances ↓</th>
          <th data-sort="Avg_Score" data-label="${t('col.avgScore')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-kar-repertoire','Avg_Score')">Avg Score</th>
          <th data-sort="Win_Rate" data-label="${t('col.winRate')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-kar-repertoire','Win_Rate')">Win Rate</th>
        </tr></thead>
        <tbody></tbody>
      </table>
    </div>` : ""}
    ${perfsFlat.length ? `
    <div class="card-section-title">${t("sec.allPerformances")}</div>
    <div class="card-table-wrap">
      <table class="data-table" id="card-kar-performances">
        <thead><tr>
          <th class="num row-num">#</th>
          <th data-sort="Tournament" data-label="${t('col.tournament')}" style="cursor:pointer" onclick="sortCardTable('card-kar-performances','Tournament')">Tournament</th>
          <th data-sort="Round" data-label="${t('col.round')}" style="cursor:pointer" onclick="sortCardTable('card-kar-performances','Round')">Round</th>
          <th data-sort="Kata" data-label="${t('col.kata')}" style="cursor:pointer" onclick="sortCardTable('card-kar-performances','Kata')">Kata</th>
          <th data-sort="Avg_Score" data-label="${t('col.score')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-kar-performances','Avg_Score')">Score</th>
          <th data-sort="Won_Sort" data-label="${t('col.result')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-kar-performances','Won_Sort')">Result</th>
          <th data-sort="Opponent" data-label="${t('col.opponent')}" style="cursor:pointer" onclick="sortCardTable('card-kar-performances','Opponent')" title="Inferred 1v1 opponent based on score matching">Opponent</th>
          <th data-sort="Score_Diff" data-label="${t('col.scoreDiff')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-kar-performances','Score_Diff')" title="This athlete's score minus the opponent's score for the same match">Score Diff</th>
        </tr></thead>
        <tbody></tbody>
      </table>
    </div>` : ""}`;
  if (repertoireFlat.length) initCardTable("card-kar-repertoire", repertoireFlat, "Performances", "desc",
    (k, i) => `<tr>
      <td class="num row-num">${i + 1}</td>
      <td>${k._tier} ${navLink("kata", k.Kata)}</td>
      <td class="num">${k.Performances}</td>
      <td class="num">${k.Avg_Score != null ? k.Avg_Score.toFixed(2) : "—"}</td>
      <td class="num">${k.Win_Rate != null ? fmtPct(k.Win_Rate) : "—"}</td>
    </tr>`);
  if (perfsFlat.length) initCardTable("card-kar-performances", perfsFlat, "Tourn_Order", "asc",
    (p, i) => `<tr>
      <td class="num row-num">${i + 1}</td>
      <td>${p._flag}${navLink("tournament", p.Tournament)}</td>
      <td>${esc(p.Round)}</td>
      <td class="name-cell">${navLink("kata", p.Kata)}</td>
      <td class="num">${p.Avg_Score != null ? p.Avg_Score.toFixed(2) : "—"}</td>
      <td class="num" style="color:${p._won ? POS : p._won === false ? "var(--red)" : "inherit"};font-weight:600">${p._won == null ? "—" : p._won ? t("res.win") : t("res.loss")}</td>
      <td>${p.Opponent ? navLink("karateka", p.Opponent) : "—"}</td>
      <td class="num" style="color:${p.Score_Diff == null ? "inherit" : p.Score_Diff > 0 ? POS : p.Score_Diff < 0 ? "var(--red)" : "inherit"};font-weight:600"${p._oppScore != null ? ` title="Opponent scored ${p._oppScore.toFixed(2)}"` : ""}>${p.Score_Diff == null ? "—" : (p.Score_Diff > 0 ? "+" : "") + p.Score_Diff.toFixed(2)}</td>
    </tr>`);
  document.getElementById("karateka-card").classList.remove("hidden");
  _currentCard = { type: "karateka", name: r.Karateka };
  window.location.hash = `karateka/${encodeURIComponent(r.Karateka)}`;
  scrollToCard("karateka-card");
  /* score histogram */
  const karScores = (r.Performances_Detail || []).map(p => p.Avg_Score).filter(s => s != null);
  renderScoreHistogram("chart-kar-histogram", karScores, "_karHistChart");

  /* common opponents — read directly from Opponent field in Performances_Detail */
  const opponents = {};
  for (const p of (r.Performances_Detail || [])) {
    if (!p.Opponent) continue;
    const oppName = p.Opponent;
    if (!opponents[oppName]) {
      const oppRow = (DATA.karateka[gender] || []).find(k => k.Karateka === oppName);
      opponents[oppName] = { Karateka: oppName, Country: oppRow?.Country || "", Meetings: 0, Wins: 0 };
    }
    opponents[oppName].Meetings++;
    if (p.Won === true) opponents[oppName].Wins++;
  }
  const oppFlat = Object.values(opponents)
    .filter(o => o.Meetings > 0)
    .map(o => ({ ...o, Win_Rate: o.Meetings > 0 ? o.Wins / o.Meetings : null }))
    .sort((a,b) => b.Meetings - a.Meetings)
  if (oppFlat.length) {
    const oppSection = document.createElement("div");
    oppSection.innerHTML = `
      <div class="card-section-title">${t("sec.allOpponents")} (${oppFlat.length})</div>
      <div class="card-table-wrap">
        <table class="data-table" id="card-kar-opponents">
          <thead><tr>
            <th class="num row-num" title="Rank by meetings">#</th>
            <th data-sort="Karateka" data-label="${t('col.opponent')}" style="cursor:pointer" onclick="sortCardTable('card-kar-opponents','Karateka')" title="Opponent's name and country">Opponent</th>
            <th data-sort="Meetings" data-label="${t('col.meetings')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-kar-opponents','Meetings')" title="Number of rounds competed head-to-head in the same tournament round">Meetings ↓</th>
            <th data-sort="Wins" data-label="${t('col.wins')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-kar-opponents','Wins')" title="Rounds won against this opponent">Wins vs.</th>
            <th data-sort="Win_Rate" data-label="${t('col.winRate')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-kar-opponents','Win_Rate')" title="Win rate against this opponent (Wins ÷ Meetings)">Win Rate</th>
          </tr></thead>
          <tbody></tbody>
        </table>
      </div>`;
    document.getElementById("karateka-card").appendChild(oppSection);
    initCardTable("card-kar-opponents", oppFlat, "Meetings", "desc",
      (o, i) => `<tr>
        <td class="num row-num">${i + 1}</td>
        <td class="name-cell">${flagOf(o.Country)} <a class="nav-link" data-nav-type="karateka" data-nav-name="${esc(o.Karateka)}">${esc(o.Karateka)}</a></td>
        <td class="num">${o.Meetings}</td>
        <td class="num">${o.Wins}</td>
        <td class="num">${o.Win_Rate != null ? fmtPct(o.Win_Rate) : "—"}</td>
      </tr>`);
  }
}

function showCountryCard(r, all) {
  const rkC = (field, asc = false) => {
    const vals  = all.filter(d => d[field] != null);
    const total = vals.length;
    const myVal = r[field];
    if (myVal == null || !total) return "";
    const better = vals.filter(d => asc ? d[field] < myVal : d[field] > myVal).length;
    const tied   = vals.filter(d => d[field] === myVal).length;
    const suffix = tied > 1 ? " (T)" : "";
    return `<div class="stat-rank">${better + 1}/${total}${suffix}</div>`;
  };

  const medals = r._medalsList || [];
  const sortedMedals = [...medals].sort((a, b) => (TOURN_ORDER[a.Tournament] ?? 99) - (TOURN_ORDER[b.Tournament] ?? 99) || a.Place - b.Place);
  const medalCounts = { 1: 0, 2: 0, 3: 0 };
  medals.forEach(m => medalCounts[m.Place] = (medalCounts[m.Place] || 0) + 1);
  const medalsByAthlete = {};
  sortedMedals.forEach(m => {
    if (!medalsByAthlete[m.Athlete]) medalsByAthlete[m.Athlete] = { Athlete: m.Athlete, Gold: 0, Silver: 0, Bronze: 0 };
    if (m.Place === 1) medalsByAthlete[m.Athlete].Gold++;
    else if (m.Place === 2) medalsByAthlete[m.Athlete].Silver++;
    else medalsByAthlete[m.Athlete].Bronze++;
  });
  const athleteMedalRows = Object.values(medalsByAthlete).sort((a, b) => b.Gold - a.Gold || b.Silver - a.Silver || b.Bronze - a.Bronze);
  const fmtMedalCell = a => [a.Gold ? `${a.Gold}x ${medalIcon(1)}` : "", a.Silver ? `${a.Silver}x ${medalIcon(2)}` : "", a.Bronze ? `${a.Bronze}x ${medalIcon(3)}` : ""].filter(Boolean).join(", ");
  const medalSummaryParts = [];
  if (medalCounts[1]) medalSummaryParts.push(`${medalCounts[1]}× ${t("medal.gold")}`);
  if (medalCounts[2]) medalSummaryParts.push(`${medalCounts[2]}× ${t("medal.silver")}`);
  if (medalCounts[3]) medalSummaryParts.push(`${medalCounts[3]}× ${t("medal.bronze")}`);

  const athleteFlat2 = (r._athleteObjs || []).map(k => ({
    Karateka:     k.Karateka,
    Performances: k.Performances ?? 0,
    Avg_Score:    k.Mean_Score,
    Best_Score:   k.Max_Score,
    Win_Rate:     k.Win_Rate,
    Medals:       k.Medals?.length || 0,
    _medals:      k.Medals && k.Medals.length ? k.Medals.map(m => medalIcon(m.Place)).join("") : "—",
  }));

  const kataFlat2 = Object.entries(r._kataMap || {}).map(([kata, count]) => {
    const kData = DATA.kata[gender]?.find(d => d.Kata === kata);
    const sc = r._kataScoreMap?.[kata];
    return { Kata: kata, Kata_Tier: kData?.Kata_Tier || "", Performances: count, Avg_Score: sc ? sc.sum / sc.n : null, _tier: kData ? tierBadge(kData.Kata_Tier) : "" };
  });

  document.getElementById("countries-card").innerHTML = `
    <button class="card-close-btn" onclick="document.getElementById('countries-card').classList.add('hidden')" title="Close">✕</button>
    <div class="card-header">
      <span class="card-title">${flagOf(r.Country)} ${esc(displayName("country", r.Country))}</span>
      ${compareBtn("country", r.Country)}
    </div>
    <div class="card-section-title">${t("sec.statistics")}</div>
    <div class="card-stats">
      <div class="stat-box"><div class="stat-label">${t("col.athletes")}</div><div class="stat-value">${r.Athletes}</div>${rkC('Athletes')}</div>
      <div class="stat-box"><div class="stat-label">${t("col.performances")}</div><div class="stat-value">${r.Performances}</div>${rkC('Performances')}</div>
      <div class="stat-box"><div class="stat-label">${t("col.tournaments")}</div><div class="stat-value">${r.Tournaments}</div>${rkC('Tournaments')}</div>
      <div class="stat-box"><div class="stat-label">${t("col.avgScore")}</div><div class="stat-value">${fmt2(r.Avg_Score)}</div>${rkC('Avg_Score')}</div>
      <div class="stat-box"><div class="stat-label">${t("col.bestScore")}</div><div class="stat-value">${fmt2(r.Best_Score)}</div>${rkC('Best_Score')}</div>
      <div class="stat-box"><div class="stat-label">${t("col.winRate")}</div><div class="stat-value">${fmtPct(r.Win_Rate)}</div>${rkC('Win_Rate')}</div>
      <div class="stat-box"><div class="stat-label">${t("col.medals")}</div><div class="stat-value">${r.Medals || 0}</div>${rkC('Medals')}</div>
    </div>
    ${medals.length ? `
    <div class="card-section-title">${t("sec.medals")}</div>
    ${medalSummaryParts.length ? `<p style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">${medalSummaryParts.join(" &nbsp;·&nbsp; ")}</p>` : ""}
    <div class="card-table-wrap" style="margin-bottom:14px">
      <div class="dt-scroll-body">
        <table class="data-table">
          <thead><tr>
            <th class="num row-num">#</th>
            <th>Athlete</th>
            <th>Medal(s)</th>
          </tr></thead>
          <tbody>
            ${athleteMedalRows.map((a, i) => `<tr>
              <td class="num row-num">${i + 1}</td>
              <td class="name-cell"><strong>${navLink("karateka", a.Athlete)}</strong></td>
              <td>${fmtMedalCell(a)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>` : ""}
    <div class="card-section-title">${t("sec.athletes")}</div>
    <div class="card-table-wrap" style="margin-bottom:14px">
      <table class="data-table" id="card-country-athletes">
        <thead><tr>
          <th class="num row-num">#</th>
          <th data-sort="Karateka" data-label="${t('col.athlete')}" style="cursor:pointer" onclick="sortCardTable('card-country-athletes','Karateka')">Athlete</th>
          <th data-sort="Performances" data-label="${t('col.performances')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-country-athletes','Performances')">Performances</th>
          <th data-sort="Avg_Score" data-label="${t('col.avgScore')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-country-athletes','Avg_Score')">Avg Score ↓</th>
          <th data-sort="Best_Score" data-label="${t('col.bestScore')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-country-athletes','Best_Score')">Best Score</th>
          <th data-sort="Win_Rate" data-label="${t('col.winRate')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-country-athletes','Win_Rate')">Win Rate</th>
          <th data-sort="Medals" data-label="${t('col.medals')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-country-athletes','Medals')">Medals</th>
        </tr></thead>
        <tbody></tbody>
      </table>
    </div>
    ${kataFlat2.length ? `
    <div class="card-section-title">${t("sec.kataPerformed")}</div>
    <div class="card-table-wrap">
      <table class="data-table" id="card-country-kata">
        <thead><tr>
          <th class="num row-num">#</th>
          <th data-sort="Kata" data-label="${t('col.kata')}" style="cursor:pointer" onclick="sortCardTable('card-country-kata','Kata')">Kata</th>
          <th data-sort="Performances" data-label="${t('col.performances')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-country-kata','Performances')">Performances ↓</th>
          <th data-sort="Avg_Score" data-label="${t('col.avgScore')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-country-kata','Avg_Score')">Avg Score</th>
        </tr></thead>
        <tbody></tbody>
      </table>
    </div>` : ""}`;
  initCardTable("card-country-athletes", athleteFlat2, "Avg_Score", "desc",
    (k, i) => `<tr>
      <td class="num row-num">${i + 1}</td>
      <td class="name-cell">${navLink("karateka", k.Karateka)}</td>
      <td class="num">${k.Performances}</td>
      <td class="num">${k.Avg_Score != null ? k.Avg_Score.toFixed(2) : "—"}</td>
      <td class="num">${k.Best_Score != null ? k.Best_Score.toFixed(2) : "—"}</td>
      <td class="num">${k.Win_Rate != null ? fmtPct(k.Win_Rate) : "—"}</td>
      <td class="num">${k._medals}</td>
    </tr>`);
  if (kataFlat2.length) initCardTable("card-country-kata", kataFlat2, "Performances", "desc",
    (k, i) => `<tr>
      <td class="num row-num">${i + 1}</td>
      <td class="name-cell">${k._tier} ${navLink("kata", k.Kata)}</td>
      <td class="num">${k.Performances}</td>
      <td class="num">${k.Avg_Score != null ? k.Avg_Score.toFixed(3) : "—"}</td>
    </tr>`);

  /* tournaments attended */
  const tournSet = new Set();
  for (const k of (r._athleteObjs || [])) {
    for (const p of (k.Performances_Detail || [])) {
      if (p.Tournament) tournSet.add(p.Tournament);
    }
  }
  const tournFlat = [...tournSet].sort().map(t => {
    const meta = TOURN_META[t] || {};
    let scoreSum = 0, scoredN = 0, wins = 0, winN = 0;
    const athSent = new Set();
    for (const k of (r._athleteObjs || [])) {
      let appeared = false;
      for (const p of (k.Performances_Detail || [])) {
        if (p.Tournament === t) {
          appeared = true;
          if (p.Avg_Score != null) { scoreSum += p.Avg_Score; scoredN++; }
          if (p.Won != null) { wins += p.Won ? 1 : 0; winN++; }
        }
      }
      if (appeared) athSent.add(k.Karateka);
    }
    const medals = (r._medalsList || []).filter(m => m.Tournament === t);
    const gold   = medals.filter(m => m.Place === 1).length;
    const silver = medals.filter(m => m.Place === 2).length;
    const bronze = medals.filter(m => m.Place === 3).length;
    return {
      Tournament:    t,
      Athletes_Sent: athSent.size,
      Gold:   gold,
      Silver: silver,
      Bronze: bronze,
      _flag:     flagOf(meta.country),
      Avg_Score: scoredN ? scoreSum / scoredN : null,
      Win_Rate:  winN   ? wins / winN        : null,
    };
  });
  if (tournFlat.length) {
    const ts = document.createElement("div");
    ts.innerHTML = `
      <div class="card-section-title">${t("sec.tournamentsAttended")} (${tournFlat.length})</div>
      <div class="card-table-wrap">
        <table class="data-table" id="card-country-tournaments">
          <thead><tr>
            <th class="num row-num">#</th>
            <th data-sort="Tournament" data-label="${t('col.tournament')}" style="cursor:pointer" onclick="sortCardTable('card-country-tournaments','Tournament')">Tournament</th>
            <th data-sort="Athletes_Sent" data-label="${t('col.athletesSent')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-country-tournaments','Athletes_Sent')">Athletes</th>
            <th data-sort="Gold" data-label="${t('medal.gold')}" class="num" style="cursor:pointer" title="${t('medal.goldTip')}" onclick="sortCardTable('card-country-tournaments','Gold')">🥇</th>
            <th data-sort="Silver" data-label="${t('medal.silver')}" class="num" style="cursor:pointer" title="${t('medal.silverTip')}" onclick="sortCardTable('card-country-tournaments','Silver')">🥈</th>
            <th data-sort="Bronze" data-label="${t('medal.bronze')}" class="num" style="cursor:pointer" title="${t('medal.bronzeTip')}" onclick="sortCardTable('card-country-tournaments','Bronze')">🥉</th>
            <th data-sort="Avg_Score" data-label="${t('col.avgScore')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-country-tournaments','Avg_Score')">Avg Score</th>
            <th data-sort="Win_Rate" data-label="${t('col.winRate')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-country-tournaments','Win_Rate')">Win Rate</th>
          </tr></thead>
          <tbody></tbody>
        </table>
      </div>`;
    document.getElementById("countries-card").appendChild(ts);
    initCardTable("card-country-tournaments", tournFlat, "Tournament", "asc",
      (t, i) => `<tr>
        <td class="num row-num">${i + 1}</td>
        <td>${t._flag} ${navLink("tournament", t.Tournament)}</td>
        <td class="num">${t.Athletes_Sent || "—"}</td>
        <td class="num">${t.Gold   ? `${t.Gold}× ${medalIcon(1)}`   : "—"}</td>
        <td class="num">${t.Silver ? `${t.Silver}× ${medalIcon(2)}` : "—"}</td>
        <td class="num">${t.Bronze ? `${t.Bronze}× ${medalIcon(3)}` : "—"}</td>
        <td class="num">${t.Avg_Score != null ? t.Avg_Score.toFixed(3) : "—"}</td>
        <td class="num">${t.Win_Rate != null ? fmtPct(t.Win_Rate) : "—"}</td>
      </tr>`);
  }
  _currentCard = { type: "country", name: r.Country };
  window.location.hash = `country/${encodeURIComponent(r.Country)}`;
  scrollToCard("countries-card");
  document.getElementById("countries-card").classList.remove("hidden");
}

/* ════════════════════════════════════════════════════════════════ TOURNAMENTS TAB */
function buildCountryStats() {
  const karAll = DATA.karateka[gender] || [];
  const map = {};
  for (const k of karAll) {
    const c = k.Country;
    if (!c) continue;
    if (!map[c]) map[c] = { Country: c, athleteObjs: [], performances: 0, tournaments: new Set(), scoreSum: 0, scoredPerfs: 0, wins: 0, winPerfs: 0, bestScore: -Infinity, golds: 0, silvers: 0, bronzes: 0, medalsList: [], kataMap: {}, kataScoreMap: {} };
    const m = map[c];
    m.athleteObjs.push(k);
    m.performances += k.Performances || 0;
    (k.Performances_Detail || []).forEach(p => { if (p.Tournament) m.tournaments.add(p.Tournament); });
    if (k.Mean_Score != null && k.Performances) { m.scoreSum += k.Mean_Score * k.Performances; m.scoredPerfs += k.Performances; }
    if (k.Win_Rate != null && k.Performances)   { m.wins += k.Win_Rate * k.Performances; m.winPerfs += k.Performances; }
    if (k.Max_Score != null && k.Max_Score > m.bestScore) m.bestScore = k.Max_Score;
    (k.Medals || []).forEach(med => {
      if (med.Place === 1) m.golds++;
      else if (med.Place === 2) m.silvers++;
      else m.bronzes++;
      m.medalsList.push({ ...med, Athlete: k.Karateka });
    });
    (k.Kata_Repertoire || []).forEach(kr => {
      m.kataMap[kr.Kata] = (m.kataMap[kr.Kata] || 0) + (kr.count || 0);
    });
    (k.Performances_Detail || []).forEach(p => {
      if (p.Kata && p.Avg_Score != null) {
        if (!m.kataScoreMap[p.Kata]) m.kataScoreMap[p.Kata] = { sum: 0, n: 0 };
        m.kataScoreMap[p.Kata].sum += p.Avg_Score;
        m.kataScoreMap[p.Kata].n++;
      }
    });
  }
  return Object.values(map).map(m => ({
    Country:      m.Country,
    Athletes:     m.athleteObjs.length,
    Performances: m.performances,
    Tournaments:  m.tournaments.size,
    Avg_Score:    m.scoredPerfs ? m.scoreSum / m.scoredPerfs : null,
    Best_Score:   isFinite(m.bestScore) ? m.bestScore : null,
    Win_Rate:     m.winPerfs ? m.wins / m.winPerfs : null,
    Medals:       m.golds + m.silvers + m.bronzes,
    _medals:      { gold: m.golds, silver: m.silvers, bronze: m.bronzes },
    _medalsList:  m.medalsList,
    _athleteObjs: m.athleteObjs,
    _kataMap:      m.kataMap,
    _kataScoreMap: m.kataScoreMap,
  }));
}

function renderCountriesTable() {
  const s = sortState.countries;
  const q = searchQuery.countries;
  const fullAll = buildCountryStats();
  const cMean = field => { const v = fullAll.map(r => r[field]).filter(x => x != null && isFinite(x)); return v.length ? v.reduce((s,x)=>s+x,0)/v.length : null; };
  const cWtAvg = (() => { const tp = fullAll.reduce((s,r)=>s+(r.Performances||0),0); const ts = fullAll.reduce((s,r)=>s+(r.Avg_Score!=null?r.Avg_Score*r.Performances:0),0); return tp ? ts/tp : null; })();
  const cWtWR  = (() => { const tp = fullAll.reduce((s,r)=>s+(r.Performances||0),0); const tw = fullAll.reduce((s,r)=>s+(r.Win_Rate!=null?r.Win_Rate*r.Performances:0),0); return tp ? tw/tp : null; })();
  const cBest  = fullAll.map(r => r.Best_Score).filter(x => x != null && isFinite(x)).reduce((m,v)=>Math.max(m,v), -Infinity);
  const cTotalMedals = fullAll.reduce((s,r) => s + (r.Medals || 0), 0);
  const cstb = document.getElementById("countries-summary-tbody"); if (cstb) cstb.innerHTML = `<tr>
    <td class="num row-num"></td>
    <td class="name-cell">${t("summary.avgAllCountries")}</td>
    <td class="num" title="Mean number of athletes per country">${fmt2(cMean("Athletes"))}</td>
    <td class="num" title="Mean number of performances per country">${fmt2(cMean("Performances"))}</td>
    <td class="num" title="Mean number of tournaments attended per country">${fmt2(cMean("Tournaments"))}</td>
    <td class="num" title="Weighted average score across all countries and performances">${fmt2(cWtAvg)}</td>
    <td class="num" title="Single highest score recorded by any athlete from any country this season">${isFinite(cBest) ? fmt2(cBest) : "—"}</td>
    <td class="num" title="Weighted win rate across all countries, always near 50% since every match has a winner and a loser">${fmtPct(cWtWR)}</td>
    <td class="num" title="Total medals won across all countries this season">${cTotalMedals || "—"}</td>
  </tr>`;
  let all = fullAll;
  if (q) all = all.filter(r => r.Country.toLowerCase().includes(q));
  const rows = sortData(all, s.col, s.dir);
  if (!rows.length) {
    document.getElementById("countries-tbody").innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted)">${lang === "jp" ? `「${esc(q)}」に一致する国はありません` : `No countries match "${esc(q)}"`}</td></tr>`;
    return;
  }
  document.getElementById("countries-tbody").innerHTML = rows.map((r, i) => `
    <tr data-country="${esc(r.Country)}" style="cursor:pointer">
      <td class="num row-num">${i + 1}</td>
      <td class="name-cell">${flagOf(r.Country)} ${navLink("country", r.Country)}</td>
      <td class="num">${r.Athletes}</td>
      <td class="num">${r.Performances}</td>
      <td class="num">${r.Tournaments}</td>
      <td class="num">${fmt2(r.Avg_Score)}</td>
      <td class="num">${fmt2(r.Best_Score)}</td>
      <td class="num">${fmtPct(r.Win_Rate)}</td>
      <td class="num" style="white-space:nowrap">${r.Medals ? medalTally(r._medalsList) : "—"}</td>
    </tr>`).join("");
  document.querySelectorAll("#countries-tbody tr").forEach(tr => {
    tr.addEventListener("click", () => {
      const all = buildCountryStats();
      const row = all.find(r => r.Country === tr.dataset.country);
      if (row) { showCountryCard(row, all); highlightRow("countries-tbody", "data-country", row.Country); }
    });
  });
}

function renderTournamentsTable() {
  const s = sortState.tournaments;
  /* compute unique countries per tournament */
  const tournCountries = {};
  for (const k of (DATA.karateka[gender] || [])) {
    for (const p of (k.Performances_Detail || [])) {
      if (p.Tournament && k.Country) {
        if (!tournCountries[p.Tournament]) tournCountries[p.Tournament] = new Set();
        tournCountries[p.Tournament].add(k.Country);
      }
    }
  }
  const baseRows = DATA.tournaments.filter(r => r.Gender.toLowerCase() === gender).map(r => ({
    ...r,
    Unique_Countries: (tournCountries[r.Tournament]?.size ?? 0),
    Tourn_Order: TOURN_ORDER[r.Tournament] ?? 99,
  }));
  const tMean = field => { const v = baseRows.map(r => r[field]).filter(x => x != null); return v.length ? v.reduce((s,x)=>s+x,0)/v.length : null; };
  const tWtAvg = (() => { const tp = baseRows.reduce((s,r)=>s+(r.Total_Performances||0),0); const ts = baseRows.reduce((s,r)=>s+(r.Avg_Score!=null?r.Avg_Score*r.Total_Performances:0),0); return tp ? ts/tp : null; })();
  const tstb = document.getElementById("tourn-summary-tbody"); if (tstb) tstb.innerHTML = `<tr>
    <td class="num row-num"></td>
    <td class="name-cell">${t("summary.avgAllTournaments")}</td>
    <td class="num" title="Mean number of performances per tournament">${fmt2(tMean("Total_Performances"))}</td>
    <td class="num" title="Mean number of athletes per tournament">${fmt2(tMean("Unique_Karateka"))}</td>
    <td class="num" title="Mean number of unique kata performed per tournament">${(() => { const v = tMean("Unique_Kata"); return v != null ? Math.round(v) : "—"; })()}</td>
    <td class="num" title="Mean number of countries represented per tournament">${(() => { const v = tMean("Unique_Countries"); return v != null ? Math.round(v) : "—"; })()}</td>
    <td class="num" title="Weighted average score across all tournaments and performances">${tWtAvg != null ? tWtAvg.toFixed(3) : "—"}</td>
  </tr>`;
  const rows = sortData(baseRows, s.col, s.dir);
  const tmeta = t => TOURN_META[t] || {};
  document.getElementById("tournaments-tbody").innerHTML = rows.map((r, i) => `
    <tr data-tourn="${esc(r.Tournament)}" style="cursor:pointer">
      <td class="num row-num">${i + 1}</td>
      <td class="name-cell">${flagOf(tmeta(r.Tournament).country)} ${navLink("tournament", r.Tournament)}</td>
      <td class="num">${r.Total_Performances}</td>
      <td class="num">${r.Unique_Karateka}</td>
      <td class="num">${r.Unique_Kata}</td>
      <td class="num">${r.Unique_Countries || "—"}</td>
      <td class="num">${r.Avg_Score != null ? r.Avg_Score.toFixed(3) : "—"}</td>
    </tr>`).join("");
  document.querySelectorAll("#tournaments-tbody tr").forEach(tr => {
    tr.addEventListener("click", () => {
      const row = DATA.tournaments.find(r => r.Tournament === tr.dataset.tourn && r.Gender.toLowerCase() === gender);
      if (row) showTournamentCard(row);
    });
  });
}

function tournamentShowList(type) {
  const tourn = lastTournCard;
  const panel = document.getElementById("tourn-list-panel");
  if (!panel) return;
  if (type === "athletes") {
    const athletes = (DATA.karateka[gender] || [])
      .filter(k => (k.Tournament_List || []).includes(tourn))
      .sort((a, b) => a.Karateka.localeCompare(b.Karateka));
    panel.innerHTML = `
      <div class="card-section-title">${t("sec.athletesAtTournament")} (${athletes.length})</div>
      <div class="pill-list">${athletes.map(k => `<span class="pill">${flagOf(k.Country)} ${esc(k.Karateka)}</span>`).join("")}</div>`;
  } else {
    const kataSet = new Set();
    for (const k of (DATA.karateka[gender] || [])) {
      for (const p of (k.Performances_Detail || [])) {
        if (p.Tournament === tourn && p.Kata) kataSet.add(p.Kata);
      }
    }
    const kataArr = [...kataSet].sort();
    const kataLookup = Object.fromEntries((DATA.kata[gender] || []).map(d => [d.Kata, d]));
    panel.innerHTML = `
      <div class="card-section-title">${t("sec.kataAtTournament")} (${kataArr.length})</div>
      <div class="pill-list">${kataArr.map(k => {
        const kd = kataLookup[k];
        return `<span class="pill">${kd ? tierBadge(kd.Kata_Tier) : ""} ${esc(k)}</span>`;
      }).join("")}</div>`;
  }
}

function showTournamentCard(r) {
  lastTournCard = r.Tournament;
  const meta = TOURN_META[r.Tournament] || {};

  /* medalists */
  const medalists = [];
  for (const k of (DATA.karateka[gender] || [])) {
    for (const m of (k.Medals || [])) {
      if (m.Tournament === r.Tournament) medalists.push({ name: k.Karateka, country: k.Country, place: m.Place });
    }
  }
  medalists.sort((a, b) => a.place - b.place);
  const medalistHtml = medalists.length ? `
    <div class="card-section-title" style="margin-top:40px">${t("sec.medalists")}</div>
    <div class="pill-list" style="margin-bottom:14px">${medalists.map(m => `<span class="pill">${medalIcon(m.place)} ${flagOf(m.country)} <strong>${navLink("karateka", m.name)}</strong></span>`).join("")}</div>` : "";

  /* athletes — with tournament-specific stats */
  const athletes = (DATA.karateka[gender] || [])
    .filter(k => (k.Tournament_List || []).includes(r.Tournament))
    .sort((a, b) => a.Karateka.localeCompare(b.Karateka));

  /* collect per-athlete/kata/country stats for this tournament from Performances_Detail */
  const kataStats = {};   // kata → { count, scoreSum, scoredCount }
  const countryStats = {}; // country → { athletes: Set, scoreSum, scoredCount, wins, winCount }
  for (const k of athletes) {
    const tPerfs = (k.Performances_Detail || []).filter(p => p.Tournament === r.Tournament);
    k._tPerfs    = tPerfs.length;
    k._tScoreSum = 0; k._tScoredN = 0;
    for (const p of tPerfs) {
      if (p.Avg_Score != null) { k._tScoreSum += p.Avg_Score; k._tScoredN++; }
      if (p.Kata) {
        if (!kataStats[p.Kata]) kataStats[p.Kata] = { count: 0, scoreSum: 0, scoredCount: 0 };
        kataStats[p.Kata].count++;
        if (p.Avg_Score != null) { kataStats[p.Kata].scoreSum += p.Avg_Score; kataStats[p.Kata].scoredCount++; }
      }
      const c = k.Country;
      if (c) {
        if (!countryStats[c]) countryStats[c] = { athleteSet: new Set(), scoreSum: 0, scoredCount: 0, wins: 0, winCount: 0 };
        countryStats[c].athleteSet.add(k.Karateka);
        if (p.Avg_Score != null) { countryStats[c].scoreSum += p.Avg_Score; countryStats[c].scoredCount++; }
        if (p.Won != null) { countryStats[c].wins += p.Won ? 1 : 0; countryStats[c].winCount++; }
      }
    }
  }

  const kataLookup = Object.fromEntries((DATA.kata[gender] || []).map(d => [d.Kata, d]));

  const athleteFlat3 = athletes.map(k => ({
    Karateka:     k.Karateka,
    Country:      k.Country || "",
    Performances: k._tPerfs,
    Avg_Score:    k._tScoredN ? k._tScoreSum / k._tScoredN : null,
    _flag:        flagOf(k.Country),
  }));

  const kataArr = Object.entries(kataStats);
  const kataFlat3 = kataArr.map(([kata, ks]) => ({
    Kata:         kata,
    Kata_Tier:    kataLookup[kata]?.Kata_Tier || "",
    Performances: ks.count,
    Avg_Score:    ks.scoredCount ? ks.scoreSum / ks.scoredCount : null,
    _tier:        kataLookup[kata] ? tierBadge(kataLookup[kata].Kata_Tier) : "",
  }));

  const countryArr = Object.entries(countryStats);
  const countryFlat3 = countryArr.map(([country, cs]) => ({
    Country:   country,
    Athletes:  cs.athleteSet.size,
    Avg_Score: cs.scoredCount ? cs.scoreSum / cs.scoredCount : null,
    Win_Rate:  cs.winCount    ? cs.wins / cs.winCount        : null,
    _flag:     flagOf(country),
  }));

  /* missing data */
  const missingTotal = (r.Missing_Kata || 0) + (r.Missing_Score || 0) + (r.Missing_Both || 0);
  let missingHtml = "";
  const jp = lang === "jp";
  const rowWord = n => jp ? "行" : ` row${n > 1 ? "s" : ""}`;
  if (missingTotal === 0) {
    missingHtml = `<p style="font-size:13px;color:var(--text-muted);margin-top:14px">${t("tourn.noMissing")}</p>`;
  } else {
    const lines = [];
    if (r.Missing_Kata)  lines.push(jp ? `${r.Missing_Kata}${rowWord(r.Missing_Kata)}で型名が欠損（スコアあり）` : `${r.Missing_Kata}${rowWord(r.Missing_Kata)} missing kata name (score present)`);
    if (r.Missing_Score) lines.push(jp ? `${r.Missing_Score}${rowWord(r.Missing_Score)}でスコアが欠損（型名あり）` : `${r.Missing_Score}${rowWord(r.Missing_Score)} missing score (kata name present)`);
    if (r.Missing_Both)  lines.push(jp ? `${r.Missing_Both}${rowWord(r.Missing_Both)}で型名・スコアともに欠損` : `${r.Missing_Both}${rowWord(r.Missing_Both)} missing both kata name and score`);
    missingHtml = `<div class="card-section-title" style="margin-top:14px">${t("sec.missingData")}</div>
      <ul style="font-size:13px;color:var(--text-muted);padding-left:18px;line-height:1.8">${lines.map(l=>`<li>${l}</li>`).join("")}</ul>`;
  }

  document.getElementById("tournaments-card").innerHTML = `
    <button class="card-close-btn" onclick="document.getElementById('tournaments-card').classList.add('hidden')" title="Close">✕</button>
    <div class="card-header">
      <span class="card-title">${esc(displayName("tournament", r.Tournament))}</span>
      ${meta.date ? `<span class="card-subtitle">${esc(meta.date)}</span>` : ""}
    </div>
    ${meta.city ? `<p style="font-size:13px;color:var(--text-muted);margin-bottom:14px">${flagOf(meta.country)} ${esc(meta.city)}, ${esc(meta.country)}</p>` : ""}
    <div class="card-section-title">${t("sec.statistics")}</div>
    <div class="card-stats">
      <div class="stat-box"><div class="stat-label">${t("col.performances")}</div><div class="stat-value">${r.Total_Performances}</div></div>
      <div class="stat-box"><div class="stat-label">${t("col.athletes")}</div><div class="stat-value">${athletes.length}</div></div>
      <div class="stat-box"><div class="stat-label">${t("col.uniqueKata")}</div><div class="stat-value">${kataFlat3.length}</div></div>
      <div class="stat-box"><div class="stat-label">${t("col.countries")}</div><div class="stat-value">${countryFlat3.length}</div></div>
      <div class="stat-box"><div class="stat-label">${t("col.avgScore")}</div><div class="stat-value">${r.Avg_Score != null ? r.Avg_Score.toFixed(3) : "—"}</div></div>
    </div>
    ${medalistHtml}
    <div class="card-section-title">${t("sec.athletes")} (${athletes.length})</div>
    <div class="card-table-wrap" style="margin-bottom:14px">
      <table class="data-table" id="card-tourn-athletes">
        <thead><tr>
          <th class="num row-num">#</th>
          <th data-sort="Karateka" data-label="${t('col.athlete')}" style="cursor:pointer" onclick="sortCardTable('card-tourn-athletes','Karateka')">Athlete</th>
          <th data-sort="Country" data-label="${t('col.country')}" style="cursor:pointer" onclick="sortCardTable('card-tourn-athletes','Country')">Country</th>
          <th data-sort="Performances" data-label="${t('col.performances')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-tourn-athletes','Performances')">Performances</th>
          <th data-sort="Avg_Score" data-label="${t('col.avgScore')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-tourn-athletes','Avg_Score')">Avg Score</th>
        </tr></thead>
        <tbody></tbody>
      </table>
    </div>
    <div class="card-section-title">${t("sec.kataPerformed")} (${kataFlat3.length})</div>
    <div class="card-table-wrap" style="margin-bottom:14px">
      <table class="data-table" id="card-tourn-kata">
        <thead><tr>
          <th class="num row-num">#</th>
          <th data-sort="Kata" data-label="${t('col.kata')}" style="cursor:pointer" onclick="sortCardTable('card-tourn-kata','Kata')">Kata</th>
          <th data-sort="Performances" data-label="${t('col.performances')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-tourn-kata','Performances')">Performances ↓</th>
          <th data-sort="Avg_Score" data-label="${t('col.avgScore')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-tourn-kata','Avg_Score')">Avg Score</th>
        </tr></thead>
        <tbody></tbody>
      </table>
    </div>
    <div class="card-section-title">${t("sec.countries")} (${countryFlat3.length})</div>
    <div class="card-table-wrap" style="margin-bottom:14px">
      <table class="data-table" id="card-tourn-countries">
        <thead><tr>
          <th class="num row-num">#</th>
          <th data-sort="Country" data-label="${t('col.country')}" style="cursor:pointer" onclick="sortCardTable('card-tourn-countries','Country')">Country</th>
          <th data-sort="Athletes" data-label="${t('col.athletes')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-tourn-countries','Athletes')">Athletes ↓</th>
          <th data-sort="Avg_Score" data-label="${t('col.avgScore')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-tourn-countries','Avg_Score')">Avg Score</th>
          <th data-sort="Win_Rate" data-label="${t('col.winRate')}" class="num" style="cursor:pointer" onclick="sortCardTable('card-tourn-countries','Win_Rate')">Win Rate</th>
        </tr></thead>
        <tbody></tbody>
      </table>
    </div>
    ${missingHtml}`;
  initCardTable("card-tourn-athletes", athleteFlat3, "Karateka", "asc",
    (k, i) => `<tr>
      <td class="num row-num">${i + 1}</td>
      <td class="name-cell">${k._flag} ${navLink("karateka", k.Karateka)}</td>
      <td>${navLink("country", k.Country)}</td>
      <td class="num">${k.Performances}</td>
      <td class="num">${k.Avg_Score != null ? k.Avg_Score.toFixed(3) : "—"}</td>
    </tr>`);
  initCardTable("card-tourn-kata", kataFlat3, "Performances", "desc",
    (k, i) => `<tr>
      <td class="num row-num">${i + 1}</td>
      <td class="name-cell">${k._tier} ${navLink("kata", k.Kata)}</td>
      <td class="num">${k.Performances}</td>
      <td class="num">${k.Avg_Score != null ? k.Avg_Score.toFixed(3) : "—"}</td>
    </tr>`);
  initCardTable("card-tourn-countries", countryFlat3, "Athletes", "desc",
    (k, i) => `<tr>
      <td class="num row-num">${i + 1}</td>
      <td class="name-cell">${k._flag} ${navLink("country", k.Country)}</td>
      <td class="num">${k.Athletes}</td>
      <td class="num">${k.Avg_Score != null ? k.Avg_Score.toFixed(3) : "—"}</td>
      <td class="num">${k.Win_Rate != null ? fmtPct(k.Win_Rate) : "—"}</td>
    </tr>`);
  _currentCard = { type: "tournament", name: r.Tournament };
  window.location.hash = `tournament/${encodeURIComponent(r.Tournament)}`;
  scrollToCard("tournaments-card");
  document.getElementById("tournaments-card").classList.remove("hidden");
}

/* ════════════════════════════════════════════════════════════════ CHART HELPERS */
const CHART_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
/* Chart colors are theme-aware: refreshChartColors() reads the current CSS
   custom properties (light or dark) before each render so canvas drawing —
   which can't use var() — stays in sync with the active theme. */
let RED         = "rgba(154,28,28,0.85)";
let RED_BORDER  = "rgba(154,28,28,1)";
let GRID        = "rgba(221,208,184,0.55)";
let ZERO_LINE   = "rgba(0,0,0,0.75)";
let AXIS_TXT    = "#7a7060";   // muted axis/tick text
let AXIS_STRONG = "#1c1c18";   // strong label text
let POS         = "#3a6e3a";   // positive diff (green)
let NEG         = "#c0392b";   // negative diff (red)

// Advanced = black, Intermediate = warm brown (recolored in dark mode)
let TIER_COLORS = {
  Advanced:     { bg: "rgba(0,0,0,0.82)",        border: "rgba(0,0,0,1)"          },
  Intermediate: { bg: "rgba(130,75,25,0.82)",    border: "rgba(110,60,15,1)"      },
};

function refreshChartColors() {
  const cs = getComputedStyle(document.documentElement);
  const g = (name, fb) => { const v = cs.getPropertyValue(name).trim(); return v || fb; };
  RED         = g("--chart-bar",        "rgba(154,28,28,0.85)");
  RED_BORDER  = g("--chart-bar-border", "rgba(154,28,28,1)");
  GRID        = g("--chart-grid",       "rgba(221,208,184,0.55)");
  ZERO_LINE   = g("--chart-zero",       ZERO_LINE);
  AXIS_TXT    = g("--text-muted",       AXIS_TXT);
  AXIS_STRONG = g("--text",             AXIS_STRONG);
  POS         = g("--pos",              POS);
  NEG         = g("--neg",              NEG);
  TIER_COLORS = {
    Advanced:     { bg: g("--tier-adv-bg", "rgba(0,0,0,0.82)"),     border: g("--tier-adv-bd", "rgba(0,0,0,1)") },
    Intermediate: { bg: g("--tier-int-bg", "rgba(130,75,25,0.82)"), border: g("--tier-int-bd", "rgba(110,60,15,1)") },
  };
}

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function makeHBar(id, labels, values, xLabel, minVal, perfs = null) {
  destroyChart(id);
  const ctx = document.getElementById(id); if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: RED, borderColor: RED_BORDER, borderWidth: 1, borderRadius: 3 }] },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx2 => perfs
          ? ` ${ctx2.raw}  (${perfs[ctx2.dataIndex]} performances)`
          : ` ${ctx2.raw}` } },
      },
      scales: {
        x: { min: minVal, grid: { color: GRID }, ticks: { font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT }, title: { display: !!xLabel, text: xLabel, font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT } },
        y: { grid: { display: false }, ticks: { font: { family: CHART_FONT, size: 11 }, color: AXIS_STRONG } },
      },
    },
  });
}

function makeCountryHBar(id, countries, athletes) {
  destroyChart(id);
  const ctx = document.getElementById(id); if (!ctx) return;
  const imgs = {};
  let pending = countries.length;
  countries.forEach(country => {
    const iso = ISO2[country]?.toLowerCase();
    if (!iso) { if (--pending <= 0 && charts[id]) charts[id].update(); return; }
    const img = new Image(20, 15);
    img.onload = () => { imgs[country] = img; if (--pending <= 0 && charts[id]) charts[id].update(); };
    img.onerror = () => { if (--pending <= 0 && charts[id]) charts[id].update(); };
    img.src = `https://flagcdn.com/20x15/${iso}.png`;
  });
  const flagPlugin = {
    id: "flagLabels",
    afterDraw(chart) {
      const yAxis = chart.scales.y;
      const c2d = chart.ctx;
      c2d.save();
      c2d.font = `11px ${CHART_FONT}`;
      c2d.textBaseline = "middle";
      c2d.fillStyle = AXIS_STRONG;
      countries.forEach((country, i) => {
        const y = yAxis.getPixelForTick(i);
        const img = imgs[country];
        const flagW = 20, flagH = 15, gap = 5;
        const rightEdge = yAxis.left - 8;
        const nameW = c2d.measureText(country).width;
        if (img && img.complete && img.naturalWidth > 0) {
          const startX = rightEdge - flagW - gap - nameW;
          c2d.drawImage(img, startX, y - flagH / 2, flagW, flagH);
          c2d.textAlign = "left";
          c2d.fillText(country, startX + flagW + gap, y);
        } else {
          c2d.textAlign = "right";
          c2d.fillText(country, rightEdge, y);
        }
      });
      c2d.restore();
    }
  };
  // Reserve only as much left padding as the widest flag + name label needs, so a
  // short set of labels doesn't leave a big empty gap that shifts the bars right.
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = `11px ${CHART_FONT}`;
  const maxNameW = countries.reduce((m, c) => Math.max(m, measure.measureText(c).width), 0);
  const leftPad = Math.ceil(maxNameW) + 20 + 5 + 8 + 6; // name + flag + gap + axis offset + buffer
  charts[id] = new Chart(ctx, {
    type: "bar",
    data: { labels: countries, datasets: [{ data: athletes, backgroundColor: RED, borderColor: RED_BORDER, borderWidth: 1, borderRadius: 3 }] },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      layout: { padding: { left: leftPad } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c2 => ` ${c2.raw}` } } },
      scales: {
        x: { min: 0, grid: { color: GRID }, ticks: { font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT }, title: { display: true, text: t("axis.athletes"), font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT } },
        y: { grid: { display: false }, ticks: { display: false } },
      },
    },
    plugins: [flagPlugin],
  });
}

function makeWinRateHBar(id, labels, values, axisTitle = "Win Rate (%)", perfs = null) {
  destroyChart(id);
  const ctx = document.getElementById(id); if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: RED, borderColor: RED_BORDER, borderWidth: 1, borderRadius: 3 }] },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx2 => perfs
          ? ` ${ctx2.raw}%  (${perfs[ctx2.dataIndex]} performances)`
          : ` ${ctx2.raw}%` } },
      },
      scales: {
        x: { min: 0, max: 100, grid: { color: GRID }, ticks: { callback: v => v + "%", font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT }, title: { display: true, text: axisTitle, font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT } },
        y: { grid: { display: false }, ticks: { font: { family: CHART_FONT, size: 11 }, color: AXIS_STRONG } },
      },
    },
  });
}

/* ════════════════════════════════════════ FINDINGS NARRATIVES (from markdown) */
/* These narratives are authored content (not auto-generated). Figure references
   use figName() so they read K-/A- for male and FK-/FA- for female. */
function _findingsBlock(head, mainItems, notesLabel, notesItems, subhead, imageHTML) {
  const ul = (items, extraStyle = "") => `<ul style="font-size:13px;color:var(--text-muted);line-height:2.2;padding-left:20px${extraStyle}">${items.map(t => `<li>${t}</li>`).join("")}</ul>`;
  return `<details class="finding-block finding-collapsible" style="margin-top:0">
      <summary class="compare-head finding-summary"><span>${head}<em class="finding-hint">${lang === "jp" ? "クリックして開く。" : "Click to open."}</em></span></summary>
      ${imageHTML || ""}
      ${subhead ? `<p style="font-size:13px;font-weight:700;color:var(--text);margin:0 0 6px">${subhead}</p>` : ""}
      ${ul(mainItems)}
      ${notesItems && notesItems.length
          ? (notesLabel
              ? `<p style="font-size:13px;font-weight:700;color:var(--text);margin:14px 0 4px">${notesLabel}</p>${ul(notesItems)}`
              : ul(notesItems, ";margin-top:18px"))
          : ""}
    </details>`;
}

function kataFindingsHTML() {
  const jp = lang === "jp";
  const head = jp ? (gender === "male" ? "男子型の分析" : "女子型の分析")
                  : (gender === "male" ? "Male Kata Analysis" : "Female Kata Analysis");
  const K1 = figName("K-1"), K3 = figName("K-3"), K4 = figName("K-4"), K5 = figName("K-5"), K6 = figName("K-6"), K7 = figName("K-7");
  if (gender === "male") {
    if (jp) return _findingsBlock(head, [
      `今シーズンの男子型 全<strong>1,006</strong>演武の平均スコアは<strong>8.132</strong>、中央値は<strong>8.09</strong>で、左右対称に近い分布を示しています。`,
      `最も多く演武された男子型は<strong>五十四歩小</strong>で<strong>108</strong>回。2番目は<strong>雲手</strong>で<strong>104</strong>回でした。詳しくは<em>図 ${K1}</em>をご覧ください。`,
      `男子型スコアのうち<strong>14/1006</strong>（<strong>1.392%</strong>）が外れ値でした。低い外れ値が7つ（6.98, 7.12, 7.16, 7.18, 7.20, 7.24, 7.24）、高い外れ値が7つ（9.02, 9.06, 9.10, 9.12, 9.14, 9.18, 9.28）あり、注目すべきことに、高い外れ値7つはすべて<strong>Kakeru Nishiyama</strong>によるものでした。`,
      `スコア差（Score Differential：選手が自身の平均と比べてその型でどれだけ高く/低く得点したか）と勝率を比べると、興味深いパターンが見えてきます。<strong>シソーチン</strong>は最も低い差（<strong>-0.225</strong>）を示し、その型を演武した選手は自身の平均を大きく下回ったことを意味します。本来なら勝率は低いと思われますが、実際にはあらゆる型の中で最も高い勝率<strong>100.0%</strong>でした。`,
      `さらに、最も高い差を示した型である<strong>岩鶴</strong>（<strong>+0.084</strong>）は勝率が高いと思われがちですが、勝率はわずか<strong>14.3%</strong>でした。`,
      `この一見した矛盾はデータの重要な限界を示しています。型のスコア差は、選手が「自身の平均」と比べてどう得点したかを測るものであり、「対戦相手のスコア」と比べたものではありません。シソーチンのマイナスの差は、この型が主にすでに非常に高い平均を持つトップ選手に選ばれているためで、彼らにとっては「平均以下」でも十分に競争力があります。シソーチンの詳細カードを確認すると、17演武のうち13がKakeru NishiyamaとAriel Torresによるものだと分かります。岩鶴の高い差・低い勝率は、その型を演武する選手は単独では高得点でも、さらに高く得点する相手に当たっていることを示唆します。`,
    ]);
    return _findingsBlock(head, [
      `The mean score for all <strong>1,006</strong> Male Kata this season was <strong>8.132</strong>, and the median score was <strong>8.09</strong>, indicating an approximately symmetrical distribution.`,
      `The most performed Male Kata was <strong>Gojushiho Sho</strong> with <strong>108</strong> performances. The second most performed was <strong>Unsu</strong> with <strong>104</strong>. See <em>Figure ${K1}</em> for a full breakdown.`,
      `<strong>14/1006</strong>, or <strong>1.392%</strong>, of Male Kata performance scores were outliers. There are 7 low outliers: 6.98, 7.12, 7.16, 7.18, 7.20, 7.24, 7.24 and 7 high outliers: 9.02, 9.06, 9.10, 9.12, 9.14, 9.18, 9.28. Remarkably, all 7 of the high outliers were performed by <strong>Kakeru Nishiyama</strong>.`,
      `<strong>Performances vs. Average Score</strong> (<em>Figure ${K4}</em>):<ul style="padding-left:18px;margin:4px 0 0;line-height:2"><li>As Kata have more performances, their Average Score <strong>regresses to the global mean</strong> (8.132).</li><li>There is a large contrast between the Average Score of Kata with <strong>greater than 20 performances</strong> and those with <strong>less than 20 performances</strong>. All Kata with at least 20 performances have Average Scores relatively close to 8.132 (within .106 points), but Kata with fewer than 20 performances deviate heavily, by as much as .762 points.</li></ul>`,
      `<strong>Score Differential</strong> (<em>Figure ${K5}</em>):<ul style="padding-left:18px;margin:4px 0 0;line-height:2"><li>An interesting pattern emerges when comparing <strong>Score Differential</strong> (how much athletes score on a Kata relative to their personal average) to Win Rate. <strong>Shisochin</strong> had the lowest differential (<strong>−0.225</strong>), meaning athletes performing it scored well below their personal average, so you would assume it has a low win rate. However, its win rate is the highest of any kata: <strong>100.0%</strong>.</li><li>Furthermore, you might assume that the kata with the highest differential, <strong>Gankaku</strong> (<strong>+0.084</strong>), would have a high win rate, yet its win rate was only <strong>14.3%</strong>, the fourth lowest of any kata.</li><li>This apparent contradiction reveals a <strong>key limitation of the data</strong>: the Score Differential measures how an athlete scores on a Kata relative to their own average, not relative to their opponent's score. Shisochin's negative differential likely reflects that it is chosen predominantly by elite athletes whose personal averages are already very high; even scoring "below average" for them is competitive. Upon checking Shisochin's detail card, you will find that 13/17 of its performances are by <strong>Kakeru Nishiyama</strong> and <strong>Ariel Torres</strong>, two of the highest-scoring male athletes. Gankaku's high differential but low win rate, meanwhile, suggests that the athletes who perform it score well in isolation, but face opponents who score even higher.</li></ul>`,
      `<strong>Standard Deviation vs. Number of Performers</strong> (<em>Figure ${K6}</em>):<ul style="padding-left:18px;margin:4px 0 0;line-height:2"><li>Kata performed by more athletes tend to show <strong>higher score variance</strong>, since a wider ability range is represented.</li><li>Notable Kata:<ul style="padding-left:18px;margin:4px 0 0;line-height:2"><li><strong>Chibana No Kushanku</strong> has a notably <strong>HIGH</strong> Standard Deviation for a Kata with 15 performers.</li><li><strong>Unsu</strong> has a notably <strong>LOW</strong> Standard Deviation for a Kata with 34 performers.</li></ul></li></ul>`,
      `<strong>Average Score by Tournament</strong> (<em>Figure ${K7}</em>):<ul style="padding-left:18px;margin:4px 0 0;line-height:2"><li>Judging was <strong>remarkably consistent</strong>.</li><li>The Average Score by Tournament only varied by up to <strong>.271 points</strong>, quite low across 1,006 performances.</li></ul>`,
      `<strong>Kata Tiers</strong>:<ul style="padding-left:18px;margin:4px 0 0;line-height:2"><li><strong>90.6%</strong> of Male Kata performances were <strong>Advanced Kata</strong>; <strong>9.4%</strong> were <strong>Intermediate Kata</strong>.</li><li>Male athletes chose <strong>9 Intermediate</strong> and <strong>20 Advanced</strong> Kata to perform.</li><li>Notably, Male athletes only chose <strong>9/56</strong> of the Intermediate Kata to perform, indicating that only a small percentage of Intermediate Kata are viable at this highest level of Kata competition.</li></ul>`,
    ]);
  }
  /* female */
  if (jp) return _findingsBlock(head, [
    `今シーズンの女子型 全<strong>964</strong>演武の平均スコアは<strong>7.954</strong>、中央値は<strong>7.94</strong>で、左右対称に近い分布を示しています。`,
    `最も多く演武された女子型は<strong>パープーレン</strong>で<strong>198</strong>回。2番目は<strong>スーパーリンペイ</strong>で<strong>129</strong>回でした。詳しくは<em>図 ${K1}</em>をご覧ください。`,
    `女子型演武のうち<strong>8/964</strong>（<strong>0.830%</strong>）が外れ値でした。低い外れ値が4つ（6.14, 6.20, 6.38, 6.98）、高い外れ値が4つ（8.88, 8.88, 8.96, 9.22）あります。`,
    `<strong>Grace Lau</strong>は9.00の壁を破った唯一の女子選手で、<strong>9.22</strong>という、2番目に高い単独スコア（同じく彼女自身が記録した<strong>8.96</strong>）を大きく上回る得点を叩き出しました。`,
    `最も高い差を示した型である<strong>ソーチン</strong>（<strong>+0.084</strong>）は勝率が高いと思われがちですが、勝率は<strong>0%</strong>でした。`,
  ]);
  return _findingsBlock(head, [
    `The <strong>mean score</strong> for all <strong>964</strong> Female Kata this season was <strong>7.954</strong>, and the <strong>median score</strong> was <strong>7.94</strong>, indicating an approximately symmetrical distribution.`,
    `The most performed Female Kata was <strong>Papuren</strong> with <strong>198</strong> performances. The second most performed was <strong>Suparinpei</strong> with <strong>129</strong>. See <em>Figure ${K1}</em> for a full breakdown.`,
    `<strong>8/964</strong>, or <strong>0.830%</strong>, of Female Kata performances were outliers. There are <strong>4 low outliers</strong>: 6.14, 6.20, 6.38, 6.98 and <strong>4 high outliers</strong>: 8.88, 8.88, 8.96, 9.22.`,
    `<strong>Performances vs. Average Score</strong> (<em>Figure ${K4}</em>):<ul style="padding-left:18px;margin:4px 0 0;line-height:2"><li>As Kata have more performances, their Average Score <strong>regresses to the global mean</strong> (7.954).</li><li>There is a large contrast between the Average Score of Kata with <strong>greater than 60 performances</strong> and those with <strong>less than 60 performances</strong>. All Kata with at least 60 performances have Average Scores relatively close to 7.954 (within .116 points), but Kata with fewer than 60 performances deviate heavily, by as much as .282 points.</li></ul>`,
    `<strong>Score Differential</strong> (<em>Figure ${K5}</em>):<ul style="padding-left:18px;margin:4px 0 0;line-height:2"><li>An interesting pattern emerges when comparing <strong>Score Differential</strong> (how much athletes score on a Kata relative to their personal average) to Win Rate. <strong>Tomari Bassai</strong> had the second lowest differential (<strong>−0.205</strong>), meaning athletes performing it scored well below their personal average, so you would assume it has a low win rate. However, its win rate is the <strong>second highest</strong> of any kata: <strong>92.3%</strong>.</li><li>Furthermore, you might assume that the kata with the highest differential, <strong>Sochin</strong> (<strong>+0.210</strong>), would have a high win rate, yet its win rate was <strong>0%</strong> across its three performances.</li><li>This apparent contradiction reveals a <strong>key limitation of the data</strong>: Score Differential measures how an athlete scores relative to their own average, not relative to their opponent's score. Tomari Bassai's negative differential likely reflects that it is chosen predominantly by elite athletes whose personal averages are already very high; even scoring "below average" for them is competitive. Upon checking Tomari Bassai's detail card, you will find that <strong>9/13</strong> of its performances are by <strong>Grace Lau</strong>, the Female athlete with the most Gold medals. Sochin's high differential but low win rate, meanwhile, suggests that <strong>Aya Hesham</strong>, the athlete who performed it three times, scored well in isolation, but faced opponents who scored even higher.</li></ul>`,
    `<strong>Standard Deviation vs. Number of Performers</strong> (<em>Figure ${K6}</em>):<ul style="padding-left:18px;margin:4px 0 0;line-height:2"><li>Kata performed by more athletes tend to show <strong>higher score variance</strong>, since a wider ability range is represented.</li><li><strong>Kururunfa</strong> has a notably <strong>LOW</strong> Standard Deviation for a Kata with 22 performers.</li></ul>`,
    `<strong>Average Score by Tournament</strong> (<em>Figure ${K7}</em>):<ul style="padding-left:18px;margin:4px 0 0;line-height:2"><li>Judging was <strong>remarkably consistent</strong>.</li><li>The Average Score by Tournament only varied by up to <strong>.178 points</strong>, quite low across 964 performances.</li></ul>`,
    `<strong>Kata Tiers</strong>:<ul style="padding-left:18px;margin:4px 0 0;line-height:2"><li>A staggering <strong>98.4%</strong> of Female Kata performances were <strong>Advanced Kata</strong>; just <strong>1.6%</strong> were <strong>Intermediate Kata</strong>.</li><li>Female athletes chose <strong>5 Intermediate</strong> and <strong>24 Advanced</strong> Kata to perform.</li><li>Notably, Female athletes only chose <strong>5/56</strong> of the Intermediate Kata to perform, indicating that only a small percentage of Intermediate Kata are viable at this highest level of Kata competition.</li></ul>`,
  ]);
}

function athleteFindingsHTML() {
  const jp = lang === "jp";
  const head = jp ? (gender === "male" ? "男子選手の分析" : "女子選手の分析")
                  : (gender === "male" ? "Male Athlete Analysis" : "Female Athlete Analysis");
  const A1 = figName("A-1"), A2 = figName("A-2"), A3 = figName("A-3");
  const spotlight = jp ? "アスリート・スポットライト" : "Athlete Spotlight";
  if (gender === "male") {
    if (jp) return _findingsBlock(head, [
      `今シーズンの男子型競技は<strong>Kakeru Nishiyama</strong>（日本）が完全に支配しました。`,
      `Nishiyamaは<strong>52</strong>演武で平均スコア<strong>8.67</strong>、勝率<strong>100.0%</strong>と男子全選手をリードしました。（前文を読んだ方には）予想通り、Nishiyamaは2024〜2025年の2年間、全大会で金メダルを獲得し、その締めくくりとして2025年世界選手権の金メダルマッチで史上最高得点となる<strong>9.28</strong>を記録しました。この試合では、相手（Alessio Ghinami）を<strong>0.44</strong>という大差で上回りました。0.44ほどの差は大会の後半ラウンドでは非常に稀ですが、片方の選手がKakeru Nishiyamaである場合は別です。この差はGhinamiの出来が悪く自己平均を下回ったためだと思うかもしれませんが、そうではありません。この試合でGhinamiは自己最高得点（<strong>8.84</strong>）を記録していました。`,
      `平均スコアで見ると、1位と2位の差は2位と10位の差に等しいほどです。<em>図 ${A1}</em>をご覧ください。`,
      `1,006の男子型演武には高い外れ値が7つあり、その全7つをKakeru Nishiyamaが保持しています。`,
      `Kakeru Nishiyamaは9.00の壁を破った唯一の男子選手で、7回それを達成しました。最高位の外れ値6つは知花のクーサンクーで、9.02はパープーレンで記録しました。`,
      `Nishiyamaの6つの型のうち、最も高い平均スコアは知花のクーサンクー（9.00）です。注目すべきことに、彼の知花のクーサンクー9演武のこの平均は、他のどの男子選手の単独スコアよりも高い値です（Kakeru Nishiyama以外の男子選手による最高単独スコアは8.98）。`,
    ], null, [
      `日本は男子型の選手層でも圧倒的で、<strong>12</strong>名を派遣し、次に多い国のほぼ倍でした。イタリアは<strong>7</strong>名、トルコは<strong>5</strong>名を派遣しています。国別の内訳は<em>図 ${A3}</em>をご覧ください。`,
      `メダルを獲得した選手は<strong>12</strong>名でした。`,
    ], spotlight);
    return _findingsBlock(head, [
      `Male Kata competition this season was completely dominated by <strong>Kakeru Nishiyama</strong> (Japan).`,
      `Nishiyama led all male athletes with an average score of <strong>8.67</strong> across <strong>52</strong> performances and a win rate of <strong>100%</strong>. Thus, predictably, Nishiyama won <strong>Gold</strong> at every tournament across the two years of 2024–2025, capping off his run with the <strong>highest score ever recorded</strong>, a <strong>9.28</strong> in the Gold Medal match at the 2025 World Championships. In this specific match, his score eclipsed his opponent's (<strong>Alessio Ghinami</strong>) by a huge margin of <strong>0.44</strong>. A margin as high as 0.44 is quite rare in the later rounds of tournaments, except when one of the athletes is named Kakeru Nishiyama. You may assume that Ghinami performed poorly on the day, resulting in a score below his own average, but that is not the case. In this match, Ghinami scored his own <strong>personal best score ever</strong> (<strong>8.84</strong>).`,
      `When looking at athletes by average score, the difference between <strong>Nishiyama and #2</strong> is the same as the difference between <strong>#2 and #10</strong>. See <em>Figure ${A1}</em>.`,
      `There are <strong>7 high outliers</strong> in the 1,006 male kata performances. <strong>Kakeru Nishiyama holds all 7.</strong>`,
      `Kakeru Nishiyama was the only Male athlete to break the <strong>9.00 score barrier</strong>, which he did <strong>seven times</strong>. Nishiyama scored the six highest outliers with <strong>Chibana No Kushanku</strong>, and he scored the 9.02 with <strong>Papuren</strong>.`,
      `Of Kakeru Nishiyama's six kata, he holds the highest average score with <strong>Chibana No Kushanku</strong> (<strong>9.00</strong>). Notably, this <strong>average</strong> across his nine performances of Chibana No Kushanku is greater than any <strong>single score</strong> by any other Male athlete (the highest single score by a Male athlete not named Kakeru Nishiyama is <strong>8.98</strong>).`,
    ], null, [
      `<strong>Japan</strong> dominated male kata representation with <strong>12</strong> athletes, nearly double the next-largest contingent. <strong>Italy</strong> sent <strong>7</strong> athletes and <strong>Turkey</strong> sent <strong>5</strong>. See <em>Figure ${A3}</em> for the full country breakdown.`,
      `<strong>12</strong> unique athletes won medals.`,
    ], spotlight);
  }
  /* female (polished into full sentences) */
  const onoLauNote = jp
    ? "任意の選手詳細カードのCompare機能で、好きな2選手を比較できます！"
    : "Use the Compare feature on any Athlete Detail Card to compare any two athletes!";
  const onoLauImg = `<figure style="margin:12px 0 4px">
      <img src="images/reference/OnoVSLau.png" alt="Maho Ono vs Grace Lau" loading="lazy" style="width:100%;border-radius:var(--radius);border:1px solid var(--border);display:block">
      <figcaption style="font-size:12px;color:var(--text-muted);font-style:italic;margin-top:6px;text-align:center">${onoLauNote}</figcaption>
    </figure>`;
  if (jp) return _findingsBlock(head, [
    `今シーズンの女子型は、明確な2強である<strong>Grace Lau</strong>（香港）と<strong>Maho Ono</strong>（日本）のトップ争いによって特徴づけられました。両者とも全9大会に出場しています。`,
    `Lauはより高いピークを持っていました。最高スコア（<strong>9.22</strong>対<strong>8.88</strong>）と勝率（<strong>91.7%</strong>対<strong>88.5%</strong>）で上回りました。`,
    `一方Onoは2人のうちより安定していました。平均スコア（<strong>8.44</strong>対<strong>8.43</strong>）と中央値（<strong>8.49</strong>対<strong>8.40</strong>）でLauをわずかに上回り、最低スコアが高く（<strong>8.1</strong>対<strong>7.9</strong>）、レンジもはるかに小さい（<strong>0.78</strong>対<strong>1.32</strong>）など、全体的に得点のばらつきが小さいものでした。`,
    `獲得メダルもこのバランスを反映しています。Lauは<strong>金5・銀1・銅3</strong>、Onoは<strong>金3・銀5・銅1</strong>を獲得しました。`,
    `要するに、Lauはより高いピークに達し、Onoはシーズンを通じてより安定した演武を見せた、ということです。`,
  ], null, [
    `Grace Lauは9.00の壁を破った唯一の女子選手で、<strong>9.22</strong>という驚異的なスコアを叩き出しました。これは2番目に高い単独スコア（同じく彼女自身による<strong>8.96</strong>）を大きく上回るものです。`,
    `国別の選手層は多様でした。日本は<strong>8</strong>名、エジプトは<strong>6</strong>名、イタリアは<strong>5</strong>名を派遣しました。<em>図 ${A3}</em>をご覧ください。`,
    `メダルを獲得した選手は<strong>11</strong>名でした。`,
  ], spotlight, onoLauImg);
  return _findingsBlock(head, [
    `Female kata this season was defined by a close rivalry at the top between two clear frontrunners: <strong>Grace Lau</strong> (Hong Kong) and <strong>Maho Ono</strong> (Japan), both of whom competed at all 9 tournaments.`,
    `Lau had the higher peaks: she posted a higher maximum score (<strong>9.22</strong> vs <strong>8.88</strong>) and a higher win rate (<strong>91.7%</strong> vs <strong>88.5%</strong>).`,
    `Ono, on the other hand, was the more consistent of the two: she edged Lau in average score (<strong>8.44</strong> vs <strong>8.43</strong>) and median score (<strong>8.49</strong> vs <strong>8.40</strong>), and her scores were tighter overall, with a higher minimum (<strong>8.1</strong> vs <strong>7.9</strong>) and a much smaller range (<strong>0.78</strong> vs <strong>1.32</strong>).`,
    `Their medal hauls reflect this balance: Lau won <strong>5 gold, 1 silver, and 3 bronze</strong>, while Ono won <strong>3 gold, 5 silver, and 1 bronze</strong>.`,
    `In short, Lau reached higher peaks, but Ono was the more consistent performer across the season.`,
  ], null, [
    `Grace Lau was the only Female athlete to break the <strong>9.00 score boundary</strong>, which she shattered with a <strong>9.22</strong>, significantly higher than the second-highest single score, <strong>8.96</strong>, which she also scored.`,
    `Kata representation by country was diverse: <strong>Japan</strong> sent <strong>8</strong> athletes, <strong>Egypt</strong> sent <strong>6</strong>, and <strong>Italy</strong> sent <strong>5</strong>. See <em>Figure ${A3}</em>.`,
    `<strong>11</strong> unique athletes won medals.`,
  ], spotlight, onoLauImg);
}

/* ══════════════════════════════════════════════════════════ SEASON-LEADER CARDS */
/* Pick the row that tops a metric, and count how many share that top value.
   `sel` reads the metric (null values skipped); `min` requires MORE than that
   many performances so a tiny sample can't top a score/rate metric; `lowest`
   flips it for "smaller is better" metrics. Returns { row, tie, value } where
   `tie` is how many rows share the top value (1 = an outright leader). */
function leaderInfo(rows, sel, { min = 0, lowest = false } = {}) {
  const eligible = min ? rows.filter(r => (r.Performances || 0) > min) : rows;
  let best = null, bestV = null;
  for (const r of eligible) {
    const v = sel(r);
    if (v == null) continue;
    if (best == null || (lowest ? v < bestV : v > bestV)) { best = r; bestV = v; }
  }
  if (best == null) return { row: null, tie: 0, value: null, tied: [] };
  const tied = eligible.filter(r => sel(r) === bestV);
  return { row: best, tie: tied.length, value: bestV, tied };
}

/* A single leader card, styled like the detail-card stat boxes. When several
   entities share the top value the box shows the tie count instead of a name,
   since a single name would misrepresent the result. */
function leaderBox(label, type, info, sub, labelTip) {
  if (!info || !info.row) return "";
  const name  = type === "kata" ? info.row.Kata : info.row.Karateka;
  let value, tipAttr = "";
  if (info.tie > 1) {
    // List every tied entity in a hover tooltip, since the box can only show a count.
    const names = (info.tied || []).map(r => displayName(type, type === "kata" ? r.Kata : r.Karateka));
    value  = t(type === "kata" ? "lead.tiedKata" : "lead.tiedAthletes").replace("{n}", info.tie);
    tipAttr = ` title="${esc(names.join(", "))}" style="cursor:help"`;
  } else {
    value = navLink(type, name);
  }
  // Optional explainer shown when hovering the box's title.
  const labelAttr = labelTip ? ` title="${esc(labelTip)}" style="cursor:help"` : "";
  return `<div class="stat-box">
    <div class="stat-label"${labelAttr}>${label}</div>
    <div class="stat-value stat-value--name"${tipAttr}>${value}</div>
    <div class="stat-rank">${sub}</div>
  </div>`;
}

const MIN_LEADER_PERFS = 5;   // floor for score/rate leaders so a lone perf can't win

/* Toggle a leaderboard's tie footnote based on whether any metric tied. */
function setTieNote(noteId, hasTie) {
  const note = document.getElementById(noteId);
  if (note) note.style.display = hasTie ? "" : "none";
}

function renderKataLeaders() {
  const el = document.getElementById("kata-leaderboard");
  if (!el) return;
  const kata = DATA.kata[gender];
  const cards = [];
  let hasTie = false;
  const push = (label, info, sub) => { if (info.tie > 1) hasTie = true; cards.push(leaderBox(label, "kata", info, sub)); };
  let info;
  info = leaderInfo(kata, x => x.Performances);
  push(t("lead.mostPerformed"), info, info.row ? `${info.row.Performances} ${t("unit.performances")}` : "");
  info = leaderInfo(kata, x => x.Unique_Karateka);
  push(t("lead.mostPerformers"), info, info.row ? `${info.row.Unique_Karateka} ${t("unit.performers")}` : "");
  info = leaderInfo(kata, x => x.Mean_Score, { min: MIN_LEADER_PERFS });
  push(t("lead.highestAvg"), info, info.row ? fmt2(info.row.Mean_Score) : "");
  info = leaderInfo(kata, x => x.Win_Rate, { min: MIN_LEADER_PERFS });
  push(t("lead.highestWR"), info, info.row ? fmtPct(info.row.Win_Rate) : "");
  info = leaderInfo(kata, x => x.Max_Score);
  push(t("lead.highestSingle"), info, info.row ? fmt2(info.row.Max_Score) : "");
  info = leaderInfo(kata, x => x.Std_Dev, { min: MIN_LEADER_PERFS, lowest: true });
  push(t("lead.mostConsistent"), info, info.row ? `${fmt2(info.row.Std_Dev)} ${t("unit.stdDev")}` : "");
  el.innerHTML = cards.join("");
  setTieNote("kata-leader-tie-note", hasTie);
}

function renderAthleteLeaders() {
  const el = document.getElementById("athlete-leaderboard");
  if (!el) return;
  const ath = DATA.karateka[gender];
  const cards = [];
  let hasTie = false;
  const push = (label, info, sub, labelTip) => { if (info.tie > 1) hasTie = true; cards.push(leaderBox(label, "karateka", info, sub, labelTip)); };
  let info;
  info = leaderInfo(ath, x => x.Performances);
  push(t("lead.mostPerformances"), info, info.row ? `${info.row.Performances} ${t("unit.performances")}` : "");
  info = leaderInfo(ath, x => x.Tournaments_Attended);
  push(t("lead.mostTournaments"), info, info.row ? `${info.row.Tournaments_Attended} ${t("unit.tournaments")}` : "");
  info = leaderInfo(ath, x => medalPoints(x.Medals));
  push(t("lead.mostMedals"), info, info.row ? (medalTally(info.row.Medals) || "—") : "");
  info = leaderInfo(ath, x => x.Mean_Score, { min: MIN_LEADER_PERFS });
  push(t("lead.highestAvg"), info, info.row ? fmt2(info.row.Mean_Score) : "");
  info = leaderInfo(ath, x => x.Win_Rate, { min: MIN_LEADER_PERFS });
  push(t("lead.highestWR"), info, info.row ? fmtPct(info.row.Win_Rate) : "");
  info = leaderInfo(ath, x => x.Differential);
  push(t("lead.bestDiff"), info, info.row ? (info.row.Differential > 0 ? "+" : "") + info.row.Differential.toFixed(3) : "", t("lead.bestDiffTip"));
  el.innerHTML = cards.join("");
  setTieNote("athlete-leader-tie-note", hasTie);
}

/* ════════════════════════════════════════════════════════════════ KATA FINDINGS */
function renderKataFindings() {
  renderKataLeaders();
  const kata   = DATA.kata[gender];
  const tourns = DATA.tournaments.filter(r => r.Gender.toLowerCase() === gender);
  const g = gender === "male" ? "male" : "female";
  const subEl = document.getElementById("kata-findings-subtitle");
  if (subEl) subEl.textContent = lang === "jp"
    ? `2024–25 WKFシーズンの9大会で${g === "male" ? "男子" : "女子"}選手が演武した全${kata.length}型の統計的内訳。`
    : `Statistical breakdowns for all ${kata.length} kata performed by ${g} athletes across 9 tournaments in the 2024–25 WKF season.`;

  /* Findings section */
  const diffSorted  = [...kata].filter(r => r.Diff != null).sort((a,b) => a.Diff - b.Diff);
  const diffSortedD = [...diffSorted].slice().reverse();
  const wrSorted5   = [...kata].filter(r => r.Win_Rate != null && r.Performances >= 5).sort((a,b) => b.Win_Rate - a.Win_Rate);
  const lowestDiff  = diffSorted[0];
  const highestDiff = diffSortedD[0];
  const highestWR   = wrSorted5[0];
  const lowestWR    = wrSorted5[wrSorted5.length - 1];
  const scoredKata  = kata.filter(r => r.Mean_Score != null);
  const wtAvgAll    = (() => { const tw = scoredKata.reduce((s,r)=>s+r.Performances,0); return tw ? scoredKata.reduce((s,r)=>s+r.Mean_Score*r.Performances,0)/tw : null; })();
  const popSorted0  = [...kata].sort((a,b) => b.Performances - a.Performances);

  const kf = document.getElementById("kata-findings-text");
  if (kf) kf.innerHTML = kataFindingsHTML();

  /* 1. Popularity */
  const popSorted = [...kata].sort((a, b) => b.Performances - a.Performances);
  const top1 = popSorted[0];
  const top5Perfs = popSorted.slice(0,10).reduce((s,r) => s + r.Performances, 0);
  const totalPerfsAll = DATA.meta[gender+"_performances"];
  document.getElementById("insight-popularity").textContent = lang === "jp"
    ? `${displayName("kata", top1.Kata)}は最も多く演武された${gender === "male" ? "男子" : "女子"}型で、${top1.Unique_Karateka}名の選手により${top1.Performances}回演武されました。上位5型で全${totalPerfsAll}演武のうち${top5Perfs}回（${(top5Perfs/totalPerfsAll*100).toFixed(1)}%）を占めました。`
    : `${top1.Kata} was the most performed ${gender === "male" ? "Male" : "Female"} kata with ${top1.Performances} performances across ${top1.Unique_Karateka} athletes. ` +
      `The top 5 kata accounted for ${top5Perfs} of ${totalPerfsAll}, or ${(top5Perfs/totalPerfsAll*100).toFixed(1)}% of, total performances.`;
  makeHBar("chart-popularity", popSorted.map(r => displayName("kata", r.Kata)), popSorted.map(r => r.Performances), t("axis.performances"), 0);

  /* 2. Avg Score */
  const scoreSorted = [...kata].filter(r => r.Mean_Score != null).sort((a, b) => b.Mean_Score - a.Mean_Score);
  const top1s = scoreSorted[0], bot1s = scoreSorted[scoreSorted.length - 1];
  const overallAvg = (() => { const sc = kata.filter(r => r.Mean_Score != null); const tw = sc.reduce((s,r)=>s+r.Performances,0); return tw ? sc.reduce((s,r)=>s+r.Mean_Score*r.Performances,0)/tw : null; })();
  document.getElementById("insight-avgscore").textContent = lang === "jp"
    ? `${displayName("kata", top1s.Kata)}が最も高い平均スコア（${top1s.Mean_Score.toFixed(3)}）を、${displayName("kata", bot1s.Kata)}が最も低い平均スコア（${bot1s.Mean_Score.toFixed(3)}）を記録しました。全演武にわたる${gender === "male" ? "男子" : "女子"}の総合平均は${overallAvg != null ? overallAvg.toFixed(3) : "—"}でした。`
    : `${top1s.Kata} had the highest average score (${top1s.Mean_Score.toFixed(3)}); ` +
      `${bot1s.Kata} had the lowest (${bot1s.Mean_Score.toFixed(3)}). ` +
      `The overall ${gender} average across all performances was ${overallAvg != null ? overallAvg.toFixed(3) : "—"}.`;
  makeHBar("chart-avgscore", scoreSorted.map(r => displayName("kata", r.Kata)), scoreSorted.map(r => r.Mean_Score), t("axis.avgScore"), 7.0, scoreSorted.map(r => r.Performances));
  const noteAvg = document.getElementById("note-avgscore");
  if (noteAvg) noteAvg.textContent = gender !== "female"
    ? ""
    : lang === "jp"
      ? "注：五十四歩（Gojushiho）は演武が1回のみでスコアが欠損しているため、ここには表示されていません。（表示されている五十四歩大・五十四歩小とは別物です。）"
      : "Note: Gojushiho is not shown here because it has only one performance and its score is missing. (This is separate from Gojushiho Dai and Gojushiho Sho, which are shown.)";

  /* 3. Win Rate — all kata shown */
  const winSorted = [...kata].filter(r => r.Win_Rate != null).sort((a, b) => b.Win_Rate - a.Win_Rate);
  document.getElementById("insight-winrate").textContent = lang === "jp"
    ? `勝率は相手の強さや組み合わせの運に大きく左右され、型の選択だけでは決まりません。全${winSorted.length}型を表示しています。演武回数の少ない型は慎重に解釈してください。`
    : `Win rates are heavily influenced by opponent strength and bracket luck, not kata choice alone. All ${winSorted.length} kata are shown; those with few performances should be interpreted with caution.`;
  makeWinRateHBar("chart-winrate", winSorted.map(r => displayName("kata", r.Kata)), winSorted.map(r => +(r.Win_Rate*100).toFixed(1)), t("axis.winRatePct"), winSorted.map(r => r.Performances));

  /* 4. Scatter: Performances vs Avg Score — Advanced & Intermediate only */
  document.getElementById("insight-scatter").textContent = lang === "jp"
    ? `各点は1つの型を表します。点にカーソルを合わせると、正確な演武数と平均スコアが表示されます。点は階級で色分けされています：黒＝上級、茶＝中級。`
    : `Each dot is one kata. Hover over a dot to see its exact number of performances and average score. ` +
      `Dots are colored by tier: black = Advanced, brown = Intermediate.`;
  destroyChart("chart-scatter");
  const ctxSc = document.getElementById("chart-scatter"); if (ctxSc) {
    const datasets = ["Advanced", "Intermediate"].map(tier => {
      const rows = kata.filter(r => r.Kata_Tier === tier && r.Mean_Score != null);
      if (!rows.length) return null;
      return {
        label: t("tier." + tier),
        data: rows.map(r => ({ x: r.Performances, y: r.Mean_Score, kata: displayName("kata", r.Kata) })),
        backgroundColor: TIER_COLORS[tier].bg,
        borderColor: TIER_COLORS[tier].border,
        borderWidth: 1.5, pointRadius: 4, pointHoverRadius: 6,
      };
    }).filter(Boolean);
    const scatterLabelPlugin = {
      id: "scatterLabels",
      afterDatasetsDraw(chart) {
        const ctx2 = chart.ctx;
        ctx2.save();
        ctx2.font = `9px ${CHART_FONT}`;
        ctx2.fillStyle = AXIS_TXT;
        ctx2.textBaseline = "middle";
        ctx2.textAlign = "left";
        chart.data.datasets.forEach((ds, di) => {
          const meta = chart.getDatasetMeta(di);
          (ds.data || []).forEach((pt, i) => {
            const el = meta.data[i];
            if (el && pt.kata) ctx2.fillText(pt.kata, el.x + 6, el.y);
          });
        });
        ctx2.restore();
      },
    };
    charts["chart-scatter"] = new Chart(ctxSc, {
      type: "scatter", data: { datasets },
      options: {
        responsive: true, maintainAspectRatio: true, aspectRatio: 11 / 6,
        layout: { padding: { right: 100 } },
        plugins: {
          legend: { position: "bottom", labels: { font: { family: CHART_FONT, size: 11 }, color: AXIS_STRONG, boxWidth: 12 } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.raw.kata}: ${ctx.raw.x} perfs, avg ${ctx.raw.y.toFixed(3)}` } },
          scatterLabels: {},
        },
        scales: {
          x: { title: { display: true, text: t("axis.performances"), font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT }, grid: { color: GRID }, ticks: { font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT } },
          y: { title: { display: true, text: t("axis.avgScore"), font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT }, grid: { color: GRID }, ticks: { font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT } },
        },
      },
      plugins: [scatterLabelPlugin],
    });
  }

  /* 5. Tier breakdown */
  const tiers = ["Advanced", "Intermediate"];
  const tierPerfs = tiers.map(t => kata.filter(r => r.Kata_Tier === t).reduce((s,r) => s + r.Performances, 0));
  const tierKata  = tiers.map(t => kata.filter(r => r.Kata_Tier === t).length);
  const totalPerfs = tierPerfs.reduce((a,b) => a+b, 0);
  const tierBgs = ["rgba(0,0,0,0.82)", "rgba(130,75,25,0.82)"];
  const tierBorders = ["rgba(0,0,0,1)", "rgba(110,60,15,1)"];
  document.getElementById("insight-tier").textContent = lang === "jp"
    ? `演武された${kata.length}型のうち${tierKata[1]}型（${Math.round(tierKata[1]/kata.length*100)}%）が中級型ですが、型演武全体の${((tierPerfs[1]/totalPerfs)*100).toFixed(1)}%しか占めていません。演武された${tierKata[0]}の上級型が${gender === "male" ? "男子" : "女子"}演武の${((tierPerfs[0]/totalPerfs)*100).toFixed(1)}%を占めます。`
    : `${tierKata[1]} of the ${kata.length} kata performed (${Math.round(tierKata[1]/kata.length*100)}%) are Intermediate kata, ` +
      `but they only account for ${((tierPerfs[1]/totalPerfs)*100).toFixed(1)}% of kata performances. ` +
      `The ${tierKata[0]} Advanced kata performed account for ${((tierPerfs[0]/totalPerfs)*100).toFixed(1)}% of ${gender} performances.`;

  destroyChart("chart-tier-perfs");
  const ctxTP = document.getElementById("chart-tier-perfs"); if (ctxTP) {
    charts["chart-tier-perfs"] = new Chart(ctxTP, {
      type: "doughnut",
      data: { labels: tiers.map(x => t("tier." + x)), datasets: [{ data: tierPerfs, backgroundColor: tierBgs, borderColor: tierBorders, borderWidth: 2 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { font: { family: CHART_FONT, size: 11 }, color: AXIS_STRONG, boxWidth: 12 } },
          title:  { display: true, text: t("chartTitle.pctPerfByTier"), font: { family: CHART_FONT, size: 12, weight: "600" }, color: AXIS_STRONG, padding: { bottom: 8 } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} (${((ctx.raw/totalPerfs)*100).toFixed(1)}%)` } },
        },
      },
    });
  }
  destroyChart("chart-tier-kata");
  const ctxTK = document.getElementById("chart-tier-kata"); if (ctxTK) {
    charts["chart-tier-kata"] = new Chart(ctxTK, {
      type: "doughnut",
      data: { labels: tiers.map(x => t("tier." + x)), datasets: [{ data: tierKata, backgroundColor: tierBgs, borderColor: tierBorders, borderWidth: 2 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { font: { family: CHART_FONT, size: 11 }, color: AXIS_STRONG, boxWidth: 12 } },
          title:  { display: true, text: t("chartTitle.distinctKataByTier"), font: { family: CHART_FONT, size: 12, weight: "600" }, color: AXIS_STRONG, padding: { bottom: 8 } },
        },
      },
    });
  }

  /* 7–10. New tables (rendered after charts) */
  renderTierCountsTable();
  renderPerformedKata();
  renderKataVsKaratekaAvg();
  renderKataStdDev();

  /* 6. Tournament avg score */
  const tSorted = [...tourns].sort((a,b) => a.Tournament.localeCompare(b.Tournament));
  const tHigh = tSorted.reduce((best,r) => (r.Avg_Score > (best?.Avg_Score||0) ? r : best), null);
  const tLow  = tSorted.filter(r=>r.Avg_Score).reduce((worst,r) => (r.Avg_Score < (worst?.Avg_Score||Infinity) ? r : worst), null);
  const tTotalPerfs = tSorted.filter(r => r.Avg_Score && r.Performances).reduce((s,r) => s + r.Performances, 0);
  const tWeightedSum = tSorted.filter(r => r.Avg_Score && r.Performances).reduce((s,r) => s + r.Avg_Score * r.Performances, 0);
  const tOverallMean = tTotalPerfs ? tWeightedSum / tTotalPerfs : null;
  const tPerfCounts  = tSorted.map(r => r.Performances ?? null);
  document.getElementById("insight-tournament").textContent =
    tHigh && tLow
      ? (lang === "jp"
          ? `${displayName("tournament", tHigh.Tournament)}が最も高い平均スコア（${tHigh.Avg_Score.toFixed(3)}）、${displayName("tournament", tLow.Tournament)}が最も低い平均スコア（${tLow.Avg_Score.toFixed(3)}）でした。` +
            (tOverallMean ? `今シーズンの${gender === "male" ? "男子" : "女子"}全演武の総合平均スコアは${tOverallMean.toFixed(3)}でした。` : "")
          : `${tHigh.Tournament} had the highest average score (${tHigh.Avg_Score.toFixed(3)}) and ${tLow.Tournament} the lowest (${tLow.Avg_Score.toFixed(3)}). ` +
            (tOverallMean ? `The overall mean score across all ${gender} performances this season was ${tOverallMean.toFixed(3)}.` : ""))
      : "";
  const tMin = Math.max(7.5, Math.min(...tSorted.map(r=>r.Avg_Score).filter(Boolean)) - 0.05);
  destroyChart("chart-tournament");
  const ctxT = document.getElementById("chart-tournament"); if (ctxT) {
    charts["chart-tournament"] = new Chart(ctxT, {
      type: "bar",
      data: { labels: tSorted.map(r=>displayName("tournament", r.Tournament)), datasets: [{ data: tSorted.map(r=>r.Avg_Score), backgroundColor: RED, borderColor: RED_BORDER, borderWidth: 1, borderRadius: 3 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx2 => {
            const p = tPerfCounts[ctx2.dataIndex];
            return p != null
              ? ` ${ctx2.raw.toFixed(3)}  (${p} performances)`
              : ` ${ctx2.raw.toFixed(3)}`;
          }}},
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: CHART_FONT, size: 11 }, color: AXIS_STRONG, maxRotation: 30 } },
          y: { min: tMin, grid: { color: GRID }, ticks: { font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT } },
        },
      },
    });
  }
}

/* ════════════════════════════════════════════════════════════════ NEW KATA TABLES */
function renderTierCountsTable() {
  const ts = DATA.tier_summary[gender];
  document.getElementById("insight-tier-counts").textContent = lang === "jp"
    ? `WKFリストの上級型${ts.adv_kata_count}種のうち${ts.adv_performed.length}種が演武され（${ts.adv_unperformed.length}種は未演武）、中級型${ts.interm_kata_count}種のうち${ts.interm_performed.length}種が演武されました（${ts.interm_unperformed.length}種は未演武）。`
    : `Of the ${ts.adv_kata_count} Advanced kata in the WKF list, ${ts.adv_performed.length} were performed ` +
      `(${ts.adv_unperformed.length} were not). Of the ${ts.interm_kata_count} Intermediate kata, ` +
      `${ts.interm_performed.length} were performed (${ts.interm_unperformed.length} were not).`;
  document.getElementById("tier-counts-tbody").innerHTML = [
    ["Advanced",     ts.adv_kata_count,   ts.adv_performed.length,   ts.adv_unperformed.length,   ts.adv_performances],
    ["Intermediate", ts.interm_kata_count, ts.interm_performed.length, ts.interm_unperformed.length, ts.interm_performances],
  ].map(([tier, total, perf, unperf, perfs]) => `
    <tr>
      <td>${tierBadge(tier)}</td>
      <td class="num">${total}</td>
      <td class="num">${perf}</td>
      <td class="num">${unperf}</td>
      <td class="num">${perfs}</td>
    </tr>`).join("");
}

function renderPerformedKata() {
  const ts = DATA.tier_summary[gender];
  const g = gender === "male" ? "Male" : "Female";
  const other = gender === "male" ? "Female" : "Male";
  const gJ = gender === "male" ? "男子" : "女子";
  const otherJ = gender === "male" ? "女子" : "男子";
  document.getElementById("insight-performed").innerHTML = lang === "jp"
    ? `2024–25シーズンの${gJ}型競技で、上級・中級の型のうちどれが演武され、どれが演武されなかったかの一覧です。${gJ}選手と${otherJ}選手が演武した型の比較は、男子 vs 女子タブの<a href="#" onclick="switchToTab('compare');setTimeout(()=>{const el=document.getElementById('fig-g2');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},150);return false;" style="color:var(--red)">図 G-2</a>をご覧ください。`
    : `Lists which Advanced and Intermediate kata were and were not performed during ${g} kata competition in the 2024–25 season. ` +
      `To compare which kata were performed by ${g} versus ${other} athletes, see <a href="#" onclick="switchToTab('compare');setTimeout(()=>{const el=document.getElementById('fig-g2');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},150);return false;" style="color:var(--red)">Figure G-2</a> in the Male vs. Female tab.`;
  const kataPerfsMap = {};
  (DATA.kata[gender] || []).forEach(k => { kataPerfsMap[k.Kata] = k.Performances; });
  const makePills = arr => arr.length
    ? arr.map(k => {
        const cnt = kataPerfsMap[k];
        return `<span class="pill">${esc(displayName("kata", k))}${cnt != null ? ` <span class="pill-count">${cnt}×</span>` : ""}</span>`;
      }).join("")
    : `<span style="color:var(--text-muted);font-size:12px">${t("lbl.none")}</span>`;
  const ADV = t("tier.Advanced"), INT = t("tier.Intermediate"), P = t("perf.performed"), NP = t("perf.notPerformed");
  document.getElementById("performed-kata-grid").innerHTML = `
    <div class="performed-kata-section">
      <h4>${ADV}: ${P} (${ts.adv_performed.length})</h4>
      <div class="pill-list">${makePills(ts.adv_performed)}</div>
    </div>
    <div class="performed-kata-section">
      <h4>${ADV}: ${NP} (${ts.adv_unperformed.length})</h4>
      <div class="pill-list">${makePills(ts.adv_unperformed)}</div>
    </div>
    <div class="performed-kata-section">
      <h4>${INT}: ${P} (${ts.interm_performed.length})</h4>
      <div class="pill-list">${makePills(ts.interm_performed)}</div>
    </div>
    <div class="performed-kata-section">
      <h4>${INT}: ${NP} (${ts.interm_unperformed.length})</h4>
      <div class="pill-list">${makePills(ts.interm_unperformed)}</div>
    </div>`;
}

function renderKataVsKaratekaAvg() {
  const rows = DATA.kata_vs_karateka_avg[gender];
  const top = rows[0], bot = rows[rows.length - 1];
  if (top && bot) {
    document.getElementById("insight-kk-avg").textContent = lang === "jp"
      ? `${displayName("kata", top.Kata)}は選手自身の平均を最も上回って演武されています（+${top.Diff.toFixed(3)}）。${displayName("kata", bot.Kata)}は最も下回って演武されています（${bot.Diff.toFixed(3)}）。演武回数が非常に少ない型は結果が偏ることがあります。`
      : `${top.Kata} is performed most above athletes' own averages (+${top.Diff.toFixed(3)}); ` +
        `${bot.Kata} is performed most below (${bot.Diff.toFixed(3)}). ` +
        `Kata with very few performances may have skewed results.`;
  }
  const sign = v => v > 0 ? `+${v.toFixed(3)}` : v.toFixed(3);
  const color = v => v > 0 ? "color:var(--pos)" : v < 0 ? "color:var(--red)" : "";
  document.getElementById("kata-kk-avg-tbody").innerHTML = rows.map(r => `
    <tr>
      <td class="name-cell">${esc(displayName("kata", r.Kata))}</td>
      <td class="num" style="${color(r.Diff)}">${sign(r.Diff)}</td>
      <td class="num">${r.Performances}</td>
    </tr>`).join("");

  /* diverging horizontal bar chart — highest diff at top */
  destroyChart("chart-kk-avg");
  const ctx = document.getElementById("chart-kk-avg"); if (!ctx) return;
  // Chart.js horizontal bar: labels[0] = top row. Sort desc so highest diff is first = top.
  const sorted = [...rows].sort((a, b) => b.Diff - a.Diff);
  const bgColors = sorted.map(r => r.Diff >= 0 ? "rgba(58,110,58,0.8)" : RED);
  const bdColors = sorted.map(r => r.Diff >= 0 ? "rgba(40,85,40,1)" : RED_BORDER);
  const kkLabelPlugin = {
    id: "kkLabels",
    afterDatasetsDraw(chart) {
      const ctx2 = chart.ctx;
      ctx2.save();
      ctx2.font = `9px ${CHART_FONT}`;
      ctx2.textBaseline = "middle";
      const meta = chart.getDatasetMeta(0);
      sorted.forEach((row, i) => {
        const el = meta.data[i];
        if (!el) return;
        if (row.Diff >= 0) {
          ctx2.textAlign = "left";
          ctx2.fillStyle = POS;
          ctx2.fillText(displayName("kata", row.Kata), el.x + 5, el.y);
        } else {
          ctx2.textAlign = "right";
          ctx2.fillStyle = NEG;
          ctx2.fillText(displayName("kata", row.Kata), el.x - 5, el.y);
        }
      });
      ctx2.restore();
    },
  };
  charts["chart-kk-avg"] = new Chart(ctx, {
    type: "bar",
    data: { labels: sorted.map(r => displayName("kata", r.Kata)), datasets: [{ data: sorted.map(r => r.Diff), backgroundColor: bgColors, borderColor: bdColors, borderWidth: 1, borderRadius: 3 }] },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      layout: { padding: { left: 160, right: 160 } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw >= 0 ? "+" : ""}${ctx.raw.toFixed(3)}` } },
        kkLabels: {},
      },
      scales: {
        x: { grid: { color: ctx => ctx.tick.value === 0 ? ZERO_LINE : GRID, lineWidth: ctx => ctx.tick.value === 0 ? 1.5 : 1 }, ticks: { font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT }, title: { display: true, text: t("axis.scoreDiffVsAthAvg"), font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT } },
        y: { grid: { display: false }, ticks: { display: false } },
      },
    },
    plugins: [kkLabelPlugin],
  });
}

function renderKataStdDev() {
  const rows = DATA.kata_std_dev[gender];
  document.getElementById("insight-stddev").textContent = lang === "jp"
    ? `より多くの選手に演武される型は、より幅広い実力層が反映されるため、スコアのばらつきが大きくなる傾向があります。演武者が1〜2名のみの型は、標準偏差に意味がありません。`
    : `Kata performed by more athletes tend to show higher score variance, since a wider ability range is represented. ` +
      `Kata with only 1–2 performers have no meaningful standard deviation.`;
  document.getElementById("kata-stddev-tbody").innerHTML = rows.map(r => `
    <tr>
      <td class="name-cell">${esc(displayName("kata", r.Kata))}</td>
      <td class="num">${r.Unique_Karateka}</td>
      <td class="num">${r.Std_Dev != null ? r.Std_Dev.toFixed(3) : "—"}</td>
    </tr>`).join("");

  /* scatter: x = unique performers, y = std dev — colored by tier */
  destroyChart("chart-stddev");
  const ctx = document.getElementById("chart-stddev"); if (!ctx) return;
  const kataLookup = Object.fromEntries((DATA.kata[gender] || []).map(k => [k.Kata, k.Kata_Tier]));
  const validRows = rows.filter(r => r.Std_Dev != null);
  const tierDatasets = ["Advanced", "Intermediate"].map(tier => {
    const subset = validRows.filter(r => kataLookup[r.Kata] === tier);
    if (!subset.length) return null;
    return {
      label: t("tier." + tier),
      data: subset.map(r => ({ x: r.Unique_Karateka, y: r.Std_Dev, kata: displayName("kata", r.Kata) })),
      backgroundColor: TIER_COLORS[tier].bg,
      borderColor: TIER_COLORS[tier].border,
      borderWidth: 1.5, pointRadius: 4, pointHoverRadius: 6,
    };
  }).filter(Boolean);

  /* line of best fit */
  const allPts = tierDatasets.flatMap(ds => ds.data);
  const n = allPts.length;
  if (n >= 2) {
    const sumX  = allPts.reduce((s, p) => s + p.x, 0);
    const sumY  = allPts.reduce((s, p) => s + p.y, 0);
    const sumXY = allPts.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = allPts.reduce((s, p) => s + p.x * p.x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const xMin = Math.min(...allPts.map(p => p.x));
    const xMax = Math.max(...allPts.map(p => p.x));
    tierDatasets.push({
      label: "Trend",
      data: [{ x: xMin, y: slope * xMin + intercept }, { x: xMax, y: slope * xMax + intercept }],
      type: "line",
      borderColor: RED,
      borderWidth: 1.5,
      borderDash: [5, 4],
      pointRadius: 0,
      fill: false,
      tension: 0,
    });
  }

  const kataLabelPlugin = {
    id: "kataLabels",
    afterDatasetsDraw(chart) {
      const ctx2 = chart.ctx;
      ctx2.save();
      ctx2.font = `9px ${CHART_FONT}`;
      ctx2.fillStyle = AXIS_TXT;
      ctx2.textBaseline = "middle";
      chart.data.datasets.forEach((dataset, di) => {
        if (dataset.type === "line") return;
        const meta = chart.getDatasetMeta(di);
        (dataset.data || []).forEach((point, i) => {
          const el = meta.data[i];
          if (el && point.kata) ctx2.fillText(point.kata, el.x + 7, el.y);
        });
      });
      ctx2.restore();
    },
  };

  charts["chart-stddev"] = new Chart(ctx, {
    type: "scatter",
    data: { datasets: tierDatasets },
    plugins: [kataLabelPlugin],
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { right: 130 } },
      plugins: {
        legend: { position: "bottom", labels: {
          filter: item => item.text !== "Trend",
          font: { family: CHART_FONT, size: 11 }, color: AXIS_STRONG, boxWidth: 12,
        } },
        tooltip: { callbacks: { label: ctx => ctx.raw.kata ? ` ${ctx.raw.kata}: ${ctx.raw.x} performers, σ = ${ctx.raw.y.toFixed(3)}` : "" } },
      },
      scales: {
        x: { title: { display: true, text: t("axis.uniquePerformers"), font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT }, grid: { color: GRID }, ticks: { font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT } },
        y: { title: { display: true, text: t("axis.scoreStdDev"), font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT }, grid: { color: GRID }, ticks: { font: { family: CHART_FONT, size: 11 }, color: AXIS_TXT } },
      },
    },
  });
}

/* ════════════════════════════════════════════════════════════════ KARATEKA FINDINGS */
function renderKaratekaFindings() {
  renderAthleteLeaders();
  const kdata     = DATA.karateka[gender];
  const countries = DATA.countries[gender];
  const g = gender === "male" ? "male" : "female";
  const subElA = document.getElementById("athlete-findings-subtitle");
  if (subElA) subElA.textContent = lang === "jp"
    ? `2024–25 WKFシーズンの9大会に出場した${g === "male" ? "男子" : "女子"}選手 全${kdata.length}名のランキングと国別内訳。`
    : `Rankings and country breakdowns for all ${kdata.length} ${g} athletes who competed across 9 tournaments in the 2024–25 WKF season.`;

  /* Findings section */
  const byScore5  = [...kdata].filter(k => k.Mean_Score != null && k.Performances >= 5).sort((a,b) => b.Mean_Score - a.Mean_Score);
  const byPerfs   = [...kdata].sort((a,b) => b.Performances - a.Performances);
  const byWR5     = [...kdata].filter(k => k.Win_Rate != null && k.Performances >= 5).sort((a,b) => b.Win_Rate - a.Win_Rate);
  const byCountry = [...countries].sort((a,b) => b.Athletes - a.Athletes);
  const top1k     = byScore5[0], top2k = byScore5[1];
  const topC      = byCountry[0], secC = byCountry[1];
  const af = document.getElementById("athlete-findings-text");
  if (af) af.innerHTML = athleteFindingsHTML();

  /* 7. Top 20 by avg score (min 5 perfs) */
  const kScoreSorted = [...kdata].filter(r => r.Mean_Score != null && r.Performances >= 5).sort((a,b) => b.Mean_Score - a.Mean_Score).slice(0, 20);
  document.getElementById("insight-k-avgscore").textContent =
    kScoreSorted[0]
      ? (lang === "jp"
          ? `${kScoreSorted[0].Karateka}（${displayName("country", kScoreSorted[0].Country)}）が${gender === "male" ? "男子" : "女子"}型選手の平均スコアで首位：${kScoreSorted[0].Performances}演武で${kScoreSorted[0].Mean_Score.toFixed(2)}。`
          : `${kScoreSorted[0].Karateka} (${kScoreSorted[0].Country}) led ${gender} kata athletes in average score: ${kScoreSorted[0].Mean_Score.toFixed(2)} over ${kScoreSorted[0].Performances} performances.`)
      : "";
  makeHBar("chart-k-avgscore", kScoreSorted.map(r => r.Karateka), kScoreSorted.map(r => r.Mean_Score), t("axis.avgScore"), 7.5);

  /* 8. Top 20 by win rate (min 5 perfs) */
  const kWinSorted = [...kdata].filter(r => r.Win_Rate != null && r.Performances >= 5).sort((a,b) => b.Win_Rate - a.Win_Rate).slice(0, 20);
  document.getElementById("insight-k-winrate").textContent = lang === "jp"
    ? `勝率は特定の相手との対戦結果を反映し、組み合わせの抽選や選手の実力に左右されます。型の選択だけで決まるものではありません。5演武以上の選手を表示しています。`
    : `Win rates reflect match outcomes against specific opponents and are shaped by bracket draw and athlete skill, not kata choice alone. Athletes with at least 5 performances are shown.`;
  makeWinRateHBar("chart-k-winrate", kWinSorted.map(r => r.Karateka), kWinSorted.map(r => +(r.Win_Rate*100).toFixed(1)), t("axis.winRatePct"));

  /* 9. Countries */
  const topCountries = countries.filter(r => r.Athletes >= 2).slice(0, 15);
  const multiCountries = countries.filter(r => r.Athletes >= 2);
  document.getElementById("insight-country").textContent =
    topCountries[0]
      ? (lang === "jp"
          ? `今シーズン${countries.length}か国が${gender === "male" ? "男子" : "女子"}型選手を派遣し、うち${multiCountries.length}か国が2名以上を派遣しました。${displayName("country", topCountries[0].Country)}が${topCountries[0].Athletes}名で最多でした。`
          : `${countries.length} countries sent ${gender} kata athletes this season; ${multiCountries.length} sent 2 or more. ${topCountries[0].Country} sent the most with ${topCountries[0].Athletes} competitors.`)
      : "";
  const noteCountry = document.getElementById("note-country");
  if (noteCountry) noteCountry.textContent = t("note.countriesMin2");
  makeCountryHBar("chart-country", topCountries.map(r => displayName("country", r.Country)), topCountries.map(r => r.Athletes));
}

/* ════════════════════════════════════════════════════════════════ NOTES */
function buildMissingTables() {
  const md = DATA.missing_data;
  ["male", "female"].forEach(g => {
    const gd = md[g];
    const rows = [
      [t("miss.total"),     gd.total,              "100.00%"],
      [t("miss.complete"),  gd.complete,           pct(gd.complete, gd.total)],
      [t("miss.kataOnly"),  gd.missing_kata_only,  pct(gd.missing_kata_only, gd.total)],
      [t("miss.scoreOnly"), gd.missing_score_only, pct(gd.missing_score_only, gd.total)],
      [t("miss.both"),      gd.missing_both,       pct(gd.missing_both, gd.total)],
    ];
    document.getElementById(`missing-tbody-${g}`).innerHTML = rows.map(([label, count, percent]) =>
      `<tr><td>${label}</td><td class="num">${count}</td><td class="num">${percent}</td></tr>`
    ).join("");
  });
}

/* ── Utilities ─────────────────────────────────────────────────────────────── */
function clearCard(id) {
  const c = document.getElementById(id); c.innerHTML = ""; c.classList.add("hidden");
}
function highlightRow(tbodyId, attr, value) {
  document.querySelectorAll(`#${tbodyId} tr`).forEach(tr =>
    tr.classList.toggle("highlighted", tr.getAttribute(attr) === value)
  );
}
function pct(n, total) { return (n / total * 100).toFixed(2) + "%"; }

/* ══════════════════════════════════════════════════════ BACK BUTTON */
function setupBackButton() {
  const btn = document.getElementById("nav-back-btn");
  if (!btn) return;
  btn.style.display = "none";
  btn.addEventListener("click", _navBack);
}

/* ══════════════════════════════════════════════════════ DEEP LINK */
function parseDeepLink() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return;
  const parts = hash.split("/");
  if (parts[0] === "tab" && parts[1]) {
    switchToTab(parts[1]);
    return;
  }
  const type = parts[0];
  const name = parts.slice(1).map(decodeURIComponent).join("/");
  if (!name) return;
  const typeToTab = { kata: "kata", karateka: "karateka", tournament: "tournaments", country: "countries" };
  const tab = typeToTab[type];
  if (!tab) return;
  switchToTab(tab);
  setTimeout(() => {
    if (type === "kata") {
      const row = DATA.kata[gender].find(r => r.Kata === name);
      if (row) { showKataCard(row); highlightRow("kata-tbody", "data-kata", name); }
    } else if (type === "karateka") {
      const row = DATA.karateka[gender].find(r => r.Karateka === name);
      if (row) { showKaratekaCard(row); highlightRow("karateka-tbody", "data-karateka", name); }
    } else if (type === "tournament") {
      const row = (DATA.tournaments || []).find(r => r.Tournament === name);
      if (row) showTournamentCard(row);
    } else if (type === "country") {
      const all = buildCountryStats();
      const row = all.find(r => r.Country === name);
      if (row) { showCountryCard(row, all); highlightRow("countries-tbody", "data-country", name); }
    }
  }, 100);
}

/* ══════════════════════════════════════════════════════ GLOBAL SEARCH */
function setupGlobalSearch() {
  const input = document.getElementById("global-search");
  const dropdown = document.getElementById("global-search-dropdown");
  if (!input || !dropdown) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q || q.length < 2) { dropdown.style.display = "none"; return; }
    const results = [];

    /* kata */
    (DATA.kata[gender] || []).filter(r => r.Kata.toLowerCase().includes(q)).slice(0, 5)
      .forEach(r => results.push({ type: "kata", name: r.Kata, sub: `${r.Kata_Tier || ""} · ${r.Performances} performances` }));

    /* karateka — flag the athlete's country in the sub line */
    (DATA.karateka[gender] || []).filter(r => r.Karateka.toLowerCase().includes(q)).slice(0, 5)
      .forEach(r => results.push({ type: "karateka", name: r.Karateka, subHtml: `${flagOf(r.Country)}${esc(r.Country)} · ${r.Performances} performances` }));

    /* countries — flag the country next to its name */
    buildCountryStats().filter(r => r.Country.toLowerCase().includes(q)).slice(0, 3)
      .forEach(r => results.push({ type: "country", name: r.Country, flag: flagOf(r.Country), sub: `${r.Athletes} athletes` }));

    /* tournaments — flag the host country next to the tournament name */
    (DATA.tournaments || []).filter(r => r.Tournament.toLowerCase().includes(q) && r.Gender.toLowerCase() === gender).slice(0, 3)
      .forEach(r => results.push({ type: "tournament", name: r.Tournament, flag: flagOf((TOURN_META[r.Tournament] || {}).country), sub: `${r.Total_Performances} performances` }));

    if (!results.length) {
      dropdown.innerHTML = `<div class="gsd-empty">${lang === "jp" ? `「${esc(q)}」の検索結果はありません` : `No results for "${esc(q)}"`}</div>`;
      dropdown.style.display = "block";
      return;
    }

    const groupLabels = { kata: "Kata", karateka: "Athletes", country: "Countries", tournament: "Tournaments" };
    const grouped = {};
    results.forEach(r => { if (!grouped[r.type]) grouped[r.type] = []; grouped[r.type].push(r); });
    let html = "";
    for (const [type, items] of Object.entries(grouped)) {
      html += `<div class="gsd-group-label">${groupLabels[type]}</div>`;
      items.forEach(item => {
        html += `<div class="gsd-item" data-type="${esc(item.type)}" data-name="${esc(item.name)}">
          <span class="gsd-name">${item.flag || ""}${esc(item.name)}</span>
          <span class="gsd-sub">${item.subHtml || esc(item.sub)}</span>
        </div>`;
      });
    }
    dropdown.innerHTML = html;
    dropdown.style.display = "block";
  });

  dropdown.addEventListener("click", e => {
    const item = e.target.closest(".gsd-item");
    if (!item) return;
    input.value = "";
    dropdown.style.display = "none";
    confirmNav(item.dataset.type, item.dataset.name);
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".global-search-wrap")) dropdown.style.display = "none";
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Escape") { dropdown.style.display = "none"; input.blur(); }
  });
}

/* ══════════════════════════════════════════════════════ SCORE HISTOGRAM */
function renderScoreHistogram(canvasId, scores, chartKey) {
  if (_kataHistChart && chartKey === "_kataHistChart") { _kataHistChart.destroy(); _kataHistChart = null; }
  if (_karHistChart  && chartKey === "_karHistChart")  { _karHistChart.destroy();  _karHistChart  = null; }
  const ctx = document.getElementById(canvasId); if (!ctx || !scores.length) return;
  /* build bins of width 0.1 from floor to ceil of data */
  const BIN_W = 0.1;
  const minV = Math.floor(scores.reduce((m,v)=>Math.min(m,v), Infinity) / BIN_W) * BIN_W;
  const maxV = Math.ceil( scores.reduce((m,v)=>Math.max(m,v), -Infinity) / BIN_W) * BIN_W;
  const bins = [];
  for (let b = minV; b < maxV + BIN_W/2; b = +(b + BIN_W).toFixed(2)) {
    const lo = b, hi = +(b + BIN_W).toFixed(2);
    bins.push({ lo, hi, count: scores.filter(s => s >= lo && s < hi).length });
  }
  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: bins.map(b => b.lo.toFixed(1)),
      datasets: [{ data: bins.map(b => b.count), backgroundColor: RED, borderColor: RED_BORDER, borderWidth: 1, borderRadius: 2 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { title: i => `${bins[i[0].dataIndex].lo.toFixed(2)} – ${bins[i[0].dataIndex].hi.toFixed(2)}`, label: c => lang === "jp" ? ` ${c.raw} ${t("chart.performances")}` : ` ${c.raw} performance${c.raw !== 1 ? "s" : ""}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: CHART_FONT, size: 10 }, color: AXIS_TXT }, title: { display: true, text: t("chart.score"), font: { family: CHART_FONT, size: 10 }, color: AXIS_TXT } },
        y: { grid: { color: GRID }, ticks: { font: { family: CHART_FONT, size: 10 }, color: AXIS_TXT, stepSize: 1 } },
      },
    },
  });
  if (chartKey === "_kataHistChart") _kataHistChart = chart;
  else _karHistChart = chart;
}

/* ══════════════════════════════════════════════════════ MEDALS TAB */
function _buildMedalRows(g) {
  const medalMap = {};
  for (const k of (DATA.karateka[g] || [])) {
    const c = k.Country;
    if (!c) continue;
    if (!medalMap[c]) medalMap[c] = { Country: c, Gold: 0, Silver: 0, Bronze: 0 };
    for (const m of (k.Medals || [])) {
      if (m.Place === 1) medalMap[c].Gold++;
      else if (m.Place === 2) medalMap[c].Silver++;
      else medalMap[c].Bronze++;
    }
  }
  return Object.values(medalMap)
    .filter(r => r.Gold + r.Silver + r.Bronze > 0)
    .map(r => ({ ...r, Total: r.Gold + r.Silver + r.Bronze }))
    .sort((a,b) => b.Gold - a.Gold || b.Silver - a.Silver || b.Bronze - a.Bronze || a.Country.localeCompare(b.Country));
}

let _medalSort = { male: { col: "Gold", dir: "desc" }, female: { col: "Gold", dir: "desc" } };

function sortMedalTable(g, col) {
  const s = _medalSort[g];
  if (s.col === col) s.dir = s.dir === "desc" ? "asc" : "desc";
  else { s.col = col; s.dir = "desc"; }
  _renderMedalBody(g);
}

function _renderMedalBody(g) {
  const s = _medalSort[g];
  let rows = _buildMedalRows(g);
  rows = rows.sort((a, b) => {
    const av = a[s.col], bv = b[s.col];
    if (typeof av === "string") return s.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return s.dir === "asc" ? av - bv : bv - av;
  }).map((r, i) => ({ ...r, _rank: i + 1 }));
  const tbody = document.getElementById(`medals-tbody-${g}`);
  if (!tbody) return;
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="num row-num">${r._rank}</td>
      <td>${flagOf(r.Country)} ${navLink("country", r.Country)}</td>
      <td class="num" style="font-weight:${r.Gold ? 700 : 400}">${r.Gold || "—"}</td>
      <td class="num" style="font-weight:${r.Silver ? 700 : 400}">${r.Silver || "—"}</td>
      <td class="num" style="font-weight:${r.Bronze ? 700 : 400}">${r.Bronze || "—"}</td>
      <td class="num" style="font-weight:700">${r.Gold + r.Silver + r.Bronze}</td>
    </tr>`).join("");
}

function _medalTableHTML(g, label) {
  return `
    <div>
      <h3 class="compare-head" style="margin-bottom:10px">${label}</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th class="num row-num" style="cursor:pointer" onclick="sortMedalTable('${g}','_rank')">#</th>
            <th style="cursor:pointer;min-width:140px" onclick="sortMedalTable('${g}','Country')">${t("col.country")}</th>
            <th class="num" style="cursor:pointer" title="${t('medal.goldTip')}" onclick="sortMedalTable('${g}','Gold')">🥇</th>
            <th class="num" style="cursor:pointer" title="${t('medal.silverTip')}" onclick="sortMedalTable('${g}','Silver')">🥈</th>
            <th class="num" style="cursor:pointer" title="${t('medal.bronzeTip')}" onclick="sortMedalTable('${g}','Bronze')">🥉</th>
            <th class="num" style="cursor:pointer" onclick="sortMedalTable('${g}','Total')">${t("col.total")}</th>
          </tr></thead>
          <tbody id="medals-tbody-${g}"></tbody>
        </table>
      </div>
    </div>`;
}

function renderMedalsTab() {
  const el = document.getElementById("medals-content");
  if (!el || el.dataset.built) return;
  el.dataset.built = "1";
  el.innerHTML = `<div class="medals-two-col">${_medalTableHTML("male",t("medals.maleTitle"))}${_medalTableHTML("female",t("medals.femaleTitle"))}</div>`;
  _renderMedalBody("male");
  _renderMedalBody("female");
}

/* ══════════════════════════════════════════════════════ TOURNAMENT TIMELINE */
/* Shared timeline rendering core. tournNames = array of unique tournament name strings.
   onChipClick(tournName) is called when a chip is clicked. */
function _buildTimelineHTML(tournNames) {
  const MON = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  const monthIdx = name => {
    const d = (TOURN_META[name] || {}).date || "";
    const m = d.match(/([A-Z][a-z]{2}).*?(\d{4})/);
    if (!m) return null;
    return (parseInt(m[2]) - 2024) * 12 + (MON[m[1]] ?? 0);
  };

  const FIRST = 0, LAST = 22;
  const pct = idx => ((idx - FIRST) / (LAST - FIRST) * 100).toFixed(2);

  const positioned = tournNames
    .map(name => ({ name, idx: monthIdx(name) }))
    .filter(x => x.idx !== null)
    .sort((a, b) => a.idx - b.idx);

  const PROX = 2, NUM_ROWS = 3;
  const rowLast = new Array(NUM_ROWS).fill(-Infinity);
  const rows = positioned.map(({ idx }) => {
    let assigned = -1;
    for (let r = 0; r < NUM_ROWS; r++) {
      if (idx - rowLast[r] > PROX) { assigned = r; break; }
    }
    if (assigned === -1) assigned = rowLast.indexOf(Math.min(...rowLast));
    rowLast[assigned] = idx;
    return assigned;
  });

  const jp = lang === "jp";
  const tickLabel = (mon, yr) => jp
    ? (mon === 0 ? `${yr}年${mon + 1}月` : `${mon + 1}月`)
    : (mon === 0 ? `${Object.keys(MON)[mon]} ${yr}` : Object.keys(MON)[mon]);

  const ticks = [];
  for (let i = FIRST; i <= LAST; i += 3) {
    const yr = 2024 + Math.floor(i / 12);
    ticks.push({ i, label: tickLabel(i % 12, yr) });
  }
  if (!ticks.find(t => t.i === LAST)) {
    const yr = 2024 + Math.floor(LAST / 12);
    ticks.push({ i: LAST, label: tickLabel(LAST % 12, yr) });
  }

  const AXIS = 140, H = 210, CHIP_H = 32;
  const rowOffsets = [44, 82, 120];

  let html = `<div class="tl-real" style="height:${H}px;position:relative;width:88%;margin:0 auto">`;
  html += `<div style="position:absolute;left:0;right:0;top:${AXIS}px;height:3px;background:#b0a090"></div>`;
  ticks.forEach(({ i, label }) => {
    const p = pct(i);
    html += `<div style="position:absolute;left:${p}%;top:${AXIS - 5}px;width:1px;height:12px;background:#b0a090;transform:translateX(-50%)"></div>`;
    html += `<div style="position:absolute;left:${p}%;top:${AXIS + 14}px;font-size:12px;color:var(--text-muted);transform:translateX(-50%);white-space:nowrap">${label}</div>`;
  });
  positioned.forEach(({ name, idx }, i) => {
    const meta = TOURN_META[name] || {};
    const p = pct(idx);
    const chipTop = AXIS - rowOffsets[rows[i]];
    const connTop = chipTop + CHIP_H;
    const connH   = AXIS - connTop;
    html += `<button class="tl-chip-real" data-tourn="${esc(name)}" style="position:absolute;left:${p}%;top:${chipTop}px;transform:translateX(-50%)">${flagOf(meta.country)} ${esc(displayName("tournament", name))}</button>`;
    if (connH > 0) html += `<div style="position:absolute;left:${p}%;top:${connTop}px;width:1px;height:${connH}px;background:#b0a090;transform:translateX(-50%)"></div>`;
  });
  html += `</div>`;
  return html;
}

function renderTournamentTimeline() {
  const wrap = document.getElementById("tourn-timeline-wrap");
  if (!wrap) return;
  const key = gender;
  if (_timelineRendered === key && wrap.children.length) return;
  _timelineRendered = key;

  const names = DATA.tournaments
    .filter(r => r.Gender.toLowerCase() === gender)
    .map(r => r.Tournament);
  wrap.innerHTML = _buildTimelineHTML(names);

  wrap.querySelectorAll(".tl-chip-real").forEach(btn => {
    btn.addEventListener("click", () => {
      const row = DATA.tournaments.find(r => r.Tournament === btn.dataset.tourn && r.Gender.toLowerCase() === gender);
      if (row) showTournamentCard(row);
    });
  });
}

function initHowToCards() {
  document.querySelectorAll(".how-to-card").forEach(card => {
    const body = card.querySelector(".how-to-body");
    if (!body) return;
    /* already transformed (e.g. on first init) — skip to avoid double-wrapping.
       A language switch resets the body's innerHTML first, so this rebuilds cleanly. */
    if (body.querySelector(".how-to-header")) return;
    const title = body.querySelector("strong");
    if (!title) return;

    /* wrap title + toggle in a header row */
    const header = document.createElement("div");
    header.className = "how-to-header";
    const toggle = document.createElement("span");
    toggle.className = "how-to-toggle";
    toggle.setAttribute("aria-hidden", "true");
    title.parentNode.insertBefore(header, title);
    header.appendChild(title);
    header.appendChild(toggle);

    /* collect siblings after header, separating q from detail paragraphs */
    const siblings = [];
    for (let node = header.nextSibling; node; node = node.nextSibling) siblings.push(node);

    const detail = document.createElement("div");
    detail.className = "how-to-detail";
    let qEl = null;
    siblings.forEach(el => {
      if (el.classList && el.classList.contains("how-to-q")) {
        qEl = el;
      } else {
        detail.appendChild(el);
      }
    });

    /* question stays visible outside detail; content paragraphs are hidden */
    body.appendChild(detail);
    if (qEl) body.appendChild(qEl);

    /* toggle on card click — bound once per card so language re-inits don't stack handlers */
    if (!card.dataset.howtoBound) {
      card.dataset.howtoBound = "1";
      card.addEventListener("click", () => {
        card.classList.toggle("open");
      });
    }
  });
}

function renderWelcomeTimeline() {
  const wrap = document.getElementById("welcome-timeline-wrap");
  if (!wrap || wrap.children.length) return;

  /* Deduplicate: same 9 tournaments appear for both genders */
  const seen = new Set();
  const names = DATA.tournaments.map(r => r.Tournament).filter(n => seen.has(n) ? false : (seen.add(n), true));
  wrap.innerHTML = _buildTimelineHTML(names);

  wrap.querySelectorAll(".tl-chip-real").forEach(btn => {
    btn.addEventListener("click", () => {
      const tourn = btn.dataset.tourn;
      switchToTab("tournaments");
      setTimeout(() => {
        const row = DATA.tournaments.find(r => r.Tournament === tourn && r.Gender.toLowerCase() === gender);
        if (row) { showTournamentCard(row); highlightRow("tourn-table", row.Tournament, "Tournament"); }
      }, 80);
    });
  });
}

/* ══════════════════════════════════════════════════════ WORLD MAP */
function renderWorldMap() {
  const wrap = document.getElementById("world-map-wrap");
  if (!wrap) return;
  const key = gender;
  if (_mapRendered === key && wrap.querySelector("svg")) return;
  _mapRendered = key;

  /* athlete counts per country */
  const countryStats = buildCountryStats();
  const athleteMap = {};
  countryStats.forEach(r => { athleteMap[r.Country] = r.Athletes; });
  const maxAthletes = Math.max(...Object.values(athleteMap), 1);

  /* name mapping from topojson country names → our DATA.countries names */
  const NAME_MAP = {
    "United States of America": "USA",
    "United Kingdom": "England",
    "Republic of Korea": "South Korea",
    "Iran (Islamic Republic of)": "Iran",
    "Taiwan": "Taiwan",
    "United Arab Emirates": "UAE",
    "Czechia": "Czech Republic",
    "Dominican Rep.": "Dominican Republic",
    "Slovakia": "Slovakia",
    "Montenegro": "Montenegro",
  };
  const resolve = name => NAME_MAP[name] || name;

  /* City-states / territories with no polygon in the 110m atlas: Hong Kong is
     merged into China, and Singapore is too small to appear. Draw them as
     point markers so their athletes still show up on the map. */
  const POINT_LOCATIONS = { "Hong Kong": [114.17, 22.32], "Singapore": [103.82, 1.35] };

  const mapHeading = lang === "jp"
    ? `${t("fig.athletesByCountry")}：${gender === "male" ? "男子" : "女子"}`
    : `Athletes per Country: ${gender === "male" ? "Male" : "Female"}`;
  wrap.innerHTML = `<h3 class="compare-head" style="margin-bottom:8px">${mapHeading}</h3><div id="world-map-svg-wrap" style="width:80%;margin:0 auto;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);overflow:hidden"></div>`;
  const svgWrap = document.getElementById("world-map-svg-wrap");
  const tooltip = document.getElementById("map-tooltip");

  fetch("assets/vendor/countries-110m.json")
    .then(r => r.json())
    .then(world => {
      const countries = topojson.feature(world, world.objects.countries);
      const w = svgWrap.getBoundingClientRect().width || 700;
      const h = Math.round(w * 0.5);
      const proj = d3.geoNaturalEarth1().scale(w / 6.28).translate([w / 2, h / 2]);
      const path = d3.geoPath(proj);

      /* log scale: 1 athlete → light pink, max athletes → very dark red.
         Log compresses the low end less than sqrt, making 5–10 athletes
         visually much darker than 1–3. */
      const logScale = d3.scaleLog()
        .domain([1, Math.max(maxAthletes, 2)])
        .range([0.08, 1])
        .clamp(true);
      const mcs = getComputedStyle(document.documentElement);
      const noData = mcs.getPropertyValue("--map-nodata").trim() || "#e8dcc8";
      const mapStroke = mcs.getPropertyValue("--map-stroke").trim() || "#ffffff";
      const color = n => n ? d3.interpolateRgb("#f5c0c0", "#700f0f")(logScale(n)) : noData;

      const svg = d3.create("svg").attr("viewBox", `0 0 ${w} ${h}`).style("width","100%").style("height","auto");

      svg.append("g")
        .selectAll("path")
        .data(countries.features)
        .join("path")
        .attr("d", path)
        .attr("fill", d => color(athleteMap[resolve(d.properties.name)] || 0))
        .attr("stroke", mapStroke)
        .attr("stroke-width", 0.3)
        .style("cursor", d => {
          const name = resolve(d.properties.name);
          return athleteMap[name] ? "pointer" : "default";
        })
        .on("mousemove", (event, d) => {
          const name = resolve(d.properties.name);
          const n = athleteMap[name];
          if (!tooltip) return;
          tooltip.style.display = "block";
          tooltip.style.left = (event.clientX + 12) + "px";
          tooltip.style.top  = (event.clientY - 28) + "px";
          tooltip.innerHTML = n
            ? `<strong>${esc(displayName("country", name))}</strong> · ${n} ${lang === "jp" ? t("map.athletes") : "athlete" + (n !== 1 ? "s" : "")}`
            : `<span style="color:var(--text-muted)">${esc(displayName("country", name))}</span>`;
        })
        .on("mouseleave", () => { if (tooltip) tooltip.style.display = "none"; })
        .on("click", (event, d) => {
          const name = resolve(d.properties.name);
          if (athleteMap[name]) confirmNav("country", name);
        });

      /* Point markers for territories that have no polygon (see POINT_LOCATIONS) */
      const points = Object.entries(POINT_LOCATIONS).filter(([name]) => athleteMap[name]);
      svg.append("g")
        .selectAll("circle")
        .data(points)
        .join("circle")
        .attr("cx", d => proj(d[1])[0])
        .attr("cy", d => proj(d[1])[1])
        .attr("r", 4)
        .attr("fill", d => color(athleteMap[d[0]]))
        .attr("stroke", mapStroke)
        .attr("stroke-width", 0.8)
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
          const name = d[0], n = athleteMap[name];
          if (!tooltip) return;
          tooltip.style.display = "block";
          tooltip.style.left = (event.clientX + 12) + "px";
          tooltip.style.top  = (event.clientY - 28) + "px";
          tooltip.innerHTML = `<strong>${esc(displayName("country", name))}</strong> · ${n} ${lang === "jp" ? t("map.athletes") : "athlete" + (n !== 1 ? "s" : "")}`;
        })
        .on("mouseleave", () => { if (tooltip) tooltip.style.display = "none"; })
        .on("click", (event, d) => { if (athleteMap[d[0]]) confirmNav("country", d[0]); });

      svgWrap.appendChild(svg.node());
    })
    .catch(() => {
      svgWrap.innerHTML = `<p style="padding:24px;color:var(--text-muted);font-size:13px">Could not load world map.</p>`;
    });
}

/* ══════════════════════════════════════════════ COMPARE (two-entity head-to-head) */
/* A small "Compare" button placed in a detail-card header. Clicking it opens a
   picker to choose a second entity of the same type, then renders a side-by-side
   comparison modal with the better value in each metric highlighted. */
const _diffFmt = v => v == null ? "—" : (v >= 0 ? "+" : "") + v.toFixed(3);

function compareBtn(type, name) {
  return `<button class="compare-btn" data-cmp-type="${esc(type)}" data-cmp-name="${esc(name)}" title="${t("cmp.tooltip")}">⇄ ${t("cmp.btn")}</button>`;
}

/* Rebuilt per call so metric labels track the active language / gender. */
function _compareConfig(type) {
  const cfg = {
    kata: {
      pickTitle: t("cmp.pickKata"),
      list: () => DATA.kata[gender] || [],
      key:  "Kata",
      head: r => `${tierBadge(r.Kata_Tier)}<span>${esc(displayName("kata", r.Kata))}</span>`,
      pick: r => `${tierBadge(r.Kata_Tier)} ${esc(displayName("kata", r.Kata))}`,
      metrics: [
        { label: t("col.performances"),      get: r => r.Performances,    fmt: v => v ?? "—", dir: "high" },
        { label: t("col.athletes"),          get: r => r.Unique_Karateka, fmt: v => v ?? "—", dir: "high" },
        { label: t("col.avgScore"),          get: r => r.Mean_Score,      fmt: fmt3,   dir: "high" },
        { label: t("col.median"),            get: r => r.Median_Score,    fmt: fmt2,   dir: "high" },
        { label: t("col.min"),               get: r => r.Min_Score,       fmt: fmt2,   dir: "high" },
        { label: t("col.max"),               get: r => r.Max_Score,       fmt: fmt2,   dir: "high" },
        { label: t("col.stdDev"),            get: r => r.Std_Dev,         fmt: fmt3,   dir: "low"  },
        { label: t("col.winRate"),           get: r => r.Win_Rate,        fmt: fmtPct, dir: "high" },
        { label: t("col.scoreDifferential"), get: r => r.Diff,            fmt: _diffFmt, dir: "high" },
      ],
    },
    karateka: {
      pickTitle: t("cmp.pickAthlete"),
      list: () => DATA.karateka[gender] || [],
      key:  "Karateka",
      head: r => `${flagOf(r.Country)}<span>${esc(r.Karateka)}</span>`,
      pick: r => `${flagOf(r.Country)} ${esc(r.Karateka)}`,
      metrics: [
        { label: t("col.medals"),       get: r => medalPoints(r.Medals),   disp: r => medalTally(r.Medals) || "0", dir: "high" },
        { label: t("cmp.headToHead"),   h2h: true, dir: "high" },
        { label: t("col.performances"), get: r => r.Performances,          fmt: v => v ?? "—", dir: "high" },
        { label: t("col.tournaments"),  get: r => r.Tournaments_Attended,  fmt: v => v ?? "—", dir: "high" },
        { label: t("cmp.opponents"),    get: r => new Set((r.Performances_Detail || []).filter(p => p.Opponent).map(p => p.Opponent)).size, fmt: v => v ?? "—", dir: "high" },
        { label: t("col.avgScore"),     get: r => r.Mean_Score,            fmt: fmt2,   dir: "high" },
        { label: t("col.median"),       get: r => r.Median_Score,          fmt: fmt2,   dir: "high" },
        { label: t("col.bestScore"),    get: r => r.Max_Score,             fmt: fmt2,   dir: "high" },
        { label: t("stat.worstScore"),  get: r => r.Min_Score,             fmt: fmt2,   dir: "high" },
        { label: t("col.winRate"),      get: r => r.Win_Rate,              fmt: fmtPct, dir: "high" },
        { label: t("col.differential"), get: r => r.Differential,          fmt: _diffFmt, dir: "high" },
      ],
    },
    country: {
      pickTitle: t("cmp.pickCountry"),
      list: () => buildCountryStats(),
      key:  "Country",
      head: r => `${flagOf(r.Country)}<span>${esc(displayName("country", r.Country))}</span>`,
      pick: r => `${flagOf(r.Country)} ${esc(displayName("country", r.Country))}`,
      metrics: [
        { label: t("col.athletes"),     get: r => r.Athletes,     fmt: v => v ?? "—", dir: "high" },
        { label: t("col.performances"), get: r => r.Performances, fmt: v => v ?? "—", dir: "high" },
        { label: t("col.tournaments"),  get: r => r.Tournaments,  fmt: v => v ?? "—", dir: "high" },
        { label: t("col.avgScore"),     get: r => r.Avg_Score,    fmt: fmt2,   dir: "high" },
        { label: t("col.bestScore"),    get: r => r.Best_Score,   fmt: fmt2,   dir: "high" },
        { label: t("col.winRate"),      get: r => r.Win_Rate,     fmt: fmtPct, dir: "high" },
        { label: t("col.medals"),       get: r => medalPoints(r._medalsList), disp: r => medalTally(r._medalsList) || "0", dir: "high" },
      ],
    },
  };
  return cfg[type];
}

function _removeCompareModal() {
  const m = document.getElementById("compare-modal");
  if (m) m.remove();
}

function openComparePicker(type, nameA) {
  const cfg = _compareConfig(type);
  if (!cfg) return;
  const rows = cfg.list()
    .filter(r => r[cfg.key] !== nameA)
    .sort((a, b) => String(a[cfg.key]).localeCompare(String(b[cfg.key])));
  _removeCompareModal();
  const overlay = document.createElement("div");
  overlay.className = "nav-modal-overlay";
  overlay.id = "compare-modal";
  overlay.innerHTML = `
    <div class="compare-modal-box" onclick="event.stopPropagation()">
      <div class="compare-modal-head">
        <span class="compare-modal-title">${cfg.pickTitle}</span>
        <button class="card-close-btn" onclick="_removeCompareModal()" title="${t("cmp.close")}">✕</button>
      </div>
      <div class="compare-modal-body">
        <input type="text" class="compare-search" id="compare-search" placeholder="${t("cmp.searchPh")}" autocomplete="off">
        <div class="compare-pick-list" id="compare-pick-list"></div>
      </div>
    </div>`;
  overlay.addEventListener("click", _removeCompareModal);
  document.body.appendChild(overlay);
  const listEl = overlay.querySelector("#compare-pick-list");
  const draw = q => {
    const ql = q.trim().toLowerCase();
    const filtered = ql
      ? rows.filter(r => cfg.pick(r).replace(/<[^>]+>/g, "").toLowerCase().includes(ql))
      : rows;
    listEl.innerHTML = filtered.length
      ? filtered.map(r => `<div class="compare-pick-item" data-name="${esc(r[cfg.key])}">${cfg.pick(r)}</div>`).join("")
      : `<p style="color:var(--text-muted);font-size:13px;padding:8px">${t("cmp.noMatch")}</p>`;
  };
  draw("");
  const searchEl = overlay.querySelector("#compare-search");
  searchEl.addEventListener("input", e => draw(e.target.value));
  listEl.addEventListener("click", e => {
    const item = e.target.closest(".compare-pick-item");
    if (item) renderComparison(type, nameA, item.dataset.name);
  });
  setTimeout(() => searchEl.focus(), 40);
}

function renderComparison(type, nameA, nameB) {
  const cfg = _compareConfig(type);
  if (!cfg) return;
  const list = cfg.list();
  const A = list.find(r => r[cfg.key] === nameA);
  const B = list.find(r => r[cfg.key] === nameB);
  if (!A || !B) return;
  // Athletes get a wider modal with a headshot above each name; a silhouette
  // shows through (via CSS background) when no photo file exists.
  const withPhotos = type === "karateka";
  const entityPhoto = withPhotos
    ? r => `<div class="compare-photo"><img src="images/athletes/${photoSlug(r.Karateka)}.jpg" alt="${esc(r.Karateka)}" loading="lazy" onerror="this.remove()"></div>`
    : () => "";
  const rowsHtml = cfg.metrics.map(m => {
    let va, vb, da, db;
    if (m.h2h) {
      // Head-to-head: each athlete's wins in matches against the other.
      va = (A.Performances_Detail || []).filter(p => p.Opponent === nameB && p.Won === true).length;
      vb = (B.Performances_Detail || []).filter(p => p.Opponent === nameA && p.Won === true).length;
      da = String(va); db = String(vb);
    } else {
      va = m.get(A); vb = m.get(B);
      da = m.disp ? m.disp(A) : m.fmt(va);
      db = m.disp ? m.disp(B) : m.fmt(vb);
    }
    let clsA = "", clsB = "";
    if (m.dir && va != null && vb != null) {
      if (va === vb) {
        clsA = clsB = " tie";                       // equal → both beige
      } else {
        const aWins = m.dir === "high" ? va > vb : va < vb;
        clsA = aWins ? " win" : "";   // loser left unstyled
        clsB = aWins ? "" : " win";
      }
    }
    return `<tr>
      <td class="compare-val${clsA}">${da}</td>
      <td class="compare-metric">${m.label}</td>
      <td class="compare-val${clsB}">${db}</td>
    </tr>`;
  }).join("");
  _removeCompareModal();
  const overlay = document.createElement("div");
  overlay.className = "nav-modal-overlay";
  overlay.id = "compare-modal";
  overlay.innerHTML = `
    <div class="compare-modal-box${withPhotos ? " compare-modal-box--athletes" : ""}" onclick="event.stopPropagation()">
      <div class="compare-modal-head">
        <span class="compare-modal-title">${t("cmp.resultTitle")}</span>
        <button class="compare-btn" id="compare-change-btn" data-cmp-type="${esc(type)}" data-cmp-name="${esc(nameA)}">${t("cmp.change")}</button>
        <button class="card-close-btn" onclick="_removeCompareModal()" title="${t("cmp.close")}">✕</button>
      </div>
      <div class="compare-modal-body">
        <table class="compare-table">
          <thead><tr>
            <th class="compare-entity">${entityPhoto(A)}<span class="ce-inner">${cfg.head(A)}</span></th>
            <th></th>
            <th class="compare-entity">${entityPhoto(B)}<span class="ce-inner">${cfg.head(B)}</span></th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <p class="compare-foot">${t("cmp.footnote")}</p>
      </div>
    </div>`;
  overlay.addEventListener("click", _removeCompareModal);
  document.body.appendChild(overlay);
  // The modal box stops click propagation, so the delegated handler below never
  // sees this button — wire it directly to reopen the picker.
  overlay.querySelector("#compare-change-btn")
    ?.addEventListener("click", () => openComparePicker(type, nameA));
}

/* A "Change" button inside the result modal re-uses .compare-btn to reopen the picker. */
document.addEventListener("click", e => {
  const b = e.target.closest(".compare-btn");
  if (b) openComparePicker(b.dataset.cmpType, b.dataset.cmpName);
});
document.addEventListener("keydown", e => { if (e.key === "Escape") _removeCompareModal(); });
