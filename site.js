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

// Home page: "Send me a message" opens the contact form in a pop-up (falls back to the Contact page)
const msgBtn = document.getElementById("open-msg");
const msgDialog = document.getElementById("msg-dialog");
if (msgBtn && msgDialog && typeof msgDialog.showModal === "function") {
  msgBtn.addEventListener("click", (e) => {
    e.preventDefault();
    msgDialog.showModal();
  });
  msgDialog.querySelector(".msg-close").addEventListener("click", () => msgDialog.close());
  msgDialog.addEventListener("click", (e) => {
    if (e.target === msgDialog) msgDialog.close();  // click on the dimmed background
  });
}

// Home page: hand-drawn arrows from "learn more about:" to each card, recomputed on resize
const learnWrap = document.querySelector(".learn-wrap");
if (learnWrap) {
  const svg = learnWrap.querySelector(".learn-arrows");
  const label = learnWrap.querySelector(".learn-label");
  let drawn = false;
  const draw = () => {
    const w = learnWrap.getBoundingClientRect();
    const l = label.getBoundingClientRect();
    let cards = [...learnWrap.querySelectorAll(".hat")].map((c) => c.getBoundingClientRect());
    if (cards.length > 1 && cards[1].top > cards[0].bottom - 1) cards = cards.slice(0, 1); // stacked on phones
    svg.setAttribute("viewBox", `0 0 ${w.width} ${w.height}`);
    const sx = l.right - w.left + 8, sy = l.top - w.top + l.height * 0.6;
    svg.innerHTML = cards.map((c, i) => {
      const ex = c.left - w.left + c.width / 2 + (i - 1) * 6;
      const ey = c.top - w.top - 7;
      const cx = ex + (i === 0 ? -10 : 8), cy = sy + (i === 0 ? 6 : -4);   // slight wobble so it looks hand-drawn
      return `<path d="M${sx + i * 4} ${sy + i * 2} Q${cx} ${cy} ${ex} ${ey}"/><path d="M${ex - 6} ${ey - 9} L${ex} ${ey} L${ex + 6} ${ey - 9}"/>`;
    }).join("");
    if (!drawn && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      svg.querySelectorAll("path").forEach((p, k) => {
        p.style.setProperty("--len", p.getTotalLength());
        p.style.animationDelay = `${0.3 + Math.floor(k / 2) * 0.25 + (k % 2) * 0.55}s`;
        p.style.animationDuration = k % 2 ? "0.15s" : "0.55s";
        p.classList.add("draw-in");
      });
    }
    drawn = true;
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(draw);
  let t;
  addEventListener("resize", () => { clearTimeout(t); t = setTimeout(draw, 80); });
}
