const AUTH_URL = '/api/auth';
const IRRIGATION_URL = '/api/irrigation';

const $ = (id) => document.getElementById(id);
let token = sessionStorage.getItem('token');

function showMessage(text, isError = false) {
  const el = $('message');
  el.textContent = text;
  el.className = isError ? 'error' : 'success';
}

function render() {
  const connected = Boolean(token);
  $('auth-section').hidden = connected;
  $('app-section').hidden = !connected;
  $('logout').hidden = !connected;
}

function logout(text = 'Vous êtes déconnecté.') {
  token = null;
  sessionStorage.removeItem('token');
  render();
  showMessage(text);
}

async function api(url, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && token) {
    logout('Session expirée, reconnectez-vous.');
  }
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`);
  }
  return data;
}

function credentials() {
  return { email: $('email').value.trim(), password: $('password').value };
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await api(`${AUTH_URL}/login`, credentials());
    token = data.token;
    sessionStorage.setItem('token', token);
    render();
    showMessage('Connexion réussie.');
  } catch (err) {
    showMessage(err.message, true);
  }
});

$('register-btn').addEventListener('click', async () => {
  try {
    await api(`${AUTH_URL}/register`, credentials());
    showMessage('Compte créé. Vous pouvez maintenant vous connecter.');
  } catch (err) {
    showMessage(err.message, true);
  }
});

$('parcelle-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const parcelle = await api(`${IRRIGATION_URL}/parcelles`, {
      nom: $('p-nom').value.trim(),
      surface_ha: Number($('p-surface').value),
      culture: $('p-culture').value.trim(),
    });
    showMessage(`Parcelle « ${parcelle.nom} » créée (numéro ${parcelle.id}).`);
    e.target.reset();
  } catch (err) {
    showMessage(err.message, true);
  }
});

$('arrosage-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const arrosage = await api(`${IRRIGATION_URL}/arrosages`, {
      parcelle_id: Number($('a-parcelle').value),
      date_arrosage: $('a-date').value,
      duree_min: Number($('a-duree').value),
      volume_l: Number($('a-volume').value),
    });
    showMessage(`Arrosage planifié le ${arrosage.date_arrosage} (numéro ${arrosage.id}).`);
    e.target.reset();
  } catch (err) {
    showMessage(err.message, true);
  }
});

$('logout').addEventListener('click', () => logout());

render();