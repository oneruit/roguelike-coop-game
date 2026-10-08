import { GameBalanceState, BalanceRow } from '../../../src/balance/BalanceTypes';
import { DEFAULT_BALANCE } from '../../../src/balance/defaultBalance';
import { TableSort } from '../types';

export class BalanceState {
  public originalBalance: GameBalanceState;
  public draftBalance: GameBalanceState;
  public modifiedPaths: Set<string> = new Set();
  public expandedRows: Set<string> = new Set(['weapons-fireball']); // Fireball open by default

  public searchFilter: string = '';
  public activeTab: string = 'dashboard';

  public tableSorts: Record<string, TableSort> = {
    weapons: { col: 'name', dir: 'asc' },
    heroes: { col: 'name', dir: 'asc' },
    monsters: { col: 'name', dir: 'asc' },
    bosses: { col: 'name', dir: 'asc' }
  };

  constructor() {
    this.originalBalance = JSON.parse(JSON.stringify(DEFAULT_BALANCE));
    this.draftBalance = JSON.parse(JSON.stringify(DEFAULT_BALANCE));
  }

  public getOriginalValue(path: string): number | undefined {
    const parts = path.split('.');
    let cur: any = this.originalBalance;
    for (const p of parts) {
      if (cur === undefined || cur === null) return undefined;
      cur = cur[p];
    }
    return typeof cur === 'number' ? cur : undefined;
  }

  public applyFieldChange(path: string, value: number): void {
    const parts = path.split('.');
    let cur: any = this.draftBalance;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur[parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    cur[lastKey] = value;

    const origVal = this.getOriginalValue(path);
    if (origVal !== undefined && value !== origVal) {
      this.modifiedPaths.add(path);
    } else {
      this.modifiedPaths.delete(path);
    }
  }

  public checkAllCategoryChanges(category: keyof GameBalanceState): void {
    if (category === 'global') {
      for (const prop of Object.keys(this.draftBalance.global)) {
        if (typeof (this.draftBalance.global as any)[prop] !== 'number') continue;
        const path = `global.${prop}`;
        if ((this.draftBalance.global as any)[prop] !== (this.originalBalance.global as any)[prop]) {
          this.modifiedPaths.add(path);
        } else {
          this.modifiedPaths.delete(path);
        }
      }
      return;
    }

    const dict = this.draftBalance[category] as Record<string, any>;
    const origDict = this.originalBalance[category] as Record<string, any>;

    for (const key of Object.keys(dict)) {
      for (const prop of Object.keys(dict[key])) {
        if (typeof dict[key][prop] !== 'number') continue;
        const path = `${category}.${key}.${prop}`;
        if (dict[key][prop] !== origDict[key]?.[prop]) {
          this.modifiedPaths.add(path);
        } else {
          this.modifiedPaths.delete(path);
        }
      }
    }
  }

  public resetSingleItem(category: keyof GameBalanceState, id: string): void {
    const def = (DEFAULT_BALANCE as any)[category]?.[id];
    if (!def) return;

    (this.draftBalance as any)[category][id] = JSON.parse(JSON.stringify(def));

    for (const prop of Object.keys(def)) {
      if (typeof def[prop] !== 'number') continue;
      const path = `${category}.${id}.${prop}`;
      const isOrigDiff = def[prop] !== (this.originalBalance as any)[category]?.[id]?.[prop];
      if (isOrigDiff) {
        this.modifiedPaths.add(path);
      } else {
        this.modifiedPaths.delete(path);
      }
    }
  }

  public discardDraft(): void {
    this.draftBalance = JSON.parse(JSON.stringify(this.originalBalance));
    this.modifiedPaths.clear();
  }

  public mergeRemoteRow(row: BalanceRow): void {
    if (!row || !row.category || !row.data) return;
    const cat = row.category as keyof GameBalanceState;

    if (cat === 'global') {
      this.originalBalance.global = { ...this.originalBalance.global, ...row.data };
      for (const [k, v] of Object.entries(row.data)) {
        const path = `global.${k}`;
        if (!this.modifiedPaths.has(path)) {
          (this.draftBalance.global as any)[k] = v;
        }
      }
    } else {
      const dict = this.originalBalance[cat] as Record<string, any>;
      const draftDict = this.draftBalance[cat] as Record<string, any>;
      if (dict && draftDict && row.key) {
        dict[row.key] = { ...(dict[row.key] || {}), ...row.data };
        if (!draftDict[row.key]) {
          draftDict[row.key] = JSON.parse(JSON.stringify(dict[row.key]));
        } else {
          for (const [prop, val] of Object.entries(row.data)) {
            const path = `${cat}.${row.key}.${prop}`;
            if (!this.modifiedPaths.has(path)) {
              draftDict[row.key][prop] = val;
            }
          }
        }
      }
    }
  }

  public getModifiedCount(): number {
    return this.modifiedPaths.size;
  }

  public getDiffList(): Array<{
    entityName: string;
    propName: string;
    origVal: number;
    draftVal: number;
    diff: string;
  }> {
    const list: Array<{
      entityName: string;
      propName: string;
      origVal: number;
      draftVal: number;
      diff: string;
    }> = [];

    const sortedPaths = Array.from(this.modifiedPaths).sort();
    for (const p of sortedPaths) {
      const parts = p.split('.');
      let origVal: any = this.originalBalance;
      let draftVal: any = this.draftBalance;
      for (const part of parts) {
        origVal = origVal?.[part];
        draftVal = draftVal?.[part];
      }

      let entityName = parts[1] || parts[0];
      const category = parts[0] as keyof GameBalanceState;
      if (category !== 'global' && parts[1]) {
        entityName = (this.draftBalance[category] as any)?.[parts[1]]?.name || parts[1];
      } else if (category === 'global') {
        entityName = 'Глобальные настройки';
      }

      const propName = parts[parts.length - 1];
      const delta = draftVal - origVal;
      const deltaSign = delta > 0 ? `+${delta}` : `${delta}`;

      list.push({
        entityName,
        propName,
        origVal,
        draftVal,
        diff: deltaSign
      });
    }

    return list;
  }
}
