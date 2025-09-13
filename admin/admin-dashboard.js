// admin.js

// ------------------------
// Admin Access Only
// ------------------------
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('isAdmin');

  if (!token || isAdmin !== 'true') {
    alert('Unauthorized access. Please login as admin.');
    return window.location.href = 'admin-login.html';
  }

  await loadAdminData();
});

// ------------------------
// Load Admin Dashboard
// ------------------------
async function loadAdminData() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('https://harvestive-com.onrender.com/admin/dashboard', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();

    if (!res.ok || !data.success) throw new Error(data.message || 'Access denied');

    loadUsers(data.users);
    loadDeposits(data.pendingDeposits);
  } catch (err) {
    console.error(err);
    alert('Failed to load admin dashboard');
  }
}

// ------------------------
// Render Users Table
// ------------------------
function loadUsers(users) {
  const table = document.getElementById('usersTable');
  table.innerHTML = `
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Balance</th>
    </tr>
    ${users.map(u => `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>$${(u.balance || 0).toFixed(2)}</td>
      </tr>
    `).join('')}
  `;
}

// ------------------------
// Render Deposits Table
// ------------------------
function loadDeposits(deposits) {
  const table = document.getElementById('depositsTable');
  table.innerHTML = `
    <tr>
      <th>User</th>
      <th>Amount</th>
      <th>Method</th>
      <th>Screenshot</th>
      <th>Action</th>
    </tr>
    ${deposits.map(d => `
      <tr>
        <td>${d.user?.name || ''}</td>
        <td>$${(d.amount || 0).toFixed(2)}</td>
        <td>${d.method || ''}</td>
        <td>
          <a href="/uploads/${d.screenshot || ''}" target="_blank">
            <img src="/uploads/${d.screenshot || ''}" class="screenshot-img" style="max-width:80px; border:1px solid #ccc;">
          </a>
        </td>
        <td>
          <button onclick="approveDeposit('${d.id}')">Approve</button>
        </td>
      </tr>
    `).join('')}
  `;
}

// ------------------------
// Approve Deposit
// ------------------------
async function approveDeposit(depositId) {
  const token = localStorage.getItem('token');
  if (!token) return alert('Unauthorized');

  const confirmAction = confirm('Are you sure you want to approve this deposit?');
  if (!confirmAction) return;

  try {
    const res = await fetch(`http://localhost:8158/admin/approve/${depositId}`, { // <-- match server route
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to approve deposit');

    alert('✅ Deposit approved!');
    await loadAdminData(); // Refresh dashboard tables without reloading page
  } catch (err) {
    console.error(err);
    alert('❌ Error approving deposit: ' + (err.message || 'Unknown'));
  }
}

// ------------------------
// Logout
// ------------------------
function adminLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('isAdmin');
  window.location.href = 'admin-login.html';
}