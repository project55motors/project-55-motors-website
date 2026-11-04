# VAT stock book deployment and operation

The dashboard now collects purchase records before adding a vehicle, supports both Margin scheme and Normal VAT treatment, and provides a Stock book / Print action on every saved vehicle. Mark sold opens the sale form. The worker also rejects Sold status through the ordinary update route until purchase and sale/disposal records are complete.

## Airtable

Created in Project 55 Motors Stock (`appVAAHvoflxItzMY`): **VAT Stock Book**, table ID `tbl3Z4BJLkDB3BjaB`.

This table is intentionally separate from Cars. The existing public cars-api worker publishes all fields from Cars. Do not put seller/buyer names, addresses or purchase prices in Cars, or point the public API at the new table.

- Stock_Number: Airtable auto-number; assigned by Airtable, never by a browser or KV counter. Margin and Normal VAT records share this unique sequence. Do not delete or renumber entries. Airtable can leave gaps after deletions; retain and explain void entries.
- Car_ID: existing Cars record ID, used only by the authenticated worker.
- Make_Model, Purchase_Registration, Registration, VIN: purchase-time snapshot of existing vehicle fields. The printout also reads the car's current registration, so a subsequent plate change does not erase the purchase registration. Retain documentation for changes. This is a single acquisition per Cars record; create a fresh Cars record if you buy back a previously sold vehicle.
- VAT_Treatment: Margin scheme or Normal VAT. Eligibility confirmation is mandatory for margin purchases.
- Purchase_Date, Purchase_Invoice_Number, Purchase_Invoice_Self_Issued, Purchase_Price, Seller_Name, Seller_Address.
- Sale_Date, Sales_Invoice_Number, Selling_Price, Buyer_Name, Buyer_Address, Disposal_Method.
- Margin and VAT_Due: formulas restricted to completed margin sales. Normal VAT, unsold and non-sale disposal records produce blank results. Set their Airtable display formatting to two decimal places if Airtable shows whole pounds; the printout always formats GBP to two decimals.

The only live changes made during development are this empty table and its fields. No existing car, purchase or sale records were edited or fabricated.

## Deployment

1. Back up the currently deployed Cloudflare admin-worker. The updated `admin-worker.js` starts from the user's uploaded worker, which is newer than the GitHub copy; it preserves its AI, PDI and login behavior.
2. Ensure the existing Cloudflare `AIRTABLE_PAT` has record read/write access to the new table in the same base. Keep `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_NAME` (Cars), session KV and other existing bindings. Optionally set `AIRTABLE_STOCK_BOOK_TABLE=tbl3Z4BJLkDB3BjaB`; that is also the code's default. Never change the public API's table binding.
3. Deploy the updated admin worker to the existing `/api/*` route. No extra Worker imports or packages are needed.
4. Publish `admin-dashboard.html`, `admin-dashboard.js` and new `stock-book.js` together to the existing website. The HTML includes versioned script URLs. Do not publish the test files as website pages.
5. Log in and test a real purchase: complete the purchase form, verify both records in Airtable, open Stock book / Print, and use the browser's Print / Save as PDF action. Unsold cars correctly show pending sale information. Verify normal VAT records carry no margin calculation. A live browser smoke test is still required: the local Chromium process was blocked by the execution sandbox before it could start.

Neither the website nor Cloudflare worker was deployed during development. The GitHub change is a draft for review.

## Existing stock and failures

Existing vehicles have no stock book until you open Stock book / Print and enter their actual purchase details. Do not invent past dates, prices or seller details. Legacy cars cannot be marked sold until their records are completed. Existing Sold cars require completed sale/disposal details when their stock book is saved.

Cars and the stock book are two Airtable records, so creating them cannot be atomic. If the car is created but the stock book write fails, the worker returns `vehicleCreated` and the car ID. The dashboard reloads and opens the existing car's stock book with the entered purchase details retained in memory. **Do not add the car again.** Correct access or connectivity, then save its stock book. An ambiguous network timeout may require checking Airtable before retrying; the feature does not claim transactional or exactly-once creation. Duplicate Car_ID entries fail closed and must be resolved in Airtable. No automatic deletion or financial record cleanup runs.

Do not use a non-sale disposal reason for a sale. For non-sale disposal, record the date and method, clear sale invoice/price fields, and review the separate tax treatment. The feature intentionally does not calculate VAT on that disposal.

## HMRC scope

Requirements checked against current official guidance on 4 November 2026:

- https://www.gov.uk/vat-margin-schemes/keeping-records
- https://www.gov.uk/guidance/buying-and-selling-second-hand-motor-vehicles-using-the-vat-margin-scheme

The record includes the numerical stock reference, purchase date/invoice/price/seller, vehicle description and registration (or VIN), later sale date/invoice/price/buyer, margin and VAT due. Seller and buyer addresses are collected to support the invoice records as well. A purchase invoice number can be omitted only when the dealer made out the purchase invoice. Sale details cannot be known at purchase and are collected later. Actual selling price is separate from the advertised Price field.

For ordinary eligible UK margin scheme sales at 20%, VAT is one-sixth of a positive gross margin, rounded to pennies; zero/negative margins incur zero margin VAT. Preparation, repairs and overheads must not be added to purchase price. Separate charges, part exchanges, finance sales and exceptional circumstances must use the correct vehicle consideration from the invoices. Normal VAT purchases and sales are recorded separately by treatment, with no normal VAT return/invoice calculation in this feature. Zero-rated adapted-vehicle sales, imports, Northern Ireland movements, sale-or-return and other special arrangements need separate review; selecting the margin option is not an automatic eligibility determination.

The printout is an **internal stock book record**, not a VAT invoice. Retain compliant purchase and sales invoices separately, including business name/address and VAT number where required. Keep VAT records for six years and keep older unsold stock records until the vehicle is sold. This feature has no deletion or expiry job.

## Verification

Run `node stock-book.test.mjs`: 13 mocked worker integration tests cover authentication, required fields, invoice exception, margin/normal treatment, sale status enforcement, date/price validation, calculations, escaped print output, plate changes, disposal, pagination and partial writes. No tests write live vehicle data.

`stock-book.browser-test.cjs` requires Playwright and Chromium and exercises purchase/sale forms, cancellation and mobile layout. It is provided for an environment where browser processes can run; local execution here was blocked by sandbox socket restrictions.
