
/* ==========================================
   SPARSH PORTFOLIO — FRONTEND API INTEGRATION
   ========================================== */

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

const API_BASE = (
  window.SP_API_BASE_URL ||
  "https://sparsh-portfolio-backend-bepz.onrender.com/api"
).replace(/\/+$/, "");

let csrfToken = null;

// Navigation
function toggleMenu() {
  const nav = $("#navlinks");
  if (nav) nav.classList.toggle("open");
}

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-menu-toggle]")) toggleMenu();

  if (event.target.closest("#navlinks a")) {
    $("#navlinks")?.classList.remove("open");
  }
});

$$("[data-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

// Notices
function showNotice(element, message, type = "success") {
  if (!element) return;

  element.textContent = message;
  element.className = `notice show ${type}`;
}

// Safe HTML output
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// Obtain a fresh CSRF token before protected requests
async function getCsrfToken() {
  const response = await fetch(`${API_BASE}/auth/csrf`, {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.csrfToken) {
    throw new Error(
      data.message || "Could not initialize security token."
    );
  }

  csrfToken = data.csrfToken;
  return csrfToken;
}

// Common API function
async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  const headers = {
    ...(options.headers || {})
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const token = await getCsrfToken();
    headers["X-CSRF-Token"] = token;
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      method,
      headers,
      credentials: "include"
    });
  } catch (error) {
    throw new Error(
      "Cannot connect to the backend. Check the backend URL and CORS settings."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || "Request failed. Please try again."
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

// ==========================================
// CONTACT FORM — EXISTING EMAIL + WHATSAPP
// ==========================================

const contactForm = $("#contactForm");

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const notice = $("#contactNotice");
    const data = Object.fromEntries(
      new FormData(contactForm).entries()
    );

    if (!data.name || !data.email || !data.message) {
      showNotice(
        notice,
        "Please complete your name, email and message.",
        "error"
      );
      return;
    }

    const button = $('button[type="submit"]', contactForm);
    const originalText = button?.textContent;

    if (button) {
      button.disabled = true;
      button.textContent = "Sending...";
    }

    try {
      const response = await fetch(
        "https://formsubmit.co/ajax/harshjaju07@gmail.com",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            _subject: `Sparsh Portfolio enquiry — ${data.service || "General"}`,
            ...data
          })
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error("Email service could not confirm delivery.");
      }

      showNotice(
        notice,
        "Your enquiry was accepted. WhatsApp will open so you can also send your details.",
        "success"
      );

      const message =
        `Hello Sparsh Portfolio,%0A` +
        `Name: ${encodeURIComponent(data.name)}%0A` +
        `Email: ${encodeURIComponent(data.email)}%0A` +
        `Phone: ${encodeURIComponent(data.phone || "Not provided")}%0A` +
        `Service: ${encodeURIComponent(data.service || "General")}%0A` +
        `Message: ${encodeURIComponent(data.message)}`;

      window.open(
        `https://wa.me/918302491321?text=${message}`,
        "_blank",
        "noopener"
      );

      contactForm.reset();
    } catch (error) {
      showNotice(
        notice,
        `${error.message} You can also contact us on WhatsApp: +91 8302491321.`,
        "error"
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText || "Send enquiry →";
      }
    }
  });
}

// ==========================================
// SIGNUP / SIGNIN / FORGOT PASSWORD
// ==========================================

const authForm = $("[data-auth-form]");

if (authForm) {
  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const notice = $("#formNotice");
    const button = $('button[type="submit"]', authForm);
    const originalText = button?.textContent;

    const formData = Object.fromEntries(
      new FormData(authForm).entries()
    );

    const action = authForm.dataset.authForm;

    if (
      action === "signup" &&
      formData.password !== formData.confirmPassword
    ) {
      showNotice(notice, "Passwords do not match.", "error");
      return;
    }

    const endpoints = {
      signup: "/auth/register",
      signin: "/auth/login",
      forgot: "/auth/forgot-password"
    };

    if (!endpoints[action]) {
      showNotice(notice, "Invalid form action.", "error");
      return;
    }

    let payload;

    if (action === "signup") {
      payload = {
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone || "",
        password: formData.password
      };
    } else if (action === "signin") {
      payload = {
        email: formData.email,
        password: formData.password
      };
    } else {
      payload = {
        email: formData.email
      };
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Please wait...";
    }

    try {
      const result = await apiRequest(endpoints[action], {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showNotice(
        notice,
        result.message || "Request completed successfully.",
        "success"
      );

      if (action === "signin") {
        const requestedPage = new URLSearchParams(
          window.location.search
        ).get("next");

        const safePage =
          requestedPage &&
          /^[a-zA-Z0-9_-]+\.html$/.test(requestedPage)
            ? requestedPage
            : "dashboard.html";

        setTimeout(() => {
          window.location.href = safePage;
        }, 700);
      }

      if (action === "signup") {
        setTimeout(() => {
          window.location.href = "signin.html";
        }, 900);
      }
    } catch (error) {
      showNotice(notice, error.message, "error");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText || "Submit";
      }
    }
  });
}

// ==========================================
// BOOKING FORM
// ==========================================

const bookingForm = $("#bookingForm");

if (bookingForm) {
  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const notice = $("#bookingNotice");
    const button = $('button[type="submit"]', bookingForm);
    const originalText = button?.textContent;

    const formData = Object.fromEntries(
      new FormData(bookingForm).entries()
    );

    const payload = {
      name: formData.customerName,
      email: formData.email,
      phone: formData.phone,
      service: formData.service,
      budget: formData.budget,
      timeline: formData.timeline,
      description: formData.description
    };

    if (button) {
      button.disabled = true;
      button.textContent = "Submitting...";
    }

    try {
      const result = await apiRequest("/bookings", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const booking = result.booking || result;

      showNotice(
        notice,
        `Booking submitted successfully. Reference: ${booking.reference || result.reference || "Created"}`,
        "success"
      );

      bookingForm.reset();
    } catch (error) {
      if (error.status === 401) {
        showNotice(
          notice,
          "Please sign in before submitting a booking.",
          "error"
        );

        setTimeout(() => {
          window.location.href = "signin.html?next=booking.html";
        }, 1200);
      } else {
        showNotice(notice, error.message, "error");
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText || "Submit booking request →";
      }
    }
  });
}

// ==========================================
// CUSTOMER DASHBOARD
// ==========================================

const dashboard = $("#dashboardContent");

if (dashboard) {
  async function loadDashboard() {
    try {
      const authResult = await apiRequest("/auth/me");

      const user = authResult.user || authResult;

      dashboard.innerHTML = `
        <h2>Welcome, ${escapeHtml(user.name || "Customer")}</h2>
        <p class="muted">
          ${escapeHtml(user.email || "")}
        </p>
        <p class="muted">Your account is connected.</p>
      `;

      const bookingResult = await apiRequest("/bookings");

      const bookings = Array.isArray(bookingResult)
        ? bookingResult
        : bookingResult.bookings || [];

      const list = $("#bookingList");

      if (!list) return;

      if (!bookings.length) {
        list.innerHTML =
          '<p class="muted">No bookings yet.</p>';
        return;
      }

      list.innerHTML = bookings.map((booking) => `
        <article class="card">
          <h3>${escapeHtml(booking.service || "Service request")}</h3>
          <p>
            Reference:
            ${escapeHtml(booking.reference || "—")}
          </p>
          <p>
            Status:
            ${escapeHtml(booking.status || "Pending")}
          </p>
          <p>
            Timeline:
            ${escapeHtml(booking.timeline || "Not specified")}
          </p>
        </article>
      `).join("");
    } catch (error) {
      dashboard.innerHTML = `
        <p class="muted">
          ${error.status === 401
            ? "Please sign in to access your dashboard."
            : escapeHtml(error.message)}
        </p>
        <a class="btn btn-primary" href="signin.html">
          Sign in
        </a>
      `;

      const list = $("#bookingList");

      if (list) {
        list.innerHTML = "";
      }
    }
  }

  loadDashboard();
}

// ==========================================
// LOGOUT
// ==========================================

$$("[data-logout]").forEach((button) => {
  button.addEventListener("click", async () => {
    button.disabled = true;

    try {
      await apiRequest("/auth/logout", {
        method: "POST",
        body: JSON.stringify({})
      });
    } catch (error) {
      console.error("Logout error:", error.message);
    }

    window.location.href = "index.html";
  });
});
