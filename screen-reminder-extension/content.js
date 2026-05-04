// content.js — Injected into every webpage

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOW_REMINDER") {
    showReminderOverlay(message.reminder);
  }
});

function showReminderOverlay(reminder) {
  // Avoid duplicates
  if (document.getElementById("screen-reminder-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "screen-reminder-overlay";

  overlay.innerHTML = `
    <div class="sr-backdrop"></div>
    <div class="sr-card">
      <div class="sr-glow"></div>
      <div class="sr-icon">⏰</div>
      <div class="sr-label">REMINDER</div>
      <div class="sr-text">${escapeHtml(reminder.text)}</div>
      <div class="sr-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      <button class="sr-dismiss" id="sr-dismiss-btn">Got it</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add("sr-visible");
  });

  document.getElementById("sr-dismiss-btn").addEventListener("click", () => {
    overlay.classList.remove("sr-visible");
    setTimeout(() => overlay.remove(), 400);
  });

  // Auto dismiss after 30 seconds
  setTimeout(() => {
    if (document.getElementById("screen-reminder-overlay")) {
      overlay.classList.remove("sr-visible");
      setTimeout(() => overlay.remove(), 400);
    }
  }, 30000);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}
