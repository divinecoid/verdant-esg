# User acceptance checklist

Tick each line as a person in the stated role performs it. Use a staging database, not production.

## Setup (ADMIN)
- [ ] Sign in with the seeded admin; change its password (Configuration → Users).
- [ ] Create an ESG Team user, a second ESG Team user (second reviewer), a Viewer, and an Investee linked to a company.
- [ ] Set `1st_reviewer` / `2nd_reviewer` in Configuration → General (emails).

## Master data (ESG Team)
- [ ] Create a company (with a contact) and a subsidiary with that company as parent.
- [ ] Create ESG themes in each group (Environmental, Social, Governance) and metrics under them; give emission metrics scope "Scope 1/2/3" and unit `tCO2-e`.
- [ ] Create a data-input attribute, an emission factor with values for two years, and a base-year GHG entry.
- [ ] Create a formula for an emission metric; try an unknown variable and a syntax error (both must be refused); run the simulator.
- [ ] Metrics Management: create a version for the company, then a second version; activating one deactivates the other; the active version cannot be deleted.

## Data request cycle
- [ ] ESG Team sends an ad hoc request (notes required) and a periodic request. A company without an active metric selection is refused.
- [ ] Investee sees only their company's requests; opening another company's request URL is refused.
- [ ] Investee enters a non-numeric value for a metric with a unit → refused; saves a draft (status On Going, progress shown); attaches a file; a `.html` file is refused.
- [ ] Final Submit with an empty metric is refused; with all filled it locks the form.
- [ ] Reviewer 1 approves → request shows "waiting for review 2 of 2". The same person cannot do review 2.
- [ ] Reviewer 2 chooses Need Revision with remarks → investee can edit again and resubmit → both reviews approve → status Approved. History tab lists every decision.
- [ ] Emails (or log lines when SMTP is not configured) appear for: new request, submission, second review, outcome.
- [ ] Scheduling Data Capture: add a monthly schedule; run the job (API `POST /data-requests/jobs/run` or wait for 06:00); a request for the last full month appears once; running again does not duplicate it.

## Calculation and reports
- [ ] Run Calculation on an approved request; unapproved ones are not offered. Check one result by hand (input × emission factor ÷ divisor).
- [ ] Running again creates a second run; the first is kept and the newest is marked "latest".
- [ ] A metric whose formula cannot be calculated shows an error on its row and a warning in the report.
- [ ] ESG Output Report: scope table, totals and percentages match the calculation; charts render; Export to PDF opens a readable file.
- [ ] Consolidated report for a company with a subsidiary sums both; note about plain sums is visible.

## Dashboard, minutes, audit
- [ ] Dashboard cards and monthly charts match the request lists for the chosen year; an Investee sees only their own numbers and no review cards.
- [ ] Minutes of Meeting: add, edit, attach a file (replace it), download it, delete it.
- [ ] Audit Trail: every step above is listed; filter by object and by date range; Export to Excel opens with one row per changed field.

## Targets, index and registers
- [ ] Run `npm run db:seed:catalog`; the ESG Catalog shows the themes and metrics, and Formula shows five formulas. Run it again: nothing changes or duplicates.
- [ ] Add a target "at most" for a calculated metric and one "at least" for a percentage metric; after approved data exists, the dashboard shows both with attainment and a trend line.
- [ ] A calculated metric's actual on the dashboard equals the sum of its calculation results (not the raw kWh/litres).
- [ ] A zero-incident target (at most 0) with one incident shows 0% and "Off track"; with none, 100% and "Met".
- [ ] Risk & Compliance: add an incident, an overdue audit finding, a risk scored 16 and a non-compliant item; the dashboard indicators and risk matrix change accordingly.
- [ ] ⌘K / Ctrl+K opens the command palette; typing "safety" finds Risk & Compliance. The sidebar and every page remain usable on a phone-width screen.

## Input rules
- [ ] In a data request, type `12,5` in a numeric field: the field turns red, a banner explains the rule, Save Draft and Final Submit are disabled. Change it to `12.5` and they unlock. `1,234.5` saves as 1234.5.
- [ ] A yes/no or text metric keeps commas in what you type (e.g. "Approved, effective 1 Jan").
- [ ] Creating a request with a date like 2024-02-31, or a due date before the period starts, is refused.
- [ ] Two reviewers pressing Approve on the same level-1 request at the same moment: one succeeds, the other is told someone else reviewed it.
- [ ] A company cannot be set as its own parent, or as the child of one of its own subsidiaries.

## Security spot checks
- [ ] Wrong password 11 times in a minute → HTTP 429 on the 11th.
- [ ] An Investee cannot open Configuration, Audit Trail, Calculation, Output Report (menu entries hidden and URLs redirect).
- [ ] A Viewer sees data but has no add/edit/delete/review buttons.
- [ ] Sign out, then use the browser Back button: protected pages ask for sign-in again.
