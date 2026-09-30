import {
  apply,
  applyEach,
  applyWhen,
  disabled,
  FieldValidator,
  max,
  min,
  minLength,
  required,
  schema,
  validate,
} from '@angular/forms/signals';
import {
  TPromotionMaster,
  TPromotionDatetime,
  TPromotionMember,
  TPromotionBranch,
  TPromotionBenefit,
  TPromotionFilterState,
  TProductRewardPool,
  TBranch,
  TMember,
  TPromotionTier,
  TTimeSpan,
} from '../../../../types/crm-promotion.type';
import {
  CHEAPEST_ACTION,
  POOL_PERCENT_TYPE,
  REGISTER_FEE_ACTION,
  SPEND_THRESHOLD,
  THRESHOLD_RULES,
  isPoolOnlyAction,
  isPriceAction,
  isSpendAction,
} from '../../../../lib/crm-promotion/promotion-actions';


const dateRangeSchema = schema<TPromotionMaster['dateRange']>((_path) => {
  required(_path.startDate);
  required(_path.endDate);
});

// ── Master ──────────────────────────────────────────────
const _today = new Date();
const _todayDate = { year: _today.getFullYear(), month: _today.getMonth() + 1, day: _today.getDate() };

export const initialMaster: TPromotionMaster = {
  promotionName: '',
  promotionDesc: '',
  promotionType: 'BILL',
  source: 'HU',
  dateRange: {
    startDate: { ..._todayDate },
    endDate: { ..._todayDate },
  },
  promotionPriority: '0',
  promotionOrder: '0',
};
export const promotionMasterSchema = schema<TPromotionMaster>((_path) => {
  required(_path.promotionName);
  required(_path.promotionType);
  required(_path.promotionOrder);
  required(_path.promotionPriority);
  required(_path.source);
  disabled(
    _path.promotionOrder,
    ({ valueOf }) => valueOf(_path.source) === 'HU',
  );
  //required(_path.promotionType) set from route
  apply(_path.dateRange, dateRangeSchema);
  //validate date range
  validate(_path.dateRange, ({ value }) => {
    const { startDate: start, endDate: end } = value();
    const toNum = (d: { year: number; month: number; day: number }) =>
      d.year * 10000 + d.month * 100 + d.day;
    return toNum(start) <= toNum(end)
      ? null
      : {
        kind: 'invalid date range',
        message: 'วันที่เริ่มต้องไม่มากกว่าวันสิ้นสุด',
      };
  });

  //validate date invalid order
  // Checked on the master node, not on promotionOrder: that field is disabled for
  // HU and disabled fields are excluded from validation.
  validate(_path, ({ value }) => {
    const { source, promotionOrder } = value();
    if (source === 'HU' && promotionOrder !== '0')
      return {
        kind: 'invalid order',
        message: 'โปรโมชั่นของ Health Up ต้องเป็นลำดับสุดท้ายเท่านั้น',
      };
    return null;
  });
});

// ── Datetime ────────────────────────────────────────────
export const initialDatetime: TPromotionDatetime = {
  activeDay: [true, true, true, true, true, true, true],
  limitTime: false,

  timeSpan: {
    startTime: { hour: 0, minute: 0, second: 0 },
    endTime: { hour: 0, minute: 0, second: 0 },
  },
};

// ngb-timepicker emits whatever is typed (including minute 60) and null for a
// cleared box, so the range has to be checked here or a shifted time is saved.
const isValidTime = (t: { hour: number; minute: number }) =>
  Number.isInteger(t?.hour) &&
  Number.isInteger(t?.minute) &&
  t.hour >= 0 &&
  t.hour <= 23 &&
  t.minute >= 0 &&
  t.minute <= 59;

const timespanSchema = schema<TTimeSpan>((_path) => {
  validate(_path, ({ value }) => {
    const { startTime, endTime } = value();
    if (!isValidTime(startTime) || !isValidTime(endTime))
      return {
        kind: 'time out of range',
        message: 'เวลาต้องอยู่ในช่วง 00:00 - 23:59',
      };
    const toMin = (t: { hour: number; minute: number }) =>
      t.hour * 60 + t.minute;
    const startMin = toMin(startTime);
    const endMin = toMin(endTime);
    // The API rejects endTime 00:00 unconditionally; blocking it here keeps the
    // user from hitting a generic server error with no field-level hint.
    if (endMin === 0)
      return {
        kind: 'time span error',
        message: 'เวลาสิ้นสุดต้องไม่เป็น 00:00 (สูงสุด 23:59)',
      };
    if (startMin < endMin) return null
    return {
      kind: 'time span error',
      message: 'เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด',
    };
  })
});

export const promotionDatetimeSchema = schema<TPromotionDatetime>((_path) => {
  applyWhen(_path.timeSpan, ({ valueOf }) => valueOf(_path.limitTime), timespanSchema);
  validate(_path.activeDay, ({ value }) =>
    value().reduceRight((acc, cur) => acc || cur)
      ? null
      : { kind: 'active day error', message: 'ต้องกำหนดวันใช้อย่างน้อย 1 วัน' },
  );
  disabled(_path.timeSpan, ({ valueOf }) => !valueOf(_path.limitTime));
});

// ── Member ──────────────────────────────────────────────
export const initialMember: TPromotionMember = {
  isMemberSpecific: false,
  members: [],
};
export const promotionMemberSchema = schema<TPromotionMember>((_path) => {
  applyWhen(
    _path,
    ({ value }) => value().isMemberSpecific,
    (_path) => {
      minLength(_path.members, 1, {
        message: 'ต้องระบุระดับสมาชิกอย่างน้อย 1 ระดับ',
      });
    },
  );
  validate(_path.members, memberUniqueValidator);
});

// ── Branch ──────────────────────────────────────────────
export const initialBranch: TPromotionBranch = {
  isBranchSpecific: false,
  branches: [],
};
export const promotionBranchSchema = schema<TPromotionBranch>((_path) => {
  applyWhen(
    _path,
    ({ value }) => value().isBranchSpecific,
    (_path) => {
      minLength(_path.branches, 1, { message: 'ต้องระบุสาขาอย่างน้อย 1 สาขา' });
    },
  );
  validate(_path.branches, branchUniqueValidator);
});
// tier
// Only the rules that need no sibling context live here. The threshold floor and
// the reward floor both depend on thresholdType / action, which sit on the parent
// benefit node, so they are declared in promotionBenefitSchema's applyEach block
// where those paths are in scope.
export const promotionTierSchema = schema<TPromotionTier>((path) => {
  min(path.rewardValue, 0, { message: 'จำนวนส่วนลดต้องมากกว่าหรือเท่ากับ 0' });
  required(path.thresholdValue, { message: 'ต้องระบุจำนวนขั้นต่ำ' });
});
//reward
// Applied per rewardPool item from promotionBenefitSchema. Previously this existed
// but was never apply-ed anywhere, and tested itemBenefitType === 'PERCENT' -- a
// value the picker never sets (it sets PERCENTDISC), so it was doubly inert: a
// 250% PWP discount validated clean and shipped.
export const promotionRewardPercentSchema = schema<TProductRewardPool>(
  (path) => {
    min(path.itemBenefitValue, 0, {
      message: 'ค่าส่วนลดต้องมากกว่าหรือเท่ากับ 0',
    });
    required(path.itemBenefitValue, { message: 'ต้องระบุค่าส่วนลด' });
    // A percent is 1-100 (86exej34u). The tier-side percent already has this floor
    // through the reward-floor rule below; the pool item had only the cap, so a
    // 0% PWP line validated clean and gave nothing at the till.
    applyWhen(
      path,
      ({ value }) => value().itemBenefitType === POOL_PERCENT_TYPE,
      (p) => {
        min(p.itemBenefitValue, 1, { message: 'ส่วนลด % ต้องอยู่ระหว่าง 1-100' });
        max(p.itemBenefitValue, 100, { message: 'ส่วนลด % ต้องอยู่ระหว่าง 1-100' });
      },
    );
  },
);
// ── Benefit ─────────────────────────────────────────────
export const initialBenefit: TPromotionBenefit = {
  action: 'BILLBATHDISC',
  // Every page config overwrites this; 'BILLBATH' was a token no layer knows.
  thresholdType: 'BILLSUBTOTAL',
  isRepeat: false,
  tiers: [],
  rewardPool: [],
};


export const promotionBenefitSchema = schema<TPromotionBenefit>((_path) => {
  required(_path.action);
  required(_path.thresholdType);
  applyWhen(
    _path,
    ({ valueOf }) => {
      const current = valueOf(_path.action);
      return current === 'PWP' || current === 'GIFT'
    },
    (_path) => {
      minLength(_path.rewardPool, 1, { message: 'ต้องมีสินค้าสิทธิประโยชน์อย่างน้อย 1 รายการ' })
    }
  );
  //validate tiers
  minLength(_path.tiers, 1, {
    message: 'ต้องมีเงื่อนไขสิทธิประโยชน์อย่างน้อย 1 สิทธิ',
  });
  applyWhen(
    _path.tiers,
    ({ valueOf }) => valueOf(_path.isRepeat),
    (v) => {
      validate(v, ({ value }) =>
        value().length === 1
          ? null
          : {
            kind: 'invalid tiers',
            message: 'สิทธิประโยชน์แบบซ้ำ หรือทุกๆ ต้องมีแค่ 1 สิทธิ',
          },
      );
    },
  );
  applyEach(_path.tiers, promotionTierSchema);
  applyEach(_path.tiers, (p) => {
    // ── Threshold floor, keyed on thresholdType ──────────────────────────
    // A COUNT threshold of 0 is met by an empty basket; combined with isRepeat
    // that is an unbounded number of rewards. BILLSUBTOTAL 0 is legitimate
    // ("no minimum"), so this cannot be a blanket min().
    validate(p.thresholdValue, ({ value, valueOf }) => {
      const rule = THRESHOLD_RULES[valueOf(_path.thresholdType)];
      if (!rule) return null;
      const v = value();
      if (typeof v !== 'number' || Number.isNaN(v)) return null; // required() reports this
      if (v < rule.min)
        return {
          kind: 'threshold below minimum',
          message: `จำนวนขั้นต่ำต้องมากกว่าหรือเท่ากับ ${rule.min}${rule.unit ? ' ' + rule.unit : ''}`,
        };
      if (rule.integer && !Number.isInteger(v))
        return {
          kind: 'threshold not an integer',
          message: `จำนวนขั้นต่ำต้องเป็นจำนวนเต็ม${rule.unit ? ` (${rule.unit})` : ''}`,
        };
      return null;
    });

    // ── Reward floor, keyed on action ───────────────────────────────────
    // PRICE actions set an absolute price, where 0 means free. Everything else --
    // including PWP/GIFT -- needs a value above 0 or the promotion does nothing at
    // the till.
    //
    // PWP/GIFT are NOT exempt, which an earlier version of this file had them be.
    // Their rewardPool carries the benefit (which SKU, at what price); the tier
    // carries the QUANTITY, and CrmPromotionEngine reads it as exactly that:
    // `if (reward <= 0) continue` drops the promotion before CollectReward emits a
    // single gift or entitlement. Exempting them here shipped 0 and killed every
    // GIFT and PWP authored since.
    //
    // REGISTERFEE IS exempt: its grant is boolean (the register SKU goes on the bill at
    // 0 baht, or it does not), the engine tests it before the reward guard and never reads
    // the value, and the page hides the box and always authors 0. Holding it to the floor
    // disabled the ค่าสมาชิก page and the edit of the live one from 2026-09-20 to 09-30.
    required(p.rewardValue, { message: 'ต้องระบุจำนวน' });
    applyWhen(
      p.rewardValue,
      ({ valueOf }) =>
        !isPriceAction(valueOf(_path.action)) &&
        valueOf(_path.action) !== REGISTER_FEE_ACTION,
      (rv) => {
        min(rv, 1, { message: 'จำนวนต้องมากกว่า 0' });
      },
    );
    // A pool-only reward counts pieces/claims, so halves are meaningless -- the
    // engine floors them, turning 1.5 silently into 1.
    applyWhen(
      p.rewardValue,
      ({ valueOf }) => isPoolOnlyAction(valueOf(_path.action)),
      (rv) => {
        validate(rv, ({ value }) =>
          Number.isInteger(value())
            ? null
            : { kind: 'not an integer', message: 'จำนวนต้องเป็นจำนวนเต็ม' },
        );
      },
    );
    applyWhen(
      p.rewardValue,
      ({ valueOf }) => valueOf(_path.action).includes("PERCENT"),
      (p) => {
        max(p, 100, { message: 'ต้องไม่เกิน 100 %' })
      }
    );
    // CHEAPEST rewards a count of free units, not an amount: half an item cannot be
    // free, and a zero-unit reward is a promotion that does nothing at the till.
    applyWhen(
      p.rewardValue,
      ({ valueOf }) => valueOf(_path.action) === CHEAPEST_ACTION,
      (p) => {
        min(p, 1, { message: 'ต้องแถมอย่างน้อย 1 ชิ้น' });
        validate(p, ({ value }) =>
          Number.isInteger(value())
            ? null
            : {
              kind: 'not an integer',
              message: 'จำนวนชิ้นที่แถมต้องเป็นจำนวนเต็ม',
            },
        );
      }
    );
  });
  // distinct reward tier
  validate(_path.tiers, ({ value }) => {
    const rewardRef = new Set<number>();
    const thresholdRef = new Set<number>();
    for (const tier of value()) {
      const { rewardValue, thresholdValue } = tier;
      if (rewardRef.has(rewardValue)) return {
        kind: 'duplicate reward value',
        message: 'เงื่อนไขแต่ละระดับต้องมีจำนวนส่วนลดที่แตกต่างกัน',
      };
      if (thresholdRef.has(thresholdValue)) return {
        kind: 'duplicate threshold value',
        message: 'เงื่อนไขแต่ละระดับต้องมีจำนวนขั้นต่ำที่แตกต่างกัน',
      }
      rewardRef.add(rewardValue);
      thresholdRef.add(thresholdValue);
    }
    return null;
  });


  // ── Ladder ordering ─────────────────────────────────────────────────────
  // Distinctness alone allows (100 -> 50฿), (200 -> 10฿): spend more, get less.
  // Price actions invert -- a higher threshold should set a *lower* price -- so
  // they are skipped.
  //
  // Pool-only actions are NOT skipped any more. Their reward is a count of pieces
  // or claims, so "spend more, get fewer" is the same authoring error it is for an
  // amount; the old exemption came from treating the value as meaningless.
  validate(_path.tiers, ({ value, valueOf }) => {
    const action = valueOf(_path.action);
    if (isPriceAction(action)) return null;
    const tiers = [...value()].sort((a, b) => a.thresholdValue - b.thresholdValue);
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].rewardValue < tiers[i - 1].rewardValue)
        return {
          kind: 'non monotonic tiers',
          message: 'ขั้นที่สูงกว่าต้องได้ส่วนลดไม่น้อยกว่าขั้นที่ต่ำกว่า',
        };
    }
    return null;
  });

  // ── Repeating rung sanity ───────────────────────────────────────────────
  // The compound case: a repeating tier multiplies its reward by how many times
  // the threshold fits into the basket. A threshold of 0 fits infinitely often.
  // The per-type floor above already blocks this for COUNT types; this catches it
  // for BILLSUBTOTAL, where 0 is otherwise legal.
  //
  // ITEMEXIST is exempt. The ITEM page authors no threshold at all: every ITEM promotion is
  // threshold 0 + isRepeat true by construction (all 90 live ones are), and the engine reads
  // ITEMEXIST as a GATE -- an ITEM discount returns the tier value as a per-unit rate before the
  // repeat arithmetic is reached (CrmPromotionEngine.SelectReward). Applying this rule to it
  // blocked every ITEM create and edit from 2026-09-20 with no message on screen, because the
  // error hangs here on promotionBenefit and the inline page renders no alert for that node.
  validate(_path, ({ value }) => {
    const { isRepeat, tiers, thresholdType } = value();
    if (!isRepeat || thresholdType === 'ITEMEXIST') return null;
    return tiers.some((t) => t.thresholdValue <= 0)
      ? {
          kind: 'zero threshold on repeat',
          message: 'สิทธิประโยชน์แบบซ้ำ/ทุกๆ ต้องมีจำนวนขั้นต่ำมากกว่า 0',
        }
      : null;
  });

  validate(_path.rewardPool, rewardPoolUniqueValidator);
  // Was defined but never applied -- see promotionRewardPercentSchema.
  applyEach(_path.rewardPool, promotionRewardPercentSchema);

});

// ── Filter item (used as form-array item) ───────────────
export const initialFilterItem: TPromotionFilterState = {
  productList: [],
  filterType: 'COUNT',
  filterValue: 1,
};
export const promotionFilterItemSchema = schema<TPromotionFilterState>(
  (_path) => {
    minLength(_path.productList, 1, {
      message: 'ต้องมีสินค้าอย่างน้อย 1 รายการ',
    });
    // An EXIST group requires ONE unit, and now says so. The engine has always read
    // it that way -- `required = FilterValue > 0 ? FilterValue : 1` in both
    // CompleteBundles and BundleConsumption -- so a stored 0 only worked because a
    // fallback rescued it, and was ambiguous between "EXIST, deliberately" and
    // "nobody filled this in". The API coerces a posted 0 up to 1 rather than
    // rejecting it, so an older client is unaffected.
    validate(_path.filterValue, ({ value }) =>
      value() >= 1
        ? null
        : { kind: 'invalid filter value', message: 'ขั้นต่ำต้อง >= 1' },
    );
  },
);

export type TCreatePromotionForm = {
  promotionMaster: TPromotionMaster;
  promotionDatetime: TPromotionDatetime;
  promotionMember: TPromotionMember;
  promotionBranch: TPromotionBranch;
  promotionFilter: TPromotionFilterState[];
  promotionBenefit: TPromotionBenefit;
};

export const createPromotionSchema = schema<TCreatePromotionForm>((_path) => {
  apply(_path.promotionMaster, promotionMasterSchema);
  apply(_path.promotionDatetime, promotionDatetimeSchema);
  apply(_path.promotionMember, promotionMemberSchema);
  apply(_path.promotionBranch, promotionBranchSchema);

  applyWhen(
    _path,
    ({ valueOf }) => valueOf(_path.promotionMaster.promotionType) !== 'BILL',
    (_path) => {
      minLength(_path.promotionFilter, 1, {
        message: 'ต้องมีเงื่อนไขสินค้าอย่างน้อย 1 เงื่อนไข',
      });
    },
  );
  applyEach(_path.promotionFilter, promotionFilterItemSchema);
  validate(_path.promotionFilter, ({ value }) => {
    let filterTypeRef: string | null = null;
    const ref = new Set<string>();
    for (const filterOption of value()) {
      const { productList, filterType } = filterOption;
      filterTypeRef ??= filterType;
      // check every filter type should be the same
      if (filterType !== filterTypeRef)
        return {
          kind: 'invalid filter type',
          message: 'เงื่อนไขสินค้าต้องเหมือนกันทั้งกลุ่ม',
        };
      //check cross group duplicate product
      for (const product of productList) {
        if (ref.has(product.goodCode))
          return {
            kind: 'invalid filter cross product in filter',
            message: 'เงื่อนไขสินค้าต้องไม่มีสินค้าข้ามกลุ่ม',
          };
        ref.add(product.goodCode);
      }
    }
    return null;
  });

  // ── Spend threshold (BUNDLESUBTOTAL) ────────────────────────────────────
  // The tiers measure the BAHT of the goods the filter names, so the filter must be
  // exactly what the engine will read it as: one EXIST pool. Each rule below closes a
  // shape that saves cleanly and misbehaves at the till:
  //  - a COUNT group is still a unit requirement, so it would gate the promotion on
  //    "N pieces" on top of the baht -- and baht typed into it is how five promotions
  //    came to require 500 PIECES and never fire;
  //  - a second group is a second REQUIREMENT (every group must be present), not
  //    "these goods count too", which is what adding one looks like on this page;
  //  - BUNDLEPRICE / CHEAPEST need a set, and the engine does nothing with them here.
  // Cross-section, but hung on promotionFilter rather than the root: that is the node
  // the filter card's alert renders, and a root error is shown nowhere.
  validate(_path.promotionFilter, ({ value, valueOf }) => {
    const promotionFilter = value();
    if (valueOf(_path.promotionBenefit.thresholdType) !== SPEND_THRESHOLD) return null;
    if (!isSpendAction(valueOf(_path.promotionBenefit.action)))
      return {
        kind: 'invalid spend action',
        message: 'เงื่อนไขตามยอดซื้อใช้ได้กับส่วนลดบาท/เปอร์เซ็นต์ สิทธิแลกซื้อ และสินค้าแถมเท่านั้น',
      };
    if (promotionFilter.length > 1)
      return {
        kind: 'spend needs one pool',
        message: 'เงื่อนไขตามยอดซื้อมีกลุ่มสินค้าได้กลุ่มเดียว ให้รวมสินค้าที่นับยอดไว้ในกลุ่มเดียวกัน',
      };
    if (promotionFilter.some((f) => f.filterType !== 'EXIST'))
      return {
        kind: 'spend pool must be EXIST',
        message: 'กลุ่มสินค้าของเงื่อนไขตามยอดซื้อต้องไม่มีจำนวนชิ้นขั้นต่ำ',
      };
    return null;
  });
  apply(_path.promotionBenefit, promotionBenefitSchema);
});

const uniqueValidator =
  <T, K>(fn: (value: T) => K): FieldValidator<Array<T>> =>
    ({ value }) => {
      const ref = new Set<K>();
      for (const entry of value()) {
        const key = fn(entry);
        if (ref.has(key))
          return {
            kind: 'nonunique entry',
            message: `duplicate list with key : ${key}`,
          };
        ref.add(key);
      }
      return null;
    };

const rewardPoolUniqueValidator = uniqueValidator<TProductRewardPool, string>(
  (p) => p.goodCode,
);
const branchUniqueValidator = uniqueValidator<TBranch, string>(
  (b) => b.branchCode,
);
const memberUniqueValidator = uniqueValidator<TMember, number>((m) => m.id);
