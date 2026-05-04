// background.js — Service Worker

// Listen for alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  const data = await chrome.storage.local.get("reminders");
  const reminders = data.reminders || [];

  const reminder = reminders.find((r) => r.id === alarm.name);
  if (!reminder) return;

  // Send desktop notification
chrome.notifications.create(reminder.id, {
  type: "basic",
  iconUrl: chrome.runtime.getURL("icons/icon128.png"), // ✅ FIXED
  title: "⏰ Screen Reminder",
  message: reminder.text,
  priority: 2,
  requireInteraction: true,
}, (id) => {
  if (chrome.runtime.lastError) {
    console.error("Notification error:", chrome.runtime.lastError.message);
  }
});

  // Send message to all active tabs to show overlay
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "SHOW_REMINDER",
        reminder,
      });
    } catch (e) {
      // Tab may not have content script
    }
  }

  // If reminder is not repeating, remove it
  if (!reminder.repeat) {
    const updated = reminders.filter((r) => r.id !== reminder.id);
    await chrome.storage.local.set({ reminders: updated });
  } else {
    // Update next trigger info
    const updated = reminders.map((r) =>
      r.id === reminder.id
        ? { ...r, nextTrigger: Date.now() + reminder.intervalMs }
        : r
    );
    await chrome.storage.local.set({ reminders: updated });
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CREATE_REMINDER") {
    createReminder(message.reminder).then(sendResponse);
    return true;
  }
  if (message.type === "DELETE_REMINDER") {
    deleteReminder(message.id).then(sendResponse);
    return true;
  }
  if (message.type === "GET_REMINDERS") {
    chrome.storage.local.get("reminders").then((data) => {
      sendResponse(data.reminders || []);
    });
    return true;
  }
});

async function createReminder(reminder) {
  const data = await chrome.storage.local.get("reminders");
  const reminders = data.reminders || [];

  reminders.push(reminder);
  await chrome.storage.local.set({ reminders });

  // Schedule alarm
  if (reminder.repeat) {
    chrome.alarms.create(reminder.id, {
      when: reminder.nextTrigger,
      periodInMinutes: reminder.intervalMs / 60000,
    });
  } else {
    chrome.alarms.create(reminder.id, {
      when: reminder.nextTrigger,
    });
  }

  return { success: true };
}

async function deleteReminder(id) {
  const data = await chrome.storage.local.get("reminders");
  const reminders = (data.reminders || []).filter((r) => r.id !== id);
  await chrome.storage.local.set({ reminders });
  await chrome.alarms.clear(id);
  return { success: true };
}
