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

// Save current readings (end) to localStorage
function saveCurrentReadings() {
  const rows = document.querySelectorAll("tbody tr");
  rows.forEach((row, index) => {
    const endInput = row.querySelector(".end");
    const endValue = parseFloat(endInput.value);
    if (!isNaN(endValue)) {
      localStorage.setItem(`equip-${index}-prev`, endValue);
    }
  });

  // Feedback UI
  const status = document.getElementById("saveStatus");
  if (status) {
    status.textContent = "✔ Saved!";
    setTimeout(() => status.textContent = "", 3000);
  }
}

// Load previous readings (as today’s initial) from localStorage
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

document.addEventListener("DOMContentLoaded", () => {
  loadPreviousReadings();
  updateTotals();
});

document.addEventListener("input", function (e) {
  if (e.target.classList.contains("start") || e.target.classList.contains("end")) {
    updateTotals();
  }
});

// Optional: also auto-save on close
window.addEventListener("beforeunload", saveCurrentReadings);

// Manual save button
const saveBtn = document.getElementById("saveBtn");
if (saveBtn) {
  saveBtn.addEventListener("click", saveCurrentReadings);
}
