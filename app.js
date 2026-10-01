/**
 * JenPay – e-wallet demo (send, receive, buy).
 * Vanilla JavaScript, no dependencies. All data is held in memory.
 */
'use strict';

// ======================================================================
// Helpers
// ======================================================================
const $ = id => document.getElementById(id);
const peso = n => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ======================================================================
// Application state (in-memory demo data)
// ======================================================================
const state = {
  bal: 1500,        // wallet balance in PHP
  ctx: null,        // pending transaction awaiting PIN confirmation
  method: '',       // selected top-up method
  item: null,       // selected item on the Buy screen
  filter: 'All',    // active History tab
  qrTab: 'scan',    // active QR tab ('scan' | 'code')
  tx: [
    { n: 'Coffee Shop', s: 'Payment', a: -120, d: 'Today, 10:24 AM', i: '☕', k: 'Payments' },
    { n: 'Juan Dela Cruz', s: 'Money Transfer', a: -200, d: 'Today, 09:12 AM', i: '✈️', k: 'Transfers' },
    { n: 'Wallet Top Up', s: 'Deposit', a: 500, d: 'Yesterday, 03:45 PM', i: '＋', k: 'Top-ups' },
    { n: 'Sari-Sari Store', s: 'Payment', a: -75, d: 'Sep 21, 2025 06:30 PM', i: '🏪', k: 'Payments' },
    { n: 'Received from Ana', s: 'Money Transfer', a: 150, d: 'Sep 20, 2025 02:15 PM', i: '➤', k: 'Transfers' }
  ]
};

// ======================================================================
// Template helpers
// ======================================================================
const backHeader = to => `<div class="top"><button class="back" aria-label="Back" onclick="navigate('${to}')">‹</button><h2>`;
const chips = (id, a = [50, 100, 200, 500]) => `<div class="chips">${a.map(v => `<button onclick="$('${id}').value=${v}">₱ ${v.toLocaleString()}</button>`).join('')}</div>`;
const bottomNav = on => `<div class="bnav">${[['home', '🏠', 'Home'], ['topup', '👛', 'Wallet'], ['pay', '💳', 'Pay'], ['send', '✈️', 'Send'], ['profile', '👤', 'Profile']].map(([g, e, l]) => `<button class="${g === on ? 'on' : ''}" onclick="navigate('${g}')"><span>${e}</span>${l}</button>`).join('')}</div>`;
const rows = l => l.map(t => `<div class="row"><div class="ic">${t.i}</div><div class="t"><b>${t.n}</b><small>${t.s}</small></div><div class="r ${t.a < 0 ? 'neg' : 'pos'}">${t.a < 0 ? '-' : '+'}${peso(Math.abs(t.a))}<small>${t.d}</small></div></div>`).join('');

// ======================================================================
// Screens: each entry returns the HTML for one view
// ======================================================================
const screens = {
  splash: () => `<div class="scr splash"><img class="lg" alt="JenPay" src="assets/logo.png"><p>Welcome to JenPay E-Wallet, Use Anytime, Anywhere</p>
<div style="margin-top:60px"><button class="btn w" onclick="navigate('login')">Get Started</button><button class="btn" style="background:none;border:1px solid #fff" onclick="navigate('login')">Login</button></div>
<p style="margin-top:auto;font-size:13px;opacity:.9">Safe • Fast • Convenient</p></div>`,

  login: () => `<div class="scr" style="justify-content:center"><div style="text-align:center"><img class="lg" alt="JenPay" src="assets/logo.png"><p style="color:var(--mute);font-size:14px;margin-top:4px">Log in to your account</p></div>
<label class="l" for="em">Email or username</label><input class="in" id="em" placeholder="Email or Username" value="jenny">
<label class="l" for="pw">Password</label><input class="in" id="pw" type="password" placeholder="Password" value="secret">
<div style="display:flex;justify-content:space-between;font-size:13px;margin-top:14px"><label><input type="checkbox"> Remember me</label><a href="#" style="color:var(--pri)" onclick="return false">Forgot password?</a></div>
<button class="btn" onclick="navigate('home')">Login</button>
<p style="text-align:center;font-size:13px;margin-top:18px">Don't have an account? <a href="#" style="color:var(--pri);font-weight:600" onclick="return false">Sign Up</a></p></div>`,

  home: () => `<div class="scr"><div style="display:flex;justify-content:space-between;align-items:center"><div><h2>Good morning, Jenny! 👋</h2><small style="color:var(--mute)">Here's your wallet overview</small></div><div class="ic">🔔</div></div>
<div class="bal" style="margin-top:16px"><small>Wallet Balance</small><b id="b">${peso(state.bal)}</b><button class="btn w" onclick="navigate('topup')" style="padding:10px">+ Add Money</button></div>
<div class="acts"><button onclick="navigate('pay')"><span class="ic" style="background:#dcfce7;color:var(--ok)">＋</span>Pay</button><button onclick="navigate('send')"><span class="ic">✈️</span>Send</button><button onclick="navigate('receive')"><span class="ic" style="background:#fef3c7">⬇️</span>Receive</button><button onclick="navigate('buy')"><span class="ic" style="background:#fce7f3">🛒</span>Buy</button><button onclick="navigate('qr')"><span class="ic" style="background:#ede9fe">▦</span>QR</button></div>
<div style="display:flex;justify-content:space-between"><b>Recent Transactions</b><a href="#" style="color:var(--pri);font-size:12px" onclick="navigate('history');return false">View All</a></div>${rows(state.tx.slice(0, 3))}</div>${bottomNav('home')}`,

  topup: () => `<div class="scr">${backHeader('home')}Add Money</h2></div>
<div class="bal"><small>Current Balance</small><b>${peso(state.bal)}</b></div>
<label class="l">Select Top-Up Method</label>
${[['Bank Transfer', 'Instant • Free', '🏦'], ['E-Wallet / Mobile Banking', 'Instant • Free', '📱'], ['ATM / Over-the-Counter', '1-2 days • May have fee', '🏧']].map(([n, s, e]) => `<button class="opt ${state.method === n ? 'sel' : ''}" onclick="state.method='${n}';navigate('topup')"><span class="ic">${e}</span><span class="t"><b>${n}</b><small>${s}</small></span>›</button>`).join('')}
<label class="l" for="amt">Enter Amount</label><input class="in" id="amt" type="number" min="1" placeholder="₱ Enter amount">${chips('amt', [100, 500, 1000, 2000])}
<div class="err" id="err"></div><button class="btn" style="margin-top:auto" onclick="doTopup()">Proceed</button></div>`,

  pay: () => `<div class="scr">${backHeader('home')}Pay to Merchant</h2></div>
<div class="mer"><div class="av">☕</div><div><b>Campus Café</b><br><small style="color:var(--mute)">Food &amp; Beverages</small></div></div>
<label class="l" for="amt">Amount</label><input class="in" id="amt" type="number" min="1" placeholder="₱ 0.00" value="120">${chips('amt')}
<label class="l">Payment Method</label><div class="opt sel"><span class="ic">👛</span><span class="t"><b>JenPay Wallet</b><small>Balance: ${peso(state.bal)}</small></span>›</div>
<div class="err" id="err"></div><button class="btn" style="margin-top:auto" onclick="toConfirm('pay','Campus Café','Food & Beverages')">Continue</button></div>`,

  send: () => `<div class="scr">${backHeader('home')}Send Money</h2></div>
<label class="l" for="to">To</label><input class="in" id="to" placeholder="🔍 Enter name, phone number, or account">
<label class="l" for="amt">Amount</label><input class="in" id="amt" type="number" min="1" placeholder="₱ Enter amount">${chips('amt')}
<label class="l" for="msg">Message (Optional)</label><textarea class="in" id="msg" placeholder="Add a note..."></textarea>
<div class="err" id="err"></div><button class="btn" style="margin-top:auto" onclick="toConfirm('send')">Next</button></div>`,

  receive: () => `<div class="scr">${backHeader('home')}Receive Money</h2></div>
<div class="mer" style="flex-direction:column;text-align:center"><div class="qrb" style="width:150px;height:150px">${[...Array(81)].map((_, i) => `<i class="${(i * 5 + i % 4 * 3) % 3 === 0 ? 'o' : ''}"></i>`).join('')}</div><b>Jenny Lausa</b><small style="color:var(--mute)">0917 123 4567 • Wallet ID PE-20250923</small></div>
<label class="l" for="amt">Request amount (optional)</label><input class="in" id="amt" type="number" min="1" placeholder="₱ Enter amount">${chips('amt')}
<label class="l" for="from">Received from</label><input class="in" id="from" value="Ana Reyes">
<div class="err" id="err"></div><button class="btn" style="margin-top:auto" onclick="doReceive()">Simulate Receive</button></div>`,

  buy: () => {
    const it = state.item || {}; return `<div class="scr">${backHeader('home')}Buy</h2></div>
${[['Mobile Load ₱100', 100, '📶'], ['Mobile Load ₱50', 50, '📶'], ['Electric Bill', 850, '💡'], ['Food Order', 250, '🍔'], ['Online Shop', 499, '🛍️']].map(([n, p, e]) => `<button class="opt ${it.n === n ? 'sel' : ''}" onclick="state.item={n:'${n}',p:${p}};navigate('buy')"><span class="ic">${e}</span><span class="t"><b>${n}</b><small>${peso(p)}</small></span>›</button>`).join('')}
<label class="l" for="amt">Amount</label><input class="in" id="amt" type="number" value="${it.p || ''}" placeholder="₱ 0.00">
<div class="err" id="err"></div><button class="btn" style="margin-top:auto" onclick="state.item?toConfirm('buy',state.item.n,'Purchase'):showError('Choose what to buy.')">Buy Now</button></div>`;  
},

  confirm: () => {
    const c = state.ctx; return `<div class="scr">${backHeader(c.kind)}Confirm Payment</h2></div>
<div class="mer"><div class="av">${c.kind === 'send' ? '✈️' : c.kind === 'buy' ? '🛒' : '☕'}</div><div><b>${c.name}</b><br><small style="color:var(--mute)">${c.sub}</small></div></div>
<div style="margin-top:8px"><div class="kv"><span>Amount</span><b>${peso(c.amt)}</b></div><div class="kv"><span>Payment Method</span><b>JenPay Wallet</b></div><div class="kv"><span>Wallet Balance</span><b>${peso(state.bal)}</b></div></div>
<div class="note">Please enter your 4-digit PIN to confirm payment. (Demo: any PIN works)</div>
<div class="pins">${[0, 1, 2, 3].map(i => `<input type="password" inputmode="numeric" maxlength="1" aria-label="PIN digit ${i + 1}" oninput="pinNext(this)">`).join('')}</div>
<div class="err" id="err" style="text-align:center"></div>
<div style="margin-top:auto"><button class="btn" onclick="doConfirm()">Confirm</button><button class="btn ghost" onclick="navigate('${c.kind}')">Cancel</button></div></div>`
      ;  
},

  success: () => {
    const c = state.ctx; return `<div class="scr" style="text-align:center"><div class="check"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></div>
<h2 style="font-size:22px">Payment Successful!</h2><p style="color:var(--mute);margin:6px 0 20px">You ${c.kind === 'send' ? 'sent' : 'paid'} <b style="color:var(--ink)">${peso(c.amt)}</b> to<br><b style="color:var(--ink)">${c.name}</b></p>
<div style="background:var(--soft);border-radius:12px;padding:8px 14px;text-align:left"><div class="kv"><span>Transaction ID</span><b>${c.id}</b></div><div class="kv"><span>Date &amp; Time</span><b>${c.date}</b></div><div class="kv"><span>Payment Method</span><b>JenPay Wallet</b></div></div>
<div style="margin-top:auto"><button class="btn" onclick="navigate('home')">Back to Home</button><button class="btn ghost" style="border:0;color:var(--ink)" onclick="navigate('history')">View Receipt</button></div></div>`;  
},

  qr: () => {
    const g = [...Array(81)].map((_, i) => `<i class="${(i * 7 + i % 5 * 3) % 3 === 0 ? 'o' : ''}"></i>`).join(''); return `<div class="scr">${backHeader('home')}QR Payment</h2></div>
<div class="tabs2"><button class="${state.qrTab === 'scan' ? 'on' : ''}" onclick="state.qrTab='scan';navigate('qr')">Scan QR</button><button class="${state.qrTab === 'code' ? 'on' : ''}" onclick="state.qrTab='code';navigate('qr')">Enter Code</button></div>
${state.qrTab === 'scan' ? `<div class="qr" onclick="simulateScan()" role="button" tabindex="0" onkeydown="if(event.key==='Enter')simulateScan()"><div><div class="qrb">${g}</div>Scan the merchant's QR code<br><small>(tap to simulate a scan)</small></div></div>`
        : `<label class="l" for="code">Merchant code</label><input class="in" id="code" placeholder="e.g. CAFE-0123" value="CAFE-0123"><button class="btn" onclick="simulateScan()">Find merchant</button>`}
<p style="text-align:center;margin-top:16px;font-size:13px;color:var(--pri)">Or enter code manually</p></div>`;  
},

  history: () => {
    const f = ['All', 'Payments', 'Transfers', 'Top-ups']; const l = state.tx.filter(t => state.filter === 'All' || t.k === state.filter); return `<div class="scr">${backHeader('home')}Transactions</h2></div>
<div class="tabs2">${f.map(x => `<button class="${state.filter === x ? 'on' : ''}" onclick="state.filter='${x}';navigate('history')">${x}</button>`).join('')}</div>
<div style="margin-top:10px">${l.length ? rows(l) : '<p style="color:var(--mute);text-align:center;margin-top:40px">No transactions yet.</p>'}</div></div>${bottomNav('')}`
      ;  
},

  profile: () => `<div class="scr">${backHeader('home')}Profile</h2></div>
<div style="display:flex;align-items:center;gap:14px;margin-bottom:12px"><div class="av" style="background:var(--pri);width:64px;height:64px">👩</div><div><b style="font-size:18px">Jenny Lausa</b><br><small style="color:var(--mute)">jennylausa@gmail.com</small></div></div>
${[['✏️', 'Edit Profile'], ['🔑', 'Change Password'], ['🛡️', 'Security (PIN / OTP)'], ['🏦', 'Linked Accounts'], ['🔔', 'Notification Settings'], ['ℹ️', 'About JenPay']].map(([e, l]) => `<div class="row" style="cursor:pointer"><span>${e}</span><div class="t"><b style="font-weight:500">${l}</b></div>›</div>`).join('')}
<button class="btn out" style="margin-top:auto" onclick="navigate('login')">Log Out</button></div>${bottomNav('profile')}`,

  admin: () => `<div class="adm"><aside class="side"><img class="slg" alt="JenPay" src="assets/logo.png">${['Dashboard', 'Merchants', 'Transactions', 'Users', 'Settings'].map((x, i) => `<a class="${i ? '' : 'on'}">${x}</a>`).join('')}<a style="margin-top:auto" onclick="navigate('login')">Logout</a></aside>
<section class="main"><h2>Merchant Dashboard</h2><div class="stats"><div><small>Total Sales</small><b>₱ 12,450.00</b></div><div><small>Today's Transactions</small><b>48</b></div></div>
<b>Recent Payments</b><div class="tw"><table><tr><th>Date &amp; Time</th><th>Merchant</th><th>Amount</th><th>Status</th></tr>
${[['Sep 23, 10:24 AM', 'Campus Café', 120], ['Sep 23, 09:12 AM', 'TechMart', 250], ['Sep 22, 06:30 PM', 'Sari-Sari Store', 75], ['Sep 22, 02:15 PM', 'Laundry Hub', 100], ['Sep 21, 11:45 AM', 'Food Express', 180]].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${peso(r[2])}</td><td><span class="pill">Success</span></td></tr>`).join('')}</table></div></section></div>`
};

// ======================================================================
// Navigation & actions
// ======================================================================

/** Current time as "10:24 AM". */
const clockTime = () =>
  new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/**
 * Add a transaction to the top of the history.
 * @param {{n: string, s: string, a: number, i: string, k: string}} t
 */
function addTransaction({ n, s, a, i, k }) {
  state.tx.unshift({ n, s, a, i, k, d: `Today, ${clockTime()}` });
}

/** Render a screen into the app frame. @param {string} name Key of `screens`. */
function navigate(name) {
  const frame = $('frame');
  frame.className = name === 'admin' ? 'wide' : '';
  frame.innerHTML = screens[name]();

  const firstInput = frame.querySelector('input.in');
  if (firstInput && !firstInput.value && name !== 'login') firstInput.focus();
}

/** Show a validation message in #err. Always returns false. */
function showError(message) {
  $('err').textContent = message;
  return false;
}

/**
 * Validate the form, store the pending transaction and open the PIN screen.
 * @param {'pay'|'send'|'buy'} kind
 */
function toConfirm(kind, name, sub) {
  const amt = parseFloat($('amt').value);

  if (kind === 'send') {
    name = $('to').value.trim();
    sub = 'Money Transfer';
    if (!name) return showError('Enter who you are sending to.');
  }
  if (!(amt > 0)) return showError('Enter an amount greater than zero.');
  if (amt > state.bal) return showError('Amount is more than your wallet balance.');

  state.ctx = { kind, name, sub, amt };
  navigate('confirm');
}

/** Move focus to the next PIN box after a digit is typed. */
function pinNext(input) {
  if (input.value && input.nextElementSibling) input.nextElementSibling.focus();
}

/** Check the PIN, deduct the balance and log the transaction. */
function doConfirm() {
  const pin = [...document.querySelectorAll('.pins input')].map(i => i.value).join('');
  if (pin.length < 4) return showError('Enter all 4 digits of your PIN.');

  const tx = state.ctx;
  const now = new Date();
  const isSend = tx.kind === 'send';

  state.bal -= tx.amt;
  tx.id = `#TXN${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`;
  tx.date = now.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });

  addTransaction({
    n: tx.name,
    s: isSend ? 'Money Transfer' : 'Payment',
    a: -tx.amt,
    i: isSend ? '✈️' : tx.kind === 'buy' ? '🛒' : '☕',
    k: isSend ? 'Transfers' : 'Payments'
  });
  navigate('success');
}

/** Add money to the wallet and log the deposit. */
function doTopup() {
  const amount = parseFloat($('amt').value);
  if (!state.method) return showError('Choose a top-up method.');
  if (!(amount > 0)) return showError('Enter an amount greater than zero.');

  state.bal += amount;
  addTransaction({ n: 'Wallet Top Up', s: 'Deposit', a: amount, i: '＋', k: 'Top-ups' });
  state.method = '';
  navigate('home');
}

/** Credit the wallet with money received from another user. */
function doReceive() {
  const amount = parseFloat($('amt').value);
  if (!(amount > 0)) return showError('Enter the amount received.');

  state.bal += amount;
  addTransaction({
    n: `Received from ${$('from').value || 'Sender'}`,
    s: 'Money Transfer', a: amount, i: '⬇️', k: 'Transfers'
  });
  navigate('home');
}

/** Demo only: pretend a merchant QR code was scanned. */
function simulateScan() {
  navigate('pay');
}

// ======================================================================
// Boot
// ======================================================================
navigate('splash');
