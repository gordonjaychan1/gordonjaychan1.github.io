// Show clean addresses: /about instead of /about.html, / instead of /index.html
if (/\.html$/.test(location.pathname)) {
  const clean = location.pathname.replace(/index\.html$/, "").replace(/\.html$/, "");
  try { history.replaceState(null, "", clean + location.search + location.hash); } catch {}
}

const copyBtn = document.getElementById("copy");
if (copyBtn) copyBtn.addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  const text = document.getElementById("email").textContent.trim();
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied";
  } catch {
    const r = document.createRange();
    r.selectNodeContents(document.getElementById("email"));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    btn.textContent = "Selected, press ⌘C";
  }
  setTimeout(() => (btn.textContent = "Copy email"), 2000);
});

// Forms post to Formspree in the background and show a thank-you in place
document.querySelectorAll("form.js-formspree").forEach((form) => {
  const status = form.querySelector(".book-status");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const tpl = form.dataset.subject;
    if (tpl) data.set("_subject", tpl.replace(/\{(\w+)\}/g, (_, k) => (data.get(k) || "").toString().trim()));
    const btn = form.querySelector('button[type="submit"]');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending…";
    status.classList.remove("error");
    status.textContent = "";
    try {
      const res = await fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } });
      if (!res.ok) {
        const out = await res.json().catch(() => ({}));
        throw new Error((out.errors || []).map((x) => x.message).join(" ") || "The message didn't go through.");
      }
      const done = document.createElement("p");
      done.className = "form-done";
      done.setAttribute("role", "status");
      done.textContent = form.dataset.done;
      form.replaceWith(done);
    } catch (err) {
      status.classList.add("error");
      status.textContent = `${err.message} Please try again, or email gordonjaychan1@gmail.com.`;
      btn.disabled = false;
      btn.textContent = label;
    }
  });
});

// "Website inquiry" buttons open the contact form with the topic already picked
const topicSelect = document.getElementById("ct-topic");
const topic = new URLSearchParams(location.search).get("topic");
if (topicSelect && topic === "website") topicSelect.value = "Website inquiry";

document.querySelectorAll(".ba").forEach((ba) => {
  const range = ba.querySelector(".ba-range");
  const set = () => ba.style.setProperty("--pos", range.value + "%");
  range.addEventListener("input", set);
  set();
});

// Web work: flip through projects like a book (falls back to all projects stacked without JS)
const book = document.querySelector(".folio");
if (book) {
  book.classList.add("js");
  const tabs = [...book.querySelectorAll(".folio-tab")];
  const pages = [...book.querySelectorAll(".page")];
  const ids = pages.map((p) => p.id);
  const legacy = { "usami-dojo": "usami" };
  let current = -1;
  const show = (id, { focusTab = false, scroll = false, setHash = true } = {}) => {
    const i = ids.indexOf(legacy[id] || id);
    if (i < 0) return;
    const dir = current < 0 ? "" : i > current || (current === ids.length - 1 && i === 0) ? "flip-next" : "flip-prev";
    pages.forEach((p, k) => {
      p.hidden = k !== i;
      p.classList.remove("flip-next", "flip-prev");
    });
    tabs.forEach((t, k) => {
      t.setAttribute("aria-selected", k === i ? "true" : "false");
      t.tabIndex = k === i ? 0 : -1;
    });
    if (dir && current !== i) { void pages[i].offsetWidth; pages[i].classList.add(dir); }
    current = i;
    if (focusTab) tabs[i].focus();
    if (window.innerWidth <= 860) tabs[i].scrollIntoView({ block: "nearest", inline: "nearest" });
    if (scroll && pages[i].getBoundingClientRect().top < 70) pages[i].scrollIntoView({ block: "start" });
    if (setHash) { try { history.replaceState(null, "", "#" + ids[i]); } catch {} }
  };
  const fromHash = () => location.hash.slice(1);
  show(ids.includes(fromHash()) || legacy[fromHash()] ? fromHash() : ids[0], { setHash: false });
  if (ids.includes(fromHash()) || legacy[fromHash()]) book.scrollIntoView({ block: "start" });
  tabs.forEach((t) => t.addEventListener("click", (e) => { e.preventDefault(); show(t.getAttribute("href").slice(1)); }));
  book.querySelectorAll("[data-go]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); show(a.dataset.go, { scroll: true }); }));
  addEventListener("hashchange", () => show(fromHash(), { scroll: true }));
  // arrow keys: inside the tab list (standard tabs behavior), or anywhere on the page when not typing or dragging a slider
  addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const inTabs = book.querySelector(".folio-tabs").contains(document.activeElement);
    const el = document.activeElement;
    if (!inTabs && el && (el.matches("input, textarea, select, [contenteditable]") )) return;
    const back = ["ArrowLeft", inTabs && "ArrowUp"].includes(e.key), fwd = ["ArrowRight", inTabs && "ArrowDown"].includes(e.key);
    if (!back && !fwd) return;
    e.preventDefault();
    show(ids[(current + (fwd ? 1 : ids.length - 1)) % ids.length], { focusTab: inTabs });
  });
  // fetch the hidden pages' screenshots in the background so flipping is instant
  addEventListener("load", () => book.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = "eager")));
}
