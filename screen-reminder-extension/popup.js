// popup.js

const textInput = document.getElementById("reminderText");
const timeInput = document.getElementById("reminderTime");
const dateInput = document.getElementById("reminderDate");
const repeatToggle = document.getElementById("repeatToggle");
const repeatOptions = document.getElementById("repeatOptions");
const repeatInterval = document.getElementById("repeatInterval");
const addBtn = document.getElementById("addBtn");
const reminderList = document.getElementById("reminderList");

// Set default time to now + 5 mins and today's date
const now = new Date();
now.setMinutes(now.getMinutes() + 5);
timeInput.value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
dateInput.value = now.toISOString().split("T")[0];

repeatToggle.addEventListener("change", () => {
  repeatOptions.classList.toggle("visible", repeatToggle.checked);
});

addBtn.addEventListener("click", async () => {
  const text = textInput.value.trim();
  const time = timeInput.value;
  const date = dateInput.value;

  if (!text) return flash(textInput, "Please enter a reminder message");
  if (!time) return flash(timeInput, "Please set a time");
  if (!date) return flash(dateInput, "Please set a date");

  const [hours, minutes] = time.split(":").map(Number);
  const triggerDate = new Date(date);
  triggerDate.setHours(hours, minutes, 0, 0);

  if (triggerDate <= Date.now()) {
    return alert("Please set a future date and time.");
  }

  const reminder = {
    id: `reminder_${Date.now()}`,
    text,
    nextTrigger: triggerDate.getTime(),
    repeat: repeatToggle.checked,
    intervalMs: repeatToggle.checked ? parseInt(repeatInterval.value) * 60000 : null,
    createdAt: Date.now(),
  };

  addBtn.textContent = "Adding...";
  addBtn.disabled = true;

  await chrome.runtime.sendMessage({ type: "CREATE_REMINDER", reminder });

  textInput.value = "";
  addBtn.textContent = "✓ Added!";
  setTimeout(() => {
    addBtn.textContent = "+ Add Reminder";
    addBtn.disabled = false;
  }, 1500);

  loadReminders();
});

async function loadReminders() {
  const reminders = await chrome.runtime.sendMessage({ type: "GET_REMINDERS" });

  if (!reminders || reminders.length === 0) {
    reminderList.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🔔</div>
        No reminders yet
      </div>`;
    return;
  }

  // Sort by next trigger time
  reminders.sort((a, b) => a.nextTrigger - b.nextTrigger);

  reminderList.innerHTML = reminders
    .map((r) => {
      const d = new Date(r.nextTrigger);
      const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const dateStr = d.toLocaleDateString([], { month: "short", day: "numeric" });
      const repeatStr = r.repeat ? ` · every ${r.intervalMs / 60000}min` : "";
      return `
        <div class="reminder-item" data-id="${r.id}">
          <div class="reminder-dot"></div>
          <div class="reminder-info">
            <div class="reminder-text">${escapeHtml(r.text)}</div>
            <div class="reminder-meta">${dateStr} ${timeStr}${repeatStr}</div>
          </div>
          <button class="delete-btn" data-id="${r.id}" title="Delete">✕</button>
        </div>`;
    })
    .join("");

  // Attach delete handlers
  reminderList.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      await chrome.runtime.sendMessage({ type: "DELETE_REMINDER", id });
      loadReminders();
    });
  });
}

function flash(el, msg) {
  el.style.borderColor = "#ff4757";
  el.focus();
  setTimeout(() => (el.style.borderColor = ""), 1000);
  console.warn(msg);
}

function escapeHtml(text) {
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(text));
  return d.innerHTML;
}

// Load on open
loadReminders();
