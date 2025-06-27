// Auto-calculate total (kWh used) for every row
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

// Listen for input changes
document.addEventListener("input", function (e) {
  if (e.target.classList.contains("start") || e.target.classList.contains("end")) {
    updateTotals();
  }
});

// Optional: run once on load to initialize totals
window.addEventListener("DOMContentLoaded", updateTotals);
