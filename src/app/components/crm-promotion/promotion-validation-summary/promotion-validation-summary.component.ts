import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FieldState } from '@angular/forms/signals';
import {
  formErrorLocation,
  formErrorMessage,
  relativeFieldPath,
} from '../../../lib/crm-promotion/form-error-location';

export type TValidationSummaryEntry = {
  path: string;
  section: string;
  field: string;
  message: string;
};

/**
 * Every reason the form cannot be submitted, in one place above the button.
 *
 * The per-field alerts only show what hangs on the node they are given, and only once that
 * node is touched (see FormAlertTextComponent). A rule on a node no page renders an alert for
 * -- the ITEM page and promotionBenefit, 2026-09-30 -- therefore disables the button with no
 * message anywhere. This reads the ROOT's errorSummary(), which collects every descendant's
 * errors, and is not gated on touched: it exists precisely to explain a disabled button.
 */
@Component({
  selector: 'app-promotion-validation-summary',
  imports: [],
  template: `
    @if (entries().length > 0) {
      <div class="alert alert-warning mb-3" role="alert" data-testid="validation-summary">
        <div class="fw-semibold mb-1">ยังบันทึกไม่ได้ กรุณาแก้ไข:</div>
        <ul class="mb-0 ps-3">
          @for (e of entries(); track e.path + e.message) {
            <li data-testid="validation-summary-item" [attr.data-path]="e.path">
              <span class="fw-semibold">{{ e.section }}</span>
              @if (e.field) {
                <span class="text-muted"> › {{ e.field }}</span>
              }
              : {{ e.message }}
            </li>
          }
        </ul>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PromotionValidationSummaryComponent {
  /** The form's root state: `promotionForm()`. */
  readonly formState = input.required<FieldState<unknown>>();

  readonly entries = computed<TValidationSummaryEntry[]>(() => {
    const root = this.formState();
    const rootName = root.name();
    return root.errorSummary().map((e) => {
      const path = relativeFieldPath(rootName, e.fieldTree().name());
      const { section, field } = formErrorLocation(path);
      return { path, section, field, message: formErrorMessage(e) };
    });
  });
}
