/* ====== Config ====== 
   Set one of the endpoints below to handle form leads.
   - Google Sheets Apps Script (recommended for static hosting)
   - Your own Express/MongoDB API
   - EmailJS (client-side email)
*/
const ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbwcf_1Z9Y80WryMxFSAbL-CXaXAmv9ZM-FV42rPlfUXScKcdfzbKB_NQmFLnxayA60K-Q/exec"; // e.g. "https://script.google.com/macros/s/XXXXX/exec"
const EMAILJS_ENABLED = false;  // if using EmailJS, set true & configure below

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

/* ====== Lead Form ====== */
const form = document.getElementById('lead-form');
const statusEl = document.getElementById('form-status');

function showStatus(msg, ok=true){
  statusEl.textContent = msg;
  statusEl.style.color = ok ? '#6ee7b7' : '#fca5a5';
}

async function submitToEndpoint(payload){
  if(!ENDPOINT_URL) return { ok:false, message:"Form endpoint not configured." };

  try{
    const body = new URLSearchParams(payload).toString(); // <-- urlencoded avoids preflight
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

    // spam trap
    if (form.website && form.website.value) return;

    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.email || !data.name || !data.message) {
      showStatus("Please fill name, email, and message.", false);
      return;
    }

    showStatus("Sending…");
    // Option A: POST to your endpoint
    const r = await submitToEndpoint({
      ...data,
      page: location.href,
      ts: new Date().toISOString()
    });

    if (r.ok) {
      form.reset();
      showStatus("Thanks! We’ll get back to you shortly.");
    } else {
      // Option B: fallback to mailto if endpoint not set
      showStatus("Could not send automatically. Opening email…", false);
      location.href = `mailto:hello@cloudzee.dev?subject=Lead from ${encodeURIComponent(data.name)}&body=${encodeURIComponent(data.message + "\n\nEmail: " + data.email + (data.company? "\nCompany: "+data.company:"") + (data.budget? "\nBudget: "+data.budget:""))}`;
    }
  });
}

// ====== Review Form ======
const reviewForm = document.getElementById('review-form');
const reviewStatus = document.getElementById('review-status');

function showReviewStatus(msg, ok=true){
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
      ...data,              // includes form=review
      page: location.href,
      ts: new Date().toISOString()
    });

    if (r.ok){
      reviewForm.reset();
      showReviewStatus("Thanks for your review! ✅");
    } else {
      showReviewStatus("Could not send automatically.", false);
    }
  });
}
// ====== Fetch & Render Reviews ======
async function loadReviews() {
  const list = document.getElementById('reviews-list');
  if (!list) return;

  try {
    const res = await fetch(ENDPOINT_URL); // GET request
    const reviews = await res.json();

    if (!reviews.length) {
      list.innerHTML = "<p class='muted'>No reviews yet. Be the first to share!</p>";
      return;
    }

    list.innerHTML = reviews.map(r => `
      <article class="card">
        <p class="testimonial__text">“${r.review}”</p>
        <strong>${r.name}</strong>
        ${r.company ? `<span class="muted">${r.company}</span>` : ""}
        <span class="muted">⭐ ${r.rating}/5</span>
      </article>
    `).join("");
  } catch (err) {
    list.innerHTML = "<p class='muted'>Could not load reviews.</p>";
  }
}

// Load on page start
loadReviews();

