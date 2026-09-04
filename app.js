let isGregorian = JSON.parse(localStorage.getItem('budget_is_gregorian')) ?? true;
let isDarkMode = JSON.parse(localStorage.getItem('budget_dark_mode')) ?? false;

function applyTheme() {
  const btn = document.getElementById('themeBtn');
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    if (btn) btn.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    if (btn) btn.textContent = '🌙';
  }
}

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  localStorage.setItem('budget_dark_mode', JSON.stringify(isDarkMode));
  applyTheme();
}

function renderDate() {
  const dateElement = document.getElementById('date-display');
  if (!dateElement) return;

  const today = new Date();

  if (isGregorian) {
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    dateElement.textContent = `${year}/${month}/${day} م`;
  } else {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    dateElement.textContent = today.toLocaleDateString('ar-SA-u-ca-islamic-umalqura-nu-latn', options) + ' هـ';
  }
}

function toggleDateFormat() {
  isGregorian = !isGregorian;
  localStorage.setItem('budget_is_gregorian', JSON.stringify(isGregorian));
  renderDate();
}

let config = JSON.parse(localStorage.getItem('budget_config')) || {
  totalAllowance: 990,
  expensesBudget: 400,
  gasBudget: 400,
  savingsBudget: 190,
  customDays: 30
};

let expenses = JSON.parse(localStorage.getItem('budget_expenses')) || [];
let gasExpenses = JSON.parse(localStorage.getItem('budget_gas_expenses')) || [];

function saveData() {
  try {
    localStorage.setItem('budget_config', JSON.stringify(config));
    localStorage.setItem('budget_expenses', JSON.stringify(expenses));
    localStorage.setItem('budget_gas_expenses', JSON.stringify(gasExpenses));
  } catch (e) {
    console.error("خطأ بالحفظ", e);
  }
}

function calculateDailyLimit() {
  const totalSpentExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalBudget = config.expensesBudget;
  const totalDays = config.customDays > 0 ? config.customDays : 30;

  const baseDaily = totalBudget / totalDays;

  let startDate = localStorage.getItem('budget_start_date');
  if (!startDate) {
    startDate = new Date().toISOString();
    localStorage.setItem('budget_start_date', startDate);
  }

  const start = new Date(startDate);
  const now = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(now - start);
  const elapsedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const accumulatedBudgetToDate = baseDaily * Math.min(elapsedDays, totalDays);
  const dailyLimit = accumulatedBudgetToDate - totalSpentExpenses;
  const remainingExpensesBudget = totalBudget - totalSpentExpenses;

  return {
    dailyLimit: dailyLimit,
    remainingExpensesBudget: Math.max(0, remainingExpensesBudget),
    daysLeft: Math.max(0, totalDays - elapsedDays + 1)
  };
}

function updateUI() {
  const { dailyLimit, remainingExpensesBudget, daysLeft } = calculateDailyLimit();

  const dailyElem = document.getElementById('dailyLimitVal');
  if (dailyElem) {
    dailyElem.innerText = dailyLimit.toFixed(1);
    dailyElem.style.color = dailyLimit < 0 ? '#ff3b30' : '#ffffff';
  }

  const remainingElem = document.getElementById('totalExpensesRemaining');
  if (remainingElem) remainingElem.innerText = remainingExpensesBudget.toFixed(0);

  const daysElem = document.getElementById('daysRemaining');
  if (daysElem) daysElem.innerText = daysLeft;

  const totalGasSpent = gasExpenses.reduce((sum, g) => sum + g.amount, 0);
  const gasRemaining = Math.max(0, config.gasBudget - totalGasSpent);
  
  const gasRemElem = document.getElementById('gasRemaining');
  if (gasRemElem) gasRemElem.innerText = gasRemaining;

  const gasTotalElem = document.getElementById('gasTotalAlloc');
  if (gasTotalElem) gasTotalElem.innerText = config.gasBudget;

  const progressBar = document.getElementById('gasProgressBar');
  if (progressBar) {
    progressBar.style.width = Math.min(100, Math.max(0, (gasRemaining / config.gasBudget) * 100)) + '%';
  }

  const savingsElem = document.getElementById('savingsVal');
  if (savingsElem) savingsElem.innerText = config.savingsBudget + ' ريال';

  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  if (!list) return;

  const allItems = [
    ...expenses.map(e => ({ ...e, type: 'exp' })),
    ...gasExpenses.map(g => ({ ...g, type: 'gas', desc: 'تعبئة بنزين ⛽' }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (allItems.length === 0) {
    list.innerHTML = '<li class="empty-state">لا يوجد مصاريف مسجلة هذا الشهر</li>';
    return;
  }

  list.innerHTML = allItems.map(item => {
    const d = new Date(item.date);
    const formattedDate = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    return `
      <li class="history-item">
        <div>
          <strong>${item.desc}</strong>
          <br><small style="color: var(--subtext-color);">${formattedDate}</small>
        </div>
        <div class="history-amount ${item.type === 'gas' ? 'gas' : ''}">-${item.amount} ريال</div>
      </li>
    `;
  }).join('');
}

function openExpenseModal() { document.getElementById('expenseModal').classList.add('active'); }
function closeExpenseModal() { document.getElementById('expenseModal').classList.remove('active'); }

function submitExpense() {
  const desc = document.getElementById('expDesc').value.trim() || 'مصروف عام';
  const amount = parseFloat(document.getElementById('expAmount').value);

  if (amount && amount > 0) {
    expenses.push({ desc, amount, date: new Date().toISOString() });
    saveData();
    updateUI();
    closeExpenseModal();
    document.getElementById('expDesc').value = '';
    document.getElementById('expAmount').value = '';
  }
}

function openGasModal() { document.getElementById('gasModal').classList.add('active'); }
function closeGasModal() { document.getElementById('gasModal').classList.remove('active'); }

function submitGas() {
  const amount = parseFloat(document.getElementById('gasAmount').value);
  if (amount && amount > 0) {
    gasExpenses.push({ amount, date: new Date().toISOString() });
    saveData();
    updateUI();
    closeGasModal();
    document.getElementById('gasAmount').value = '';
  }
}

function toggleSettingsModal() {
  const modal = document.getElementById('settingsModal');
  modal.classList.toggle('active');
  if (modal.classList.contains('active')) {
    document.getElementById('cfgTotal').value = config.totalAllowance;
    document.getElementById('cfgExpenses').value = config.expensesBudget;
    document.getElementById('cfgGas').value = config.gasBudget;
    document.getElementById('cfgSavings').value = config.savingsBudget;

    let daysInput = document.getElementById('cfgDays');
    if (!daysInput) {
      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';
      formGroup.innerHTML = '<label>عدد الأيام للحسبة</label><input type="number" id="cfgDays" value="' + config.customDays + '">';
      document.querySelector('#settingsModal .modal-content .form-group').after(formGroup);
    } else {
      daysInput.value = config.customDays;
    }
  }
}

function saveSettings() {
  config.totalAllowance = parseFloat(document.getElementById('cfgTotal').value) || 990;
  config.expensesBudget = parseFloat(document.getElementById('cfgExpenses').value) || 400;
  config.gasBudget = parseFloat(document.getElementById('cfgGas').value) || 400;
  config.savingsBudget = parseFloat(document.getElementById('cfgSavings').value) || 190;

  const daysVal = parseFloat(document.getElementById('cfgDays').value);
  config.customDays = daysVal > 0 ? daysVal : 30;

  saveData();
  updateUI();
  toggleSettingsModal();
}

function resetMonth() {
  if (confirm('تصفير المصاريف وبدء شهر جديد؟')) {
    expenses = [];
    gasExpenses = [];
    localStorage.setItem('budget_start_date', new Date().toISOString());
    saveData();
    updateUI();
    toggleSettingsModal();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  renderDate();
  updateUI();
});
