# MVP Test Guide (Short)

Use this guide to quickly validate the end-to-end marketplace and traceability flow.

## 1) Start the app

- Run: `npm install`
- Run: `npm run dev`
- Open: `http://localhost:3000/login`

## 2) Login and role checks

- On login cards, confirm relevant users show:
  - `Bank approved` or `Bank approval required`
- Log in as these key roles during testing:
  - `processor`
  - `lab`
  - `exporter`
  - `importer`
  - `bank`
  - `admin`
  - `reviewer` (shown as Reviewer, read-only)

## 3) Core happy-path flow

1. **Processor**
   - Go to `Processor workspace`.
   - Use **Assign transporter and lab (one step)**.
   - Expected: lot moves to lab queue.

2. **Lab**
   - Open `Lab` dashboard.
   - Confirm received lot appears in queue.
   - Submit lab result (Approved/Failed).
   - Expected: submit succeeds and returns to previous page.

3. **Processor / Exporter / Importer (Discovery creation)**
   - Go to `Create RFQ` (`/trade/rfqs/new`).
   - For processor:
     - select source lots from processed outputs only
     - use lot filter: with/without lab results
   - Set opportunity type (`RFQ`, `IOI`, or `AUCTION`) and publish.
   - Expected: redirected to Discovery, new opportunity visible immediately.

4. **Bid + selection**
   - Log in as counterparty and submit bid on an open opportunity.
   - RFQ owner selects winning bid.
   - Expected: RFQ closes, trade created, events recorded.

## 4) Bank controls to validate

- Go to `Bank > Onboarding`.
- Check **Approved traders registry** appears with activity counts.
- Open a review detail and verify **Applicant 360 profile** data.
- Confirm unapproved users are blocked from marketplace actions.

## 5) Rules your team should verify

- Opportunity creator must be **bank-approved**.
- Source lots used for processor opportunity creation must be:
  - processed outputs
  - owned by the creator
- Bidding and bid selection require bank-approved counterparties.

## 6) Admin vs Reviewer behavior

- **Admin**
  - Full CRUD/settings/integrity/role monitor access.
  - Role monitor has role selection on left + iframe preview on right.
- **Reviewer**
  - Read-only reports, lineage, traceability, transaction oversight.
  - No create/update/delete actions.

## 7) Quick troubleshooting

- If a newly created opportunity is not visible:
  - refresh Discovery page once
  - confirm create request succeeded (no red error banner)
- If action is blocked:
  - check bank approval badge/status for involved users
  - verify selected lots are eligible and owned by creator
