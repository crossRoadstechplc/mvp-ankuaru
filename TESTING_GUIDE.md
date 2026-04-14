# MVP Test Guide

Use this guide to validate **traceability** (origin → processing → lab) and the **marketplace** (Discovery, RFQs, trades, bank) end-to-end. Roles build on each other in order where noted.

---

## 1) Start the app

- Run: `npm install`
- Run: `npm run dev`
- Open: `http://localhost:3000/login`

---

## 2) Login, bank badges, and roles to exercise

### Bank approval on login cards

- Users in **processor / exporter / importer** lanes should show **`Bank approved`** or **`Bank approval required`** (seed data mixes both).

### Roles (log in as each during a full pass)

| Area | Role (app) | Example seed user | Notes |
|------|------------|-------------------|--------|
| Origin | **Farmer** | Alemu Bekele (`user-farmer-001`) | Fields + picks (origin lots). |
| Consolidation | **Aggregator** | Selam Trading Cooperative | Lot validation + aggregation. |
| Processing | **Processor** | Yirgacheffe Wash Station | Processing runs; can assign to lab in one step. |
| Logistics | **Transporter** | Abeba Logistics | Dispatch + receipt (custody moves). |
| Quality | **Lab** | Coffee Quality Lab Addis | Lab queue + results. |
| Sell side | **Exporter** | Blue Nile Export PLC | RFQs, bids, trades. |
| Buy side | **Importer** | Harbor Roasters GmbH | RFQs, bids, trades. |
| Finance | **Bank** | Ankuaru Trade Finance Bank | Onboarding + trade financing. |
| Platform | **Admin** | Platform Admin | CRUD, integrity, role monitor. |
| Oversight | **Regulator** (Reviewer) | Ethiopian Coffee Regulator | Read-only reports / discovery / lots. |

Also spot-check **inactive / onboarding** users (e.g. Pending Importer LLC) where the UI shows blocked or limited access.

---

## 3) Traceability spine (recommended order)

This is the **physical flow** before or alongside trade. Complete at least once.

### 3.1 Farmer — fields and picks

1. Log in as a **farmer** (e.g. Alemu Bekele).
2. **Fields** → `/farmer/fields`  
   - Draw a polygon for a new plot (or edit an existing one).  
   - **Expected:** save succeeds; boundary must **not** overlap another farmer’s saved field (warning + blocked save if it does). Toast confirms success.
3. **Lots / Pick creation** → `/farmer/lots`  
   - Choose a field, enter pick weight (kg), optional harvest metadata.  
   - **Expected:** new origin lot + `PICK` on the ledger; toast; lot appears in “Your picks”.

### 3.2 Aggregator — validate farmer-origin lots

1. Log in as **aggregator** (e.g. Selam Trading Cooperative).
2. **Lot validation** → `/aggregator/lot-validation` (or from home **Aggregator priority** when PENDING picks exist).  
   - Open a lot that is **farmer-held** and **PENDING** validation.  
   - Submit **Validated** or **Rejected** with observed weight / notes.  
   - **Expected:** lot validation status updates; toast on success.
3. **Farmer lots** (optional) → `/farmer/lots` as aggregator to review **all** farmer-origin lots.

### 3.3 Aggregator — create aggregated lot

1. Still as **aggregator**, open **Create aggregation** → `/actions/create-aggregation?role=aggregator` (or sidebar).  
2. Select **two or more** eligible source lots (validated / pipeline rules per UI).  
3. Set output weight and form; submit.  
   - **Expected:** new output lot + `AGGREGATE` event; toast; downstream steps use this lot.

### 3.4 Processor — record processing

1. Log in as **processor**.  
2. **Processor workspace** → `/processor` and **Record processing** → `/processor/record`.  
3. Choose a lot in **READY_FOR_PROCESSING** (typical handoff after aggregation), enter mass-balanced outputs / byproducts.  
   - **Expected:** `PROCESS` event; output lots; toast.

### 3.5 Transporter — dispatch and receipt (explicit path)

Use this to exercise **ledger custody** separate from the processor “assign to lab” shortcut.

1. Log in as **transporter**.  
2. **Record dispatch** → `/transport/dispatch`  
   - Pick lot, transporter, vehicle, driver; submit.  
   - **Expected:** lot **IN_TRANSIT**; toast.  
3. **Record receipt** → `/transport/receipt`  
   - Pick in-transit lot, next custodian (e.g. exporter/lab per scenario); submit.  
   - **Expected:** custody handoff; toast.

*(Alternatively, from **processor** workspace, **Assign transporter and lab (one step)** still covers dispatch + receipt to lab in one flow.)*

### 3.6 Processor → Lab (happy path shortcut)

1. As **processor**, **Processor workspace** → `/processor`.  
2. Use **Assign transporter and lab (one step)**.  
   - **Expected:** lot reaches **lab** custody / queue; toasts on success.

### 3.7 Lab — queue and result

1. Log in as **lab**.  
2. **Lab** → `/lab` (or assess route from queue).  
3. Confirm the lot appears; submit **lab result** (Approved / Failed / pending as designed).  
   - **Expected:** submit succeeds; redirect/refresh per form; toast.

### 3.8 Traceability UX checks (any role)

- Open a lot → `/lots/[id]` — timeline, lineage hints, **View parent lots only** when parents exist (`/lots/[id]/parents`).  
- **Discovery** — read-only browse for most roles; links to opportunities and lots.

---

## 4) Marketplace and trade flow

### 4.1 Create opportunity (RFQ / IOI / Auction)

1. Log in as **processor**, **exporter**, or **importer** (bank-approved where required).  
2. Go to **Create RFQ** → `/trade/rfqs/new`.  
3. For **processor**: attach **source lots** that satisfy filters (e.g. processed outputs; **with / without lab result** filter).  
4. Set **opportunity type** (`RFQ`, `IOI`, or `AUCTION`), fill quantity / quality / location, publish.  
   - **Expected:** redirect toward **Discovery**; new row visible (refresh once if needed).

### 4.2 Bids and winning selection

1. Log in as **counterparty** (exporter vs importer depending on who published).  
2. Open the opportunity in **Discovery**; **submit bid** with price and lot attachments.  
3. Log in as **RFQ owner**; **select winning bid** on the RFQ detail.  
   - **Expected:** RFQ closes, **trade** created, ledger events; toasts where applicable.

### 4.3 Bank — trade financing

1. Log in as **bank**.  
2. Open a trade pending financing; **approve** or **reject** with margin / notes as prompted.  
   - **Expected:** trade bank flags update; reload or navigate to confirm.

### 4.4 Delivery and settlement (simulator)

- From **trade / delivery** flows in the app, confirm **delivery confirmation** and any **trade finance simulator** actions you use in demos (settlement, margin, etc.).  
- **Expected:** POST succeeds; toast; page refresh shows new status where applicable.

---

## 5) Bank onboarding and gates

- **Bank → Onboarding** → `/bank/onboarding`  
  - **Approved traders registry** and per-applicant reviews.  
  - Open a review; confirm **applicant / profile** context matches seed.  
- **Rules**  
  - Unapproved or blocked users should be **stopped** from marketplace actions that require bank approval.  
  - **Opportunity creator** should be bank-approved where the app enforces it.  
  - **Bidding / bid selection** counterparties should be bank-approved where enforced.

---

## 6) Admin vs regulator (reviewer)

### Admin

- **Users, fields, lots, bank onboarding, integrity, role monitor** — full CRUD / tooling.  
- **Role monitor** — role picker + iframe preview of another role’s home.

### Regulator (shown as reviewer-style oversight)

- **Reviewer reports** / regulator home — read-oriented.  
- **Discovery**, lot detail, lineage — **no** create/update/delete for trace mutations.  
- Confirm sidebar / home matches **read-only** expectations.

---

## 7) Rules checklist (expand as you harden the MVP)

- [ ] Farmer picks are tied to **their** fields; polygons do not cross **other farmers’** fields.  
- [ ] Aggregator validates **PENDING** farmer-origin lots before they flow to aggregation where the app requires it.  
- [ ] Aggregation inputs respect **eligibility** (validation + lab pipeline as coded).  
- [ ] Processing is **mass-balanced** (inputs = outputs + byproducts within tolerance).  
- [ ] Transporter **dispatch / receipt** only use valid lots and actors from dropdowns.  
- [ ] Lab results attach to the correct lot and actor.  
- [ ] RFQ publisher and processor-attached lots meet **ownership + lab/process** filters.  
- [ ] Bank approval gates **RFQ publish**, **bids**, and **selection** per current API rules.  
- [ ] Trades and delivery steps emit **ledger events** visible on lot timelines.

---

## 8) Quick troubleshooting

| Symptom | What to check |
|---------|----------------|
| New opportunity not in Discovery | Refresh Discovery once; confirm create form had no error; toast did not show error. |
| Cannot save field | Overlap warning with another farmer’s plot; adjust polygon. |
| Cannot aggregate | Lot validation / lab status / eligibility messages on the form. |
| Cannot process | Lot not **READY_FOR_PROCESSING**; run aggregation / admin handoff first. |
| Lab queue empty | Processor assign-to-lab or transport receipt to lab completed first. |
| Action blocked “bank” | Login card + onboarding status for **both** sides of the trade. |
| Stale lists after an action | One manual refresh; production uses polling/KV — see deployment notes in repo if applicable. |

---

## 9) Optional regression passes

- **Home dashboard** — each role shows **recent ledger** strip with correct deep links (e.g. parent-only lot pages for transforms).  
- **Login** — toast on successful sign-in.  
- **Integrity** (admin) — dry run vs apply from integrity UI.

---

*Last aligned with repo roles: farmer, aggregator, processor, transporter, lab, exporter, importer, bank, admin, regulator.*
