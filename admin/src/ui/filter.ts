/**
 * Smart search filter for balance entities.
 * Supports fuzzy matching across:
 * - Entity Names & IDs (Russian and English)
 * - Descriptions, Notes, Roles
 * - Exact and partial numeric values (e.g. '2.5', '100', '0.4')
 * - Property keys (e.g. 'cooldown', 'damage', 'hp', 'radius')
 */
export function matchesSearch(item: any, filter: string): boolean {
  if (!filter) return true;
  const q = filter.toLowerCase().trim();
  if (!q) return true;

  // 1. Text attributes
  if (item.name && String(item.name).toLowerCase().includes(q)) return true;
  if (item.id && String(item.id).toLowerCase().includes(q)) return true;
  if (item.notes && String(item.notes).toLowerCase().includes(q)) return true;
  if (item.role && String(item.role).toLowerCase().includes(q)) return true;
  if (item.description && String(item.description).toLowerCase().includes(q)) return true;
  if (item.category && String(item.category).toLowerCase().includes(q)) return true;
  if (item.startingWeapon && String(item.startingWeapon).toLowerCase().includes(q)) return true;

  // 2. Scan all properties (numbers, strings)
  for (const [key, val] of Object.entries(item)) {
    if (val === undefined || val === null) continue;
    const keyLower = key.toLowerCase();
    if (keyLower.includes(q)) return true;

    if (typeof val === 'number') {
      const numStr = String(val);
      if (numStr === q || numStr.includes(q)) return true;
    } else if (typeof val === 'string') {
      if (val.toLowerCase().includes(q)) return true;
    }
  }

  // 3. Common Russian aliases for stats
  if (q.includes('кулдаун') || q.includes('кд')) {
    if ('cooldown' in item) return true;
  }
  if (q.includes('урон')) {
    if ('damage' in item || 'baseDamage' in item) return true;
  }
  if (q.includes('хп') || q.includes('здоров')) {
    if ('health' in item || 'hp' in item || 'baseHp' in item) return true;
  }
  if (q.includes('скорост')) {
    if ('speed' in item || 'baseSpeed' in item) return true;
  }

  return false;
}

export function renderEmptySearchState(container: HTMLElement, filter: string, onClear?: () => void): void {
  const emptyDiv = document.createElement('div');
  emptyDiv.className = 'empty-search-state';
  emptyDiv.innerHTML = `
    <div class="empty-icon">🔍</div>
    <div class="empty-title">Ничего не найдено по запросу «${filter}»</div>
    <div class="empty-subtitle">Проверьте правильность написания или сбросьте строку поиска</div>
    <button class="btn btn-sm btn-outline btn-clear-search-action" style="margin-top:12px;">Сбросить поиск</button>
  `;
  container.appendChild(emptyDiv);

  emptyDiv.querySelector('.btn-clear-search-action')?.addEventListener('click', () => {
    if (onClear) onClear();
  });
}
