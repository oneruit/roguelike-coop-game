import { Player, ActiveBuff, BuffType } from '../../entities/Player';
import { RemotePlayer } from '../../entities/RemotePlayer';
import { Weapon } from '../../combat/Weapon';
import { Enemy } from '../../entities/Enemy';
import { SoundManager } from '../../core/SoundManager';
import { DifficultyDirector } from '../../director/DifficultyDirector';
import { RiftItemId, RIFT_ITEMS } from '../../items/RiftItemSystem';
import { LobbyPlayerInfo, PLAYER_COLORS, getPlayerSlotNumber } from '../../net/NetworkManager';
import { TextureManager } from '../../core/TextureManager';
import { getHeroAvatar, getHeroName, getWeaponIconUrl } from './HeroUIHelpers';
import { InGameHUDScreen } from '../screens/InGameHUD/InGameHUDScreen';
import { SafeDOM } from '../core/SafeDOM';

declare const __APP_MODE__: string | undefined;

export class InGameOverlayUI extends InGameHUDScreen {
  // Base HUD
  private xpFill: HTMLElement;
  private playerLevel: HTMLElement;
  private timerText: HTMLElement;
  private killCountText: HTMLElement;
  private coopKillsDetail: HTMLElement;
  private myKillsCount: HTMLElement;
  private partnerKillsCount: HTMLElement;
  private hpFill: HTMLElement | null;
  private hpText: HTMLElement | null;
  private weaponsBar: HTMLElement;
  public poePartyList: HTMLElement;

  // Boss HUD
  private bossHpContainer: HTMLElement;
  private bossHpFill: HTMLElement;
  private bossHpText: HTMLElement;
  private bossNameText: HTMLElement | null;
  private bossWarningBanner: HTMLElement;
  private bossWarningText: HTMLElement | null;

  // The Rift HUD Elements
  private stageText: HTMLElement | null;
  public currentStageNumber: number = 1;
  private plasmaCreditsText: HTMLElement | null;
  private diffTierLabel: HTMLElement | null;
  private diffBarFill: HTMLElement | null;
  private interactionPrompt: HTMLElement | null;
  private interactionPromptText: HTMLElement | null;
  private itemInventoryTray: HTMLElement | null;
  private dashCooldownBadge: HTMLElement | null;
  private dashCooldownText: HTMLElement | null;
  private dashCooldownFloating: HTMLElement | null;

  // Screen Damage & Low HP Vignette
  private damageFlashLayer: HTMLElement | null;
  private lowHpVignetteLayer: HTMLElement | null;

  // Altar & Buffs
  private altarBanner: HTMLElement;
  private altarBannerText: HTMLElement;
  private buffsTray: HTMLElement;
  private passivesBar: HTMLElement | null;

  // Co-op In-game HUD
  private coopBadge: HTMLElement;
  private coopRoomName: HTMLElement;
  private partnerHpContainer: HTMLElement | null;
  private partnerHpFill: HTMLElement | null;
  private partnerHpText: HTMLElement | null;
  private teammatesHpTray: HTMLElement | null;

  // Performance Overlay (FPS & Latency)
  private perfOverlay: HTMLElement | null = null;
  private perfFps: HTMLElement | null = null;
  private perfPing: HTMLElement | null = null;
  private isPerfOverlayEnabled: boolean = true;
  private lastPerfUiUpdate: number = 0;

  // Timeouts & State
  private bossWarningTimeout: number | null = null;
  private damageFlashTimeout: number | null = null;
  private altarBannerTimeout: number | null = null;
  private lastRenderedItemsKey = '';
  public isTrainingModeActive = false;

  constructor() {
    super();

    const getEl = (id: string) => SafeDOM.getElementById(id) || document.createElement('div');
    this.xpFill = getEl('xp-bar-fill');
    this.playerLevel = getEl('player-level');
    this.timerText = getEl('game-timer');
    this.killCountText = getEl('kill-count');
    this.coopKillsDetail = getEl('coop-kills-detail');
    this.myKillsCount = getEl('my-kills-count');
    this.partnerKillsCount = getEl('partner-kills-count');
    this.hpFill = SafeDOM.getElementById('player-hp-fill');
    this.hpText = SafeDOM.getElementById('player-hp-text');
    this.weaponsBar = getEl('active-weapons-bar');
    this.poePartyList = SafeDOM.getElementById('poe-party-list') || document.createElement('div');

    this.bossHpContainer = getEl('boss-hp-container');
    this.bossHpFill = getEl('boss-hp-fill');
    this.bossHpText = getEl('boss-hp-text');
    this.bossNameText = SafeDOM.getElementById('boss-name-text');
    this.bossWarningBanner = getEl('boss-warning-banner');
    this.bossWarningText = SafeDOM.getElementById('boss-warning-text');

    this.altarBanner = getEl('altar-notification-banner');
    this.altarBannerText = getEl('altar-notification-text');
    this.buffsTray = getEl('active-buffs-tray');
    this.passivesBar = SafeDOM.getElementById('active-passives-bar');

    // The Rift Elements
    this.stageText = SafeDOM.getElementById('stage-text');
    this.plasmaCreditsText = SafeDOM.getElementById('plasma-credits');
    this.diffTierLabel = SafeDOM.getElementById('diff-tier-label');
    this.diffBarFill = SafeDOM.getElementById('diff-bar-fill');
    this.interactionPrompt = SafeDOM.getElementById('interaction-prompt');
    this.interactionPromptText = SafeDOM.getElementById('interaction-prompt-text');
    this.itemInventoryTray = SafeDOM.getElementById('item-inventory-tray');
    this.dashCooldownBadge = SafeDOM.getElementById('dash-cooldown-badge');
    this.dashCooldownText = SafeDOM.getElementById('dash-cooldown-text');
    this.dashCooldownFloating = SafeDOM.getElementById('dash-cooldown-floating');

    // Screen Damage & Low HP Vignette
    this.damageFlashLayer = SafeDOM.getElementById('damage-flash-layer');
    this.lowHpVignetteLayer = SafeDOM.getElementById('low-hp-vignette-layer');

    // Co-op HUD Elements
    this.coopBadge = getEl('coop-badge');
    this.coopRoomName = getEl('coop-room-name');
    this.partnerHpContainer = SafeDOM.getElementById('partner-hp-container');
    this.partnerHpFill = SafeDOM.getElementById('partner-hp-fill');
    this.partnerHpText = SafeDOM.getElementById('partner-hp-text');
    this.teammatesHpTray = SafeDOM.getElementById('teammates-hp-tray');

    // Performance Overlay
    this.perfOverlay = SafeDOM.getElementById('perf-overlay');
    this.perfFps = SafeDOM.getElementById('perf-fps');
    this.perfPing = SafeDOM.getElementById('perf-ping');
  }

  public override show(): void {
    super.show();
    const hud = SafeDOM.getElementById('in-game-hud');
    if (hud) hud.classList.remove('hidden');
  }

  public override hide(): void {
    super.hide();
    const hud = SafeDOM.getElementById('in-game-hud');
    if (hud) hud.classList.add('hidden');
  }

  public setInGameHUDVisible(visible: boolean): void {
    if (visible) this.show();
    else this.hide();
  }

  public setCoopBadge(roomCode: string | null) {
    if (roomCode) {
      this.coopBadge.classList.remove('hidden');
      this.coopRoomName.innerText = `КООП: ${roomCode}`;
    } else {
      this.coopBadge.classList.add('hidden');
    }
  }

  public updatePoeParty(
    localPlayer: Player,
    remotePlayers: Map<string, RemotePlayer>,
    mySlotId: string = 'p1',
    role: string = 'solo',
    _lobbyPlayers: LobbyPlayerInfo[] = []
  ) {
    if (!this.poePartyList) return;

    // Collect all party members
    const members: {
      id: string;
      name: string;
      hero: any;
      colorCss: string;
      hp: number;
      maxHp: number;
      shield: number;
      maxShield: number;
      isShieldRecharging: boolean;
      level: number;
      xp: number;
      xpToNextLevel: number;
      isDowned: boolean;
      reviveProgress: number;
      isLocal: boolean;
      hasInvuln: boolean;
      credits?: number;
      weapons: { id: string; name: string; icon: string; level: number }[];
      buffs: { type: BuffType; icon: string; duration: number }[];
      items: { id: string; count: number }[];
    }[] = [];

    // 1. Local Player
    const localSlotNum = getPlayerSlotNumber(mySlotId);
    const localDisplayName = role === 'solo' ? 'Игрок 1 (Вы)' : `Игрок ${localSlotNum} (Вы)`;
    const localColor = PLAYER_COLORS[mySlotId]?.css || '#f59e0b';
    const localBuffs: { type: BuffType; icon: string; duration: number }[] = [];
    for (const b of localPlayer.activeBuffs.values()) {
      localBuffs.push({ type: b.type, icon: b.icon, duration: b.duration });
    }

    members.push({
      id: mySlotId || 'p1',
      name: localDisplayName,
      hero: localPlayer.charType,
      colorCss: localColor,
      hp: localPlayer.hp,
      maxHp: localPlayer.maxHp,
      shield: localPlayer.shield,
      maxShield: localPlayer.maxShield,
      isShieldRecharging: localPlayer.shieldRegenDelay <= 0 && localPlayer.shield < localPlayer.maxShield,
      level: localPlayer.level,
      xp: localPlayer.xp,
      xpToNextLevel: localPlayer.xpToNextLevel,
      isDowned: localPlayer.isDowned,
      reviveProgress: localPlayer.reviveProgress,
      isLocal: true,
      hasInvuln: localPlayer.hasBuff('invulnerable'),
      credits: localPlayer.credits,
      weapons: localPlayer.weapons.map((w) => ({ id: w.id, name: w.name, icon: w.icon, level: w.level })),
      buffs: localBuffs,
      items: Array.from(localPlayer.riftItems.entries()).map(([id, count]) => ({ id, count }))
    });

    // 2. Remote Teammates
    for (const [id, rp] of remotePlayers) {
      const rpBuffs: { type: BuffType; icon: string; duration: number }[] = [];
      for (const b of rp.activeBuffs.values()) {
        rpBuffs.push({ type: b.type, icon: b.icon, duration: b.duration });
      }
      const remoteSlotNum = getPlayerSlotNumber(id);
      const remoteDisplayName = `Игрок ${remoteSlotNum}`;

      members.push({
        id,
        name: remoteDisplayName,
        hero: rp.charType,
        colorCss: rp.colorCss,
        hp: rp.hp,
        maxHp: rp.maxHp,
        shield: rp.shield || 0,
        maxShield: rp.maxShield || 0,
        isShieldRecharging: false,
        level: rp.level,
        xp: rp.xp,
        xpToNextLevel: rp.xpToNextLevel,
        credits: rp.credits,
        isDowned: rp.isDowned,
        reviveProgress: rp.reviveProgress,
        isLocal: false,
        hasInvuln: rp.activeBuffs.has('invulnerable'),
        weapons: rp.weapons,
        buffs: rpBuffs,
        items: Array.from(rp.riftItems.entries()).map(([itemId, count]) => ({ id: itemId, count }))
      });
    }

    const currentIds = new Set<string>();

    for (const m of members) {
      currentIds.add(m.id);
      let el = this.poePartyList.querySelector<HTMLElement>(`.poe-party-member[data-player-id="${m.id}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = `poe-party-member ${m.isLocal ? 'is-local' : ''}`;
        el.setAttribute('data-player-id', m.id);
        el.innerHTML = `
          <div class="poe-portrait-box">
            <img class="poe-portrait-img" src="${getHeroAvatar(m.hero)}" alt="${getHeroName(m.hero)}" />
            <div class="poe-swirl-crest" style="border-color: ${m.colorCss};">${m.id.toUpperCase()}</div>
            <div class="poe-downed-skull hidden">†</div>
          </div>
          <div class="poe-member-content">
            <div class="poe-name-row">
              <span class="poe-member-name" style="color: ${m.colorCss};">${m.name}</span>
              <span class="poe-class-tag">${getHeroName(m.hero)}</span>
              <span class="poe-level-tag">L${m.level}</span>
              <span class="poe-credits-tag" style="margin-left: 6px; font-size: 11px; color: #fbbf24; font-weight: bold;">⚡ ${m.credits ?? 0}</span>
            </div>
            <div class="poe-hp-frame">
              <div class="poe-hp-track">
                <div class="poe-hp-fill" style="width: 100%;"></div>
                <div class="poe-shield-fill" style="width: 100%;"></div>
                <div class="poe-hp-glass-shine"></div>
                <span class="poe-hp-text">100 / 100</span>
                <div class="poe-downed-badge hidden">РАНЕН!</div>
              </div>
            </div>
            <div class="poe-xp-frame" title="Прогресс опыта">
              <div class="poe-xp-fill" style="width: 0%;"></div>
            </div>
            <div class="poe-meta-row">
              <div class="poe-member-weapons"></div>
              <div class="poe-member-items"></div>
              <div class="poe-member-buffs"></div>
            </div>
          </div>
        `;
        this.poePartyList.appendChild(el);
      }

      // Update avatar if changed
      const imgEl = el.querySelector<HTMLImageElement>('.poe-portrait-img');
      const expectedAvatar = getHeroAvatar(m.hero);
      if (imgEl && imgEl.getAttribute('src') !== expectedAvatar) {
        imgEl.src = expectedAvatar;
      }

      // Update name & class & level
      const nameEl = el.querySelector<HTMLElement>('.poe-member-name');
      if (nameEl && nameEl.innerText !== m.name) {
        nameEl.innerText = m.name;
        nameEl.style.color = m.colorCss;
      }

      const classEl = el.querySelector<HTMLElement>('.poe-class-tag');
      const expectedClass = getHeroName(m.hero);
      if (classEl && classEl.innerText !== expectedClass) {
        classEl.innerText = expectedClass;
      }

      const lvlEl = el.querySelector<HTMLElement>('.poe-level-tag');
      if (lvlEl && lvlEl.innerText !== `L${m.level}`) {
        lvlEl.innerText = `L${m.level}`;
      }

      const creditsEl = el.querySelector<HTMLElement>('.poe-credits-tag');
      if (creditsEl && creditsEl.innerText !== `⚡ ${m.credits ?? 0}`) {
        creditsEl.innerText = `⚡ ${m.credits ?? 0}`;
      }

      // Update HP
      const hpPct = Math.max(0, Math.min(100, (m.hp / (m.maxHp || 100)) * 100));
      const hpFillEl = el.querySelector<HTMLElement>('.poe-hp-fill');
      if (hpFillEl) {
        hpFillEl.style.width = `${hpPct}%`;
      }

      // Update Shield (Armor)
      const shieldFillEl = el.querySelector<HTMLElement>('.poe-shield-fill');
      const shieldPct = (m.maxShield && m.maxShield > 0)
        ? Math.max(0, Math.min(100, (m.shield / m.maxShield) * 100))
        : 0;
      if (shieldFillEl) {
        shieldFillEl.style.width = `${shieldPct}%`;
        if (m.isShieldRecharging) {
          shieldFillEl.classList.add('is-recharging');
        } else {
          shieldFillEl.classList.remove('is-recharging');
        }
      }

      const hpTextEl = el.querySelector<HTMLElement>('.poe-hp-text');
      if (hpTextEl) {
        if (m.shield > 0) {
          hpTextEl.innerHTML = `${Math.ceil(m.hp)} / ${m.maxHp} <span class="poe-shield-badge">[🛡️ ${Math.ceil(m.shield)}]</span>`;
        } else {
          hpTextEl.innerText = `${Math.ceil(m.hp)} / ${m.maxHp}`;
        }
      }

      // Invulnerable frame glow
      const hpFrameEl = el.querySelector<HTMLElement>('.poe-hp-frame');
      if (hpFrameEl) {
        if (m.hasInvuln) {
          hpFrameEl.classList.add('is-invulnerable');
        } else {
          hpFrameEl.classList.remove('is-invulnerable');
        }
      }

      // Downed / Reviving status
      const skullEl = el.querySelector<HTMLElement>('.poe-downed-skull');
      const downedBadgeEl = el.querySelector<HTMLElement>('.poe-downed-badge');
      if (m.isDowned) {
        if (!el.classList.contains('is-downed')) el.classList.add('is-downed');
        skullEl?.classList.remove('hidden');
        downedBadgeEl?.classList.remove('hidden');
        if (downedBadgeEl) {
          if (m.reviveProgress > 0) {
            downedBadgeEl.classList.add('reviving');
            downedBadgeEl.innerText = `ПОДЪЁМ ${Math.round(m.reviveProgress * 100)}%`;
          } else {
            downedBadgeEl.classList.remove('reviving');
            downedBadgeEl.innerText = 'РАНЕН!';
          }
        }
      } else {
        if (el.classList.contains('is-downed')) el.classList.remove('is-downed');
        skullEl?.classList.add('hidden');
        downedBadgeEl?.classList.add('hidden');
      }

      // Update XP Progress Bar
      const xpPct = Math.max(0, Math.min(100, (m.xp / (m.xpToNextLevel || 10)) * 100));
      const xpFillEl = el.querySelector<HTMLElement>('.poe-xp-fill');
      if (xpFillEl) {
        xpFillEl.style.width = `${xpPct}%`;
      }

      // Update weapons row
      const weaponsRow = el.querySelector<HTMLElement>('.poe-member-weapons');
      if (weaponsRow) {
        let weaponsHtml = '';
        for (const w of m.weapons) {
          weaponsHtml += `<span class="poe-weapon-pill" title="${w.name} (Ур. ${w.level})"><span class="pill-icon">${w.icon}</span><span class="pill-lvl">L${w.level}</span></span>`;
        }
        if (weaponsRow.innerHTML !== weaponsHtml) {
          weaponsRow.innerHTML = weaponsHtml;
        }
      }

      // Update items row
      const itemsRow = el.querySelector<HTMLElement>('.poe-member-items');
      if (itemsRow) {
        let itemsHtml = '';
        for (const it of m.items) {
          const def = RIFT_ITEMS[it.id as RiftItemId];
          if (def) {
            itemsHtml += `<span class="poe-item-pill" title="${def.name}: ${def.description}"><span class="pill-icon">${def.icon}</span><span class="pill-lvl">x${it.count}</span></span>`;
          }
        }
        if (itemsRow.innerHTML !== itemsHtml) {
          itemsRow.innerHTML = itemsHtml;
        }
      }

      // Update buffs row
      const buffsRow = el.querySelector<HTMLElement>('.poe-member-buffs');
      if (buffsRow) {
        let buffsHtml = '';
        for (const b of m.buffs) {
          const sec = Math.ceil(b.duration);
          buffsHtml += `<span class="poe-buff-pill" title="Баф алтаря (${sec}с)"><span class="pill-icon">${b.icon}</span><span class="pill-sec">${sec}с</span></span>`;
        }
        if (buffsRow.innerHTML !== buffsHtml) {
          buffsRow.innerHTML = buffsHtml;
        }
      }
    }

    // Remove any members who left
    const allRendered = Array.from(this.poePartyList.querySelectorAll<HTMLElement>('.poe-party-member'));
    for (const card of allRendered) {
      const pid = card.getAttribute('data-player-id');
      if (pid && !currentIds.has(pid)) {
        card.remove();
      }
    }
  }

  public updateTeammates(
    remotePlayers: Map<string, RemotePlayer>,
    localPlayer?: Player,
    mySlotId: string = 'p1',
    role: string = 'solo',
    lobbyPlayers: LobbyPlayerInfo[] = []
  ) {
    if (localPlayer) {
      this.updatePoeParty(localPlayer, remotePlayers, mySlotId, role, lobbyPlayers);
    }
  }

  public clearTeammates() {
    if (this.teammatesHpTray) this.teammatesHpTray.innerHTML = '';
    if (this.poePartyList) {
      const remoteCards = Array.from(this.poePartyList.querySelectorAll<HTMLElement>('.poe-party-member:not(.is-local)'));
      for (const card of remoteCards) {
        card.remove();
      }
    }
  }

  public updatePartnerHp(hp: number, maxHp: number, isDowned: boolean) {
    if (this.partnerHpContainer) {
      this.partnerHpContainer.classList.remove('hidden');
      const pct = Math.max(0, Math.min(100, (hp / (maxHp || 100)) * 100));
      if (this.partnerHpFill) this.partnerHpFill.style.width = `${pct}%`;
      if (this.partnerHpText) {
        if (isDowned) {
          this.partnerHpText.innerText = 'РАНЕН!';
          this.partnerHpText.style.color = '#ef4444';
        } else {
          this.partnerHpText.innerText = `${Math.ceil(hp)} / ${maxHp}`;
          this.partnerHpText.style.color = '#e0f2fe';
        }
      }
    }
  }

  public hidePartnerHp() {
    if (this.partnerHpContainer) {
      this.partnerHpContainer.classList.add('hidden');
    }
    this.clearTeammates();
  }

  public update(
    player: Player,
    totalKills: number,
    gameTime: number,
    activeBoss: Enemy | null,
    partnerKills?: number
  ) {
    // XP Bar
    const xpPercent = Math.min(100, Math.max(0, (player.xp / player.xpToNextLevel) * 100));
    this.xpFill.style.width = `${xpPercent}%`;
    this.playerLevel.innerText = `${player.level}`;

    // Timer
    const mins = Math.floor(gameTime / 60);
    const secs = Math.floor(gameTime % 60);
    this.timerText.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Kills
    this.killCountText.innerText = `${totalKills}`;

    if (player.isCoop && partnerKills !== undefined) {
      this.coopKillsDetail.classList.remove('hidden');
      this.myKillsCount.innerText = `${player.kills}`;
      this.partnerKillsCount.innerText = `${partnerKills}`;
    } else {
      this.coopKillsDetail.classList.add('hidden');
    }

    // HP Bar
    const hpPercent = Math.min(100, Math.max(0, (player.hp / player.maxHp) * 100));
    if (this.hpFill) {
      this.hpFill.style.width = `${hpPercent}%`;
    }
    if (this.hpText) {
      this.hpText.innerText = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    }

    // Screen Low HP Vignette (< 30% of max HP)
    if (this.lowHpVignetteLayer) {
      const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
      if (player.isAlive && !player.isDowned && hpRatio <= 0.3) {
        this.lowHpVignetteLayer.classList.add('active');
        if (hpRatio <= 0.15) {
          this.lowHpVignetteLayer.classList.add('critical');
        } else {
          this.lowHpVignetteLayer.classList.remove('critical');
        }
      } else {
        this.lowHpVignetteLayer.classList.remove('active');
        this.lowHpVignetteLayer.classList.remove('critical');
      }
    }

    // In single player, keep PoE party list updated with local player
    if (!player.isCoop && this.poePartyList) {
      this.updatePoeParty(player, new Map(), 'p1', 'solo');
    }

    // Active Weapons Bar
    this.updateWeaponsBar(player.weapons);

    // Active Passives Bar
    this.updatePassivesBar(player);

    // Active Shrine Buffs Tray
    this.updateBuffsTray(player.activeBuffs);

    // Boss Bar
    if (activeBoss && activeBoss.isAlive) {
      this.bossHpContainer.classList.remove('hidden');
      if (this.bossNameText) {
        this.bossNameText.innerText = activeBoss.name.toUpperCase();
      }
      if (activeBoss.isImmortal) {
        this.bossHpFill.style.width = '100%';
        this.bossHpFill.style.background = 'linear-gradient(90deg, #7e22ce, #c084fc)';
        this.bossHpText.innerText = 'БЕССМЕРТЕН (∞)';
      } else {
        const bossHpPercent = Math.min(100, Math.max(0, (activeBoss.hp / activeBoss.maxHp) * 100));
        this.bossHpFill.style.width = `${bossHpPercent}%`;
        this.bossHpFill.style.background = 'linear-gradient(90deg, #b91c1c, #ef4444)';
        this.bossHpText.innerText = `${Math.max(0, Math.ceil(activeBoss.hp))} / ${activeBoss.maxHp}`;
      }
    } else {
      this.bossHpContainer.classList.add('hidden');
    }

    // The Rift: Credits, Difficulty, Items, Dash HUD
    if (this.plasmaCreditsText) {
      this.plasmaCreditsText.innerText = `⬡ ${player.credits}`;
    }

    // Difficulty Meter
    const tier = DifficultyDirector.getCurrentTier(gameTime);
    const progress = DifficultyDirector.getTierProgress(gameTime);
    if (this.diffTierLabel) {
      this.diffTierLabel.innerText = tier.name;
      this.diffTierLabel.style.color = tier.color;
    }
    if (this.diffBarFill) {
      this.diffBarFill.style.width = `${Math.round(progress * 100)}%`;
      this.diffBarFill.style.backgroundColor = tier.color;
    }

    // Tactical Dash Badge & Floating Cooldown Indicator
    if (this.dashCooldownText) {
      if (player.dashCooldown > 0) {
        this.dashCooldownText.innerText = `${player.dashCooldown.toFixed(1)}s`;
        this.dashCooldownBadge?.classList.add('cooling-down');
        this.dashCooldownFloating?.classList.remove('hidden');
      } else {
        this.dashCooldownText.innerText = '0.0s';
        this.dashCooldownBadge?.classList.remove('cooling-down');
        this.dashCooldownFloating?.classList.add('hidden');
      }
    }

    // Item Inventory Tray
    this.renderItemInventory(player.riftItems);
  }

  public updateStageText(stageNum: number, biomeName: string) {
    this.currentStageNumber = stageNum;
    if (this.stageText) {
      this.stageText.innerText = `${stageNum}: ${biomeName.toUpperCase()}`;
    }
  }

  public updateTeleportButton(canTeleport: boolean, reason?: string): void {
    const btn = SafeDOM.getElementById('btn-teleport-to-rift');
    if (!btn) return;

    if (canTeleport) {
      btn.style.opacity = '1';
      btn.style.filter = 'none';
      btn.style.cursor = 'pointer';
      btn.title = 'Телепортация к разлому [T] (+20 сек времени)';
    } else {
      btn.style.opacity = '0.45';
      btn.style.filter = 'grayscale(0.8)';
      btn.style.cursor = 'not-allowed';
      btn.title = reason ? `Телепорт недоступен: ${reason}` : 'Телепортация к разлому недоступна';
    }
  }

  public showInteractionPrompt(text: string) {
    if (this.interactionPrompt && this.interactionPromptText) {
      this.interactionPromptText.innerText = text;
      this.interactionPrompt.classList.remove('hidden');
    }
  }

  public hideInteractionPrompt() {
    if (this.interactionPrompt) {
      this.interactionPrompt.classList.add('hidden');
    }
  }

  public renderItemInventory(items: Map<RiftItemId, number>) {
    if (!this.itemInventoryTray) return;

    let key = '';
    for (const [id, count] of items) {
      key += `${id}:${count},`;
    }
    if (key === this.lastRenderedItemsKey) return;
    this.lastRenderedItemsKey = key;

    this.itemInventoryTray.innerHTML = '';
    for (const [id, count] of items) {
      const def = RIFT_ITEMS[id];
      if (!def) continue;

      const card = document.createElement('div');
      card.className = `rift-item-card ${def.rarity}`;
      card.title = `${def.name} (${def.description})`;
      card.innerHTML = `
        <span>${def.icon}</span>
        ${count > 1 ? `<span class="item-stack-badge">x${count}</span>` : ''}
      `;
      this.itemInventoryTray.appendChild(card);
    }
  }

  public triggerAltarNotification(name: string, subtitle: string, _icon: string, color: string) {
    if (this.altarBannerTimeout !== null) {
      window.clearTimeout(this.altarBannerTimeout);
      this.altarBannerTimeout = null;
    }

    this.altarBannerText.innerText = `${name.toUpperCase()} ЗАХВАЧЕН! ${subtitle}`;
    this.altarBannerText.style.color = color;
    this.altarBanner.style.borderColor = color;
    this.altarBanner.style.boxShadow = 'none';
    this.altarBanner.classList.remove('hidden');

    this.altarBannerTimeout = window.setTimeout(() => {
      this.altarBanner.classList.add('hidden');
      this.altarBannerTimeout = null;
    }, 3800);
  }

  public showBalanceToast(message: string) {
    let container = document.getElementById('balance-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'balance-toast-container';
      container.style.cssText = `
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: rgba(15, 23, 42, 0.94);
      border: 1px solid #f59e0b;
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.35);
      color: #f8fafc;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 600;
      padding: 10px 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: auto;
    `;
    toast.innerHTML = `<span style="color:#f59e0b; font-size:18px;">⚡</span> <span>${message}</span>`;
    container.appendChild(toast);

    window.setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      window.setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  public updateBuffsTray(activeBuffs: Map<BuffType, ActiveBuff>) {
    if (activeBuffs.size === 0) {
      if (this.buffsTray.children.length > 0) {
        this.buffsTray.innerHTML = '';
      }
      return;
    }

    const currentTypes = new Set<string>();

    for (const buff of activeBuffs.values()) {
      currentTypes.add(buff.type);
      const secs = Math.max(1, Math.ceil(buff.duration));
      const pct = Math.max(0, Math.min(100, (buff.duration / buff.maxDuration) * 100));
      const isExpiring = buff.duration <= 3.0 && buff.duration > 0;

      let slot = this.buffsTray.querySelector<HTMLElement>(`[data-buff-type="${buff.type}"]`);
      if (!slot) {
        slot = document.createElement('div');
        slot.className = 'buff-slot';
        slot.setAttribute('data-buff-type', buff.type);
        slot.style.borderColor = buff.color;
        slot.style.boxShadow = `0 0 12px ${buff.color}60`;
        slot.innerHTML = `
          <div class="buff-icon-wrap">
            <span class="buff-icon">${buff.icon}</span>
          </div>
          <div class="buff-timer">${secs}с</div>
          <div class="buff-progress-track">
            <div class="buff-progress-fill" style="width: ${pct}%; background-color: ${buff.color};"></div>
          </div>
        `;
        this.buffsTray.appendChild(slot);
      }

      slot.title = `${buff.name} (${secs}с)`;

      const timerEl = slot.querySelector<HTMLElement>('.buff-timer');
      if (timerEl && timerEl.innerText !== `${secs}с`) {
        timerEl.innerText = `${secs}с`;
      }

      const fillEl = slot.querySelector<HTMLElement>('.buff-progress-fill');
      if (fillEl) {
        fillEl.style.width = `${pct}%`;
      }

      if (isExpiring) {
        if (!slot.classList.contains('buff-expiring')) {
          slot.classList.add('buff-expiring');
        }
      } else {
        if (slot.classList.contains('buff-expiring')) {
          slot.classList.remove('buff-expiring');
        }
      }
    }

    const slots = Array.from(this.buffsTray.querySelectorAll<HTMLElement>('.buff-slot'));
    for (const slot of slots) {
      const type = slot.getAttribute('data-buff-type');
      if (type && !currentTypes.has(type)) {
        slot.remove();
      }
    }
  }

  public triggerDamageFlash(_damageAmount?: number) {
    if (!this.damageFlashLayer) return;
    this.damageFlashLayer.classList.remove('hit-flash');
    void this.damageFlashLayer.offsetWidth;
    this.damageFlashLayer.classList.add('hit-flash');

    if (this.damageFlashTimeout !== null) {
      window.clearTimeout(this.damageFlashTimeout);
    }
    this.damageFlashTimeout = window.setTimeout(() => {
      this.damageFlashLayer?.classList.remove('hit-flash');
      this.damageFlashTimeout = null;
    }, 45);
  }

  public triggerBossWarning(bossName?: string, tier?: number) {
    if (this.bossWarningTimeout !== null) {
      window.clearTimeout(this.bossWarningTimeout);
      this.bossWarningTimeout = null;
    }
    const name = bossName || (tier ? `КРОВАВЫЙ ДЕМОН (УР. ${tier})` : 'КРОВАВЫЙ ДЕМОН');
    if (this.bossWarningText) {
      this.bossWarningText.innerText = `ВНИМАНИЕ: ПОЯВИЛСЯ БОСС «${name.toUpperCase()}»!`;
      this.bossWarningText.style.color = '#fbbf24';
    }
    this.bossWarningBanner.style.borderColor = '#d97706';
    this.bossWarningBanner.style.boxShadow = '0 0 35px rgba(217, 119, 6, 0.6)';
    this.bossWarningBanner.classList.remove('hidden');
    SoundManager.playLevelUp();
    this.bossWarningTimeout = window.setTimeout(() => {
      this.bossWarningBanner.classList.add('hidden');
      this.bossWarningTimeout = null;
    }, 4500);
  }

  public triggerImmortalBossWarning(bossName?: string) {
    if (this.bossWarningTimeout !== null) {
      window.clearTimeout(this.bossWarningTimeout);
      this.bossWarningTimeout = null;
    }
    const name = bossName || 'ДРЕВНИЙ ВЛАДЫКА РАЗЛОМА';
    if (this.bossWarningText) {
      this.bossWarningText.innerText = `ПРИБЛИЖАЕТСЯ ${name.toUpperCase()}! ПРИГОТОВЬТЕСЬ К БИТВЕ!`;
      this.bossWarningText.style.color = '#e9d5ff';
    }
    this.bossWarningBanner.style.borderColor = '#a855f7';
    this.bossWarningBanner.style.boxShadow = '0 0 45px rgba(168, 85, 247, 0.85)';
    this.bossWarningBanner.classList.remove('hidden');
    SoundManager.playReaperSpawn();
    this.bossWarningTimeout = window.setTimeout(() => {
      this.bossWarningBanner.classList.add('hidden');
      this.bossWarningTimeout = null;
    }, 5500);
  }

  public resetBossUI() {
    if (this.bossWarningTimeout !== null) {
      window.clearTimeout(this.bossWarningTimeout);
      this.bossWarningTimeout = null;
    }
    this.bossWarningBanner.classList.add('hidden');
    this.bossHpContainer.classList.add('hidden');

    if (this.altarBannerTimeout !== null) {
      window.clearTimeout(this.altarBannerTimeout);
      this.altarBannerTimeout = null;
    }
    this.altarBanner.classList.add('hidden');
    this.buffsTray.innerHTML = '';
    if (this.passivesBar) {
      this.passivesBar.innerHTML = '';
    }
  }

  public updateWeaponsBar(weapons: Weapon[]) {
    const currentWeaponIds = new Set<string>();
    for (const weapon of weapons) {
      currentWeaponIds.add(weapon.id);
      let slot = this.weaponsBar.querySelector<HTMLElement>(`[data-weapon-id="${weapon.id}"]`);
      if (!slot) {
        slot = document.createElement('div');
        slot.className = 'weapon-slot';
        slot.setAttribute('data-weapon-id', weapon.id);
        slot.title = `${weapon.name} (Ур. ${weapon.level})`;
        const iconUrl = TextureManager.getWeaponBlobUrl(weapon.iconImage || getWeaponIconUrl(weapon.id));
        slot.innerHTML = `
          <img src="${iconUrl}" class="weapon-icon-img" alt="${weapon.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'" />
          <span class="weapon-icon" style="display:none">${weapon.icon}</span>
          <span class="weapon-level">lvl ${weapon.level}</span>
        `;
        this.weaponsBar.appendChild(slot);
      } else {
        const lvlEl = slot.querySelector<HTMLElement>('.weapon-level');
        if (lvlEl && lvlEl.innerText !== `lvl ${weapon.level}`) {
          lvlEl.innerText = `lvl ${weapon.level}`;
          slot.title = `${weapon.name} (Ур. ${weapon.level})`;
        }
      }
    }

    const slots = Array.from(this.weaponsBar.querySelectorAll<HTMLElement>('.weapon-slot'));
    for (const slot of slots) {
      const id = slot.getAttribute('data-weapon-id');
      if (id && !currentWeaponIds.has(id)) {
        slot.remove();
      }
    }
  }

  public updatePassivesBar(_player: Player) {
    if (!this.passivesBar) return;
    this.passivesBar.innerHTML = '';
  }

  public updatePerformance(fps: number, pingMs?: number) {
    if (!this.perfOverlay || !this.isPerfOverlayEnabled) return;

    const now = performance.now();
    if (now - this.lastPerfUiUpdate < 250) return;
    this.lastPerfUiUpdate = now;

    if (this.perfFps) {
      const roundedFps = Math.round(fps);
      this.perfFps.innerText = `${roundedFps} FPS`;
      this.perfFps.className = 'perf-badge perf-fps';
      if (roundedFps < 30) {
        this.perfFps.classList.add('fps-low');
      } else if (roundedFps < 50) {
        this.perfFps.classList.add('fps-mid');
      }
    }

    if (this.perfPing) {
      if (pingMs !== undefined) {
        this.perfPing.classList.remove('hidden');
        const roundedPing = Math.round(pingMs);
        this.perfPing.innerText = `Ping: ${roundedPing} ms`;
        this.perfPing.className = 'perf-badge perf-ping';
        if (roundedPing > 140) {
          this.perfPing.classList.add('ping-high');
        } else if (roundedPing > 70) {
          this.perfPing.classList.add('ping-medium');
        } else {
          this.perfPing.classList.add('ping-good');
        }
      } else {
        this.perfPing.classList.add('hidden');
      }
    }
  }

  public resetSessionHUD() {
    this.resetBossUI();
    this.clearTeammates();
    this.lastRenderedItemsKey = '';

    if (this.xpFill) this.xpFill.style.width = '0%';
    if (this.playerLevel) this.playerLevel.innerText = '1';
    if (this.timerText) this.timerText.innerText = '00:00';
    if (this.killCountText) this.killCountText.innerText = '0';
    if (this.myKillsCount) this.myKillsCount.innerText = '0';
    if (this.partnerKillsCount) this.partnerKillsCount.innerText = '0';
    if (this.coopKillsDetail) this.coopKillsDetail.classList.add('hidden');
    if (this.plasmaCreditsText) this.plasmaCreditsText.innerText = '0';
    if (this.stageText) this.stageText.innerText = '1: ПУСТЫНЯ';
    if (this.diffTierLabel) this.diffTierLabel.innerText = 'ЛЕГКО';
    if (this.diffBarFill) this.diffBarFill.style.width = '0%';
    if (this.weaponsBar) this.weaponsBar.innerHTML = '';
    if (this.passivesBar) this.passivesBar.innerHTML = '';
    if (this.buffsTray) this.buffsTray.innerHTML = '';
    if (this.itemInventoryTray) this.itemInventoryTray.innerHTML = '';
    if (this.interactionPrompt) this.interactionPrompt.classList.add('hidden');
    if (this.dashCooldownBadge) this.dashCooldownBadge.classList.remove('cooling-down');
    if (this.dashCooldownFloating) this.dashCooldownFloating.classList.add('hidden');

    const damageFlash = document.getElementById('damage-flash-layer');
    if (damageFlash) damageFlash.style.opacity = '0';
    const lowHp = document.getElementById('low-hp-vignette-layer');
    if (lowHp) lowHp.style.opacity = '0';

    this.setTrainingModeActive(false);
  }

  public setTrainingModeActive(active: boolean) {
    this.isTrainingModeActive = active;
    const mobileDevBtn = document.getElementById('btn-dev-mobile-trigger');
    const pauseDevBtn = document.getElementById('btn-pause-dev');
    const pauseRestartSameBtn = document.getElementById('btn-pause-restart-same');
    if (active) {
      mobileDevBtn?.classList.remove('hidden');
      pauseDevBtn?.classList.remove('hidden');
      pauseRestartSameBtn?.classList.remove('hidden');
    } else {
      mobileDevBtn?.classList.add('hidden');
      pauseDevBtn?.classList.add('hidden');
      pauseRestartSameBtn?.classList.add('hidden');
    }
  }
}
