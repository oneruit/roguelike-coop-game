import { BalanceState } from '../state/balanceState';

export class ModalManager {
  private state: BalanceState;
  private onDeployConfirm: () => void;

  constructor(state: BalanceState, onDeployConfirm: () => void) {
    this.state = state;
    this.onDeployConfirm = onDeployConfirm;
    this.bindEvents();
  }

  private bindEvents(): void {
    document.querySelectorAll('.modal-close-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.closeReviewModal());
    });
    document.getElementById('btn-cancel-deploy')?.addEventListener('click', () => this.closeReviewModal());
    document.getElementById('btn-confirm-deploy')?.addEventListener('click', () => this.onDeployConfirm());
  }

  public openReviewModal(adminKeyRequired: boolean): void {
    const tbody = document.getElementById('diff-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const diffList = this.state.getDiffList();
    if (diffList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-muted);">Нет несохраненных изменений в черновике</td></tr>';
    } else {
      for (const d of diffList) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${d.entityName}</strong></td>
          <td><code>${d.propName}</code></td>
          <td style="color: var(--text-muted);">${d.origVal}</td>
          <td style="font-weight: 600;">${d.draftVal}</td>
          <td><span class="diff-tag diff-${d.diff.startsWith('+') ? 'up' : 'down'}">${d.diff}</span></td>
        `;
        tbody.appendChild(tr);
      }
    }

    const passcodeWrap = document.getElementById('admin-passcode-challenge');
    if (passcodeWrap) {
      if (adminKeyRequired) {
        passcodeWrap.classList.remove('hidden');
        const passInput = document.getElementById('input-confirm-passcode') as HTMLInputElement;
        if (passInput) passInput.value = '';
      } else {
        passcodeWrap.classList.add('hidden');
      }
    }

    const modal = document.getElementById('modal-review');
    modal?.classList.remove('hidden');
  }

  public closeReviewModal(): void {
    const modal = document.getElementById('modal-review');
    modal?.classList.add('hidden');
    document.getElementById('passcode-error')?.classList.add('hidden');
  }
}
