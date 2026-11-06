// Run with the emulators and dev server up:
//   npx firebase emulators:start --only auth,firestore --project demo-task-table
//   VITE_USE_EMULATORS=1 npx vite --port 5173
//   node tests/e2e/e2e.cjs   (needs Playwright + Chromium)
// End-to-end check against the Firebase emulators + Vite dev server.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = require('path').join(require('os').tmpdir(), 'task-table-e2e');
const AUTH = 'http://127.0.0.1:9099';
const PROJECT = 'demo-task-table';
const ADMIN = 'karasuleyman125@gmail.com';
const PASS = 'test-password-123';
require('fs').mkdirSync(OUT, { recursive: true });

async function api(path, body, owner = false) {
  const res = await fetch(AUTH + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(owner ? { authorization: 'Bearer owner' } : {}) },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function step(name, fn) {
  try {
    await fn();
    console.log('PASS', name);
  } catch (e) {
    console.log('FAIL', name, '-', e.message.split('\n')[0]);
    throw e;
  }
}

(async () => {
  // fresh state
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  const su = await api('/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', { email: ADMIN, password: PASS, returnSecureToken: true });
  await api(`/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, { localId: su.localId, emailVerified: true }, true);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

  try {
    await step('login page loads', async () => {
      await page.goto('http://127.0.0.1:5173/');
      await page.getByRole('button', { name: /Giriş bağlantısı gönder/ }).waitFor({ timeout: 15000 });
      await shot('01-login');
    });

    await step('not-invited email is refused', async () => {
      await page.getByLabel('E-posta').first().fill('zeynep@ornek.com');
      await page.getByRole('button', { name: /Giriş bağlantısı gönder/ }).click();
      await page.getByText(/davetli değil/).waitFor({ timeout: 10000 });
      await shot('02-denied');
    });

    await step('admin signs in with password', async () => {
      await page.getByRole('button', { name: /Yönetici misiniz/ }).click();
      await page.getByLabel('E-posta').first().fill(ADMIN);
      await page.getByLabel('Şifre').fill(PASS);
      await page.getByRole('button', { name: /^Giriş yap$/ }).click();
      await page.getByText('Hemen yap').first().waitFor({ timeout: 15000 });
      await shot('03-admin-empty');
    });

    await step('admin creates a project', async () => {
      await page.goto('http://127.0.0.1:5173/#projeler');
      await page.getByLabel('Proje adı').fill('Web Sitesi');
      await page.getByRole('button', { name: /Projeyi ekle/ }).click();
      await page.locator('.row', { hasText: 'Web Sitesi' }).first().waitFor({ timeout: 10000 });
      await shot('04-projects');
    });

    await step('admin adds a member', async () => {
      await page.goto('http://127.0.0.1:5173/#kisiler');
      const add = page.getByRole('button', { name: /^Kişi ekle$/ });
      if (await add.count()) await add.first().click();
      await page.getByLabel('Ad soyad').fill('Ayşe Demir');
      await page.getByLabel('E-posta').fill('ayse@ornek.com');
      await page.locator('.chip', { hasText: 'Web Sitesi' }).first().click();
      await page.getByRole('button', { name: /Kişiyi ekle/ }).click();
      await page.locator('.row', { hasText: 'ayse@ornek.com' }).first().waitFor({ timeout: 10000 });
      await shot('05-people');
    });

    await step('admin creates a task assigned to Ayşe', async () => {
      await page.goto('http://127.0.0.1:5173/#');
      await page.getByRole('button', { name: /Yeni görev/ }).first().click();
      await page.locator('.dialog').getByLabel('Görev', { exact: true }).fill('Ödeme sayfasındaki hatayı düzelt');
      await page.locator('.qopt', { hasText: 'Hemen yap' }).click();
      await page.locator('.dialog .chip', { hasText: 'Web Sitesi' }).click();
      await page.locator('.dialog .chip', { hasText: 'Ayşe' }).click();
      await page.getByRole('button', { name: /Görevi ekle/ }).click();
      await page.locator('.card', { hasText: 'Ödeme sayfasındaki' }).first().waitFor({ timeout: 10000 });
      await shot('06-matrix-task');
    });

    await step('filtered view (no project on cards)', async () => {
      await page.locator('.side .nav-btn', { hasText: 'Web Sitesi' }).first().click();
      await page.waitForTimeout(600);
      await shot('06b-filtered');
      await page.locator('.side .nav-btn', { hasText: 'Tüm projeler' }).first().click();
    });

    await step('admin signs out', async () => {
      await page.getByRole('link', { name: /Çıkış/ }).or(page.getByRole('button', { name: /Çıkış/ })).first().click();
      await page.getByRole('button', { name: /Giriş bağlantısı gönder/ }).waitFor({ timeout: 10000 });
    });

    await step('member requests a sign-in link', async () => {
      await page.getByLabel('E-posta').first().fill('ayse@ornek.com');
      await page.getByRole('button', { name: /Giriş bağlantısı gönder/ }).click();
      await page.getByText(/E-postanızı kontrol edin/).waitFor({ timeout: 10000 });
      await shot('07-sent');
    });

    let link;
    await step('emulator received the link', async () => {
      const r = await (await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`)).json();
      const code = (r.oobCodes || []).reverse().find((c) => c.email === 'ayse@ornek.com' && c.requestType === 'EMAIL_SIGNIN');
      if (!code) throw new Error('no oob code');
      link = code.oobLink;
    });

    await step('member signs in from the link and sees the task', async () => {
      await page.goto(link);
      await page.locator('.card', { hasText: 'Ödeme sayfasındaki' }).first().waitFor({ timeout: 20000 });
      await shot('08-member-matrix');
    });

    await step('editor cannot see Kişiler/Projeler nav', async () => {
      const n = await page.locator('.side .nav-btn', { hasText: 'Kişiler' }).count();
      if (n) throw new Error('Kişiler visible for editor');
    });

    await step('member completes the task (undo bar, then Bitenler)', async () => {
      await page.locator('.card', { hasText: 'Ödeme sayfasındaki' }).locator('.check').first().click();
      await page.getByText(/tamamlandı/).first().waitFor({ timeout: 5000 });
      await shot('09-undo');
      await page.waitForTimeout(4600);
      await page.goto('http://127.0.0.1:5173/#bitenler');
      await page.locator('.row', { hasText: 'Ödeme sayfasındaki' }).first().waitFor({ timeout: 10000 });
      await shot('10-done');
    });

    await step('mobile layout renders', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('http://127.0.0.1:5173/#');
      await page.locator('.tabbar').waitFor({ timeout: 10000 });
      await shot('11-mobile');
    });
  } catch (e) {
    await shot('zz-failure');
  }
  console.log('page errors:', errors.length ? errors.slice(0, 5) : 'none');
  await browser.close();
})();
