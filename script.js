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

  // Save the supervisor's lastname and proceed to operator name form
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

  // Save the operator's name and show the main app
  localStorage.setItem('currentOperatorName', operatorName);
  document.getElementById('operator-form').style.display = 'none';
  document.getElementById('app-content').style.display = 'block';

  // Display the full name on the dashboard
  document.getElementById('operator-name').textContent = operatorName;

  // Load data from Supabase after a successful login session
  loadPreviousReadings();
  updateTotals();
}

// --- Main Application Logic ---

function updateTotals() {
  sections.forEach(section => {
    const rows = document.querySelectorAll(`${section.selector} tbody tr`);
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
  });
}

async function saveCurrentReadings() {
  const currentUserLastname = localStorage.getItem('currentUserLastname');
  if (!currentUserLastname) {
    alert('You are not logged in.');
    return;
  }

  const currentDate = new Date().toISOString().slice(0, 10);
  let allRows = [];
  let hasEmpty = false;

  sections.forEach(section => {
    const rows = document.querySelectorAll(`${section.selector} tbody tr`);
    const equipmentNames = Array.from(rows).map(row => row.querySelector('td:first-child').textContent.trim());

    rows.forEach((row, index) => {
      const startInput = row.querySelector(".start");
      const endInput = row.querySelector(".end");
      const totalSpan = row.querySelector(".total");

      if (startInput.value === "" || endInput.value === "") {
        hasEmpty = true;
      }

      allRows.push({
        table: section.table,
        lastname: currentUserLastname,
        date: currentDate,
        equipment: equipmentNames[index],
        start_reading: parseFloat(startInput.value) || null,
        end_reading: parseFloat(endInput.value) || null,
        total_kwh: parseFloat(totalSpan.textContent) || null
      });
    });
  });

  if (hasEmpty) {
    const confirmSave = confirm("You left some fields empty. Do you want to continue saving?");
    if (!confirmSave) return;
  }

  // I-save ang lahat ng data sa Supabase
  for (const rowData of allRows) {
    await supabase.from(rowData.table).insert(rowData);
  }

  alert("Your readings have been saved to the database!");
}

async function loadPreviousReadings() {
  const currentUserLastname = localStorage.getItem('currentUserLastname');
  if (!currentUserLastname) {
    return;
  }

  for (const section of sections) {
    const { data, error } = await supabase
      .from(section.table)
      .select('equipment, end_reading')
      .eq('lastname', currentUserLastname)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const rows = document.querySelectorAll(`${section.selector} tbody tr`);
      rows.forEach(row => {
        const startInput = row.querySelector('.start');
        const equipmentName = row.querySelector('td:first-child').textContent.trim();
        const latestReading = data.find(item => item.equipment === equipmentName);
        if (latestReading) {
          startInput.value = latestReading.end_reading;
        } else {
          startInput.value = '';
        }
      });
    }
  }

  updateTotals();
  alert('Previous readings loaded!');
}

// --- Event Listeners ---

document.addEventListener("DOMContentLoaded", () => {
  // Check if a session already exists
  const currentUserLastname = localStorage.getItem('currentUserLastname');
  const currentOperatorName = localStorage.getItem('currentOperatorName');

  if (currentUserLastname && currentOperatorName) {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('operator-form').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    document.getElementById('operator-name').textContent = currentOperatorName;
    loadPreviousReadings();
  }

  // Set today's date
  document.getElementById('date-input').valueAsDate = new Date();
});

document.addEventListener("input", function (e) {
  if (e.target.classList.contains("start") || e.target.classList.contains("end")) {
    updateTotals();
  }
});

// Event listener for the Login button
document.getElementById('login-btn').addEventListener('click', handleLogin);

// Event listener for the Start Session button
document.getElementById('start-btn').addEventListener('click', handleStartSession);

// Event listener for the Save button
document.getElementById('save-btn').addEventListener('click', saveCurrentReadings);

// Event listener for the Reload button
document.getElementById('reload-btn').addEventListener('click', loadPreviousReadings);

// Auto-update copyright year
document.getElementById("currentYear").textContent = new Date().getFullYear();

// Disclaimer logic
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

// Ilagay ang function na ito sa dulo ng script.js
function handleLogout() {
  // Clear all relevant local storage items
  localStorage.removeItem('currentUserLastname');
  localStorage.removeItem('currentOperatorName');

  // I-clear din ang mga readings na naka-save sa local storage
  // Note: Kung wala kang local storage saving, huwag mo nang isama ito
  // I-delete lahat ng local storage na naka-save sa app
  localStorage.clear(); 

  // I-reload ang buong page para bumalik sa login form
  window.location.reload();
}

// Event listener para sa Logout button
document.getElementById('logout-btn').addEventListener('click', handleLogout);

// Add the functions to the window object so they can be called from HTML
window.closeDisclaimer = closeDisclaimer;
window.showDisclaimer = showDisclaimer;
