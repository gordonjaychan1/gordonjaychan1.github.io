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
