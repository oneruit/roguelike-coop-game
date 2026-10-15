import { Player } from '../../entities/Player';
import { MerchantManager } from '../../world/MerchantManager';
import { RiftItemDef } from '../../items/RiftItemSystem';
import { SoundManager } from '../../core/SoundManager';
import { SafeDOM } from '../core/SafeDOM';
import { getAssetUrl } from '../../utils/assetPath';

export class MerchantAndChestUI {
  // Merchant Modal Elements
  private merchantModal: HTMLElement | null = null;
  private merchantCloseBtn: HTMLElement | null = null;
  private merchantTimerBadge: HTMLElement | null = null;
  private merchantCreditsVal: HTMLElement | null = null;
  private merchantItemsContainer: HTMLElement | null = null;
  private isMerchantActive: boolean = false;
  private merchantKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  // Chest Choice Modal Elements
  private chestModal: HTMLElement;
  private chestItemCardsContainer: HTMLElement;
  private chestKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  public cachedPlayer: Player | null = null;
  public onMerchantToggle?: (isOpen: boolean) => void;
  public onMenuPush?: (menu: string) => void;
  public onMenuRemove?: (menu: string) => void;
  public onItemPurchased?: (item: any, player: Player) => void;

  constructor() {
    this.chestModal = SafeDOM.getElementById('chest-modal') || document.createElement('div');
    this.chestItemCardsContainer = SafeDOM.getElementById('chest-item-cards') || document.createElement('div');

    this.merchantModal = SafeDOM.getElementById('merchant-modal');
    this.merchantCloseBtn = SafeDOM.getElementById('btn-close-merchant') || SafeDOM.getElementById('merchant-close-btn');
    this.merchantTimerBadge = SafeDOM.getElementById('merchant-timer-badge');
    this.merchantCreditsVal = SafeDOM.getElementById('merchant-player-credits') || SafeDOM.getElementById('merchant-credits-val');
    this.merchantItemsContainer = SafeDOM.getElementById('merchant-items-container');

    this.merchantCloseBtn?.addEventListener('click', () => this.hideMerchant());
    const merchantBackdrop = this.merchantModal?.querySelector('.modal-backdrop');
    merchantBackdrop?.addEventListener('click', () => this.hideMerchant());
  }

  public isMerchantOpen(): boolean {
    return this.isMerchantActive && !this.merchantModal?.classList.contains('hidden');
  }

  public showMerchant(merchant: MerchantManager, player: Player): void {
    if (!this.merchantModal) return;
    this.cachedPlayer = player;
    this.isMerchantActive = true;
    this.merchantModal.classList.remove('hidden');
    this.onMenuPush?.('merchant');

    if (!merchant.stock || merchant.stock.length === 0) {
      merchant.stock = merchant.generateStock();
    }
    this.updateMerchantTimer(merchant);
    this.renderMerchantItems(merchant, player);
    this.onMerchantToggle?.(true);

    if (this.merchantKeyHandler) {
      window.removeEventListener('keydown', this.merchantKeyHandler);
    }
    this.merchantKeyHandler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      if (e.code === 'KeyE') {
        e.preventDefault();
        this.hideMerchant();
      }
    };
    window.addEventListener('keydown', this.merchantKeyHandler);
  }

  public hideMerchant(): void {
    if (this.merchantKeyHandler) {
      window.removeEventListener('keydown', this.merchantKeyHandler);
      this.merchantKeyHandler = null;
    }
    this.isMerchantActive = false;
    this.merchantModal?.classList.add('hidden');
    this.onMenuRemove?.('merchant');
    this.onMerchantToggle?.(false);
  }

  public updateMerchantTimer(merchant: MerchantManager): void {
    if (!this.merchantTimerBadge || !this.isMerchantOpen()) return;
    const minutes = Math.floor(Math.max(0, merchant.timer) / 60);
    const seconds = Math.floor(Math.max(0, merchant.timer) % 60);
    this.merchantTimerBadge.innerText = `Осталось: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    if (!merchant.isActive) {
      this.hideMerchant();
    }
  }

  public renderMerchantItems(merchant: MerchantManager, player: Player): void {
    if (this.merchantCreditsVal) {
      this.merchantCreditsVal.innerText = `⬡ ${player.credits}`;
    }
    if (!this.merchantItemsContainer) return;
    this.merchantItemsContainer.innerHTML = '';

    merchant.stock.forEach((item) => {
      const isSold = merchant.isSold(item, player);
      const canAfford = player.credits >= item.price;
      const card = document.createElement('div');
      card.className = `merchant-item-card rarity-${item.rarity}${isSold ? ' is-sold' : ''}`;

      card.innerHTML = `
        <div class="merchant-item-top">
          <div class="merchant-item-icon">${item.icon}</div>
          <div class="merchant-item-meta">
            <span class="merchant-item-name">${item.name}</span>
            <span class="merchant-item-rarity" style="color: ${item.color}">${item.rarity.toUpperCase()}</span>
          </div>
        </div>
        <div class="merchant-item-desc">${item.description}</div>
        <div class="merchant-item-bottom">
          <div class="merchant-item-price">${item.price} ⬡</div>
          ${
            isSold
              ? `<span class="merchant-badge-sold">SOLD</span>`
              : `<button class="merchant-buy-btn" type="button" ${canAfford ? '' : 'disabled'}>${canAfford ? `КУПИТЬ (${item.price} ⬡)` : `НЕДОСТАТОЧНО (${item.price} ⬡)`}</button>`
          }
        </div>
      `;

      if (!isSold) {
        const buyBtn = card.querySelector<HTMLButtonElement>('.merchant-buy-btn');
        if (buyBtn && canAfford) {
          buyBtn.addEventListener('click', () => {
            const res = merchant.buyItem(item, player);
            if (res.success) {
              SoundManager.playItemPickup();
              this.renderMerchantItems(merchant, player);
              this.onItemPurchased?.(item, player);
            }
          });
        }
      }

      this.merchantItemsContainer!.appendChild(card);
    });
  }

  /**
   * Shows chest 2-item choice modal where the player can choose 1 of 2 dropped items.
   */
  public showChestChoice(
    items: [RiftItemDef, RiftItemDef],
    player: Player,
    onChoose: (item: RiftItemDef) => void
  ): void {
    SoundManager.playLevelUp();
    const modalImg = SafeDOM.getElementById('chest-modal-img') as HTMLImageElement | null;
    if (modalImg) {
      modalImg.src = getAssetUrl('/textures/chests/chest_open.gif') + `?v=${Date.now()}`;
    }
    this.chestModal.classList.remove('hidden');
    this.chestItemCardsContainer.innerHTML = '';
    let chosen = false;

    const chooseItem = (item: RiftItemDef) => {
      if (chosen) return;
      chosen = true;
      this.hideChestChoice();
      onChoose(item);
    };

    items.forEach((item, idx) => {
      const currentCount = player.riftItems.get(item.id) || 0;
      const card = document.createElement('div');
      card.className = `modal-card chest-choice-item-card grade-${item.rarity}`;

      const rarityLabels: Record<string, string> = {
        common: 'Обычный',
        uncommon: 'Необычный',
        rare: 'Редкий',
        legendary: 'Легендарный',
        boss: 'Босс-реликт'
      };
      const rarityLabel = rarityLabels[item.rarity] || item.rarity;

      card.innerHTML = `
        <div class="chest-card-top">
          <span class="chest-hotkey-chip">[${idx + 1}]</span>
          <span class="grade-badge grade-${item.rarity}">${rarityLabel.toUpperCase()}</span>
        </div>
        <div class="chest-card-icon-wrap" style="color: ${item.color}">${item.icon}</div>
        <div class="chest-card-title" style="color: ${item.color}">${item.name}</div>
        <div class="chest-card-desc">${item.description}</div>
        <div class="chest-card-footer">
          <div class="chest-card-count">
            ${currentCount > 0 ? `В наличии: <strong>x${currentCount}</strong>` : '<span class="chest-new-tag">✨ Новый артефакт!</span>'}
          </div>
          <button class="action-btn select-btn chest-select-btn" type="button">
            <span class="btn-hotkey">[${idx + 1}]</span> ВЗЯТЬ
          </button>
        </div>
      `;

      card.addEventListener('click', () => chooseItem(item));
      this.chestItemCardsContainer.appendChild(card);
    });

    this.chestKeyHandler = (e: KeyboardEvent) => {
      if (chosen || e.repeat || e.defaultPrevented) return;
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      if (this.chestModal.classList.contains('hidden')) return;

      if (e.code === 'Digit1' || e.code === 'Numpad1' || e.key === '1') {
        e.preventDefault();
        chooseItem(items[0]);
      } else if (e.code === 'Digit2' || e.code === 'Numpad2' || e.key === '2') {
        e.preventDefault();
        chooseItem(items[1]);
      }
    };

    window.addEventListener('keydown', this.chestKeyHandler);
  }

  public hideChestChoice(): void {
    if (this.chestKeyHandler) {
      window.removeEventListener('keydown', this.chestKeyHandler);
      this.chestKeyHandler = null;
    }
    this.chestModal.classList.add('hidden');
  }
}
