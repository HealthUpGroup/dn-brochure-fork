import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { promotionDetailToForm } from './promotion-detail-to-form';
import { createPromotionSchema } from '../../pages/crm-promotion/create/create-bill-discount-promotion/createPromotionSchema';
import { TPromotionDetail } from '../../types/crm-promotion.type';

// The shape of every ITEM promotion the API holds (id 1, 2026-09-30): threshold 0 with
// isRepeat, one EXIST group, and -- on the older rows -- a filterValue of 0.
function itemDetail(overrides: Partial<TPromotionDetail> = {}): TPromotionDetail {
  return {
    id: 1,
    promotionName: 'ลดพารา',
    promotionDesc: '',
    promotionType: 'ITEM',
    source: null,
    action: 'ITEMPRICE',
    thresholdType: 'ITEMEXIST',
    isRepeat: true,
    isBranchSpecific: false,
    isMemberSpecific: false,
    startdate: '2026-01-01T00:00:00',
    enddate: '2026-12-31T00:00:00',
    limitTime: false,
    startTime: '00:00:00',
    endTime: '00:00:00',
    activeDays: '1111111',
    promotionStatus: 'ACTIVE',
    promotionPriority: 0,
    promotionOrder: 0,
    tiers: [{ thresholdValue: 0, rewardValue: 99 }],
    filterList: [
      {
        filterType: 'EXIST',
        filterValue: 0,
        productList: [{ goodCode: 'A1', goodName: 'ยา A', sku: '1' }],
      },
    ],
    rewardPool: [],
    branches: [],
    members: [],
    ...overrides,
  };
}

describe('promotionDetailToForm', () => {
  it('opens a stored filterValue of 0 as 1', () => {
    // 53 of the 90 live ITEM promotions store 0. The schema rejects it and the ITEM page has
    // no box to change it, so their edit page was blocked. 1 is what 0 has always meant to
    // the engine and what the API lifts a posted 0 to, so saving 1 back changes nothing.
    const f = promotionDetailToForm(itemDetail());
    expect(f.promotionFilter[0].filterValue).toBe(1);
  });

  it('keeps a stored filterValue above 0 as is', () => {
    const d = itemDetail({
      filterList: [{ filterType: 'COUNT', filterValue: 3, productList: [] }],
    });
    expect(promotionDetailToForm(d).promotionFilter[0].filterValue).toBe(3);
  });

  it('opens the live register-fee promotion (reward 0) as a valid form', () => {
    const d = itemDetail({
      id: 184,
      promotionType: 'BILL',
      action: 'REGISTERFEE',
      thresholdType: 'BILLSUBTOTAL',
      isRepeat: false,
      tiers: [{ thresholdValue: 1000, rewardValue: 0 }],
      filterList: [],
      rewardPool: [
        {
          goodCode: '11755',
          goodName: 'ค่าสมัครสมาชิก HUG Club',
          sku: '066',
          itemBenefitType: 'PRICE',
          itemBenefitValue: 0,
        },
      ],
    });
    TestBed.runInInjectionContext(() => {
      const f = form(signal(promotionDetailToForm(d)), createPromotionSchema);
      expect(f().errorSummary().map((e) => e.kind)).toEqual([]);
    });
  });

  it('opens a live-shaped ITEM promotion as a valid form', () => {
    // The whole point of the edit page: an unrelated edit must not be blocked by what the
    // row already holds. Threshold 0 + isRepeat is exempt in the schema; filterValue is lifted
    // above.
    TestBed.runInInjectionContext(() => {
      const model = signal(promotionDetailToForm(itemDetail()));
      const f = form(model, createPromotionSchema);
      expect(f().errorSummary().map((e) => e.kind)).toEqual([]);
      expect(f().valid()).toBeTrue();
    });
  });
});
