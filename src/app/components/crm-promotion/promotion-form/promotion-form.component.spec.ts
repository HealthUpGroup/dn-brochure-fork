import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PromotionFormComponent } from './promotion-form.component';
import { CRM_PAGE_CONFIG } from '../../../service/crm-promotion/crm-token';
import { provideCreatePromotionConfig } from '../../../factory/crm-promotion/create-promotion';
import {
  CHEAPEST_ACTION,
  REGISTER_FEE_ACTION,
  REGISTER_FEE_GOOD_CODE,
} from '../../../lib/crm-promotion/promotion-actions';
import { TCreatePromotionRequest } from '../../../types/crm-promotion.type';
import { ComponentFixture } from '@angular/core/testing';

function fixtureFor(path: string): ComponentFixture<PromotionFormComponent> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withXhr()),
      provideHttpClientTesting(),
      { provide: CRM_PAGE_CONFIG, useValue: provideCreatePromotionConfig(path) },
    ],
  });
  return TestBed.createComponent(PromotionFormComponent);
}

function summaryPaths(fixture: ComponentFixture<PromotionFormComponent>): string[] {
  fixture.detectChanges();
  const items = fixture.nativeElement.querySelectorAll(
    '[data-testid="validation-summary-item"]',
  ) as NodeListOf<HTMLElement>;
  return Array.from(items).map((li) => li.dataset['path'] ?? '');
}

// The request built for a given page — this is the seam where a reward pool has
// historically been dropped without a trace, so assert on the payload, not the form.
function requestFor(path: string): TCreatePromotionRequest {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withXhr()),
      provideHttpClientTesting(),
      { provide: CRM_PAGE_CONFIG, useValue: provideCreatePromotionConfig(path) },
    ],
  });
  const fixture = TestBed.createComponent(PromotionFormComponent);
  const component = fixture.componentInstance;

  let emitted: TCreatePromotionRequest | undefined;
  component.submitted.subscribe((r) => (emitted = r));
  component.onSubmit();

  if (!emitted) throw new Error('form did not emit a request');
  return emitted;
}

describe('PromotionFormComponent payload', () => {
  describe('ค่าสมาชิก (REGISTERFEE)', () => {
    it('carries the register-fee SKU at 0 baht', () => {
      // The whole promotion is this one line: the POS reads it to promote the customer
      // to HUG Club. An empty pool here is a promotion that does nothing at the till,
      // saved without an error anywhere.
      const req = requestFor('create-register-fee');

      expect(req.action).toBe(REGISTER_FEE_ACTION);
      expect(req.rewardPool).toEqual([
        {
          goodCode: REGISTER_FEE_GOOD_CODE,
          itemBenefitType: 'PRICE',
          itemBenefitValue: 0,
        },
      ]);
    });

    it('is a BILL promotion with a single tier', () => {
      const req = requestFor('create-register-fee');

      expect(req.promotionType).toBe('BILL');
      expect(req.thresholdType).toBe('BILLSUBTOTAL');
      expect(req.isRepeat).toBeFalse();
      expect(req.tiers.length).toBe(1);
    });
  });

  describe('แถมในกลุ่ม (CHEAPEST)', () => {
    it('sends no reward pool — the reward is a count, not a SKU list', () => {
      const req = requestFor('create-cheapest');

      expect(req.action).toBe(CHEAPEST_ACTION);
      expect(req.rewardPool).toEqual([]);
    });

    it('pins the threshold to one set and repeats', () => {
      const req = requestFor('create-cheapest');

      expect(req.promotionType).toBe('BUNDLE');
      expect(req.thresholdType).toBe('BUNDLECOUNT');
      expect(req.isRepeat).toBeTrue();
      expect(req.tiers).toEqual([{ thresholdValue: 1, rewardValue: 1 }]);
    });
  });

  it('still strips the pool from a plain discount promotion', () => {
    const req = requestFor('create-bill');

    expect(req.action).toBe('BILLBATHDISC');
    expect(req.rewardPool).toEqual([]);
  });
});

describe('PromotionFormComponent submit gate', () => {
  describe('ลดรายสินค้า (ITEM)', () => {
    // 2026-09-30: every ITEM create/edit was disabled with no message. The
    // "zero threshold on repeat" rule fired on the ITEM seed (threshold 0, isRepeat
    // true, which is how every ITEM promotion is authored) and hung on
    // promotionBenefit -- a node the inline page renders no alert for.
    it('is submittable once a product and a reward are filled in', () => {
      const fixture = fixtureFor('create-inline');
      const c = fixture.componentInstance;
      c.onMasterChange('promotionName', 'ลด 5 บาท');
      c.onChangeFilter(
        {
          filterType: 'EXIST',
          filterValue: 1,
          productList: [{ goodCode: 'A1', goodName: 'ยา A', sku: '1' }],
        },
        0,
      );
      c.onBenefitChange({ tiers: [{ thresholdValue: 0, rewardValue: 5 }] });

      expect(summaryPaths(fixture)).toEqual([]);
      expect(c.canSubmit()).toBeTrue();
    });

    it('lists every blocking rule above the button, including ones no field alert shows', () => {
      const fixture = fixtureFor('create-inline');
      const paths = summaryPaths(fixture);

      // The seed's zeros: no name, no product, a 0 reward.
      expect(paths).toContain('promotionMaster.promotionName');
      expect(paths).toContain('promotionFilter.0.productList');
      expect(paths).toContain('promotionBenefit.tiers.0.rewardValue');
      // The summary is what makes a rule on a section node visible on this page.
      expect(paths).not.toContain('promotionBenefit');
      expect(fixture.componentInstance.canSubmit()).toBeFalse();
    });
  });

  describe('ค่าสมาชิก (REGISTERFEE)', () => {
    // Same 2026-09-30 class: the reward floor rejected the page's always-0 reward, and the
    // page hides that box, so nothing on screen said why.
    it('is submittable with just a name and a bill minimum', () => {
      const fixture = fixtureFor('create-register-fee');
      const c = fixture.componentInstance;
      c.onMasterChange('promotionName', 'สมัครฟรีเมื่อซื้อครบ 1000');
      c.onBenefitChange({ tiers: [{ thresholdValue: 1000, rewardValue: 0 }] });

      expect(summaryPaths(fixture)).toEqual([]);
      expect(c.canSubmit()).toBeTrue();
    });
  });

  it('shows a rule that hangs on a section node, with the section named', () => {
    // A BILL page with a repeating tier at threshold 0: the rule is real there, and it
    // hangs on promotionBenefit, which only the summary renders.
    const fixture = fixtureFor('create-bill');
    const c = fixture.componentInstance;
    c.onMasterChange('promotionName', 'ทดสอบ');
    c.onBenefitChange({
      isRepeat: true,
      tiers: [{ thresholdValue: 0, rewardValue: 10 }],
    });

    expect(summaryPaths(fixture)).toContain('promotionBenefit');
    const text = fixture.nativeElement.querySelector(
      '[data-testid="validation-summary"]',
    ).textContent as string;
    expect(text).toContain('สิทธิประโยชน์');
    expect(text).toContain('สิทธิประโยชน์แบบซ้ำ/ทุกๆ ต้องมีจำนวนขั้นต่ำมากกว่า 0');
  });

  it('renders nothing once the form is valid', () => {
    const fixture = fixtureFor('create-bill');
    const c = fixture.componentInstance;
    c.onMasterChange('promotionName', 'ทดสอบ');
    c.onBenefitChange({ tiers: [{ thresholdValue: 0, rewardValue: 10 }] });

    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="validation-summary"]'),
    ).toBeNull();
    expect(c.canSubmit()).toBeTrue();
  });
});

