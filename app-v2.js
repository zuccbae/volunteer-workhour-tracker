document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('logForm');
  const downloadBtn = document.getElementById('downloadCSV');
  const weekSelect = document.getElementById('weekSelect');
  const weeklyContainer = document.getElementById('weeklyEntriesContainer');
  const weekDisplay = document.getElementById('currentWeekDisplay');

  let entries = JSON.parse(localStorage.getItem('volunteerEntries')) || [];
  let grouped = {};

  displayCurrentWeekLabel();
  refreshView();

  // === 📨 Submit to Google Sheets + Save Locally ===
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const date = document.getElementById('date').value;
    const hours = parseInt(document.getElementById('hours').value) || 0;
    const minutes = parseInt(document.getElementById('minutes').value) || 0;
    const totalHours = (hours + minutes / 60).toFixed(2);

    const entry = { Name: name, Date: date, Hours: totalHours };

    // ✅ CORRECT SheetDB submission with logging
    fetch('https://sheetdb.io/api/v1/c32du5n38t9gc', {
      method: 'POST',
      body: JSON.stringify({ data: entry }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(res => {
      console.log('Fetch response:', res);
      return res.json();
    })
    .then(data => {
      console.log('SheetDB returned:', data);
      alert('Entry submitted successfully to cloud!');
    })
    .catch(err => {
      console.error('Cloud submission error:', err);
      console.log('Entry object:', entry);
      alert('Cloud error – entry saved locally instead.');
    });

    // 🗂️ Save locally
    entries.push({ name, date, totalHours });
    localStorage.setItem('volunteerEntries', JSON.stringify(entries));
    refreshView();
    form.reset();
  });

  // === 📥 Download CSV for selected week ===
  downloadBtn.addEventListener('click', () => {
    const selectedWeek = weekSelect.value;
    if (!selectedWeek) {
      alert("Please select a week to download.");
      return;
    }

    const weekEntries = grouped[selectedWeek];
    if (!weekEntries || weekEntries.length === 0) {
      alert("No entries for selected week.");
      return;
    }

    const csvHeader = "Name,Date,Hours\n";
    const csvRows = weekEntries.map(entry =>
      `${entry.name},${entry.date},${entry.totalHours}`
    );
    const csvContent = csvHeader + csvRows.join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `volunteer_log_${selectedWeek}.csv`);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // === 🔧 Helpers ===
  function refreshView() {
    grouped = groupEntriesByWeek(entries);
    renderGroupedEntries(grouped);
    populateWeekDropdown(grouped);
  }

  function getWeekNumber(dateString) {
    const date = new Date(dateString);
    const dayNum = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - dayNum + 3);
    const firstThursday = new Date(date.getFullYear(), 0, 4);
    const weekNum = Math.floor(
      (date - firstThursday) / (7 * 24 * 60 * 60 * 1000)
    ) + 1;
    return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }

  function groupEntriesByWeek(entries) {
    const grouped = {};
    entries.forEach(entry => {
      const week = getWeekNumber(entry.date);
      if (!grouped[week]) grouped[week] = [];
      grouped[week].push(entry);
    });
    return grouped;
  }

  function renderGroupedEntries(grouped) {
    weeklyContainer.innerHTML = '';
    for (const week in grouped) {
      const section = document.createElement('div');
      section.innerHTML = `<h3>${week}</h3>`;
      const ul = document.createElement('ul');
      grouped[week].forEach(entry => {
        const li = document.createElement('li');
        li.textContent = `${entry.name} – ${entry.date} – ${entry.totalHours} hrs`;
        ul.appendChild(li);
      });
      section.appendChild(ul);
      weeklyContainer.appendChild(section);
    }
  }

  function populateWeekDropdown(grouped) {
    weekSelect.innerHTML = `<option value="">Select a week</option>`;
    Object.keys(grouped).forEach(week => {
      const option = document.createElement('option');
      option.value = week;
      option.textContent = week;
      weekSelect.appendChild(option);
    });
  }

  function displayCurrentWeekLabel() {
    const today = new Date();
    const week = getWeekNumber(today.toISOString().split('T')[0]);

    const monday = new Date(today);
    monday.setDate(monday.getDate() - ((today.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const format = (date) => date.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

    const range = `${format(monday)} – ${format(sunday)}`;
    weekDisplay.textContent = `Logging hours for: ${week} (${range})`;
  }
});
