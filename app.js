// ----------------------------
// Helper: Save & get JWT
// ----------------------------
function saveToken(token) {
  localStorage.setItem('token', token);
}
function getToken() {
  return localStorage.getItem('token');
}
function removeToken() {
  localStorage.removeItem('token');
}

// ----------------------------
// REGISTER
// ----------------------------
async function register() {
  const name = document.getElementById('regName')?.value?.trim();
  const email = document.getElementById('regEmail')?.value?.trim();
  const password = document.getElementById('regPassword')?.value;
  const confirmPassword = document.getElementById('regPassword2')?.value;

  if (!name || !email || !password || !confirmPassword) {
    alert('⚠️ Please fill in all fields.');
    return;
  }

  if (password.length < 6) {
    alert('⚠️ Password must be at least 6 characters.');
    return;
  }

  if (password !== confirmPassword) {
    alert('⚠️ Passwords do not match!');
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');

    saveToken(data.token);
    alert('✅ Registered successfully!');
    window.location.href = 'dashboard.html';
  } catch (err) {
    alert('❌ ' + err.message);
  }
}

// ----------------------------
// LOGIN (User)
// ----------------------------
async function login() {
  const email = document.getElementById('loginEmail')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value;

  if (!email || !password) {
    alert('⚠️ Please enter both email and password.');
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');

    saveToken(data.token);
    alert('✅ Login successful!');
    window.location.href = 'dashboard.html';
  } catch (err) {
    alert('❌ ' + err.message);
  }
}

// ----------------------------
// ADMIN LOGIN
// ----------------------------
async function adminLogin() {
  const email = document.getElementById("email")?.value?.trim();
  const password = document.getElementById("password")?.value?.trim();

  if (!email || !password) {
    alert("⚠️ Please fill both fields.");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, isAdmin: true })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");

    // Save token and admin flag
    localStorage.setItem("token", data.token);
    localStorage.setItem("isAdmin", "true");

    alert("✅ Admin login successful!");
    window.location.href = "admin-dashboard.html";
  } catch (err) {
    console.error(err);
    alert("❌ " + err.message);
  }
}

// Optional: allow Enter key to trigger admin login
document.addEventListener("keypress", function(event) {
  if (event.key === "Enter" && window.location.pathname.endsWith("admin-login.html")) {
    event.preventDefault();
    adminLogin();
  }
});

// ----------------------------
// LOGOUT
// ----------------------------
function logout() {
  removeToken();
  localStorage.removeItem("isAdmin");
  window.location.href = 'index.html';
}

// ----------------------------
// DASHBOARD
// ----------------------------
async function loadDashboard() {
  const token = getToken();
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/user/me', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load dashboard');

    const user = data.user;
    document.getElementById('welcomeText').innerText = 'Welcome, ' + user.name;
    document.getElementById('balance').innerText = user.balance.toFixed(2) + ' USD';
    document.getElementById('deposit').innerText = (user.totalDeposit || 0).toFixed(2) + ' USD';
    document.getElementById('withdraw').innerText = (user.totalWithdraw || 0).toFixed(2) + ' USD';
    document.getElementById('invest').innerText = (user.totalInvest || 0).toFixed(2) + ' USD';
    document.getElementById('currentInvest').innerText = (user.currentInvest || 0).toFixed(2) + ' USD';

    document.getElementById('referralLink').value =
      window.location.origin + '/register.html?ref=' + user.id;

  } catch (err) {
    alert('❌ ' + err.message);
    logout();
  }
}

// ----------------------------
// DEPOSIT
// ----------------------------
let selectedGateway = '';

function openDepositModal(gateway) {
  selectedGateway = gateway;
  document.getElementById('depositModal').style.display = 'block';
}

function closeModal() {
  document.getElementById('depositModal').style.display = 'none';
}

function showPaymentInfo() {
  const amount = parseFloat(document.getElementById('depositAmount').value);
  if (!amount || amount < 100) {
    alert('Minimum deposit is 100 USD.');
    return;
  }

  document.getElementById('depositModal').style.display = 'none';
  document.getElementById('paymentInfo').style.display = 'block';

  document.getElementById('gatewayName').innerText = selectedGateway + ' PAYMENT';
  document.getElementById('payAmount').innerText = amount.toFixed(2) + ' USD';
  document.getElementById('totalAmount').innerText = amount.toFixed(2) + ' USD';

  document.getElementById('usdtInfo').style.display = selectedGateway === 'BTC' ? 'block' : 'none';
  document.getElementById('paypalInfo').style.display = selectedGateway === 'PayPal' ? 'block' : 'none';
}

function previewReceipt() {
  const file = document.getElementById('receiptFile').files[0];
  const preview = document.getElementById('receiptPreview');
  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
  } else preview.style.display = 'none';
}

async function submitDeposit() {
  const token = getToken();
  if (!token) return alert('❌ Not logged in');

  const amount = parseFloat(document.getElementById('depositAmount').value);
  const method = selectedGateway;
  const file = document.getElementById('receiptFile').files[0];

  if (!amount || !method || !file) return alert('⚠️ Fill all deposit info');

  const formData = new FormData();
  formData.append('amount', amount);
  formData.append('method', method);
  formData.append('screenshot', file);

  try {
    const res = await fetch('http://localhost:3000/user/deposit', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Deposit failed');

    alert('✅ Deposit submitted!');
    document.getElementById('depositModal').style.display = 'none';
    document.getElementById('paymentInfo').style.display = 'none';
  } catch (err) {
    alert('❌ ' + err.message);
  }
}

// ----------------------------
// Copy referral link
// ----------------------------
function copyReferral() {
  const input = document.getElementById('referralLink');
  navigator.clipboard.writeText(input.value)
    .then(() => alert('Referral link copied!'));
}

// ----------------------------
// Auto-run dashboard loader if on dashboard.html
// ----------------------------
if (window.location.pathname.endsWith('dashboard.html')) {
  document.addEventListener('DOMContentLoaded', loadDashboard);
}

// ----------------------------
// Enter key login for users
// ----------------------------
document.addEventListener('keypress', function(event) {
  if (event.key === 'Enter' && window.location.pathname.endsWith('index.html')) {
    event.preventDefault();
    login();
  }
});