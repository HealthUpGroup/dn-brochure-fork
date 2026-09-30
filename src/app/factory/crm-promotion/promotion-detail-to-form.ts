import { TPromotionDetail } from '../../types/crm-promotion.type';
import { resolvePromotionSource } from '../../lib/crm-promotion/resolve-promotion-source';
import { TCreatePromotionForm } from '../../pages/crm-promotion/create/create-bill-discount-promotion/createPromotionSchema';

function isoToNgbDate(iso: string) {
  const [year, month, day] = iso.split('T')[0].split('-').map(Number);
  return { year, month, day };
}

// The API can hold null/short values that the UI itself never produces. Guard the
// parsing so the edit page still renders instead of throwing on a blank field.
function timeStrToNgbTime(time: string | null | undefined) {
  const [hour = 0, minute = 0, second = 0] = (time ?? '').split(':').map(Number);
  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
    second: Number.isFinite(second) ? second : 0,
  };
}

type TActiveDay = [boolean, boolean, boolean, boolean, boolean, boolean, boolean];

function activeDaysToFlags(activeDays: string | null | undefined): TActiveDay {
  const chars = (activeDays ?? '').padEnd(7, '0').slice(0, 7);
  return Array.from(chars, (c) => c === '1') as TActiveDay;
}

export function promotionDetailToForm(d: TPromotionDetail): TCreatePromotionForm {
  return {
    promotionMaster: {
      promotionName: d.promotionName,
      promotionDesc: d.promotionDesc,
      promotionType: d.promotionType,
      source: resolvePromotionSource(d.source, d.promotionOrder),
      dateRange: {
        startDate: isoToNgbDate(d.startdate),
        endDate: isoToNgbDate(d.enddate),
      },
      promotionPriority: String(d.promotionPriority),
      promotionOrder: String(d.promotionOrder),
    },
    promotionDatetime: {
      activeDay: activeDaysToFlags(d.activeDays),
      limitTime: d.limitTime,
      timeSpan: {
        startTime: timeStrToNgbTime(d.startTime),
        endTime: timeStrToNgbTime(d.endTime),
      },
    },
    promotionMember: {
      isMemberSpecific: d.isMemberSpecific,
      members: d.members,
    },
    promotionBranch: {
      isBranchSpecific: d.isBranchSpecific,
      branches: d.branches,
    },
    // A stored 0 opens as 1. Older rows (53 of the 90 live ITEM promotions, 2026-09-30) hold
    // filterValue 0 from before the form wrote 1 for EXIST; the schema rejects 0, the ITEM page
    // has no box to change it, so every one of them was un-editable. 1 is what 0 has always
    // meant: the engine reads `required = FilterValue > 0 ? FilterValue : 1`, and the API lifts
    // a posted 0 to 1 -- saving back 1 changes nothing at the till.
    promotionFilter: d.filterList.map(f => ({
      filterType: f.filterType,
      filterValue: f.filterValue > 0 ? f.filterValue : 1,
      productList: f.productList,
    })),
    promotionBenefit: {
      action: d.action,
      thresholdType: d.thresholdType,
      isRepeat: d.isRepeat,
      tiers: d.tiers,
      rewardPool: d.rewardPool,
    },
  };
}
