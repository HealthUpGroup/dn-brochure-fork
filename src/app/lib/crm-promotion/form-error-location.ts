// Turns a signal-forms field path ("promotionBenefit.tiers.0.rewardValue") into the words the
// author sees on screen, so the submit-blocked summary can say WHERE a rule failed, not just
// what it said. Every alert on the form is per-node, so a rule hung on a node whose alert a
// page does not render (the ITEM page and promotionBenefit, 2026-09-30) blocks submit with no
// message anywhere. The summary reads the root's errorSummary(), which has every error
// regardless of where it hangs, and this map is how it names them.
//
// Section and field labels are the card titles and <label> texts in components/crm-promotion.
// Keep them in step; an unmapped key falls back to the raw key rather than hiding the error.

const SECTION_LABELS: Readonly<Record<string, string>> = {
  promotionMaster: 'ข้อมูลทั่วไป',
  promotionDatetime: 'เงื่อนไขวัน เวลา',
  promotionMember: 'เงื่อนไขตามสมาชิก',
  promotionBranch: 'เงื่อนไขตามสมาชิก',
  promotionFilter: 'เงื่อนไขตามสินค้า',
  promotionBenefit: 'สิทธิประโยชน์',
};

const FIELD_LABELS: Readonly<Record<string, string>> = {
  promotionName: 'ชื่อโปรโมชั่น',
  promotionDesc: 'รายละเอียด',
  promotionType: 'ประเภทโปรโมชั่น',
  source: 'โปรโมชั่นของ',
  promotionOrder: 'ลำดับการคำนวณ',
  promotionPriority: 'ใช้ร่วมกับโปรโมชั่นอื่น',
  dateRange: 'ช่วงวันที่',
  startDate: 'วันที่เริ่ม',
  endDate: 'วันที่สิ้นสุด',
  activeDay: 'วันที่ใช้',
  limitTime: 'จำกัดช่วงเวลา',
  timeSpan: 'ช่วงเวลา',
  startTime: 'เวลาเริ่ม',
  endTime: 'เวลาสิ้นสุด',
  isMemberSpecific: 'จำกัดสมาชิก',
  members: 'ระดับสมาชิก',
  isBranchSpecific: 'จำกัดสาขา',
  branches: 'สาขา',
  productList: 'รายการสินค้า',
  filterType: 'ประเภทเงื่อนไข',
  filterValue: 'ขั้นต่ำ',
  action: 'สิทธิ',
  thresholdType: 'เงื่อนไข',
  isRepeat: 'แบบซ้ำ/ทุกๆ',
  tiers: 'ขั้นสิทธิประโยชน์',
  thresholdValue: 'จำนวนขั้นต่ำ',
  rewardValue: 'จำนวน/ส่วนลด',
  rewardPool: 'สินค้าสิทธิประโยชน์',
  itemBenefitType: 'ประเภทส่วนลด',
  itemBenefitValue: 'ค่าส่วนลด',
  goodCode: 'รหัสสินค้า',
};

// How an array index reads, keyed on the array it indexes into.
const INDEX_LABELS: Readonly<Record<string, string>> = {
  promotionFilter: 'กลุ่มที่',
  tiers: 'ขั้นที่',
  rewardPool: 'รายการที่',
  productList: 'สินค้าที่',
  members: 'ระดับที่',
  branches: 'สาขาที่',
};

// Built-in rules used without a custom message (required(_path.promotionName) and the like)
// carry only a kind. Say it in the form's language rather than printing "required".
const KIND_MESSAGES: Readonly<Record<string, string>> = {
  required: 'ต้องระบุ',
  min: 'ค่าต่ำกว่าที่กำหนด',
  max: 'ค่าเกินที่กำหนด',
  minLength: 'จำนวนรายการน้อยกว่าที่กำหนด',
  maxLength: 'จำนวนรายการเกินที่กำหนด',
};

/** The text to show for an error: its own message, else its kind in Thai, else the raw kind. */
export function formErrorMessage(e: { kind: string; message?: string }): string {
  return e.message ?? KIND_MESSAGES[e.kind] ?? e.kind;
}

export type TFormErrorLocation = {
  /** Card title the error belongs under. */
  section: string;
  /** Path below the section in on-screen words, '' for a rule on the section itself. */
  field: string;
};

/**
 * @param path the field name relative to the form root, e.g. "promotionFilter.1.productList".
 * An empty path is a rule on the root itself.
 */
export function formErrorLocation(path: string): TFormErrorLocation {
  if (path === '') return { section: 'ทั้งฟอร์ม', field: '' };
  const [head, ...rest] = path.split('.');
  const section = SECTION_LABELS[head] ?? head;
  const words: string[] = [];
  let arrayKey = head;
  rest.forEach((seg, i) => {
    if (/^\d+$/.test(seg)) {
      // 1-based: the screen numbers groups and tiers from 1.
      words.push(`${INDEX_LABELS[arrayKey] ?? 'ลำดับที่'} ${Number(seg) + 1}`);
      return;
    }
    arrayKey = seg;
    // "tiers.0" reads as "ขั้นที่ 1", not "ขั้นสิทธิประโยชน์ › ขั้นที่ 1": an array name followed by an
    // index is spoken by the index alone. A bare array name (a rule on the list itself) stays.
    if (!/^\d+$/.test(rest[i + 1] ?? '')) words.push(FIELD_LABELS[seg] ?? seg);
  });
  return { section, field: words.join(' › ') };
}

/** The part of a field's name() below the root's name(), or '' for the root itself. */
export function relativeFieldPath(rootName: string, fieldName: string): string {
  if (fieldName === rootName) return '';
  return fieldName.startsWith(rootName + '.')
    ? fieldName.slice(rootName.length + 1)
    : fieldName;
}
