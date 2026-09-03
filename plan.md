# Speed 400 Garage — Product & Implementation Plan

A personal Android app that becomes the long-term digital memory of one motorcycle:
a 2024 Triumph Speed 400.

**Status:** planning document. No code written yet.
**Author:** drafted for Pranav P Aradhya (Mysuru, India), single-user, single-bike.
**Last updated:** 2026-09-03

---

## 1. The premise

> I should never have to remember anything about my bike.

Everything that follows is a consequence of that one sentence. If a fact about the
motorcycle exists — what it cost, when it was serviced, what oil it takes, how many
kilometres since the chain was cleaned, where the insurance PDF is — the app knows it,
and can produce it in under five seconds without a network connection.

That framing sets a high bar in two directions:

1. **Capture must be effortless**, or the memory will have holes. An app that knows
   nothing because logging was tedious is worse than a notebook.
2. **Recall must be trustworthy.** A remembered number that is wrong is worse than no
   number at all — especially for tyre pressures and torque specs.

Most of the design decisions below are in service of one or the other.

---

## 2. Context and constraints

| Dimension | Value |
|---|---|
| Users | One. Me. No accounts, no login, no sharing, no cloud identity. |
| Vehicles | One (Speed 400). Model the schema for N, build the UI for 1. |
| Primary devices | Android tablet (review/analysis) + Android phone (capture) |
| Connectivity | Must be fully usable offline. Network only for the AI assistant. |
| Region | India — ₹, litres, km, PUC/RC/insurance, roadside fuel pumps |
| Distribution | Self-signed APK, sideloaded. No Play Store. |
| Bike telemetry | **None available.** The Speed 400 has no accessible OBD/Bluetooth data port for a phone app. Every odometer reading is entered by a human or read by the camera. This is the single biggest constraint on the whole design. |

---

## 3. Design principles

These are the rules I want to be able to point at when a feature decision gets
ambiguous later.

### P1 — The friction budget

Every capture flow has a hard tap budget. If a flow exceeds it, the flow is wrong,
not the user.

| Action | Budget |
|---|---|
| Log a fuel fill | 3 taps + 2 numbers |
| Log an arbitrary expense | 3 taps + 1 number |
| Capture a bill for later | 1 tap (camera opens, shoot, done) |
| Update the odometer | 1 tap + 1 number |
| Mark a reminder done | 1 tap, from the notification |

The corollary: **capture and structure are separate acts.** At a petrol pump in the
sun, wearing gloves, I should be able to photograph the bill and walk away. Turning
that photo into a structured record can happen that evening on the tablet, from an
Inbox. Data is never lost because I was in a hurry.

### P2 — One event log, many views

The brief lists "fuel tracking", "expense tracking", "service history", "parts
history", "ride history" and "a Bike Timeline" as six features. They are not six
features. They are **one append-only event log and five saved views over it.**

A single real-world happening produces a single event. A service visit is one event
that carries: a date, an odometer reading, a workshop, several money line items
(labour, oil, filter, consumables), several component resets (engine oil replaced →
oil interval restarts), and an attached invoice PDF. If those were separate records,
I would enter the same visit four times and the analytics would triple-count it.

This is the most important structural decision in the plan.

### P3 — The odometer is the spine

Almost every fact about a motorcycle is anchored to a `(date, odometer)` pair.
Fuel economy, service intervals, component wear, cost-per-km, warranty windows —
all of them. So:

- Every event that plausibly has an odometer reading captures one.
- The app maintains a **running estimate of today's odometer**, extrapolated from
  recent readings, so that km-based reminders can be projected onto a calendar.
- The freshness of that estimate is shown honestly, and the app asks for a reading
  when it goes stale.

### P4 — Provenance is a first-class field

Every number the app shows has a source, and the source is visible:

| Badge | Meaning |
|---|---|
| 🟢 **Manual** | From the Speed 400 owner's/service manual, with a page citation |
| 🔵 **My records** | Computed from my own logged data |
| 🟡 **Estimate** | Derived/projected by the app (e.g. today's odometer) |
| ⚪ **General** | Unverified general knowledge or community rule-of-thumb |

This applies to the AI assistant *and* to the rest of the app. A maintenance
interval sourced from a forum post must not look identical to one from the manual.

**Concrete evidence this matters:** while researching this plan, one bike-spec
aggregator listed the Speed 400 as a *349cc* engine. It is not — it is the 398cc
TR-series single. Web aggregators, dealer sites and forums routinely disagree with
each other. Grounding on the actual owner's manual is not pedantry; it is the only
way this app is worth trusting.

### P5 — Never invent a safety-critical number

Tyre pressures, torque specs, fluid capacities and grades, brake specifications,
valve clearances, electrical ratings, load limits. For these, the app either
produces a cited value from the manual or says it doesn't know. There is no
middle option, and no "approximately". A hallucinated torque spec can strip a
caliper bolt; a hallucinated tyre pressure can end badly at speed.

### P6 — The data outlives the device

This is meant to be a ten-year record on a phone that will be replaced three times.
Backup and restore is a **Phase 1** feature, not a "later" feature. If the device
dies and the data is gone, the entire premise collapses.

---

## 4. Where I'd change the brief

Taking the request to think for myself rather than transcribe the feature list.

### 4.1 "Tablet-first" is half right, and the half that's wrong matters

Analysis is tablet-shaped: reviewing charts, reading service history, filing
documents, browsing the timeline, chatting with the assistant. That happens at home,
on the sofa.

**Capture is phone-shaped.** It happens at a petrol pump, at a service centre
counter, at a roadside mechanic in the rain. The tablet will not be there.

If the phone experience is an afterthought, the friction budget (P1) is blown and the
data never gets logged — which breaks everything downstream. So:

> **Recommendation:** build adaptive from day one — one codebase, `WindowSizeClass`
> driven. Tablet gets multi-pane list+detail layouts and the analytics surface. Phone
> gets a stripped, thumb-reachable capture surface. Neither is a scaled version of the
> other. Design the capture screens phone-first and the review screens tablet-first.

This also forces an early decision on sync — see §16 Open Questions.

### 4.2 Fuel and expenses are the same thing, entered once

A fuel fill is an expense. If "fuel tracking" and "expense tracking" are separate
modules, I will either enter every fill twice or my total spend will be wrong.

> **Recommendation:** money exists in exactly one place — `line_item` rows attached to
> events. A fuel event carries a line item of category `fuel`. The Fuel screen is a
> filtered view; the Expenses screen is a grouped view; the totals can never disagree
> because there is only one set of numbers.

### 4.3 Parts and accessories are mostly a *current state* question

The brief asks for "parts and accessories/modifications history". History is the easy
half and it falls out of the event log for free. The half that's actually useful is
the question history can't answer directly:

> *What is fitted to this bike right now?*

Which exhaust, which tyres and how old, which sprocket ratio, what's the current
chain, which accessories are installed vs. sitting in a box in the cupboard.

> **Recommendation:** a derived **Build Sheet** — current fitted state, computed from
> fit/remove events — alongside the history. Also track whether each modification
> affects the warranty, because that is a real and expensive thing to forget.

### 4.4 GPS ride tracking is the lowest value-per-effort item on the list

It's the most technically expensive feature here — foreground services, battery
optimisation whitelisting, location permissions, map tiles, route storage, offline
maps — and it's the one furthest from "I shouldn't have to remember anything". Google
Maps Timeline already records where I rode; Strava-likes already do this better.

There is also a correctness trap: **GPS distance is not odometer distance.** If ride
distances silently feed the odometer, the fuel-economy maths gets quietly corrupted.

> **Recommendation:** Phase 1–3 ship a *manual* ride log (date, route name, start/end
> odometer, notes, photos, companions). That covers the memory use-case — "when did we
> do that Coorg run and what did it cost?" — at ~2% of the effort. Revisit live GPS
> tracking in Phase 5, and if it lands, treat GPS as decoration and keep the odometer
> as the source of truth.

### 4.5 Analytics should answer questions, not fill a screen with charts

It's easy to build twelve charts nobody reads. Each chart should exist because it
answers a question I'd actually ask. If I can't write the question down, the chart
doesn't ship. See §11.

### 4.6 Three different "cost per km" numbers, never conflated

The brief asks for both "fuel-cost-per-km" and "cost per kilometre". These differ by
almost an order of magnitude and mixing them makes the whole analytics section
meaningless:

| Metric | Includes | Typical shape |
|---|---|---|
| **Fuel ₹/km** | Petrol only | small, stable, good for trip budgeting |
| **Running ₹/km** | Fuel + consumables + service + repairs | the honest "cost to ride" number |
| **True ₹/km** | Running + insurance + accessories + depreciation on purchase price | the "what this hobby actually costs" number |

> **Recommendation:** show all three, always labelled, never a bare "cost per km".

### 4.7 "No accounts" is right, and it hands me a problem to solve

No accounts means no server, which means no sync and no automatic backup. That's the
correct trade for a personal app — but it must be paid for deliberately (P6) with a
first-class export/restore, not ignored. See §14 (backup) and §16 (the sync question).

---

## 5. What's missing from the brief

Features I'd add, roughly in order of how much I think they matter.

### 5.1 Odometer projection ⭐ (enables everything else)

Because there is no telemetry (§2), the app only knows the odometer when I tell it.
But every km-based reminder needs to know *today's* odometer to be useful. "Chain
lube due at 12,400 km" is useless if I don't know where I am now.

So: maintain a rolling km/day rate (exponentially weighted toward recent readings)
and project. This turns every km-based interval into a **date**, which is the only
form a notification can act on:

```
est_odo(today)   = last_reading + km_per_day × days_since_reading
km_remaining     = due_odo − est_odo(today)
projected_due    = today + (km_remaining / km_per_day) days
effective_due    = min(projected_due, time_based_due)
```

Two consequences worth designing for:

- **Freshness is displayed, always.** "≈ 11,240 km (estimated, last read 4 days ago)".
  Past ~14 days the estimate is marked stale and projections are downgraded.
- **A virtuous loop:** every fuel fill captures an odometer reading for free. Log fuel
  regularly and the entire reminder system stays accurate with zero extra effort. Which
  is another reason the fuel flow must be frictionless.

### 5.2 The Capture Inbox ⭐

A photo-first queue. One tap from anywhere shoots a bill, a pump display, an odometer,
a part label, a warning light on the dash. It lands in an Inbox as an unstructured
item with a timestamp and location. Later, on the tablet, the Inbox shows each photo
with OCR-extracted candidates pre-filled and I confirm or correct.

This is the mechanism that makes P1 achievable. It also means the app degrades
gracefully: worst case, it's a well-organised shoebox of photos with dates — which is
still better than what most people have.

### 5.3 Warranty guard ⭐

The Speed 400 ships with a 2-year warranty in India (extendable). Warranty terms
generally require scheduled services to be done on time at an authorised centre, with
proof. Missing one can cost far more than the service.

Nobody remembers this. The app should:

- Know which services are warranty-mandatory and their deadline windows
- Warn *hard* and early (60/30/7 days) — a different, louder notification class
- Refuse to mark such a service complete without an attached invoice
- Show warranty expiry on the dashboard in its final 90 days
- Flag modifications that may affect warranty coverage on the Build Sheet

### 5.4 Fault / niggle log ⭐

*"There's a rattle from the left side around 4,000 rpm — started 3rd August."*

That's not an expense, not a service, not a ride. It's an **open issue**. Bikes
accumulate niggles, and by the time the service appointment comes around I've
forgotten three of the four things I meant to mention.

- Log a symptom with date, odometer, conditions, optional audio/video/photo
- Stays **open** until closed by a service event or by me
- The service prep screen hands me the open list to read out at the counter
- Historical value is enormous: "has this happened before?" becomes answerable, and
  it makes the AI assistant dramatically more useful

### 5.5 Trip readiness check ⭐

The payoff feature — it only exists *because* everything else is tracked. One screen
that answers: **"Can I ride to Coorg tomorrow?"**

```
✅  Insurance valid until 12 Mar 2027
⚠️  PUC expires in 9 days — renew before you go
✅  Next service due in 3,100 km
⚠️  Chain lubed 780 km ago (interval 500 km)
❓  Tyre pressure last checked 22 days ago
✅  Fuel range ≈ 340 km from a full tank
📄  Documents available offline
```

Cheap to build once the data model exists, and genuinely delightful. This is the
answer to "so what?" for the whole app.

### 5.6 Tyres deserve their own model

Tyres are the one component where age matters as much as wear, where the front and
rear wear at different rates and get replaced at different times, and where the
consequence of getting it wrong is a crash. Track per-corner: fitment date, fitment
odometer, brand/model/size, DOT manufacture date, pressure check log, tread notes,
and km run. Ageing warning independent of km.

### 5.7 Workshop & vendor directory

Which service centre, which mechanic, phone number, address, what work each has done,
what it cost, and my own quality rating. Answers "who did the chain last time and were
they any good?" and "who do I call from the road?".

### 5.8 Consumables inventory

Small but real: a spare oil filter on the shelf, half a can of chain lube, a spare
bulb. Prevents double-buying and answers "do I need to order anything before the
weekend?".

### 5.9 Exportable history document

A generated PDF of the complete, chronological ownership record: services, parts,
mileage, spend. Useful at resale — a full documented history is worth actual money —
and as a human-readable backup that outlives the app itself.

### 5.10 Backfill onboarding

The bike already exists and has history. If the app starts empty, the first six months
of analytics are useless and motivation dies. The first-run flow must invite me to
enter purchase date, purchase price, purchase odometer, current odometer, and to
photograph whatever old bills I still have. Even three remembered data points make the
timeline feel real from day one.

### 5.11 Small things worth having

- **Fuel station + fuel grade on each fill.** Riders swear one pump gives better
  mileage. With enough data that becomes a testable claim rather than folklore.
- **Home-screen widget:** current odometer, next thing due, one-tap fuel log.
- **Anomaly detection on entry** — see §9.2. Bad data is worse than no data.
- **Full-text search over everything**, including my own notes.
- **Pre-service prep screen:** open faults + due items + last service reference,
  assembled into something I can read out at the counter.

---

## 6. Data model

Sketch, not final schema. The point is to show that the six "features" collapse into
one spine.

### 6.1 The spine

```
Bike (1 row, but modelled as N)
 └── Event  ──┬── LineItem     (money — the ONLY place money lives)
              ├── Attachment   (photos, PDFs, audio)
              ├── OdometerReading
              └── ComponentAction  (what this event did to which component)
```

**Event** — every timeline entry is one of these:

| Field | Notes |
|---|---|
| `id`, `bike_id` | |
| `type` | `fuel` · `service` · `repair` · `part` · `accessory` · `document` · `ride` · `fault` · `note` · `odo_reading` · `purchase` |
| `occurred_at` | date + optional time |
| `odometer_km` | nullable, but prompted for on every type that plausibly has one |
| `title`, `notes` | |
| `vendor_id` | workshop / petrol pump / shop, nullable |
| `location` | optional |
| `created_at`, `updated_at` | |

**LineItem** — `event_id`, `category`, `description`, `qty`, `unit_price`, `amount`,
`is_estimate`. Categories: `fuel`, `labour`, `parts`, `consumables`, `accessories`,
`insurance`, `puc`, `rto`, `washing`, `parking`, `tolls`, `gear`, `other`.

> **Invariant:** no total is ever computed by summing events. Every money figure in
> the app is a `SUM(line_item.amount)` over a filter. This makes double-counting
> structurally impossible.

**FuelEntry** — a facet of a `fuel` event, not a separate thing:
`event_id`, `litres`, `price_per_litre`, `amount`, `fill_type`
(`full` | `partial` | `first`), `missed_previous` (bool), `station_id`,
`fuel_grade`, `is_computed_litres`.

**Component** — `key` (`engine_oil`, `oil_filter`, `air_filter`, `chain`,
`sprockets`, `brake_pads_front`, `brake_pads_rear`, `brake_fluid`, `coolant`,
`spark_plug`, `tyre_front`, `tyre_rear`, `battery`, `clutch_cable`, `valve_clearance`,
`chain_lube`, `tyre_pressure_check`, …), display name, `interval_km`, `interval_days`,
`interval_source` (`manual` | `dealer` | `community` | `mine`), `manual_page_ref`,
`action_kind` (`replace` | `service` | `check` | `adjust`), `is_warranty_relevant`.

**ComponentAction** — `event_id`, `component_key`, `action` (`replaced` | `serviced` |
`checked` | `adjusted` | `topped_up`), `part_used`, `notes`. This is what resets an
interval, and it's why a service visit is one event rather than seven.

**Document** — `event_id`, `doc_type` (`insurance` | `puc` | `rc` | `licence` |
`warranty` | `invoice` | `service_plan` | `rsa` | `loan` | `other`), `issuer`,
`number`, `issued_on`, `expires_on`, `secondary_expires_on`, `amount`, `file_uri`.

> `secondary_expires_on` exists because Indian new-vehicle insurance commonly bundles
> a multi-year third-party cover with an annually-renewed own-damage cover. One expiry
> field would silently produce a wrong reminder for the one that matters. *(Verify the
> exact structure against my own policy document during Phase 2.)*

**Reminder** — `component_key` or `document_id`, `rule_type` (`km` | `time` |
`whichever_first`), computed `due_odo` / `due_date`, `severity`, `snoozed_until`,
`last_notified_at`.

**Others:** `Vendor`, `Ride`, `Fault`, `InventoryItem`, `Attachment`, `CaptureInbox`,
`Fact` (see §10), `Setting`.

### 6.2 Why this shape

- A service visit = 1 Event + N LineItems + N ComponentActions + 1 Attachment.
  Entered once, appears correctly in Timeline, Expenses, Service History, Maintenance
  state and Analytics.
- The Timeline is `SELECT * FROM event ORDER BY occurred_at DESC`. It cannot drift out
  of sync with the other screens, because it *is* the other screens.
- Adding a second bike later is a `WHERE bike_id = ?`.

---

## 7. Screens & experience

### 7.1 Home / Dashboard

Ordered by what I actually need when I open the app:

1. **Quick actions** — a persistent row, thumb-height on phone:
   `⛽ Fuel` · `₹ Expense` · `📷 Capture` · `🔢 Odo`. Never more than one tap away.
2. **Bike card** — photo, registration, estimated odometer with freshness, days owned.
3. **Due next** — the three most urgent items across services, documents and
   components. Each shows both distances: *"in 640 km · ~11 days"*. Overdue in red.
4. **Pulse** — this month's spend, rolling mileage (km/L), fuel ₹/km, km ridden.
   Four numbers, each with a small trend arrow against the previous period.
5. **Recent activity** — last five timeline events.
6. **Nudges** — data-quality prompts: *"No odometer reading in 16 days — projections
   are getting stale."*, *"3 items waiting in your Inbox."*

On tablet this becomes a three-pane layout: nav rail · dashboard column · detail pane,
so tapping a due item opens it beside the dashboard rather than navigating away.

### 7.2 Fuel

The single most-used screen. India-specific insight that most fuel trackers get
backwards: **at an Indian pump you transact in rupees, not litres.** You say
"₹500 ka" or "full tank" — the pump displays the rate and the amount. Litres are the
derived quantity.

So the entry form is:

```
Odometer      [ 11,240 ]  ← camera OCR offered
Amount ₹      [    500 ]
Rate ₹/L      [ 106.42 ]  ← defaulted from last fill, editable
Fill type     ( Full ) ( Partial )
                                        → 4.70 L computed, shown live
Station       [ HP, Hunsur Road ▾ ]     ← last-used default
```

Two numbers and a toggle. Everything else is defaulted or derived. Litres can be
entered directly instead if the bill shows them.

The list below shows each fill with its computed tank mileage, the rolling average,
and a clear marker on any tank excluded from the mileage calculation and why.

### 7.3 Expenses

Grouped by month with category chips. Two views: *by category* (where does the money
go) and *chronological*. Filters by category, date range, vendor, amount. Every row
opens its parent event, so an expense is never an orphan.

### 7.4 Maintenance

The health screen. A card per component:

```
Engine oil                              🟢 Manual
Last replaced   8,200 km · 14 Feb 2026 · Triumph Mysuru
Interval        16,000 km / 12 months (whichever first)
Now             ≈ 11,240 km
Remaining       4,960 km  ·  ~86 days     [████████░░ 31% used]
                                          [ Log service ]
```

Sorted by urgency. Split into *Due soon* / *Healthy* / *Not tracked*. Each card shows
its interval **provenance badge** — a manual-sourced interval must not look like a
number I made up. Supports both workshop work and DIY, with a "who did it" field,
because DIY changes what the record needs (part used, my own notes) versus a workshop
visit (invoice, service advisor).

Frequent light-touch items (chain lube ~500 km, tyre pressure ~weekly) are
`action_kind = check` and log with a single tap — no form.

**Note on intervals:** the component catalogue ships with intervals marked
`source = unverified` and a setup task to confirm every one against the owner's
manual. The headline figures I have from public sources — first service at 1,000 km,
then 16,000 km / 12 months, 2-year warranty — are corroborated but *not* manual-sourced,
and the detailed per-item schedule (valve clearance, brake fluid, coolant, spark plug,
oil grade and capacity) must come from the manual before the app asserts any of it.

### 7.5 Service history

Reverse-chronological service events, each expanding to the full record: workshop,
odometer, line items, components touched, the invoice, and my own notes on how it
went. A per-visit total and a running lifetime service total.

### 7.6 Documents

Grid of cards with a prominent expiry state (valid / expiring / expired). Each stores
the file, the metadata, the premium paid (which flows into expenses automatically),
and renewal history.

**Offline-first "show at a checkpoint" mode:** one tap from the dashboard, full
brightness, large, works with zero network. Note that in India the legally-accepted
digital route is DigiLocker / mParivahan — this app complements that with the
*complete* file set (warranty card, service plan, old invoices) rather than replacing
it. Worth saying out loud so I don't rely on it in the wrong situation.

### 7.7 Timeline

Everything, chronologically, with type filters and full-text search. The "what
happened to this bike" view. Jump-to-date, and a distance axis so I can see the
spacing between events in kilometres as well as time.

### 7.8 Analytics

See §11 — deliberately small.

### 7.9 Assistant

See §10.

### 7.10 Build sheet

Current fitted state, derived. What's on the bike, when it went on, what it cost,
what it replaced, whether it's warranty-relevant, and what's in the box in the
cupboard.

### 7.11 Design language

The bike is a modern classic and I already write in an instrument-panel idiom. Lean
into it: dark-first theme, monospaced tabular numerals for all readings (odometer,
mileage, money), a restrained accent drawn from the bike's own colour, generous
touch targets sized for use with gloves on, and high-contrast type that survives
direct sunlight at a petrol pump. Material 3 with a personality, not a Material 3
demo.

---

## 8. The reminder engine

The part that delivers "I don't have to remember anything". It has to be right, or I
will stop trusting it — and a distrusted reminder system is worse than none.

### 8.1 Rule types

| Type | Example | Logic |
|---|---|---|
| Time only | PUC expiry, insurance renewal | fixed date |
| Distance only | chain lube every 500 km | `due_odo = last_odo + interval` |
| Whichever first | engine oil: 16,000 km **or** 12 months | `min(projected_km_due, time_due)` |
| Age | tyres, battery, brake fluid | date of fitment + years |
| Conditional | warranty-mandatory service | hard deadline, escalated severity |

Distance rules are projected onto dates using §5.1 so that a notification can fire on
a day. All four are then a single sorted list of `(due_date, severity)`.

### 8.2 Notification policy

Under-notifying breaks the promise; over-notifying trains me to swipe them away, which
also breaks the promise. So:

- **Documents:** 30 / 7 / 1 days before expiry, then daily once expired.
- **Warranty-mandatory service:** 60 / 30 / 7 days, in a separate high-priority channel.
- **Routine service:** at 1,000 km remaining, then 300 km remaining.
- **Light checks** (chain lube, tyre pressure): a single weekly digest, never
  individually. These are the ones that would otherwise cause notification fatigue.
- **Actionable from the shade:** `Done` · `Snooze 7d` · `Log it`. Marking done from
  the notification writes a real event and resets the interval.
- One daily recompute via `WorkManager`, plus recompute on every write.

### 8.3 The staleness problem

Distance-based reminders silently rot if I stop logging. Mitigations:

1. Every fuel fill refreshes the odometer for free (§5.1).
2. If no reading in 14 days, the dashboard shows a nudge and projections are labelled
   stale rather than shown as confident.
3. If no reading in 30 days, a single low-priority notification asks for one.
4. The estimate is never silently written to the database as if it were a real
   reading. Estimates and observations are different kinds of fact (P4).

---

## 9. The fuel & money engine

Two calculations that most tracker apps get subtly wrong. Both deserve unit tests
before they deserve UI.

### 9.1 Fuel economy — full-to-full only

A single tank's mileage is only meaningful between two **full** fills. Partial fills
in between must be accumulated, not treated as data points.

```
For each full fill Fi with previous full fill F(i-1):
    km     = odo(Fi) − odo(F(i−1))
    litres = Σ litres of every fill after F(i−1) up to and including Fi
    kmpl   = km / litres

Rules:
  · The first fill establishes a baseline and yields no kmpl.
  · A fill flagged missed_previous breaks the chain; the next full fill
    starts a new baseline instead of producing a wrong number.
  · A partial fill never produces a kmpl on its own.
```

The headline number on the dashboard is a **rolling average over the last 5 full-tank
spans**, not the most recent tank — single-tank figures are noisy enough (traffic,
pillion, weather, how full "full" was) to be misleading on their own. The per-tank
series still gets plotted, because its variance is itself informative.

### 9.2 Entry-time validation

Bad data poisons every chart downstream, and it's far easier to catch at entry than to
find six months later. On save, check:

- Odometer went **backwards** → block, ask to correct.
- Odometer jumped implausibly (> ~1,500 km since last reading) → confirm.
- Litres > 13 L (tank capacity) → confirm, likely a typo or a jerrycan.
- Computed kmpl deviates > 40% from the rolling average → ask *why*, offering:
  "I missed logging a fill" · "partial fill" · "typo" · "genuinely different riding".
  This one question is what keeps the mileage chart honest for ten years.
- Rate ₹/L wildly off the last known → confirm.

Every one of these is a *question*, not a rejection. The app should never refuse data
it doesn't understand; it should record it and flag it.

### 9.3 The three cost-per-km numbers

Per §4.6, computed over an explicit window and always labelled:

```
fuel_per_km    = Σ fuel amount            / Δodo
running_per_km = Σ (fuel+consumables
                    +service+repairs)     / Δodo
true_per_km    = Σ everything
                 + depreciation estimate  / total odo since purchase
```

Depreciation is an **estimate** (P4, 🟡) driven by a purchase price and a
user-adjustable current-value guess. It is by far the largest component of true cost
in early ownership and omitting it would make the number a comfortable lie.

---

## 10. The AI assistant

The most interesting part, and the part most likely to be built badly. The key insight
is that the brief describes **two completely different kinds of question** that need
two completely different mechanisms:

| | Question about **the model** | Question about **my bike** |
|---|---|---|
| Example | "What's the rear tyre pressure?" | "How much have I spent on fuel this year?" |
| Example | "What does the amber engine light mean?" | "When did I last replace the chain?" |
| Truth lives in | The owner's / service manual | My SQLite database |
| Mechanism | **RAG with citations** | **Tool calls returning SQL results** |
| Failure mode | Confident wrong spec → mechanical damage | Confident wrong number → bad decisions |

Conflating these — in particular, RAG-ing over my own records — is the classic mistake
and it produces answers that are approximately right, which for money and maintenance
is the same as wrong.

### 10.1 Architecture

```
              ┌──────────────────────────────┐
   question → │  Router (LLM w/ tool schema) │
              └──────┬────────────────┬──────┘
                     │                │
      ┌──────────────▼──┐      ┌──────▼─────────────────┐
      │ Knowledge tools │      │ Record tools           │
      │ spec_lookup()   │      │ sum_expenses()         │
      │  → chunk + page │      │ last_event()           │
      │ fact_lookup()   │      │ km_since()             │
      │  → curated fact │      │ fuel_economy()         │
      └────────┬────────┘      │ current_odometer()     │
               │               │ due_items()            │
       manual corpus           │ service_history()      │
       (local vectors +        │ find_documents()       │
        FTS, page-cited)       │ search_notes()         │
                               └──────┬─────────────────┘
                                      │  typed SQL, deterministic
              ┌───────────────────────▼──────┐
              │ Composer + numeric grounding │
              │ check → answer with badges   │
              └──────────────────────────────┘
```

Many real questions need both sides. *"Should I change my oil?"* =
`spec_lookup("engine oil interval")` (🟢 manual) + `last_event("engine_oil")` (🔵
records) + `current_odometer()` (🟡 estimate) → a synthesised answer whose every
component is attributed.

### 10.2 The knowledge corpus

- **User-supplied.** I import my own owner's manual PDF; the app parses, chunks by
  section, keeps page numbers, and embeds. The manual is copyrighted, so it is never
  shipped inside the app or committed to this repository — it's my personal copy,
  indexed locally.
- **Retrieval is small.** A manual is a few hundred chunks. Brute-force cosine
  similarity over a few hundred vectors held in memory is instantaneous. No vector
  database, no dependency. Combine with SQLite FTS5 for keyword recall (part numbers
  and warning-light names are exact-match problems, not semantic ones) — hybrid
  retrieval, trivially.
- **Every returned chunk carries its page number**, and citations render as
  "Owner's Manual, p. 84".

### 10.3 The curated fact table

Separately from RAG, a small hand-verified `facts` table (~50 rows): tyre pressures,
oil grade and capacity, coolant spec, key torque values, bulb types, fuse ratings,
service intervals, fluid capacities. Each row: `key`, `value`, `unit`, `source`,
`page_ref`, `verified_on`.

Three jobs for one small table:

1. Powers a **Quick Specs** screen — no AI, no network, instant.
2. Provides **offline answers** to the most common questions when there's no signal —
   which, on a road trip, is exactly when I need the tyre pressure.
3. Acts as the authority for §10.5's safety rule.

Entering it by hand from the manual, once, is an hour well spent.

### 10.4 The numeric grounding check

A concrete guardrail, cheap to implement, that directly serves P5:

> After the model composes an answer, extract every numeral in it. Any numeral that
> does not appear in a tool result or a cited manual chunk is flagged. If the answer
> is about a safety-critical topic, the answer is **blocked** and regenerated or
> refused. Otherwise it is downgraded to ⚪ *General, unverified*.

This is a deterministic post-check, not a prompt instruction — prompts alone will not
reliably stop a model from producing a plausible-looking torque figure.

### 10.5 The safety rule

Safety-critical topics: tyre pressures, torque specifications, fluid capacities and
grades, brake specifications, valve clearances, electrical ratings, load limits,
tyre sizes and speed ratings.

For these, the assistant answers **only** from the fact table or a cited manual chunk.
If neither has it, the answer is: *"Not in the manual I've indexed — check the printed
manual or the dealer."* It never estimates, never says "typically around", never
reasons from other motorcycles.

Everything else — DIY procedures, approximate costs, general advice, "is this rattle
normal" — is permitted with a clear ⚪ badge and, where relevant, a "verify before
acting" note.

### 10.6 Privacy and the model choice

A cloud LLM gives far better answers than anything that fits on the device. The trade
is that some of my data leaves the device.

> **Recommendation:** cloud model (Claude API), with a hard rule that **only tool
> results leave the device — never the raw database.** `sum_expenses` sends back one
> number, not my transaction history. This keeps the exposure surface proportionate
> and legible, and I can inspect exactly what was sent for any given answer.
>
> Plus a genuine offline mode: the fact table and a set of canned record queries
> answer the top ~20 questions with zero network. If the answer needs the network and
> there isn't any, the app says so rather than degrading silently.

An API key lives in encrypted local storage, entered once in settings. No key is
committed anywhere.

### 10.7 Worth being honest about

The assistant is the highest-risk, highest-effort component and it is **not** where
the app's value comes from. Everything in §5 works with no AI at all. The assistant
is an accelerant on a good dataset, which is exactly why it belongs in Phase 4 and not
Phase 1 — it has nothing useful to say until there are records to say it about.

---

## 11. Analytics that earn their place

Each visualisation must answer a question I would actually ask. If I can't write the
question, it doesn't ship.

| Question | View |
|---|---|
| What has this bike cost me in total? | Lifetime spend, split by category, with true ₹/km |
| Where does the money actually go? | Category donut + ranked list, per year |
| Is my mileage getting worse? | km/L per full tank, with a rolling-5 trend line |
| Is my mileage worse because of *me* or the bike? | Mileage vs. avg km/day for the same period, overlaid |
| Am I riding more or less? | km per month, bar |
| What's my real running cost? | Three ₹/km numbers side by side, current vs previous year |
| What does servicing cost me per year? | Service + parts spend by year |
| Which month is expensive and why? | Monthly spend with the top three line items surfaced |
| How far do I get on a tank? | Distribution of tank ranges — sets realistic trip planning |

Deliberately **not** building: fuel-price-vs-time charts (I don't control it), pace or
speed analytics (not the point), goal-setting or gamification, comparisons against
other riders (no other riders — no accounts).

Every chart states its window and gets a one-line plain-language takeaway underneath,
because a chart I have to interpret from scratch each time is a chart I'll stop
opening.

---

## 12. Non-goals

Saying no explicitly, so scope creep has something to bounce off:

- ❌ Accounts, login, users, sharing, social feeds, leaderboards
- ❌ Multi-user or "my riding group" features
- ❌ Play Store release, ASO, monetisation, subscriptions
- ❌ A backend server of any kind
- ❌ Analytics SDKs, crash reporting, telemetry — nothing phones home
- ❌ Supporting every motorcycle. This is a Speed 400 app; the schema is generic, the
  knowledge base and defaults are not.
- ❌ OBD / hardware integration (§2 — not available)
- ❌ Community fuel prices, dealer locators, marketplace, parts shopping
- ❌ Replacing DigiLocker/mParivahan for legal document production (§7.6)

---

## 13. Priorities

| Priority | Items |
|---|---|
| **Must have** | Odometer + projection · fuel logging (₹-first) · expenses · timeline · dashboard · backup & restore · service records · maintenance intervals & reminders · documents with expiry · capture inbox |
| **Should have** | Analytics (§11) · warranty guard · fault log · trip readiness · attachments/OCR · full-text search · build sheet · tyre tracking · export to PDF |
| **Could have** | AI assistant · vendor directory · inventory · home-screen widget · manual ride log · quick specs screen |
| **Won't have (this version)** | GPS ride tracking · multi-device sync · anything in §12 |

The ordering principle: **the value of this app compounds with elapsed time.** A crude
version shipped in three weeks that starts capturing data is worth more than a polished
version shipped in four months, because the first one has three months of history by
the time the second one launches. Ship the logbook early; build everything else while
it fills up.

---

## 14. Technical approach

Proposal, open to revision at Phase 0.

| Layer | Choice | Why |
|---|---|---|
| Language / UI | Kotlin + Jetpack Compose, Material 3 | Native, best tablet adaptive story |
| Adaptive layout | `WindowSizeClass` + canonical list-detail | One codebase, two genuinely different form factors (§4.1) |
| Database | Room (SQLite), single source of truth | Offline-first, relational — this data is deeply relational |
| Search | SQLite FTS5 | Free, fast, offline, no dependency |
| Vectors | In-memory float arrays + cosine | A few hundred chunks; a vector DB would be absurd here |
| Background | `WorkManager` daily recompute + notification channels | Reliable across Android's battery restrictions |
| Camera / OCR | CameraX + ML Kit text recognition (on-device) | Free, offline, no images leave the device |
| PDF | `PdfRenderer` to view; PDFBox-Android to extract manual text at import | |
| Charts | Vico, or hand-rolled Compose Canvas | Few enough charts to consider drawing them |
| DI | Hilt | |
| Files | App-private storage; SAF for import/export | |
| Security | Biometric app lock; encrypted prefs for the API key; consider SQLCipher | Documents and spend history are personal |
| Testing | JUnit on the fuel-economy, interval and cost engines | The maths is the part that must be right (§9) |
| Build | Gradle + GitHub Actions producing a signed APK artifact | Sideload; no store |

**Rejected alternatives.** A PWA or Flutter would be faster to start, but Android's
reliable scheduled local notifications, home-screen widgets, camera OCR and background
work are the load-bearing parts of "I don't have to remember anything" — and those are
exactly where cross-platform layers are weakest. Native is the right call for an app
that will only ever run on Android.

**Backup (P6), Phase 1, non-negotiable:**
- One-tap export → a single encrypted archive (SQLite dump + attachments + manifest)
- Restore from that archive on a fresh install
- Weekly automatic export to a user-chosen folder / Drive via SAF
- A plain JSON/CSV export alongside it, so the data is never trapped in my own format
- A restore is verified at least once before the app is trusted with real history

---

## 15. Implementation phases

Each phase ends with something genuinely usable. No phase is a scaffolding-only phase.

### Phase 0 — Decide and set up *(~1 weekend)*
- Answer §16's open questions
- Project skeleton, Room schema, navigation, theme
- Seed the component catalogue with intervals marked *unverified*
- Transcribe key specs from the owner's manual into the `facts` table
- Backfill onboarding: purchase details, current odometer, old bills photographed
- **Done when:** the app opens, knows the bike exists, and has my real starting state

### Phase 1 — The logbook *(~2–3 weekends)* — **ship this and start using it**
- Odometer readings + km/day projection engine
- Fuel logging (₹-first) + full-to-full economy engine + entry validation
- Expenses with categories and line items
- Timeline (all events, filterable)
- Dashboard v1: quick actions, bike card, pulse, recent activity
- Capture Inbox (photo now, structure later)
- **Backup / restore / export**
- **Done when:** I stop using anything else to record fuel and spending

### Phase 2 — Memory *(~3 weekends)*
- Components, intervals, ComponentActions, DIY vs workshop
- Service records with line items and attached invoices
- The reminder engine, notification policy, notification actions
- Documents with expiry, offline "show at a checkpoint" mode
- Warranty guard
- Fault / niggle log
- **Done when:** I stop worrying about missing a renewal or a service

### Phase 3 — Understanding *(~2 weekends)*
- Analytics (§11) with the three ₹/km numbers
- Full-text search across everything
- Build sheet, tyre panel
- Trip readiness check
- Export a complete history PDF
- Tablet multi-pane polish
- **Done when:** I can answer any question about the bike's past in under a minute

### Phase 4 — The assistant *(~3 weekends)*
- Manual import, chunking, page-cited hybrid retrieval
- Record tools over SQLite, typed and deterministic
- Router, composer, provenance badges
- Numeric grounding check + safety rule
- Offline fact-table fallback + Quick Specs screen
- **Done when:** I ask it something instead of opening the manual, and trust the answer

### Phase 5 — Long tail *(ongoing)*
- Home-screen widget · vendor directory · inventory · manual ride log
- Reconsider GPS ride tracking on the evidence of whether I miss it
- Revisit sync if the two-device answer in §16 turned out to be "both"

---

## 16. Open questions — decisions I need from you

Ordered by how much they change the build.

1. **One device or two?** If the app runs on both phone and tablet, "no accounts"
   collides with needing the same data in two places. Options: (a) phone is the device
   of record, tablet is read-only via export — simple, slightly annoying; (b) file-based
   sync through a Drive folder with last-write-wins — moderate effort, occasional
   conflicts; (c) genuinely one device. **My recommendation: (a) for Phase 1, revisit at
   Phase 5.** But this needs your answer at Phase 0, because it shapes the schema (sync
   needs per-row timestamps and IDs designed for merge from the start).
2. **Do you have the owner's manual as a PDF?** The knowledge base and the whole
   safety story (P5) depend on it. If not, Phase 4 needs rethinking and the fact table
   has to come from the printed book.
3. **What history exists to backfill?** Purchase date, purchase price, current
   odometer, and any past service invoices — paper or digital. This determines whether
   analytics are useful on day one or in six months.
4. **Do you do your own maintenance?** Chain cleaning, oil changes, brake pads — or is
   everything dealer-done? Heavy DIY shifts weight toward procedures, parts inventory
   and torque specs; dealer-only shifts it toward invoices, warranty and cost tracking.
5. **Is a cloud LLM acceptable** under the §10.6 rule that only tool *results* leave
   the device, or does it need to be strictly on-device (which means a much weaker
   assistant)?
6. **Do you want ride tracking at all,** or is a manual trip log enough? This is the
   single biggest effort swing in the plan.
7. **How much time per week** do you want to put into this? It changes whether Phase 1
   is three weeks or three months, and whether Phases 4–5 are realistic at all.

---

## 17. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Logging fatigue** — the app dies of neglect | Critical | The friction budget (P1), the Capture Inbox, ₹-first fuel entry, widget. Treat any flow over budget as a bug. |
| **Data loss** — one device, ten years of records | Critical | Backup in Phase 1 (P6), verified restore, plain-format export |
| **Hallucinated safety spec** | Critical | Verified-only rule (P5), numeric grounding check (§10.4), refusal over estimation |
| **Bad data poisoning analytics** | High | Entry-time validation (§9.2), full-to-full economy (§9.1), anomalies flagged not silently absorbed |
| **Stale odometer breaking reminders** | High | Fuel-fill piggyback, staleness nudges, estimates never written as observations (§8.3) |
| **Scope creep** — this plan is already large | High | Ship Phase 1 and *use it* before building Phase 2. Non-goals (§12) are load-bearing. |
| **Unverified intervals treated as gospel** | Medium | `interval_source` on every component, provenance badges everywhere (P4) |
| **The assistant becomes the project** | Medium | It's Phase 4 for a reason. Everything else works without it. |
| **Android background restrictions killing reminders** | Medium | WorkManager, exact alarms only where justified, battery-optimisation exemption prompt during onboarding, test on the actual device |

---

## 18. Success criteria

Not download counts. These:

1. I log **every** fuel fill for three consecutive months without it feeling like a chore.
2. I never again miss an insurance or PUC renewal.
3. When a mechanic asks "when did you last change the oil?", I answer in ten seconds
   with an odometer reading and an invoice.
4. I can say what this motorcycle has actually cost me, per kilometre, with a straight
   face.
5. Before a long ride, one screen tells me whether the bike and its paperwork are ready.
6. A year in, the timeline is something I enjoy scrolling through.

---

## Appendix — sources consulted

Public sources used for context while planning. **None of these are treated as
authoritative by the app** (P4); every specification and interval must be confirmed
against the owner's manual before the app asserts it. The 349cc/398cc contradiction
noted in §3 came from comparing these.

- [Triumph Motorcycles India — T-series Q&A](https://www.triumphmotorcycles.in/for-the-ride/news/motorcycles/t-series-q-and-a-2024-03-28)
- [DriveSpark — Speed 400 service interval](https://www.drivespark.com/two-wheelers/2023/triumph-speed-400-service-interval-details-038657.html)
- [RushLane — Triumph 400 maintenance costs](https://www.rushlane.com/triumph-400-maintenance-will-be-lower-than-royal-enfield-350-bajaj-12474587.html)
- [Triumph 400 Forum — first service](https://www.triumph400forum.com/threads/first-service.239/)
- [Autocar India — Speed 400 specifications](https://www.autocarindia.com/bikes/triumph/speed-400/specifications)
- [Team-BHP — Speed 400 specifications](https://www.team-bhp.com/new-bikes/triumph/speed-400/specifications/)
