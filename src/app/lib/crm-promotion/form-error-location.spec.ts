import {
  formErrorLocation,
  formErrorMessage,
  relativeFieldPath,
} from './form-error-location';

describe('formErrorMessage', () => {
  it('prefers the rule’s own message', () => {
    expect(formErrorMessage({ kind: 'min', message: 'จำนวนต้องมากกว่า 0' })).toBe(
      'จำนวนต้องมากกว่า 0',
    );
  });

  it('says a bare built-in kind in Thai, and falls back to the raw kind otherwise', () => {
    // required(_path.promotionName) has no message; the summary must not print "required".
    expect(formErrorMessage({ kind: 'required' })).toBe('ต้องระบุ');
    expect(formErrorMessage({ kind: 'something custom' })).toBe('something custom');
  });
});

describe('formErrorLocation', () => {
  it('names the section and the field in on-screen words', () => {
    expect(formErrorLocation('promotionMaster.promotionName')).toEqual({
      section: 'ข้อมูลทั่วไป',
      field: 'ชื่อโปรโมชั่น',
    });
  });

  it('numbers array entries from 1, by the array they sit in', () => {
    expect(formErrorLocation('promotionBenefit.tiers.0.rewardValue')).toEqual({
      section: 'สิทธิประโยชน์',
      field: 'ขั้นที่ 1 › จำนวน/ส่วนลด',
    });
    expect(formErrorLocation('promotionFilter.1.productList')).toEqual({
      section: 'เงื่อนไขตามสินค้า',
      field: 'กลุ่มที่ 2 › รายการสินค้า',
    });
    expect(formErrorLocation('promotionBenefit.rewardPool.2.itemBenefitValue').field).toBe(
      'รายการที่ 3 › ค่าส่วนลด',
    );
  });

  it('keeps the array name for a rule on the list itself', () => {
    expect(formErrorLocation('promotionBenefit.tiers').field).toBe('ขั้นสิทธิประโยชน์');
    expect(formErrorLocation('promotionBranch.branches').field).toBe('สาขา');
  });

  it('leaves the field blank for a rule on the section itself', () => {
    // This is the ITEM case: "zero threshold on repeat" hangs on promotionBenefit, which the
    // inline page never renders an alert for.
    expect(formErrorLocation('promotionBenefit')).toEqual({
      section: 'สิทธิประโยชน์',
      field: '',
    });
    expect(formErrorLocation('')).toEqual({ section: 'ทั้งฟอร์ม', field: '' });
  });

  it('falls back to the raw key rather than hiding an unmapped path', () => {
    expect(formErrorLocation('somethingNew.deep')).toEqual({
      section: 'somethingNew',
      field: 'deep',
    });
  });
});

describe('relativeFieldPath', () => {
  it('strips the root name and its dot', () => {
    expect(relativeFieldPath('form0', 'form0.promotionMaster.promotionName')).toBe(
      'promotionMaster.promotionName',
    );
    expect(relativeFieldPath('form0', 'form0')).toBe('');
  });

  it('does not strip a root name that is only a prefix of the first segment', () => {
    expect(relativeFieldPath('form', 'form0.x')).toBe('form0.x');
  });
});
