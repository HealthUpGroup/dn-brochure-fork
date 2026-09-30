# CRM Promotion Module

Staff-facing tool for authoring retail promotions: create, list, view, edit,
and activate/deactivate promotions, plus manage the reusable branch and
product groupings promotions draw on. A legacy-style feature domain (pages
under `src/app/pages/crm-promotion/`, components/services/types in the
shared top-level folders rather than self-contained here).

Despite the folder name, this module talks to the **Other Income API**
(`environment.oi + '/crm'`) — that is its only backend. It shares no state or
components with the `src/app/other-income/` module beyond the UI controls
noted under "Shared UI" below.

## Where the pieces live

This module is spread across the legacy top-level folders, not one tree:

```
src/app/
├── routes/crm-promotion.route.ts        Mounted at /crm-promotion
├── pages/crm-promotion/
│   ├── promotions/                      List page + promotion-detail page
│   ├── create/create-bill-discount-promotion/
│   │   ├── create-bill-discount-promotion.component.ts   Thin page — all 3 create routes
│   │   └── createPromotionSchema.ts     Signal-forms schemas + initial* consts + form type
│   ├── edit/edit-promotion.component.ts Thin page — /:id/edit
│   └── config/                          Reusable group admin: branches/, products/
├── components/crm-promotion/
│   ├── promotion-form/                  PromotionFormComponent — the whole form
│   ├── create-promotion-subform/        promotion-master/-datetime/-limit-usage/-product-filter
│   └── (benefit-*, inline-*, promotion-*, product-picker, ...)  Field-level controls
├── factory/crm-promotion/
│   ├── create-promotion.ts              provideCreatePromotionConfig / provideEditPromotionConfig
│   └── promotion-detail-to-form.ts      TPromotionDetail -> TCreatePromotionForm
├── service/crm-promotion/               crm-promotion (CRUD), branch-config, product-config,
│                                        product-group-config, member-config, crm-token
├── layout/crm-promotion-layout/         Shell for all /crm-promotion routes
├── lib/crm-promotion/                   Display pipes (promotion-type, -order, -priority,
│                                        -threshold, -benefit-name, product-name)
└── types/crm-promotion.type.ts          All domain/request/response types
```

Docs at repo root: `docs/crm-promotion-edit-api-spec.md` (PUT contract +
backend-enforced business rules), `docs/crm-promotion-editor-tasks.md`
(edit-feature task log; its end-to-end checklist is still unchecked).

## Six create pages, three promotion types, one form

`promotionType` is not a field the author picks — the **route path** determines
it. All five create pages share `PromotionFormComponent`; differences are pushed
into an injected config object rather than branched inside the form.

| Create route          | Label                | `promotionType` | Threshold options           |
| --------------------- | -------------------- | --------------- | --------------------------- |
| `create-bill`         | ส่วนลดท้ายบิล        | `BILL`          | `BILLSUBTOTAL`, `BILLCOUNT` |
| `create-group`        | ส่วนลดตามกลุ่มสินค้า | `BUNDLE`        | `BUNDLECOUNT`               |
| `create-inline`       | ลดรายสินค้า          | `ITEM`          | none — always `ITEMEXIST`   |
| `create-register-fee` | ค่าสมาชิก            | `BILL`          | `BILLSUBTOTAL` (pinned)     |
| `create-cheapest`     | แถมในกลุ่ม           | `BUNDLE`        | `BUNDLECOUNT` (pinned)      |
| `create-spend`        | ส่วนลดตามยอดซื้อกลุ่มสินค้า | `BUNDLE`  | `BUNDLESUBTOTAL` (pinned)   |

`create-spend` is "spend N baht on these goods": the tier ladder holds the **baht**
(500 → 50, 700 → 80) and the filter is one `EXIST` pool that only names the goods —
it reuses the BILL page's `showPool` control. Unlike a pool-scoped BILL promotion the
till splits the discount onto the goods' own lines (DrugPOSApp sale RULES §1.20).
**`BUNDLE` is therefore two shapes under one `promotionType`**, told apart by
`thresholdType`; `provideEditPromotionConfig` keys on both, or a spend promotion
would reopen with the set page's controls and save back as `BUNDLECOUNT` ("500 sets").

The last two are narrowed presets rather than new types: `fixedAction: true`
hides the action and threshold selects entirely, leaving the author one number.
So there are **4 distinct (promotionType, thresholdType) pairs** creatable, and
14 (promotionType, action) combinations.

`CRM_PAGE_CONFIG` (`service/crm-promotion/crm-token.ts`) is the mechanism. It
carries `pageName`, `initialData`, `filterOption` (four booleans gating which
filter widgets render) and `rewardOption` (which reward actions / threshold
types are selectable). Create routes provide it via
`provideCreatePromotionConfig(path)` keyed on route path; the edit page
provides it via `provideEditPromotionConfig(detail)` keyed on
`detail.promotionType`. **Adding a promotion type means adding a case to both
factories** — they duplicate the same filter/reward tables.

`EditPromotionComponent` provides the token in its own `@Component.providers`
with a `useFactory` that reads `ActivatedRoute.snapshot.data['detail']`, not
in the route's `providers` block. This is deliberate: providing at route level
with `deps: [ActivatedRouteSnapshot]` caused a circular dependency.

## Form architecture

`PromotionFormComponent` owns all form state and is shared by create and edit.
Pages are thin: they pass `submitLabel` / `submitting` / optional
`initialData`, project a header via `slot="header"`, and handle the
`submitted` output (which emits a finished `TCreatePromotionRequest`) by
calling the service and navigating.

One `formModel` signal of type `TCreatePromotionForm` holds six sections —
`promotionMaster`, `promotionDatetime`, `promotionMember`, `promotionBranch`,
`promotionFilter`, `promotionBenefit` — wrapped by
`form(this.formModel, createPromotionSchema)` from `@angular/forms/signals`.
Every handler is an immutable `formModel.update(...)`. No `ReactiveFormsModule`.

### Three shapes for the same data

The conversions between these are where the real logic sits:

- **`TPromotionDetail`** — `GET /crm/promotions/:id`. ISO date strings,
  `activeDays` as `"1111111"`, priority/order as numbers.
- **`TCreatePromotionForm`** — the form model. `NgbDateStruct`/`NgbTimeStruct`,
  `activeDay` as a 7-tuple of booleans, priority/order as **strings** (they
  bind to `<select>`), products as full objects.
- **`TCreatePromotionRequest`** — POST/PUT body. Back to ISO strings, binary
  string, numbers; products flattened to bare `goodCode` strings.

Detail→form is the exported pure function in `factory/crm-promotion/
promotion-detail-to-form.ts`. Form→request is the **private** `buildRequest()`
inside `promotion-form.component.ts`. They are inverses in effect but not in
structure or location — change one, check the other.

## Validation

All in `createPromotionSchema.ts` as signal-forms schemas, Thai messages.
The API validates a **subset** of these (source, tier counts/distinctness, the
PERCENT cap, filter-group shape, reward-pool presence, and the count-reward rules
below); everything else is guarded here alone.
`docs/crm-promotion-edit-api-spec.md` splits its rules into the ones the API
enforces and a "Not yet enforced by the API" section, which is the spec for the
backend work that should follow. The non-obvious ones:

- `source === 'HU'` forces and disables `promotionOrder = '0'`. Because the
  field is disabled, signal-forms skips validators on it — the rule is checked
  on the `promotionMaster` node, and `buildRequest()` derives `0` for HU
  independently, so a stale order cannot be submitted.
- Tiers need distinct `thresholdValue` **and** distinct `rewardValue`;
  `isRepeat = true` means exactly one tier.
- **Threshold floors are per-`thresholdType`**, not a blanket `min()`:
  `BILLSUBTOTAL` 0 is the legitimate "no minimum", but `BILLCOUNT`/`BUNDLECOUNT`
  0 is met by an empty basket — and on a repeating tier, met without bound. Both
  COUNT types also require an integer. Table is `THRESHOLD_RULES` in
  `lib/crm-promotion/promotion-actions.ts`. Because the floor depends on a
  sibling field (`thresholdType` lives on the parent benefit node), the rule is a
  `validate` inside `promotionBenefitSchema`'s `applyEach(_path.tiers, …)` block,
  not in `promotionTierSchema`.
- `isRepeat = true` additionally requires every `thresholdValue > 0` — the
  compound case, which catches `BILLSUBTOTAL` where 0 is otherwise legal.
- **Reward floors are per-`action`**: `*BATHDISC`/`*PERCENTDISC` need `> 0` (a 0
  deduction does nothing at the till); `BUNDLEPRICE`/`ITEMPRICE` allow 0 (an
  absolute price, so 0 = free); `CHEAPEST` needs an integer `>= 1`.
  **`PWP`/`GIFT` are not exempt** — their `rewardPool` says *what* the customer
  gets, but the tier's `rewardValue` says *how many* (pieces given, claims
  offered), and `CrmPromotionEngine` reads it as exactly that: `if (reward <= 0)
  continue` drops the promotion before `CollectReward` emits anything. An earlier
  version treated the value as meaningless and hid the input, which shipped 0 and
  killed every GIFT and PWP authored after that change. Integer `>= 1`, same as
  `CHEAPEST`. **`REGISTERFEE` is exempt**: its grant is boolean, the engine never
  reads the value, and the page hides the box and always authors 0 — holding it to
  the floor disabled the ค่าสมาชิก page and the live promotion's edit from
  2026-09-20 to 09-30 with no message on screen.
- Actions containing `"PERCENT"` cap `rewardValue` at 100.
- Tier ladders must be monotonic once sorted by threshold — distinctness alone
  allowed "spend more, get less". Skipped for `PRICE` actions only (they invert:
  a higher threshold should set a *lower* price). `PWP`/`GIFT` are included, since
  their reward is a count.
- `rewardPool` item values: `>= 0`, and `<= 100` for `itemBenefitType`
  `PERCENTDISC`. Note the pool's type enum (`PRICE | BATHDISC | PERCENTDISC`) is
  **not** the promotion-level `action`, so an action-based percent cap misses it.
  `promotionRewardPercentSchema` previously tested for `'PERCENT'` and was never
  `apply`-ed at all, so a 250% PWP discount shipped clean.
- `PWP` / `GIFT` require a non-empty `rewardPool`; for any other action
  `buildRequest()` sends `rewardPool: []`, and changing the action clears the
  pool, so items cannot carry across reward types.
- All filter groups must share one `filterType`; no `goodCode` may appear in
  two groups. `filterValue >= 1` for every type — an `EXIST` group stores **1**,
  not 0. The engine coerces it either way (`required = FilterValue > 0 ?
  FilterValue : 1`), so 0 only ever worked because a fallback rescued it, and was
  ambiguous between "EXIST, deliberately" and "nobody filled this in". The API
  lifts a posted 0 to 1 rather than rejecting it, so older clients are unaffected.
  `promotionDetailToForm` opens a stored 0 as 1 for the same reason: 53 of the 90
  live ITEM promotions still hold 0, and the ITEM page has no box to change it, so
  without the lift their edit page was blocked.
- ⚠️ **`filterType` itself is carried end-to-end and read by nothing.**
  `CrmPromotionEngine` never references it — only `filterValue` and the good
  codes. A `SUBTOTAL` group was therefore authored in baht
  ("เพิ่มเงื่อนไขตามยอด(บาท)") and evaluated as a unit count; that button has been
  removed. Baht belongs on the **tiers**: `create-spend` (`BUNDLESUBTOTAL`), or a
  pool-scoped BILL promotion when a whole-bill discount is really meant.
- **`BUNDLESUBTOTAL` pins its own shape**: exactly one filter group, `EXIST`, and an
  action from `SPEND_ACTIONS` (no `BUNDLEPRICE`/`CHEAPEST` — they need a set and the
  engine ignores them here); threshold floor 1 baht. The rule hangs on
  `promotionFilter`, not the root, because that is the node whose alert renders. The
  API enforces the same.
- `limitTime` gates the timespan sub-schema. Hour must be 0-23 and minute
  0-59 (a cleared box reads as null and is rejected), and `endTime` may
  never be `00:00` — matching `docs/crm-promotion-edit-api-spec.md`, which the
  API enforces. Treating `00:00` as end-of-day is an open request that needs
  the evaluator changed in the same release; see ClickUp `86eynabyf`.
- `promotionType !== 'BILL'` requires at least one filter group.

## Services

`CrmPromotionService` (root) is the promotion CRUD surface: `allPromotions`
signal, `createPromotion`, `getPromotionById`, `updatePromotion`,
`togglePromotionStatus`. Cache invalidation idiom throughout this module is a
counter signal + `toObservable` + `switchMap` re-fetch, exposed as a
`refetch*()` method — `BranchConfigService`, `ProductConfigService` follow it
too. `ProductGroupConfigService` is the only route-scoped service (provided on
`config-product/:productGroupId`); it mostly re-exports `ProductConfigService`
members.

## Known gaps / check before building on this

- **`CrmGroupService` is an empty shell** — decorator and imports, no members.
  It has a `.spec.ts`. Don't assume it does anything.
- **The entire edit feature ships untested**: no `.spec.ts` for
  `promotion-form.component.ts`, `promotion-detail-to-form.ts`,
  `edit-promotion.component.ts`, or `factory/crm-promotion/create-promotion.ts`.
  The end-to-end checklist in `docs/crm-promotion-editor-tasks.md` is also
  entirely unchecked — that flow may never have been verified manually.
  `promotion-detail-to-form.ts` is a pure function and the cheapest place to
  start.
- `ProductConfigService` has both a `fetchAllProducts()` method and an
  `allProduct` signal hitting the same `/all-products` endpoint, plus
  commented-out dead code. `ProductGroupConfigService` also carries a
  commented-out block.
- `initialBenefit.thresholdType` is now `'BILLSUBTOTAL'` (it was `'BILLBATH'`, a
  token no layer knew). Every factory case still overrides it, so nothing reads
  the default — but `BenefitSelectComponent.onActionChange()` resets
  `thresholdType` from `config.initialData`, i.e. from the *overridden* value, so
  a missed override would now write a real token rather than a bogus one.
- **The API validates only part of the promotion body.** The signal-forms schema
  is still the main guard; `docs/crm-promotion-edit-api-spec.md` has a
  "Not yet enforced by the API" section listing what the backend still owes —
  notably the per-`thresholdType` threshold floors, ladder monotonicity, the
  reward-pool percent cap, and any whitelist of `action` / `thresholdType` /
  `promotionType` / `filterType` / `itemBenefitType` values (there is none, at any
  layer, in any of the three repos).
  Threshold floors are per-`thresholdType` (`THRESHOLD_RULES` in
  `lib/crm-promotion/promotion-actions.ts`) and reward floors per-`action` —
  neither can be a blanket `min()`, because `BILLSUBTOTAL` 0 means "no minimum"
  while `BUNDLECOUNT` 0 means an unbounded discount.
- `FormAlertTextComponent` gates errors on `touched`, because the create pages
  seed zeros that the schema legitimately rejects. Container/cross-field nodes
  (tier ladder, filter groups, date range) need `[alwaysShow]="true"` — nothing
  ever marks them touched, so gating alone would silence them permanently.
- **Every blocking rule is also listed above the submit button** by
  `PromotionValidationSummaryComponent` (`components/crm-promotion/
  promotion-validation-summary/`), which reads the root's `errorSummary()` and
  names each error's section and field via `lib/crm-promotion/form-error-location.ts`.
  It is not gated on `touched`: it exists to explain a disabled button. The
  per-node alerts alone cannot, because a rule on a node whose alert a page does
  not render is invisible — on 2026-09-30 every ITEM create/edit was disabled with
  no message, since "zero threshold on repeat" hung on `promotionBenefit` and the
  inline page renders no alert for that node. When adding a form field, add its
  label to `FIELD_LABELS` there or the summary shows the raw key.
- **`ITEMEXIST` is exempt from "zero threshold on repeat".** Every ITEM promotion
  is threshold 0 + `isRepeat: true` by construction (all 90 live ones are); the
  engine reads `ITEMEXIST` as a gate and returns an ITEM discount's tier value as a
  per-unit rate before any repeat arithmetic (`CrmPromotionEngine.SelectReward`).
- The create page component is still named
  `CreateBillDiscountPromotionComponent` but serves all three create routes.

## Shared UI — the trap

`src/app/components/crm-promotion/` is **not owned by this module**.
`SignalMonthPickerComponent` and `FormAlertTextComponent` there are also
imported by `src/app/other-income/` v2 forms, which is unrelated to this
module. Editing them in place for a CRM Promotion need can silently break
Other Income v2 — this class of breakage has already happened once with
`src/app/components/date-input/`. Prefer adding module-scoped components
rather than changing shared `components/*` files in place.
