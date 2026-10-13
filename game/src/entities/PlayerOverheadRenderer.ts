import type { CharacterType } from './Player';

export interface PlayerOverheadData {
  hp: number;
  maxHp: number;
  level: number;
  isDowned: boolean;
  reviveProgress: number;
  charType: CharacterType;
  displayName: string;
  colorCss: string;
}

export function getHeroRussianName(charType: CharacterType): string {
  switch (charType) {
    case 'invoker':
      return 'Инвокер';
    case 'valkyrie':
      return 'Каэла';
    case 'flail':
      return 'Бригитта';
    case 'sorceress':
      return 'Ария';
    case 'chakram':
      return 'Кира';
    case 'archer':
      return 'Эльф';
    case 'rocket':
      return 'Ракета';
    case 'necromancer':
      return 'Мортис';
    case 'amazon':
      return 'Амазонка';
    case 'ronin':
    default:
      return 'Рен';
  }
}

export function renderPlayerOverhead(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: PlayerOverheadData
): void {
  ctx.clearRect(0, 0, w, h);

  if (data.isDowned) {
    // Downed Badge
    ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.beginPath();
    ctx.roundRect(16, 8, w - 32, 34, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Cinzel", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠️ РАНЕН! СПАСИТЕ!', w / 2, 25);

    // Revive progress bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(24, 48, w - 48, 18, 9);
    ctx.fill();

    if (data.reviveProgress > 0) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(26, 50, (w - 52) * Math.min(1, data.reviveProgress), 14, 7);
      ctx.fill();
    }
  } else {
    // Name & Level Pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = data.colorCss;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(16, 6, w - 32, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = data.colorCss;
    ctx.font = 'bold 17px "Cinzel", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const heroName = getHeroRussianName(data.charType);
    ctx.fillText(`${data.displayName} (${heroName}) [L${data.level}]`, w / 2, 24);

    // Health Bar (XP-bar capsule style, red palette, lighter as HP drops)
    const barX = 22;
    const barY = 48;
    const barW = w - 44;
    const barH = 17;
    const radius = barH / 2;

    // Track Container (matching XP-bar glass capsule)
    ctx.fillStyle = 'rgba(6, 12, 22, 0.94)';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, radius);
    ctx.fill();
    ctx.stroke();

    // Fill with dynamic lightness (less HP = lighter red)
    const hpPct = Math.max(0, Math.min(1, data.hp / (data.maxHp || 100)));
    const fillW = (barW - 4) * hpPct;
    if (hpPct > 0 && fillW > 0) {
      const lightnessFactor = 1 - hpPct; // 0 at full HP -> 1 at empty HP
      const l1 = Math.round(38 + lightnessFactor * 32); // 38% -> 70%
      const l2 = Math.round(50 + lightnessFactor * 30); // 50% -> 80%
      if (ctx.createLinearGradient) {
        const grad = ctx.createLinearGradient(barX + 2, barY, barX + 2 + fillW, barY);
        grad.addColorStop(0, `hsl(0, 90%, ${l1}%)`);
        grad.addColorStop(1, `hsl(0, 95%, ${l2}%)`);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = `hsl(0, 90%, ${l1}%)`;
      }
      ctx.beginPath();
      ctx.roundRect(barX + 2, barY + 2, fillW, barH - 4, (barH - 4) / 2);
      ctx.fill();

      // Subtle XP-style glass gloss highlight on upper half
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.roundRect(barX + 4, barY + 2.5, Math.max(0, fillW - 4), (barH - 4) * 0.38, (barH - 4) * 0.19);
      ctx.fill();
    }

    // Numeric HP Text
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.font = 'bold 11px "Cinzel", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.ceil(data.hp)} / ${data.maxHp}`, w / 2, barY + barH / 2 + 1);
    ctx.shadowBlur = 0;
  }
}
