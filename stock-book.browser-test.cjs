const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-crash-reporter', '--disable-crashpad', '--no-zygote', '--single-process'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 850 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const writes = [];
    await page.route('https://stock.test/**', route => {
      const request = route.request();
      if (request.url().includes('/api/stock-book/')) {
        if (request.method() === 'POST') {
          writes.push(request.postDataJSON());
          return route.fulfill({ json: { ok: true, stockBook: { Stock_Number: 7 } } });
        }
        return route.fulfill({ json: { ok: true, car: { Make_Model: 'Test vehicle', Registration: 'AB12CDE', Status: 'Available' }, stockBook: null } });
      }
      if (request.url().includes('/api/update/')) {
        writes.push(request.postDataJSON());
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body><h1>Admin test</h1></body></html>' });
    });
    await page.goto('https://stock.test/');
    await page.evaluate(() => { window.loadStock = async () => {}; window.refreshPublicStockCache = () => {}; });
    await page.addScriptTag({ content: readFileSync(__dirname + '/stock-book.js', 'utf8') });
    await page.evaluate(() => { window.collectPurchaseDetails({ Make_Model: 'Test car', Registration: 'AB12CDE' }).then(data => { window.purchaseResult = data; }); });
    const form = page.locator('.stockbook-dialog form');
    await page.getByRole('button', { name: 'Save details', exact: true }).click();
    assert.equal(await page.evaluate(() => window.purchaseResult), undefined);
    await form.locator('[name=VAT_Treatment]').selectOption('Margin scheme');
    assert.equal(await form.locator('[name=Eligibility_Confirmed]').isVisible(), true);
    await form.locator('[name=Purchase_Date]').fill('2026-11-01');
    await form.locator('[name=Purchase_Price]').fill('6000.25');
    await form.locator('[name=Seller_Name]').fill('Seller');
    await form.locator('[name=Seller_Address]').fill('1 High Street');
    await form.locator('[name=Purchase_Invoice_Self_Issued]').check();
    await form.locator('[name=Eligibility_Confirmed]').check();
    await page.getByRole('button', { name: 'Save details', exact: true }).click();
    await page.waitForFunction(() => window.purchaseResult);
    const purchase = await page.evaluate(() => window.purchaseResult);
    assert.equal(purchase.Purchase_Price, '6000.25');
    assert.equal(purchase.Purchase_Invoice_Self_Issued, true);
    assert.equal(purchase.Selling_Price, null);
    assert.equal(await page.locator('dialog').count(), 0);
    await page.evaluate(() => window.openStockBook('recCar', true, window.purchaseResult));
    await page.locator('dialog').waitFor();
    assert.equal(await form.locator('[name=hasSale]').isChecked(), true);
    assert.equal(await form.locator('[name=hasSale]').isDisabled(), true);
    await page.getByRole('button', { name: 'Save details and mark sold' }).click();
    assert.equal(writes.length, 0);
    for (const [name, value] of Object.entries({ Sale_Date: '2026-11-04', Selling_Price: '7200.25', Buyer_Name: 'Buyer', Buyer_Address: '2 High Street', Sales_Invoice_Number: 'S1' })) await form.locator(`[name=${name}]`).fill(value);
    await page.getByRole('button', { name: 'Save details and mark sold' }).click();
    await page.waitForFunction(() => !document.querySelector('dialog'));
    assert.equal(writes.length, 2);
    assert.equal(writes[0].markSold, true);
    assert.equal(writes[1].Status, 'Sold');
    await page.evaluate(() => { window.collectPurchaseDetails({ Make_Model: 'Normal VAT car', Registration: 'VAT123' }).then(data => { window.cancelResult = data; }); });
    await form.locator('[name=VAT_Treatment]').selectOption('Normal VAT');
    assert.equal(await form.locator('[name=Eligibility_Confirmed]').isVisible(), false);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('.stockbook-grid').first().evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length), 1);
    await page.screenshot({ path: __dirname + '/stock-book-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await page.evaluate(() => window.cancelResult), null);
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: required purchase fields, margin eligibility, self-issued invoice, sale gate, saved sale then status update, normal VAT, mobile layout and cancellation.');
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exit(1); });
