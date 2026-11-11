// ============================================
// 1. DOM Elements ko grab karna (HTML se connect)
// ============================================
const balance = document.getElementById('balance');
const moneyPlus = document.getElementById('money-plus');
const moneyMinus = document.getElementById('money-minus');
const moneySaved = document.getElementById('money-saved');
const list = document.getElementById('list');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const category = document.getElementById('category');
const dateInput = document.getElementById('date');
const todayBadge = document.getElementById('today-badge');
const spendingPercent = document.getElementById('spending-percent');
const progressFill = document.getElementById('progress-fill');
const txCount = document.getElementById('tx-count');
const filterButtons = document.querySelectorAll('.filter-btn');

// Type Confirmation Modal DOM Elements
const typeModal = document.getElementById('type-modal');
const modalPreview = document.getElementById('modal-preview');
const confirmExpenseBtn = document.getElementById('confirm-expense-btn');
const confirmIncomeBtn = document.getElementById('confirm-income-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');

// Temporary state jab tak user popup me Expense ya Income select na kare
let pendingTransaction = null;

// Emergency Savings DOM Elements
const savingsAmountEl = document.getElementById('savings-amount');
const savingsGoalEl = document.getElementById('savings-goal');
const savingsProgressFill = document.getElementById('savings-progress-fill');
const savingsPercentEl = document.getElementById('savings-percent');
const savingsStatusEl = document.getElementById('savings-status');
const editGoalBtn = document.getElementById('edit-goal-btn');
const goalEditor = document.getElementById('goal-editor');
const goalInput = document.getElementById('goal-input');
const saveGoalBtn = document.getElementById('save-goal-btn');
const savingInput = document.getElementById('saving-input');
const addSavingBtn = document.getElementById('add-saving-btn');
const withdrawSavingBtn = document.getElementById('withdraw-saving-btn');
const chipButtons = document.querySelectorAll('.chip-btn');

// Active filter state ('all', 'income', ya 'expense')
let currentFilter = 'all';

// ============================================
// 2. Helper Functions (Date & Currency Format)
// ============================================
function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  if (dateInput) {
    dateInput.value = today;
  }
  if (todayBadge) {
    todayBadge.innerText = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}
setDefaultDate();

// Indian Rupee format (jaise 5000 -> 5,000.00)
function formatINR(num) {
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Date ko sundar format me dikhana (2026-11-11 -> 11 Nov 2026)
function formatDate(dateStr) {
  if (!dateStr || dateStr === 'Earlier') return 'Earlier';
  const parsed = new Date(dateStr + 'T00:00:00');
  if (isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Safe text rendering taaki special characters layout kharab na karein
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Category ke emojis aur labels
const categoryMeta = {
  Food: { emoji: '🍔', label: 'Food' },
  Education: { emoji: '📚', label: 'Education' },
  Travel: { emoji: '🚗', label: 'Travel' },
  Shopping: { emoji: '🛍️', label: 'Shopping' },
  Bills: { emoji: '💡', label: 'Bills' },
  Salary: { emoji: '💰', label: 'Salary' },
  Other: { emoji: '🏷️', label: 'Other' }
};

// Title type karte hi Category auto-detect karne ke keywords
const keywordCategoryMap = [
  { cat: 'Salary', words: ['salary', 'income', 'bonus', 'stipend', 'pocket money', 'freelance', 'earning'] },
  { cat: 'Education', words: ['book', 'books', 'pen', 'notebook', 'course', 'fees', 'college', 'school', 'tuition', 'study', 'exam'] },
  { cat: 'Food', words: ['chai', 'coffee', 'tea', 'pizza', 'burger', 'food', 'lunch', 'dinner', 'breakfast', 'snacks', 'biryani', 'momos', 'restaurant', 'cafe'] },
  { cat: 'Travel', words: ['bus', 'train', 'cab', 'uber', 'ola', 'auto', 'metro', 'petrol', 'diesel', 'fuel', 'flight', 'ticket', 'travel'] },
  { cat: 'Shopping', words: ['shirt', 'shoes', 'clothes', 'dress', 'amazon', 'flipkart', 'myntra', 'shopping', 'mall', 'bag', 'watch', 'gift'] },
  { cat: 'Bills', words: ['bill', 'bills', 'recharge', 'wifi', 'internet', 'electricity', 'water', 'rent', 'gas', 'emi', 'subscription'] }
];

let userPickedCategory = false;

category.addEventListener('change', () => {
  userPickedCategory = true;
});

// Jab user title likhe toh smartly category select ho jaye
text.addEventListener('input', () => {
  if (userPickedCategory) return;
  const val = text.value.toLowerCase();
  let matched = 'Other';

  for (const group of keywordCategoryMap) {
    if (group.words.some(word => new RegExp(`\\b${word}\\b`, 'i').test(val))) {
      matched = group.cat;
      break;
    }
  }
  category.value = matched;
});

// ============================================
// 3. LocalStorage se data load karna
// ============================================
const localStorageTransactions = JSON.parse(
  localStorage.getItem('transactions')
);

let transactions = localStorage.getItem('transactions') !== null
  ? localStorageTransactions
  : [];

let emergencySavings = parseFloat(localStorage.getItem('emergencySavings')) || 0;
let emergencyGoal = parseFloat(localStorage.getItem('emergencyGoal')) || 20000;
let lastSavingDate = localStorage.getItem('lastSavingDate') || '';

// ============================================
// 4. Form Submit hone par Popup Modal dikhana
// ============================================
function addTransaction(e) {
  e.preventDefault();

  const parsedAmt = parseFloat(amount.value);
  if (text.value.trim() === '' || isNaN(parsedAmt) || parsedAmt <= 0) {
    alert('Kripya sahi title aur amount bharein');
    return;
  }

  // Temporary transaction details save karna
  pendingTransaction = {
    text: text.value.trim(),
    amount: Math.abs(parsedAmt),
    category: category.value,
    date: dateInput.value || new Date().toISOString().split('T')[0]
  };

  // Popup me preview dikhana
  const catInfo = categoryMeta[pendingTransaction.category] || categoryMeta.Other;
  modalPreview.innerHTML = `
    <div class="modal-preview-left">
      <div class="cat-icon-box cat-${pendingTransaction.category}">${catInfo.emoji}</div>
      <div>
        <div class="modal-preview-title">${escapeHTML(pendingTransaction.text)}</div>
        <div class="modal-preview-meta">${catInfo.label} &bull; ${formatDate(pendingTransaction.date)}</div>
      </div>
    </div>
    <div class="modal-preview-amt">&#8377;${formatINR(pendingTransaction.amount)}</div>
  `;

  // Popup open karna
  typeModal.classList.remove('hidden');
}

// ============================================
// 5. Popup me Expense ya Income select hone par Save karna
// ============================================
function finalizeTransaction(selectedType) {
  if (!pendingTransaction) return;

  // Agar user ne Income chuna aur category abhi bhi 'Other' hai, toh Salary set karein
  let finalCategory = pendingTransaction.category;
  if (selectedType === 'income' && finalCategory === 'Other' && !userPickedCategory) {
    finalCategory = 'Salary';
  }

  const newTransaction = {
    id: Date.now(),
    text: pendingTransaction.text,
    amount: pendingTransaction.amount,
    type: selectedType, // "expense" ya "income"
    category: finalCategory,
    date: pendingTransaction.date
  };

  // Naya transaction sabse upar dikhane ke liye
  transactions.unshift(newTransaction);

  updateLocalStorage();
  init();

  // Form reset aur popup band karna
  text.value = '';
  amount.value = '';
  category.value = 'Other';
  userPickedCategory = false;
  setDefaultDate();
  closeTypeModal();
}

function closeTypeModal() {
  typeModal.classList.add('hidden');
  pendingTransaction = null;
}

// Modal Buttons Event Listeners
confirmExpenseBtn.addEventListener('click', () => finalizeTransaction('expense'));
confirmIncomeBtn.addEventListener('click', () => finalizeTransaction('income'));
cancelModalBtn.addEventListener('click', closeTypeModal);

// Modal ke bahar click karne ya Escape key dabane par band ho
typeModal.addEventListener('click', (e) => {
  if (e.target === typeModal) closeTypeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !typeModal.classList.contains('hidden')) {
    closeTypeModal();
  }
});

// ============================================
// 6. Screen (DOM) par ek transaction card banana
// ============================================
function addTransactionDOM(transaction) {
  const isIncome = transaction.type === 'income';
  const sign = isIncome ? '+' : '-';
  const itemClass = isIncome ? 'plus' : 'minus';

  const catKey = categoryMeta[transaction.category] ? transaction.category : 'Other';
  const catInfo = categoryMeta[catKey];
  const dateDisplay = formatDate(transaction.date);

  const item = document.createElement('li');
  item.classList.add('tx-item', itemClass);

  item.innerHTML = `
    <div class="tx-left">
      <div class="cat-icon-box cat-${catKey}">${catInfo.emoji}</div>
      <div class="transaction-info">
        <span class="transaction-title">${escapeHTML(transaction.text)}</span>
        <div class="transaction-meta">
          <span>${catInfo.label}</span>
          <span>&bull;</span>
          <span>${dateDisplay}</span>
        </div>
      </div>
    </div>
    <div class="tx-right">
      <span class="amount-val ${itemClass}">${sign}&#8377;${formatINR(transaction.amount)}</span>
      <button class="delete-btn" onclick="removeTransaction(${transaction.id})" title="Delete transaction" aria-label="Delete transaction">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `;

  list.appendChild(item);
}

// ============================================
// 7. Total Balance, Income, Expense & Ratio Bar Update
// ============================================
function getTotals() {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach(transaction => {
    if (transaction.type === 'income') {
      totalIncome += transaction.amount;
    } else {
      totalExpense += transaction.amount;
    }
  });

  // Available Balance = Income - Expense - Emergency Fund Saved
  const availableBalance = totalIncome - totalExpense - emergencySavings;
  return { totalIncome, totalExpense, availableBalance };
}

function updateValues() {
  const { totalIncome, totalExpense, availableBalance } = getTotals();

  const absBalance = Math.abs(availableBalance);
  const balanceSign = availableBalance < 0 ? '-' : '';

  balance.innerText = `${balanceSign}₹${formatINR(absBalance)}`;
  balance.classList.toggle('negative', availableBalance < 0);

  moneyPlus.innerText = `+₹${formatINR(totalIncome)}`;
  moneyMinus.innerText = `-₹${formatINR(totalExpense)}`;
  moneySaved.innerText = emergencySavings > 0 ? `-₹${formatINR(emergencySavings)}` : '₹0.00';

  // Spending + Saving Ratio Progress Bar calculation
  if (totalIncome > 0) {
    const spentPct = Math.round((totalExpense / totalIncome) * 100);
    const savedPct = Math.round((emergencySavings / totalIncome) * 100);
    const barWidth = Math.min(spentPct + savedPct, 100);
    progressFill.style.width = `${barWidth}%`;
    spendingPercent.innerText = `${spentPct}% spent • ${savedPct}% saved`;
  } else if (totalExpense > 0 || emergencySavings > 0) {
    progressFill.style.width = '100%';
    spendingPercent.innerText = 'No income added yet';
  } else {
    progressFill.style.width = '0%';
    spendingPercent.innerText = '0% of income spent';
  }
}

// ============================================
// 8. Filter Tabs (All / Income / Expense)
// ============================================
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderList();
  });
});

function renderList() {
  list.innerHTML = '';

  const filteredTransactions = transactions.filter(tx => {
    if (currentFilter === 'all') return true;
    return tx.type === currentFilter;
  });

  // Item count pill update
  txCount.innerText = `${filteredTransactions.length} ${filteredTransactions.length === 1 ? 'item' : 'items'}`;

  if (filteredTransactions.length === 0) {
    const emptyText = currentFilter === 'all'
      ? 'Abhi koi transaction nahi hai'
      : `Koi ${currentFilter} transaction nahi mila`;
    list.innerHTML = `
      <li class="empty-state">
        <span class="empty-icon">💸</span>
        <p>${emptyText}</p>
        <span>Left side wale form se naya transaction add karein!</span>
      </li>
    `;
  } else {
    filteredTransactions.forEach(addTransactionDOM);
  }
}

// ============================================
// 9. Transaction Delete Karna
// ============================================
function syncEmergencyAfterDelete(removedTx) {
  if (transactions.length === 0) {
    emergencySavings = 0;
    lastSavingDate = '';
    saveEmergencyStorage();
    return;
  }

  // Agar Income delete hui hai, toh Emergency Fund ko bache hue balance ke hisaab se adjust karein
  if (removedTx && removedTx.type === 'income') {
    const { totalIncome, totalExpense } = getTotals();
    const maxAllowedSaving = Math.max(totalIncome - totalExpense, 0);
    if (emergencySavings > maxAllowedSaving) {
      emergencySavings = maxAllowedSaving;
      if (emergencySavings === 0) {
        lastSavingDate = '';
      }
      saveEmergencyStorage();
    }
  }
}

function removeTransaction(id) {
  const removedTx = transactions.find(transaction => transaction.id === id);
  transactions = transactions.filter(transaction => transaction.id !== id);
  syncEmergencyAfterDelete(removedTx);
  updateLocalStorage();
  init();
}

// ============================================
// 10. LocalStorage me data save karna
// ============================================
function updateLocalStorage() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

// ============================================
// 11. Emergency Savings Fund Logic
// ============================================
function saveEmergencyStorage() {
  localStorage.setItem('emergencySavings', emergencySavings);
  localStorage.setItem('emergencyGoal', emergencyGoal);
  localStorage.setItem('lastSavingDate', lastSavingDate);
}

function updateSavingsUI() {
  savingsAmountEl.innerText = `₹${formatINR(emergencySavings)}`;
  savingsGoalEl.innerText = `₹${formatINR(emergencyGoal)}`;

  const rawPct = emergencyGoal > 0 ? Math.round((emergencySavings / emergencyGoal) * 100) : 0;
  const barPct = Math.min(rawPct, 100);

  savingsProgressFill.style.width = `${barPct}%`;
  savingsPercentEl.innerText = `${rawPct}% completed`;

  if (emergencySavings >= emergencyGoal) {
    savingsStatusEl.innerText = '🎉 Goal Reached! Safe Reserve Ready';
  } else if (lastSavingDate) {
    savingsStatusEl.innerText = `Last saved: ${lastSavingDate}`;
  } else {
    savingsStatusEl.innerText = 'Start saving today!';
  }
}

function depositToEmergency(amt) {
  if (isNaN(amt) || amt <= 0) {
    alert('Kripya sahi saving amount dalein');
    return;
  }

  const { availableBalance } = getTotals();
  if (amt > availableBalance) {
    alert(`Aapke Total Available Balance (₹${formatINR(Math.max(availableBalance, 0))}) me itne paise nahi hain! Pehle Income add karein ya kam amount save karein.`);
    return;
  }

  emergencySavings += amt;
  lastSavingDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  saveEmergencyStorage();
  updateSavingsUI();
  updateValues();
}

function withdrawFromEmergency(amt) {
  if (isNaN(amt) || amt <= 0) {
    alert('Emergency me kitne rupaye use karne hain, box me likhein');
    return;
  }
  if (amt > emergencySavings) {
    alert('Aapke Emergency Fund me itna balance nahi hai!');
    return;
  }
  emergencySavings -= amt;
  saveEmergencyStorage();
  updateSavingsUI();
  updateValues();
}

// Quick 1-click preset chips (+₹500, +₹1000, etc.)
chipButtons.forEach(chip => {
  chip.addEventListener('click', () => {
    const val = parseFloat(chip.dataset.save);
    depositToEmergency(val);
  });
});

// Custom Save & Use buttons
addSavingBtn.addEventListener('click', () => {
  const val = parseFloat(savingInput.value);
  if (!isNaN(val) && val > 0) {
    depositToEmergency(val);
    savingInput.value = '';
  } else {
    alert('Kripya save karne ke liye sahi amount likhein');
  }
});

withdrawSavingBtn.addEventListener('click', () => {
  const val = parseFloat(savingInput.value);
  if (!isNaN(val) && val > 0) {
    withdrawFromEmergency(val);
    savingInput.value = '';
  } else {
    alert('Emergency me use karne ke liye sahi amount likhein');
  }
});

// Edit Emergency Goal toggle & save
editGoalBtn.addEventListener('click', () => {
  goalEditor.classList.toggle('hidden');
  if (!goalEditor.classList.contains('hidden')) {
    goalInput.value = emergencyGoal;
    goalInput.focus();
  }
});

saveGoalBtn.addEventListener('click', () => {
  const newGoal = parseFloat(goalInput.value);
  if (isNaN(newGoal) || newGoal < 100) {
    alert('Kam se kam ₹100 ka emergency goal set karein');
    return;
  }
  emergencyGoal = newGoal;
  saveEmergencyStorage();
  updateSavingsUI();
  goalEditor.classList.add('hidden');
});

// ============================================
// 12. App Shuru (Initialize) Karna
// ============================================
function init() {
  renderList();
  updateValues();
  updateSavingsUI();
}

// Agar koi transaction nahi bacha hai toh purani bachi hui emergency saving reset karein
if (transactions.length === 0 && emergencySavings > 0) {
  emergencySavings = 0;
  lastSavingDate = '';
  saveEmergencyStorage();
}

form.addEventListener('submit', addTransaction);
init();
