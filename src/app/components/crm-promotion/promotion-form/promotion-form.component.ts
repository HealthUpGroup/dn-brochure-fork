import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form } from '@angular/forms/signals';
import {
  TCreatePromotionRequest,
  TMember,
  TPromotionBenefit,
  TPromotionFilterState,
  TPromotionProductBase,
} from '../../../types/crm-promotion.type';
import { CRM_PAGE_CONFIG } from '../../../service/crm-promotion/crm-token';
import {
  REGISTER_FEE_ACTION,
  REGISTER_FEE_GOOD_CODE,
} from '../../../lib/crm-promotion/promotion-actions';
import {
  createPromotionSchema,
  TCreatePromotionForm,
} from '../../../pages/crm-promotion/create/create-bill-discount-promotion/createPromotionSchema';
import { BenefitSelectComponent } from '../benefit-select/benefit-select.component';
import { InlineBenefitComponent } from '../inline-benefit/inline-benefit.component';
import { PromotionMasterComponent } from '../create-promotion-subform/promotion-master/promotion-master.component';
import { PromotionDatetimeComponent } from '../create-promotion-subform/promotion-datetime/promotion-datetime.component';
import { PromotionLimitUsageComponent } from '../create-promotion-subform/promotion-limit-usage/promotion-limit-usage.component';
import { PromotionProductFilterComponent } from '../create-promotion-subform/promotion-product-filter/promotion-product-filter.component';
import { PromotionValidationSummaryComponent } from '../promotion-validation-summary/promotion-validation-summary.component';

@Component({
  selector: 'app-promotion-form',
  imports: [
    FormsModule,
    BenefitSelectComponent,
    InlineBenefitComponent,
    PromotionMasterComponent,
    PromotionDatetimeComponent,
    PromotionLimitUsageComponent,
    PromotionProductFilterComponent,
    PromotionValidationSummaryComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './promotion-form.component.html',
})
export class PromotionFormComponent {
  private readonly config = inject(CRM_PAGE_CONFIG);

  submitLabel = input('บันทึก');
  initialData = input<TCreatePromotionForm>();
  submitted = output<TCreatePromotionRequest>();

  showFilterOption = signal(this.config.filterOption.showFilter);
  showItem = signal(this.config.filterOption.showItem);
  showFilterList = signal(this.config.filterOption.showList);
  showBundle = signal(this.config.filterOption.showBundle);
  // BILL pages offer a product pool (one "add group" button, no count box) instead of the
  // bundle pages' by-count control -- see IFilterOption.showPool.
  showPool = signal(this.config.filterOption.showPool ?? false);

  submitting = input(false);

  formModel = signal<TCreatePromotionForm>(this.initialData() ?? this.config.initialData);

  promotionForm = form(this.formModel, createPromotionSchema);

  canSubmit = computed(() => {
    const { invalid } = this.promotionForm();
    return !invalid() && !this.submitting();
  });

  // ── Master ────────────────────────────────────────────────

  onMasterChange<K extends keyof TCreatePromotionForm['promotionMaster']>(
    key: K,
    value: TCreatePromotionForm['promotionMaster'][K],
  ) {
    this.formModel.update((s) => ({
      ...s,
      promotionMaster: { ...s.promotionMaster, [key]: value },
    }));
  }

  // ── Member ────────────────────────────────────────────────

  onLimitTierChange(isMemberSpecific: boolean) {
    this.formModel.update((s) => ({
      ...s,
      promotionMember: { ...s.promotionMember, isMemberSpecific },
    }));
  }

  onChangeMember(members: TMember[]) {
    this.formModel.update((s) => ({
      ...s,
      promotionMember: { ...s.promotionMember, members },
    }));
  }

  onRemoveMember(memberId: number) {
    this.formModel.update((s) => ({
      ...s,
      promotionMember: {
        ...s.promotionMember,
        members: s.promotionMember.members.filter((m) => m.id !== memberId),
      },
    }));
  }

  // ── Branch ────────────────────────────────────────────────

  toggleBranch(isBranchSpecific: boolean) {
    this.formModel.update((s) => ({
      ...s,
      promotionBranch: {
        ...s.promotionBranch,
        isBranchSpecific,
        ...(isBranchSpecific ? {} : { branches: [] }),
      },
    }));
  }

  onRemoveBranch(branchCode: string) {
    this.formModel.update((s) => ({
      ...s,
      promotionBranch: {
        ...s.promotionBranch,
        branches: s.promotionBranch.branches.filter(
          (b) => b.branchCode !== branchCode,
        ),
      },
    }));
  }

  onBranchChange<K extends keyof TCreatePromotionForm['promotionBranch']>(
    key: K,
    value: TCreatePromotionForm['promotionBranch'][K],
  ) {
    this.formModel.update((s) => ({
      ...s,
      promotionBranch: { ...s.promotionBranch, [key]: value },
    }));
  }

  // ── Filter ────────────────────────────────────────────────

  // filterValue 1, not 0: the engine coerces it either way
  // (`required = FilterValue > 0 ? FilterValue : 1`), and 1 is what the row actually means.
  onAddSkuProductExist() {
    this.formModel.update((s) => ({
      ...s,
      promotionFilter: [
        ...s.promotionFilter,
        { productList: [], filterType: 'EXIST', filterValue: 1 },
      ],
    }));
  }

  onAddSkuProductCount() {
    this.formModel.update((s) => ({
      ...s,
      promotionFilter: [
        ...s.promotionFilter,
        { productList: [], filterType: 'COUNT', filterValue: 1 },
      ],
    }));
  }

  onChangeFilter(filterCondition: TPromotionFilterState, index: number) {
    this.formModel.update((s) => ({
      ...s,
      promotionFilter: s.promotionFilter.map((f, i) =>
        i === index ? filterCondition : f,
      ),
    }));
  }

  onDeleteFilter(index: number) {
    this.formModel.update((s) => ({
      ...s,
      promotionFilter: s.promotionFilter.filter((_, i) => i !== index),
    }));
  }

  // ── Benefit ───────────────────────────────────────────────

  onBenefitChange(partial: Partial<TPromotionBenefit>) {
    this.formModel.update((s) => ({
      ...s,
      promotionBenefit: { ...s.promotionBenefit, ...partial },
    }));
  }

  onRewardPoolChange(product: TPromotionProductBase) {
    this.formModel.update((s) => ({
      ...s,
      promotionBenefit: {
        ...s.promotionBenefit,
        rewardPool: [
          ...s.promotionBenefit.rewardPool,
          { ...product, itemBenefitType: 'BATHDISC', itemBenefitValue: 0 },
        ],
      },
    }));
  }

  // ── Submit ────────────────────────────────────────────────

  onSubmit() {
    this.submitted.emit(this.buildRequest());
  }

  private buildRequest(): TCreatePromotionRequest {
    const {
      promotionMaster,
      promotionDatetime,
      promotionMember,
      promotionBranch,
      promotionFilter,
      promotionBenefit,
    } = this.formModel();
    const {
      promotionName,
      promotionDesc,
      promotionType,
      source,
      promotionOrder,
      promotionPriority,
      dateRange: { startDate, endDate },
    } = promotionMaster;
    const {
      activeDay,
      limitTime,
      timeSpan: { startTime, endTime },
    } = promotionDatetime;
    const { isMemberSpecific, members } = promotionMember;
    const { isBranchSpecific, branches } = promotionBranch;
    const { action, thresholdType, isRepeat, tiers, rewardPool } =
      promotionBenefit;
    // HU promotions always compute last; the order select is disabled for HU so its
    // value can be stale from a previous source selection.
    const effectiveOrder = source === 'HU' ? 0 : Number(promotionOrder);
    return {
      promotionName: promotionName.trim(),
      promotionDesc: promotionDesc.trim(),
      promotionType,
      source,
      promotionOrder: effectiveOrder,
      promotionPriority: Number(promotionPriority),
      startDate: this.ngbDateToIso(startDate),
      endDate: this.ngbDateToIso(endDate),
      isBranchSpecific,
      branches: branches.map(({ branchCode }) => branchCode),
      isMemberSpecific,
      members: members.map(({ id }) => id),
      limitTime,
      startTime: this.ngbTimeToTime(startTime),
      endTime: this.ngbTimeToTime(endTime),
      activeDay: activeDay.reduce((acc, cur) => acc + (cur ? '1' : '0'), ''),
      filterList: promotionFilter.map(({ productList, ...res }) => ({
        productList: productList.map((p) => p.goodCode),
        ...res,
      })),
      action,
      thresholdType,
      isRepeat,
      rewardPool: this.buildRewardPool(action, rewardPool),
      tiers,
    };
  }

  // The pool belongs to the reward actions only; anything left over from a previous
  // selection must not be persisted on a plain discount promotion. REGISTERFEE is the
  // exception that is *derived* rather than authored: its pool is always the one SKU
  // at 0 baht, so it is built here instead of being carried through the form. That
  // keeps it clear of the strip-unless-PWP/GIFT rule it sits beside -- the same class
  // of silent drop that left `source` unwritten for four months.
  private buildRewardPool(
    action: string,
    rewardPool: TPromotionBenefit['rewardPool'],
  ): TCreatePromotionRequest['rewardPool'] {
    if (action === REGISTER_FEE_ACTION)
      return [
        {
          goodCode: REGISTER_FEE_GOOD_CODE,
          itemBenefitType: 'PRICE',
          itemBenefitValue: 0,
        },
      ];
    if (action !== 'PWP' && action !== 'GIFT') return [];
    return rewardPool.map(({ goodName, sku, ...res }) => ({ ...res }));
  }

  private ngbDateToIso({
    day,
    month,
    year,
  }: {
    day: number;
    month: number;
    year: number;
  }) {
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  private ngbTimeToTime({
    hour,
    minute,
    second,
  }: {
    hour: number;
    minute: number;
    second: number;
  }) {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
  }
}
