// State Management
const DEFAULT_CONFIG = {
  totalAmount: 1000,
  expensesAllocated: 410,
  gasAllocated: 400,
  savingsAllocated: 190,
  totalDays: 30
};

let config = JSON.parse(localStorage.getItem('budget_config')) || { ...DEFAULT_CONFIG };
let expenses = JSON.parse(localStorage.getItem('budget_expenses')) || [];
let gasExpenses = JSON.parse(localStorage.getItem('budget_gas_expenses')) || [];

// Format Date YYYY/MM/DD
function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
}

// Calculate remaining days in month
function getDaysRemainingInMonth() {
  const now = new Date();
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const remaining = totalDaysInMonth - currentDay + 1;
  return remaining > 0 ? remaining : 1;
}

// Helper to format float display nicely (up to 2 decimals)
function formatMoney(amount) {
  return Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

// Update UI
function updateUI() {
  // Date Display
  document.getElementById('currentDate').innerText = formatDate(new Date());

  // Expenses Calculations
  const totalSpentExpenses = expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const expensesRemaining = Math.max(0, config.expensesAllocated - totalSpentExpenses);
  const daysRemaining = getDaysRemainingInMonth();
  
  const dailyLimit = (expensesRemaining / daysRemaining);

  // العرض بدقة خانتين عشريتين بدون التضحية بالفواصل
  document.getElementById('dailyLimitVal').innerText = formatMoney(dailyLimit);
  document.getElementById('totalExpensesRemaining').innerText = formatMoney(expensesRemaining);
  document.getElementById('daysRemaining').innerText = daysRemaining;

  // Badge Status
  const statusBadge = document.getElementById('statusBadge');
  if (expensesRemaining <= 0) {
    statusBadge.innerText = 'تنبيه: استهلكت كامل ميزانية المصاريف ⚠️';
    statusBadge.style.background = 'rgba(255, 59, 48, 0.3)';
  } else if (dailyLimit < 15) {
    statusBadge.innerText = 'انتبه: حدك اليومي منخفض ⚡';
    statusBadge.style.background = 'rgba(255, 149, 0, 0.3)';
  } else {
    statusBadge.innerText = 'وضع الميزانية ممتاز 👍';
    statusBadge.style.background = 'rgba(255, 255, 255, 0.2)';
  }

  // Gas Calculations
  const totalSpentGas = gasExpenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const gasRemaining = Math.max(0, config.gasAllocated - totalSpentGas);
  
  document.getElementById('gasRemaining').innerText = formatMoney(gasRemaining);
  document.getElementById('gasTotalAlloc').innerText = formatMoney(config.gasAllocated);

  const gasPercent = config.gasAllocated > 0 ? (gasRemaining / config.gasAllocated) * 100 : 0;
  const gasProgressBar = document.getElementById('gasProgressBar');
  gasProgressBar.style.width = `${Math.min(100, Math.max(0, gasPercent))}%`;

  if (gasPercent < 20) {
    gasProgressBar.style.background = '#ff3b30';
  } else {
    gasProgressBar.style.background = '#ff9500';
  }

  // Savings
  document.getElementById('savingsVal').innerText = `${formatMoney(config.savingsAllocated)} ريال`;

  // Render History List
  renderHistory();
}

// Render Recent History
function renderHistory() {
  const historyList = document.getElementById('historyList');
  historyList.innerHTML = '';

  const allTransactions = [
    ...expenses.map(e => ({ ...e, type: 'expense' })),
    ...gasExpenses.map(g => ({ ...g, type: 'gas' }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (allTransactions.length === 0) {
    historyList.innerHTML = '<li class="empty-state">لا يوجد مصاريف مسجلة هذا الشهر</li>';
    return;
  }

  allTransactions.slice(0, 10).forEach(item => {
    const li = document.createElement('li');
    li.className = 'history-item';
    
    const isGas = item.type === 'gas';
    const title = isGas ? 'تعبئة بنزين ⛽' : (item.desc || 'مصروف عام');
    const amountClass = isGas ? 'history-amount gas' : 'history-amount';

    li.innerHTML = `
      <div>
        <strong>${title}</strong>
        <small>${item.time}</small>
      </div>
      <span class="${amountClass}">-${formatMoney(item.amount)} ريال</span>
    `;
    historyList.appendChild(li);
  });
}

// Modals Controls
function openExpenseModal() {
  document.getElementById('expDesc').value = '';
  document.getElementById('expAmount').value = '';
  document.getElementById('expenseModal').classList.add('active');
}

function closeExpenseModal() {
  document.getElementById('expenseModal').classList.remove('active');
}

function openGasModal() {
  document.getElementById('gasAmount').value = '';
  document.getElementById('gasModal').classList.add('active');
}

function closeGasModal() {
  document.getElementById('gasModal').classList.remove('active');
}

function toggleSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (!modal.classList.contains('active')) {
    document.getElementById('cfgTotal').value = config.totalAmount;
    document.getElementById('cfgExpenses').value = config.expensesAllocated;
    document.getElementById('cfgGas').value = config.gasAllocated;
    document.getElementById('cfgSavings').value = config.savingsAllocated;
    document.getElementById('cfgDays').value = config.totalDays;
    modal.classList.add('active');
  } else {
    modal.classList.remove('active');
  }
}

// Submit Handlers
function submitExpense() {
  const amount = parseFloat(document.getElementById('expAmount').value);
  const desc = document.getElementById('expDesc').value.trim();

  if (isNaN(amount) || amount <= 0) {
    alert('الرجاء إدخال مبلغ صحيح');
    return;
  }

  const now = new Date();
  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

  expenses.push({
    id: Date.now(),
    amount: amount,
    desc: desc,
    date: now.toISOString(),
    time: timeStr
  });

  localStorage.setItem('budget_expenses', JSON.stringify(expenses));
  closeExpenseModal();
  updateUI();
}

function submitGas() {
  const amount = parseFloat(document.getElementById('gasAmount').value);

  if (isNaN(amount) || amount <= 0) {
    alert('الرجاء إدخال مبلغ صحيح');
    return;
  }

  const now = new Date();
  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

  gasExpenses.push({
    id: Date.now(),
    amount: amount,
    date: now.toISOString(),
    time: timeStr
  });

  localStorage.setItem('budget_gas_expenses', JSON.stringify(gasExpenses));
  closeGasModal();
  updateUI();
}

function saveSettings() {
  const total = parseFloat(document.getElementById('cfgTotal').value) || 0;
  const exp = parseFloat(document.getElementById('cfgExpenses').value) || 0;
  const gas = parseFloat(document.getElementById('cfgGas').value) || 0;
  const sav = parseFloat(document.getElementById('cfgSavings').value) || 0;
  const days = parseInt(document.getElementById('cfgDays').value) || 30;

  config = {
    totalAmount: total,
    expensesAllocated: exp,
    gasAllocated: gas,
    savingsAllocated: sav,
    totalDays: days
  };

  localStorage.setItem('budget_config', JSON.stringify(config));
  toggleSettingsModal();
  updateUI();
}

function resetMonth() {
  if (confirm('هل أنت تأكد من تصفير جميع المصاريف وبدء شهر جديد؟')) {
    expenses = [];
    gasExpenses = [];
    localStorage.removeItem('budget_expenses');
    localStorage.removeItem('budget_gas_expenses');
    toggleSettingsModal();
    updateUI();
  }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
});
