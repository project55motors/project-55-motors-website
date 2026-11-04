import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./admin-worker.js', import.meta.url), 'utf8');
const worker = (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
const cars = new Map();
const books = new Map();
let writes, failBook, pages;
const env = { AIRTABLE_BASE_ID: 'appTest', AIRTABLE_TABLE_NAME: 'Cars', AIRTABLE_PAT: 'test', AIRTABLE_STOCK_BOOK_TABLE: 'Books', ADMIN_SESSIONS_KV: { get: async () => 'valid' } };
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
beforeEach(() => {
  cars.clear(); books.clear(); writes = []; failBook = false; pages = false;
  globalThis.fetch = async (url, options = {}) => {
    const u = new URL(url);
    const [, table, id] = u.pathname.split('/').slice(2);
    const store = table === 'Books' ? books : cars;
    const method = options.method || 'GET';
    if (table === 'Books' && failBook) return response({ error: { message: 'Access denied' } }, 403);
    if (method === 'GET') {
      if (id) return store.has(id) ? response({ id, fields: store.get(id) }) : response({}, 404);
      if (table === 'Books') {
        const carId = u.searchParams.get('filterByFormula')?.match(/'([^']+)'/)?.[1];
        return response({ records: [...books].filter(([, b]) => b.Car_ID === carId).map(([id, fields]) => ({ id, fields })) });
      }
      if (pages) return response(u.searchParams.has('offset') ? { records: [{ id: 'recSecond', fields: { Make_Model: 'Second' } }] } : { records: [{ id: 'recFirst', fields: { Make_Model: 'First' } }], offset: 'next' });
      return response({ records: [...cars].map(([id, fields]) => ({ id, fields })) });
    }
    const fields = JSON.parse(options.body).fields;
    writes.push({ table, method, fields });
    const key = id || `rec${table}${store.size + 1}`;
    store.set(key, { ...(store.get(key) || {}), ...(table === 'Books' && !id ? { Stock_Number: store.size + 1 } : {}), ...fields });
    return response({ id: key, fields: store.get(key) });
  };
});
const purchase = () => ({ VAT_Treatment: 'Margin scheme', Purchase_Date: '2026-11-01', Purchase_Price: 6000, Seller_Name: 'Seller', Seller_Address: '1 Street', Purchase_Invoice_Number: 'P1', Eligibility_Confirmed: true });
const car = () => ({ Make_Model: 'Test car', Registration: 'AB12CDE', Status: 'Available', Price: 9999 });
const sale = () => ({ Sale_Date: '2026-11-04', Selling_Price: 7200, Buyer_Name: 'Buyer', Buyer_Address: '2 Street', Sales_Invoice_Number: 'S1' });
async function request(path, body, auth = true) {
  return worker.fetch(new Request(`https://example.test${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { ...(auth ? { Cookie: '__Host-p55admin=session' } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), env);
}
test('private stock book requires a session, including print', async () => {
  for (const suffix of ['', '?print=1']) assert.equal((await request('/api/stock-book/recCar' + suffix, undefined, false)).status, 401);
  assert.equal(writes.length, 0);
});
test('create rejects missing purchase fields before writing either table', async () => {
  const result = await request('/api/create', { fields: car() });
  assert.equal(result.status, 422); assert.equal(writes.length, 0);
});
test('purchase validation rejects invalid dates, negative / excess-precision prices and unconfirmed eligibility', async () => {
  for (const patch of [{ Purchase_Date: '2026-02-30' }, { Purchase_Price: -1 }, { Purchase_Price: 1.001 }, { Eligibility_Confirmed: false }, { Seller_Address: ' ' }, { Purchase_Invoice_Number: '' }]) {
    assert.equal((await request('/api/create', { fields: car(), stockBook: { ...purchase(), ...patch } })).status, 422);
  }
  assert.equal(writes.length, 0);
});
test('creates public car without accounting fields and private linked stock book', async () => {
  const result = await request('/api/create', { fields: car(), stockBook: purchase() });
  assert.equal(result.status, 200);
  const data = await result.json();
  assert.equal(cars.get(data.id).Seller_Name, undefined);
  const book = [...books.values()][0];
  assert.equal(book.Car_ID, data.id); assert.equal(book.Stock_Number, 1);
  assert.equal(book.Purchase_Registration, 'AB12CDE');
  assert.equal(book.Selling_Price, undefined); // never takes advertised Price
});
test('VIN is accepted without registration; self-issued invoice exception and normal VAT are supported', async () => {
  const result = await request('/api/create', { fields: { ...car(), Registration: '', VIN: 'VIN123' }, stockBook: { ...purchase(), VAT_Treatment: 'Normal VAT', Eligibility_Confirmed: false, Purchase_Invoice_Number: null, Purchase_Invoice_Self_Issued: true } });
  assert.equal(result.status, 200);
});
test('sale status cannot bypass stock book checks using the generic update route', async () => {
  cars.set('recCar', car());
  assert.equal((await request('/api/update/recCar', { Status: 'Sold' })).status, 422);
  books.set('recBook', { ...purchase(), Car_ID: 'recCar', Stock_Number: 1 });
  assert.equal((await request('/api/update/recCar', { Status: 'Sold' })).status, 422);
  assert.equal(cars.get('recCar').Status, 'Available');
});
test('sale requires actual invoice price and buyer details; date cannot precede purchase', async () => {
  cars.set('recCar', car()); books.set('recBook', { ...purchase(), Car_ID: 'recCar', Stock_Number: 1 });
  for (const patch of [{ Selling_Price: null }, { Buyer_Name: '' }, { Buyer_Address: '' }, { Sales_Invoice_Number: '' }, { Sale_Date: '2026-10-31' }]) {
    assert.equal((await request('/api/stock-book/recCar', { fields: { ...sale(), ...patch }, markSold: true })).status, 422);
  }
  assert.equal(writes.length, 0);
});
test('saved sale enables sold status and print calculates £200 VAT on £1200 margin', async () => {
  cars.set('recCar', car()); books.set('recBook', { ...purchase(), Car_ID: 'recCar', Stock_Number: 42, Make_Model: 'Test car', Purchase_Registration: 'AB12CDE' });
  assert.equal((await request('/api/stock-book/recCar', { fields: sale(), markSold: true })).status, 200);
  assert.equal((await request('/api/update/recCar', { Status: 'Sold' })).status, 200);
  const print = await request('/api/stock-book/recCar?print=1');
  assert.equal(print.headers.get('Cache-Control'), 'no-store');
  const html = await print.text(); assert.match(html, /£1,200\.00/); assert.match(html, /£200\.00/); assert.doesNotMatch(html, /Incomplete record/);
});
test('zero and negative margins yield zero VAT; normal VAT has no margin calculation', async () => {
  cars.set('recCar', car());
  for (const price of [6000, 5000]) {
    books.set('recBook', { ...purchase(), ...sale(), Selling_Price: price, Car_ID: 'recCar', Stock_Number: 1 });
    assert.match(await (await request('/api/stock-book/recCar?print=1')).text(), /Margin scheme VAT due<\/th><td>£0\.00/);
  }
  books.set('recBook', { ...purchase(), ...sale(), VAT_Treatment: 'Normal VAT', Car_ID: 'recCar', Stock_Number: 1 });
  const html = await (await request('/api/stock-book/recCar?print=1')).text();
  assert.match(html, /Normal VAT purchase \/ sale record/); assert.match(html, /Margin scheme VAT due<\/th><td>Pending \/ not applicable/);
});
test('print escapes stored data and displays original and changed registrations', async () => {
  cars.set('recCar', { ...car(), Registration: 'NEW123' });
  books.set('recBook', { ...purchase(), Car_ID: 'recCar', Stock_Number: 1, Seller_Name: '<script>alert(1)</script>', Make_Model: 'Car', Purchase_Registration: 'OLD123' });
  const html = await (await request('/api/stock-book/recCar?print=1')).text();
  assert.doesNotMatch(html, /<script>/); assert.match(html, /&lt;script&gt;/); assert.match(html, /OLD123/); assert.match(html, /NEW123/); assert.match(html, /Pending — unsold/);
});
test('disposal records close without sale VAT; contradictory sale details are rejected', async () => {
  cars.set('recCar', car()); books.set('recBook', { ...purchase(), Car_ID: 'recCar', Stock_Number: 1 });
  assert.equal((await request('/api/stock-book/recCar', { fields: { Sale_Date: '2026-11-04', Disposal_Method: 'Transferred to scrap accounting' } })).status, 200);
  assert.equal((await request('/api/stock-book/recCar', { fields: { Selling_Price: 300 } })).status, 422);
});
test('partial create failure returns the existing car ID for repair, without claiming success', async () => {
  failBook = true;
  const result = await request('/api/create', { fields: car(), stockBook: purchase() });
  assert.equal(result.status, 502); const data = await result.json();
  assert.equal(data.vehicleCreated, true); assert.ok(cars.has(data.id)); assert.equal(cars.size, 1);
});
test('all stock pages are loaded and duplicate stock book entries fail closed', async () => {
  pages = true; assert.equal((await (await request('/api/all')).json()).length, 2);
  cars.set('recCar', car());
  books.set('recBook1', { Car_ID: 'recCar' }); books.set('recBook2', { Car_ID: 'recCar' });
  assert.equal((await request('/api/stock-book/recCar')).status, 502);
});
