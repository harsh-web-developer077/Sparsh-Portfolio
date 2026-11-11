
/* ==========================================
   SPARSH PORTFOLIO — ADMIN DASHBOARD
   ========================================== */

const API_BASE = (
  window.SP_API_BASE_URL ||
  "https://sparsh-portfolio-backend-bepz.onrender.com/api"
).replace(/\/+$/, "");

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

const STATUSES = [
  "Pending",
  "Under Review",
  "In Discussion",
  "Accepted",
  "Completed",
  "Cancelled"
];

let csrfToken = null;
let currentSection = "overview";
let noticeTimer;

// ==========================================
// HELPERS
// ==========================================

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function showNotice(message, type = "success") {
  const notice = $("#adminNotice");

  if (!notice) return;

  clearTimeout(noticeTimer);

  notice.textContent = message;
  notice.className = `admin-notice show ${type}`;

  noticeTimer = setTimeout(() => {
    notice.className = "admin-notice";
  }, 4500);
}

function setLoading(element, message = "Loading...") {
  if (element) {
    element.innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
  }
}

// ==========================================
// API + CSRF
// ==========================================

async function getCsrfToken() {
  const response = await fetch(`${API_BASE}/auth/csrf`, {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.csrfToken) {
    throw new Error(data.message || "Unable to initialize security token.");
  }

  csrfToken = data.csrfToken;
  return csrfToken;
}

async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = { ...(options.headers || {}) };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers["X-CSRF-Token"] = await getCsrfToken();
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      method,
      headers,
      credentials: "include"
    });
  } catch {
    throw new Error("Cannot connect to the backend. Check your connection.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || "Something went wrong."
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

// ==========================================
// AUTHENTICATION CHECK
// ==========================================

async function checkAdminAccess() {
  try {
    const result = await apiRequest("/auth/me");
    const user = result.user || result;

    if (user.role !== "admin") {
      window.location.replace("/dashboard.html");
      return false;
    }

    $("#adminEmail").textContent = user.email || "Admin account";

    return true;
  } catch (error) {
    if (error.status === 403) {
      window.location.replace("/dashboard.html");
    } else {
      window.location.replace("/signin.html?next=admin");
    }

    return false;
  }
}

// ==========================================
// NAVIGATION
// ==========================================

const sectionDetails = {
  overview: {
    title: "Overview",
    subtitle: "Monitor your portfolio business from one place."
  },
  users: {
    title: "Users",
    subtitle: "View registered customer accounts."
  },
  bookings: {
    title: "Bookings",
    subtitle: "Review enquiries and manage service requests."
  },
  messages: {
    title: "Messages",
    subtitle: "Read messages received from your customers."
  },
  offers: {
    title: "Offers",
    subtitle: "Create and manage promotional offers."
  }
};

async function openSection(section) {
  if (!sectionDetails[section]) return;

  currentSection = section;

  $$(".admin-section").forEach(element => {
    element.classList.toggle(
      "active",
      element.id === `section-${section}`
    );
  });

  $$(".admin-nav-link").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.section === section
    );
  });

  $("#pageTitle").textContent = sectionDetails[section].title;
  $("#pageSubtitle").textContent = sectionDetails[section].subtitle;

  $("#adminSidebar").classList.remove("open");

  try {
    if (section === "overview") await loadOverview();
    if (section === "users") await loadUsers();
    if (section === "bookings") await loadBookings();
    if (section === "messages") await loadMessages();
    if (section === "offers") await loadOffers();
  } catch (error) {
    showNotice(error.message, "error");
  }
}

$$("[data-section]").forEach(button => {
  button.addEventListener("click", () => {
    openSection(button.dataset.section);
  });
});

$("#mobileMenu")?.addEventListener("click", () => {
  $("#adminSidebar").classList.toggle("open");
});

// ==========================================
// OVERVIEW
// ==========================================

async function loadOverview() {
  const summary = $("#bookingStatusSummary");

  setLoading(summary, "Loading booking statistics...");

  const result = await apiRequest("/admin/overview");
  const overview = result.overview || {};

  $("#totalUsers").textContent = overview.totalUsers ?? 0;
  $("#totalBookings").textContent = overview.totalBookings ?? 0;
  $("#totalMessages").textContent = overview.totalMessages ?? 0;
  $("#activeOffers").textContent = overview.activeOffers ?? 0;

  const statuses = overview.bookingStatuses || [];

  if (!statuses.length) {
    summary.innerHTML = '<p class="muted">No booking data available yet.</p>';
    return;
  }

  summary.innerHTML = statuses.map(item => `
    <div class="status-item">
      <span>${escapeHtml(item._id || "Other")}</span>
      <strong>${Number(item.count) || 0}</strong>
    </div>
  `).join("");
}

// ==========================================
// USERS
// ==========================================

async function loadUsers() {
  const table = $("#usersTable");

  setLoading(table, "Loading users...");

  const result = await apiRequest("/admin/users");
  const users = result.users || [];

  $("#usersCount").textContent = `${users.length} users`;

  if (!users.length) {
    table.innerHTML = '<tr><td colspan="5">No users found.</td></tr>';
    return;
  }

  table.innerHTML = users.map(user => `
    <tr>
      <td><strong>${escapeHtml(user.name)}</strong></td>
      <td>${escapeHtml(user.email)}</td>
      <td>${escapeHtml(user.phone || "—")}</td>
      <td><span class="role-tag">${escapeHtml(user.role || "customer")}</span></td>
      <td>${formatDate(user.createdAt)}</td>
    </tr>
  `).join("");
}

// ==========================================
// BOOKINGS
// ==========================================

async function loadBookings() {
  const table = $("#bookingsTable");

  setLoading(table, "Loading bookings...");

  const filter = $("#bookingFilter").value;

  const query = filter
    ? `?status=${encodeURIComponent(filter)}`
    : "";

  const result = await apiRequest(`/admin/bookings${query}`);
  const bookings = result.bookings || [];

  if (!bookings.length) {
    table.innerHTML = '<tr><td colspan="5">No bookings found.</td></tr>';
    return;
  }

  table.innerHTML = bookings.map(booking => {
    const status = booking.status || "Pending";
    const statusClass = status.toLowerCase().replace(/\s+/g, "-");

    return `
      <tr>
        <td>
          <strong>${escapeHtml(booking.name)}</strong>
          <small>${escapeHtml(booking.email)}</small>
        </td>

        <td>
          ${escapeHtml(booking.service)}
          <small>${formatDate(booking.createdAt)}</small>
        </td>

        <td>${escapeHtml(booking.reference)}</td>

        <td>
          <span class="status-tag ${escapeHtml(statusClass)}">
            ${escapeHtml(status)}
          </span>
        </td>

        <td>
          <select class="admin-select booking-status-select"
            data-booking-id="${escapeHtml(booking._id)}">
            ${STATUSES.map(option => `
              <option value="${escapeHtml(option)}"
                ${option === status ? "selected" : ""}>
                ${escapeHtml(option)}
              </option>
            `).join("")}
          </select>
        </td>
      </tr>
    `;
  }).join("");
}

$("#bookingFilter")?.addEventListener("change", loadBookings);

$("#bookingsTable")?.addEventListener("change", async event => {
  const select = event.target.closest(".booking-status-select");

  if (!select) return;

  const id = select.dataset.bookingId;
  const status = select.value;

  select.disabled = true;

  try {
    await apiRequest(`/admin/bookings/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });

    showNotice("Booking status updated successfully.");
    await loadBookings();
    await loadOverview();
  } catch (error) {
    showNotice(error.message, "error");
  } finally {
    select.disabled = false;
  }
});

// ==========================================
// CUSTOMER MESSAGES
// ==========================================

async function loadMessages() {
  const container = $("#messagesList");

  setLoading(container, "Loading messages...");

  const result = await apiRequest("/admin/messages");
  const messages = result.messages || [];

  $("#messagesCount").textContent = `${messages.length} messages`;

  if (!messages.length) {
    container.innerHTML = '<p class="muted">No customer messages found.</p>';
    return;
  }

  container.innerHTML = messages.map(message => `
    <article class="message-card">
      <div class="message-top">
        <div>
          <h3>${escapeHtml(message.subject || "General enquiry")}</h3>
          <div class="message-meta">
            ${escapeHtml(message.name)} ·
            ${escapeHtml(message.email)} ·
            ${formatDate(message.createdAt)}
          </div>
        </div>

        <button class="message-delete"
          data-delete-message="${escapeHtml(message._id)}">
          Delete
        </button>
      </div>

      <p>${escapeHtml(message.message)}</p>

      ${message.phone ? `
        <div class="message-meta">Phone: ${escapeHtml(message.phone)}</div>
      ` : ""}
    </article>
  `).join("");
}

$("#messagesList")?.addEventListener("click", async event => {
  const button = event.target.closest("[data-delete-message]");

  if (!button) return;

  if (!confirm("Are you sure you want to delete this message?")) {
    return;
  }

  button.disabled = true;

  try {
    await apiRequest(
      `/admin/messages/${encodeURIComponent(button.dataset.deleteMessage)}`,
      { method: "DELETE" }
    );

    showNotice("Message deleted.");
    await loadMessages();
    await loadOverview();
  } catch (error) {
    showNotice(error.message, "error");
    button.disabled = false;
  }
});

// ==========================================
// OFFERS
// ==========================================

async function loadOffers() {
  const container = $("#offersList");

  setLoading(container, "Loading offers...");

  const result = await apiRequest("/admin/offers");
  const offers = result.offers || [];

  if (!offers.length) {
    container.innerHTML = '<p class="muted">No offers created yet.</p>';
    return;
  }

  container.innerHTML = offers.map(offer => `
    <article class="offer-card">
      <div class="offer-top">
        <div>
          <h3>${escapeHtml(offer.title)}</h3>
          <div class="message-meta">
            Created ${formatDate(offer.createdAt)}
          </div>
        </div>

        <span class="status-tag ${offer.active ? "accepted" : "cancelled"}">
          ${offer.active ? "Active" : "Inactive"}
        </span>
      </div>

      <div class="offer-discount">
        ${Number(offer.discountPercentage) || 0}% OFF
      </div>

      <p>${escapeHtml(offer.description || "No description provided.")}</p>

      <p class="message-meta">
        Expires: ${formatDate(offer.expiresAt)}
      </p>

      <div class="offer-actions">
        <button class="offer-action"
          data-toggle-offer="${escapeHtml(offer._id)}"
          data-active="${offer.active ? "true" : "false"}">
          ${offer.active ? "Deactivate" : "Activate"}
        </button>

        <button class="offer-action"
          data-edit-offer="${escapeHtml(offer._id)}">
          Edit
        </button>

        <button class="message-delete"
          data-delete-offer="${escapeHtml(offer._id)}">
          Delete
        </button>
      </div>
    </article>
  `).join("");
}

$("#offerForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const button = $('button[type="submit"]', form);

  const formData = new FormData(form);

  const title = String(formData.get("title") || "").trim();
  const discountPercentage = Number(formData.get("discountPercentage"));
  const description = String(formData.get("description") || "");
  const expiresAt = String(formData.get("expiresAt") || "");

  if (!title || !Number.isFinite(discountPercentage) ||
      discountPercentage < 0 || discountPercentage > 100) {
    showNotice("Please enter a valid title and discount.", "error");
    return;
  }

  const payload = {
    title,
    description,
    discountPercentage,
    active: formData.get("active") === "on",
    expiresAt: expiresAt || null
  };

  button.disabled = true;

  try {
    await apiRequest("/admin/offers", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    form.reset();
    form.querySelector('[name="active"]').checked = true;

    showNotice("Offer created successfully.");
    await loadOffers();
    await loadOverview();
  } catch (error) {
    showNotice(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

$("#offersList")?.addEventListener("click", async event => {
  const toggleButton = event.target.closest("[data-toggle-offer]");
  const editButton = event.target.closest("[data-edit-offer]");
  const deleteButton = event.target.closest("[data-delete-offer]");

  if (toggleButton) {
    const id = toggleButton.dataset.toggleOffer;
    const currentlyActive = toggleButton.dataset.active === "true";

    toggleButton.disabled = true;

    try {
      await apiRequest(`/admin/offers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !currentlyActive })
      });

      showNotice("Offer status updated.");
      await loadOffers();
      await loadOverview();
    } catch (error) {
      showNotice(error.message, "error");
      toggleButton.disabled = false;
    }

    return;
  }

  if (editButton) {
    const id = editButton.dataset.editOffer;

    const title = prompt("Enter the new offer title:");

    if (title === null) return;

    if (!title.trim()) {
      showNotice("Offer title cannot be empty.", "error");
      return;
    }

    const description = prompt("Enter the offer description:");

    if (description === null) return;

    const discountInput = prompt("Enter discount percentage (0–100):");

    if (discountInput === null) return;

    const discountPercentage = Number(discountInput);

    if (!Number.isFinite(discountPercentage) ||
        discountPercentage < 0 || discountPercentage > 100) {
      showNotice("Enter a valid discount percentage.", "error");
      return;
    }

    editButton.disabled = true;

    try {
      await apiRequest(`/admin/offers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description,
          discountPercentage
        })
      });

      showNotice("Offer updated successfully.");
      await loadOffers();
    } catch (error) {
      showNotice(error.message, "error");
      editButton.disabled = false;
    }

    return;
  }

  if (deleteButton) {
    if (!confirm("Are you sure you want to permanently delete this offer?")) {
      return;
    }

    deleteButton.disabled = true;

    try {
      await apiRequest(
        `/admin/offers/${encodeURIComponent(deleteButton.dataset.deleteOffer)}`,
        { method: "DELETE" }
      );

      showNotice("Offer deleted.");
      await loadOffers();
      await loadOverview();
    } catch (error) {
      showNotice(error.message, "error");
      deleteButton.disabled = false;
    }
  }
});

// ==========================================
// REFRESH
// ==========================================

$("#refreshButton")?.addEventListener("click", async () => {
  const button = $("#refreshButton");

  button.disabled = true;
  button.textContent = "Refreshing...";

  try {
    await openSection(currentSection);
    showNotice("Dashboard refreshed.");
  } catch (error) {
    showNotice(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "↻ Refresh";
  }
});

// ==========================================
// LOGOUT
// ==========================================

$("#logoutButton")?.addEventListener("click", async () => {
  const button = $("#logoutButton");

  button.disabled = true;
  button.textContent = "Signing out...";

  try {
    await apiRequest("/auth/logout", {
      method: "POST",
      body: JSON.stringify({})
    });
  } catch (error) {
    console.error("Logout error:", error.message);
  }

  window.location.replace("/signin.html");
});

// ==========================================
// START DASHBOARD
// ==========================================

async function startAdminDashboard() {
  $("#currentYear").textContent = new Date().getFullYear();

  const allowed = await checkAdminAccess();

  if (!allowed) return;

  await openSection("overview");
}

startAdminDashboard();
