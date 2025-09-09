/* ====== Config ====== 
   Google Sheets Apps Script (Web App) URL MUST be the /exec URL
*/
const ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbwcf_1Z9Y80WryMxFSAbL-CXaXAmv9ZM-FV42rPlfUXScKcdfzbKB_NQmFLnxayA60K-Q/exec";
const EMAILJS_ENABLED = false;

/* ====== Nav Toggle (mobile) ====== */
const toggleBtn = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true' || false;
    toggleBtn.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('show');
  });
}

/* ====== Reveal on Scroll ====== */
const observer = new IntersectionObserver((entries)=> {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in-view'); });
}, { threshold: 0.16 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

/* ====== Footer year ====== */
document.getElementById('year').textContent = new Date().getFullYear();

/* ====== Helpers ====== */
function qs(id){ return document.getElementById(id); }

/* ====== Lead Form ====== */
const form = qs('lead-form');
const statusEl = qs('form-status');

function showStatus(msg, ok=true){
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.color = ok ? '#6ee7b7' : '#fca5a5';
}

async function submitToEndpoint(payload){
  if(!ENDPOINT_URL) return { ok:false, message:"Form endpoint not configured." };
  try{
    const body = new URLSearchParams(payload).toString(); // urlencoded -> avoids CORS preflight
    const res = await fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!res.ok) throw new Error(await res.text());
    return { ok:true };
  }catch(err){
    return { ok:false, message: err.message || 'Network error' };
  }
}

if (form) {
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (form.website && form.website.value) return; // spam trap

    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.email || !data.name || !data.message) {
      showStatus("Please fill name, email, and message.", false);
      return;
    }

    showStatus("Sending…");
    const r = await submitToEndpoint({
      ...data,
      form: "lead",
      page: location.href,
      ts: new Date().toISOString()
    });

    if (r.ok) { form.reset(); showStatus("Thanks! We’ll get back to you shortly."); }
    else {
      showStatus("Could not send automatically. Opening email…", false);
      location.href = `mailto:hello@cloudzee.dev?subject=Lead from ${encodeURIComponent(data.name)}&body=${encodeURIComponent(data.message + "\n\nEmail: " + data.email + (data.company? "\nCompany: "+data.company:"") + (data.budget? "\nBudget: "+data.budget:""))}`;
    }
  });
}

/* ====== Review Form ====== */
const reviewForm   = qs('review-form');
const reviewStatus = qs('review-status');

function showReviewStatus(msg, ok=true){
  if (!reviewStatus) return;
  reviewStatus.textContent = msg;
  reviewStatus.style.color = ok ? '#6ee7b7' : '#fca5a5';
}

if (reviewForm) {
  reviewForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (reviewForm.website && reviewForm.website.value) return; // honeypot

    const data = Object.fromEntries(new FormData(reviewForm).entries());
    if (!data.name || !data.email || !data.rating || !data.review) {
      showReviewStatus("Please fill name, email, rating and review.", false);
      return;
    }

    showReviewStatus("Sending…");
    const r = await submitToEndpoint({
      ...data,
      form: "review",            // tell Apps Script which sheet
      page: location.href,
      ts: new Date().toISOString()
    });

    if (r.ok){
      reviewForm.reset();
      showReviewStatus("Thanks for your review! ✅");
      loadReviews();             // refresh list immediately
    } else {
      showReviewStatus("Could not send automatically.", false);
    }
  });
}

/* ====== Fetch & Render Reviews (JSONP to bypass CORS) ====== */
function jsonp(url, cbName) {
  return new Promise((resolve, reject) => {
    window[cbName] = (data) => { resolve(data); delete window[cbName]; s.remove(); };
    const s = document.createElement('script');
    s.src = `${url}?callback=${cbName}&_=${Date.now()}`; // cache buster
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

async function loadReviews() {
  const list = qs('reviews-list');
  if (!list) return;
  try {
    const reviews = await jsonp(ENDPOINT_URL, 'reviewsCallback');
    if (!reviews || !reviews.length) {
      list.innerHTML = "<p class='muted'>No reviews yet. Be the first to share!</p>";
      return;
    }
    // very light sanitization
    const esc = s => String(s).replace(/</g,'&lt;');
    list.innerHTML = reviews.map(r => `
      <article class="card">
        <p class="testimonial__text">“${esc(r.review)}”</p>
        <strong>${esc(r.name)}</strong>
        ${r.company ? `<span class="muted">${esc(r.company)}</span>` : ""}
        <span class="muted">⭐ ${esc(r.rating)}/5</span>
      </article>
    `).join("");
  } catch {
    qs('reviews-list').innerHTML = "<p class='muted'>Could not load reviews.</p>";
  }
}
loadReviews();
