function updateTotals() {
  const rows = document.querySelectorAll("tbody tr");
  rows.forEach(row => {
    const startInput = row.querySelector(".start");
    const endInput = row.querySelector(".end");
    const totalSpan = row.querySelector(".total");

    const start = parseFloat(startInput.value);
    const end = parseFloat(endInput.value);

    if (!isNaN(start) && !isNaN(end)) {
      const total = end - start;
      totalSpan.textContent = total >= 0 ? total.toFixed(2) : "0.00";
    } else {
      totalSpan.textContent = "0";
    }
  });
}

// 🔁 Auto-load previous "end" readings as today's "start"
function loadPreviousReadings() {
  const rows = document.querySelectorAll("tbody tr");
  rows.forEach((row, index) => {
    const prevValue = localStorage.getItem(`equip-${index}-prev`);
    if (prevValue !== null) {
      const startInput = row.querySelector(".start");
      startInput.value = prevValue;
    }
  });
}

// 💾 Manual save button logic
function saveCurrentReadings() {
  const rows = document.querySelectorAll("tbody tr");
  let hasEmpty = false;

  rows.forEach((row, index) => {
    const endInput = row.querySelector(".end");
    const value = parseFloat(endInput.value);

    if (endInput.value === "") {
      hasEmpty = true;
    }

    if (!isNaN(value)) {
      localStorage.setItem(`equip-${index}-prev`, value);
    }
  });

  if (hasEmpty) {
    const confirmSave = confirm("You left some fields empty. Do you want to continue saving?");
    if (!confirmSave) return;
  }

  const status = document.getElementById("saveStatus");
  if (status) {
    status.textContent = "✔ Your readings have been saved!";
    setTimeout(() => status.textContent = "", 4000);
  }
}

// ✅ Real-time auto-save + green flash
document.addEventListener("input", function (e) {
  if (e.target.classList.contains("start") || e.target.classList.contains("end")) {
    updateTotals();

    // Only auto-save on "end" fields
    if (e.target.classList.contains("end")) {
      const row = e.target.closest("tr");
      const rows = Array.from(document.querySelectorAll("tbody tr"));
      const rowIndex = rows.indexOf(row);
      const value = parseFloat(e.target.value);

      if (!isNaN(value)) {
        localStorage.setItem(`equip-${rowIndex}-prev`, value);

        // 🟢 Visual feedback: flash green border
        e.target.style.borderColor = "#4CAF50";
        setTimeout(() => {
          e.target.style.borderColor = "#ccc";
        }, 800);
      }
    }
  }
});

// ✅ Load previous values + totals on startup
document.addEventListener("DOMContentLoaded", () => {
  loadPreviousReadings();
  updateTotals();
});

// ✅ Save again on page close (safety)
window.addEventListener("beforeunload", saveCurrentReadings);

// ✅ Hook to save button (if present)
const saveBtn = document.getElementById("saveBtn");
if (saveBtn) {
  saveBtn.addEventListener("click", saveCurrentReadings);
}

// ✅ Auto-update copyright year
document.getElementById("currentYear").textContent = new Date().getFullYear();

// ✅ Auto-load version number from version.json
fetch("version.json")
  .then(res => res.json())
  .then(data => {
    const version = data.version || "v1.0.0";
    document.getElementById("appVersion").textContent = version;
  })
  .catch(err => {
    console.warn("⚠ Failed to fetch version:", err);
    document.getElementById("appVersion").textContent = "v?";
  });
