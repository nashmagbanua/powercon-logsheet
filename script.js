import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase credentials (dito mo ilalagay)
const SUPABASE_URL = 'https://qbeacrpoyfacgmbzxjcu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZWFjcnBveWZhY2dtYnp4amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NTM5NTIsImV4cCI6MjA2NDIyOTk1Mn0.6kfxKLJxidW4BcqsMJte61AtzydrTW-1ZJIJytiUBt4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mga global variables para sa mga equipment at table names
const sections = [
  { name: 'Utilities', table: 'utilities_readings', selector: '#utilities-section table' },
  { name: 'Process', table: 'process_readings', selector: '#process-section table' },
  { name: 'Bottling', table: 'bottling_readings', selector: '#bottling-section table' },
  { name: 'LVSG 5 Loads', table: 'lvsg5loads_readings', selector: '#lvsg5-section table' }
];

// --- Authentication Logic ---

async function handleLogin() {
  const passcode = document.getElementById('passcode-input').value;
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const currentDay = new Date().getDate().toString().padStart(2, '0');
  const currentDateCode = currentMonth + currentDay;

  const lastname = passcode.substring(0, passcode.length - 4).toLowerCase();
  const passcodeDate = passcode.substring(passcode.length - 4);

  if (passcodeDate !== currentDateCode) {
    alert('Incorrect date format in passcode. Please use the current date.');
    return;
  }

  const { data, error } = await supabase
    .from('authorized_users')
    .select('lastname')
    .eq('lastname', lastname)
    .single();

  if (error || !data) {
    alert('Invalid lastname. Access denied.');
    return;
  }

  localStorage.setItem('currentUserLastname', data.lastname);
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('operator-form').style.display = 'block';
}

function handleStartSession() {
  const operatorName = document.getElementById('operator-name-input').value;

  if (operatorName.trim() === '') {
    alert('Please enter the operator\'s full name.');
    return;
  }

  localStorage.setItem('currentOperatorName', operatorName);
  document.getElementById('operator-form').style.display = 'none';
  document.getElementById('app-content').style.display = 'block';
  document.getElementById('operator-name').textContent = operatorName;

  loadPreviousReadings();
  updateTotals();
}

// --- Main Application Logic ---

function updateTotals() {
  let grandTotal = 0; // lahat ng subtotal

  sections.forEach(section => {
    const rows = document.querySelectorAll(`${section.selector} tbody tr`);
    let sectionSubtotal = 0;

    rows.forEach(row => {
      const startInput = row.querySelector(".start");
      const endInput = row.querySelector(".end");
      const totalSpan = row.querySelector(".total");

      const start = parseFloat(startInput?.value);
      const end = parseFloat(endInput?.value);

      if (!isNaN(start) && !isNaN(end)) {
        const total = end - start;
        totalSpan.textContent = total >= 0 ? total.toFixed(2) : "0.00";
        sectionSubtotal += total >= 0 ? total : 0;
      } else {
        totalSpan.textContent = "0";
      }
    });

    // Update subtotal per section
    const subtotalCell = document.querySelector(`${section.selector} .subtotal`);
    if (subtotalCell) {
      subtotalCell.textContent = sectionSubtotal.toFixed(2);
    }

    grandTotal += sectionSubtotal;
  });

  // Update grand total
  const grandTotalSpan = document.getElementById("grandtotal");
  if (grandTotalSpan) {
    grandTotalSpan.textContent = grandTotal.toFixed(2);
  }
}

async function saveCurrentReadings() {
  const currentUserLastname = localStorage.getItem('currentUserLastname');
  if (!currentUserLastname) {
    alert("No user logged in!");
    return;
  }

  for (const section of sections) {
    const rows = document.querySelectorAll(`${section.selector} tbody tr`);

    for (const row of rows) {
      const equipmentName = row.querySelector('td:first-child').textContent.trim();
      const startInput = row.querySelector('.start');
      const endInput = row.querySelector('.end');
      const totalSpan = row.querySelector('.total');

      const start = parseFloat(startInput.value);
      const end = parseFloat(endInput.value);
      const total = parseFloat(totalSpan.textContent);

      if (!isNaN(start) && !isNaN(end)) {
        const { error } = await supabase
          .from(section.table)
          .insert([{
            lastname: currentUserLastname,
            date: new Date().toISOString().split('T')[0],
            equipment: encodeURIComponent(equipmentName), // ✅ FIX dito
            start_reading: start,
            end_reading: end,
            total_kwh: total
          }]);

        if (error) {
          console.error("Save error:", error);
        }
      }
    }
  }

  alert("Readings saved successfully!");
}

async function loadPreviousReadings() {
  const currentUserLastname = localStorage.getItem('currentUserLastname');
  if (!currentUserLastname) return;

  for (const section of sections) {
    const rows = document.querySelectorAll(`${section.selector} tbody tr`);

    for (const row of rows) {
      const equipmentName = row.querySelector('td:first-child').textContent.trim();
      const startInput = row.querySelector('.start');

      const { data, error } = await supabase
        .from(section.table)
        .select('end_reading')
        .eq('lastname', currentUserLastname)
        .eq('equipment', encodeURIComponent(equipmentName)) // ✅ FIX
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        startInput.value = data.end_reading;
      } else {
        startInput.value = '';
      }
    }
  }

  updateTotals();
  alert('Previous readings loaded!');
}

// --- Event Listeners ---

document.addEventListener("DOMContentLoaded", () => {
  const currentUserLastname = localStorage.getItem('currentUserLastname');
  const currentOperatorName = localStorage.getItem('currentOperatorName');

  if (currentUserLastname && currentOperatorName) {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('operator-form').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    document.getElementById('operator-name').textContent = currentOperatorName;
    loadPreviousReadings();
  }

  document.getElementById('date-input').valueAsDate = new Date();
});

document.addEventListener("input", function (e) {
  if (e.target.classList.contains("start") || e.target.classList.contains("end")) {
    updateTotals();
  }
});

document.getElementById('login-btn').addEventListener('click', handleLogin);
document.getElementById('start-btn').addEventListener('click', handleStartSession);
document.getElementById('save-btn').addEventListener('click', saveCurrentReadings);
document.getElementById('reload-btn').addEventListener('click', loadPreviousReadings);

document.getElementById("currentYear").textContent = new Date().getFullYear();

function closeDisclaimer() {
  localStorage.setItem("disclaimerAcknowledged", "true");
  document.getElementById("disclaimerModal").style.display = "none";
}

function showDisclaimer() {
  document.getElementById("disclaimerModal").style.display = "flex";
}

window.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("disclaimerAcknowledged")) {
    document.getElementById("disclaimerModal").style.display = "flex";
  }
});

function handleLogout() {
  localStorage.removeItem('currentUserLastname');
  localStorage.removeItem('currentOperatorName');
  localStorage.clear();
  window.location.reload();
}

document.getElementById('logout-btn').addEventListener('click', handleLogout);

window.closeDisclaimer = closeDisclaimer;
window.showDisclaimer = showDisclaimer;
