# Codebase Symbol Index

> Automatically generated index of all exported classes, interfaces, types, functions, constants, and class methods.
> **Generated:** 2026-10-14T23:15:49.091Z | **Files:** 148 | **Top-level:** 457 | **Class Methods:** 1051
> **Entities Registered:** 10 Heroes, 25 Weapons, 2 Bosses, 8 Monsters

Run `npm run index` to refresh this cache.

## Modules Overview

| Module | Top-Level Symbols |
| :--- | :--- |
| `game/src` | 416 |
| `admin/src` | 39 |
| `server` | 2 |

---

## Alphabetical Symbol & Member Registry

| Symbol / Member | Kind | File & Line | Description |
| :--- | :--- | :--- | :--- |
| `ActiveBuff` | `interface` | [`game/src/shared/types/entities.ts:28`](../../game/src/shared/types/entities.ts#L28) | - |
| `AdminConfig` | `interface` | [`admin/src/types.ts:6`](../../admin/src/types.ts#L6) | - |
| `AdminController` | `class` | [`admin/src/admin.ts:19`](../../admin/src/admin.ts#L19) | - |
| `AdminController.applyFilter` | `method` | [`admin/src/admin.ts:401`](../../admin/src/admin.ts#L401) | - |
| `AdminController.bindDOM` | `method` | [`admin/src/admin.ts:47`](../../admin/src/admin.ts#L47) | - |
| `AdminController.clearSearch` | `method` | [`admin/src/admin.ts:418`](../../admin/src/admin.ts#L418) | - |
| `AdminController.collapseAllCurrentTab` | `method` | [`admin/src/admin.ts:449`](../../admin/src/admin.ts#L449) | - |
| `AdminController.expandAllCurrentTab` | `method` | [`admin/src/admin.ts:426`](../../admin/src/admin.ts#L426) | - |
| `AdminController.handleFieldChange` | `method` | [`admin/src/admin.ts:487`](../../admin/src/admin.ts#L487) | - |
| `AdminController.init` | `method` | [`admin/src/admin.ts:40`](../../admin/src/admin.ts#L40) | - |
| `AdminController.renderAll` | `method` | [`admin/src/admin.ts:648`](../../admin/src/admin.ts#L648) | - |
| `AdminController.renderBosses` | `method` | [`admin/src/admin.ts:583`](../../admin/src/admin.ts#L583) | - |
| `AdminController.renderGlobal` | `method` | [`admin/src/admin.ts:644`](../../admin/src/admin.ts#L644) | - |
| `AdminController.renderHeroes` | `method` | [`admin/src/admin.ts:557`](../../admin/src/admin.ts#L557) | - |
| `AdminController.renderItems` | `method` | [`admin/src/admin.ts:609`](../../admin/src/admin.ts#L609) | - |
| `AdminController.renderMerchant` | `method` | [`admin/src/admin.ts:636`](../../admin/src/admin.ts#L636) | - |
| `AdminController.renderMonsters` | `method` | [`admin/src/admin.ts:570`](../../admin/src/admin.ts#L570) | - |
| `AdminController.renderPassives` | `method` | [`admin/src/admin.ts:596`](../../admin/src/admin.ts#L596) | - |
| `AdminController.renderTalents` | `method` | [`admin/src/admin.ts:622`](../../admin/src/admin.ts#L622) | - |
| `AdminController.renderWeapons` | `method` | [`admin/src/admin.ts:544`](../../admin/src/admin.ts#L544) | - |
| `AdminController.switchTab` | `method` | [`admin/src/admin.ts:312`](../../admin/src/admin.ts#L312) | - |
| `AdminController.updateSortHeaderUI` | `method` | [`admin/src/admin.ts:472`](../../admin/src/admin.ts#L472) | - |
| `Altar` | `class` | [`game/src/world/Altar.ts:108`](../../game/src/world/Altar.ts#L108) | - |
| `ALTAR_CONFIGS` | `const` | [`game/src/world/Altar.ts:37`](../../game/src/world/Altar.ts#L37) | - |
| `Altar.applyRemoteCapture` | `method` | [`game/src/world/Altar.ts:485`](../../game/src/world/Altar.ts#L485) | Apply a capture decided by the host without replaying the local capture log... |
| `Altar.destroy` | `method` | [`game/src/world/Altar.ts:497`](../../game/src/world/Altar.ts#L497) | - |
| `Altar.renderBillboard` | `method` | [`game/src/world/Altar.ts:299`](../../game/src/world/Altar.ts#L299) | - |
| `Altar.updateVisuals` | `method` | [`game/src/world/Altar.ts:431`](../../game/src/world/Altar.ts#L431) | Rendering phase: Viewport/Frustum culling, billboard canvas updates, mesh a... |
| `AltarConfig` | `interface` | [`game/src/world/Altar.ts:27`](../../game/src/world/Altar.ts#L27) | - |
| `AltarManager` | `class` | [`game/src/world/AltarManager.ts:5`](../../game/src/world/AltarManager.ts#L5) | - |
| `AltarManager.applyRemoteCapture` | `method` | [`game/src/world/AltarManager.ts:71`](../../game/src/world/AltarManager.ts#L71) | - |
| `AltarManager.clear` | `method` | [`game/src/world/AltarManager.ts:76`](../../game/src/world/AltarManager.ts#L76) | - |
| `AltarManager.registerAltar` | `method` | [`game/src/world/AltarManager.ts:14`](../../game/src/world/AltarManager.ts#L14) | - |
| `AltarManager.unregisterAltar` | `method` | [`game/src/world/AltarManager.ts:24`](../../game/src/world/AltarManager.ts#L24) | - |
| `AltarManager.updateVisuals` | `method` | [`game/src/world/AltarManager.ts:47`](../../game/src/world/AltarManager.ts#L47) | - |
| `AltarNotificationPayload` | `interface` | [`game/src/mechanics/events/GameEventBus.ts:46`](../../game/src/mechanics/events/GameEventBus.ts#L46) | - |
| `ANIM_LAYOUT_LEGACY` | `const` | [`game/src/entities/CharacterAnimator.ts:60`](../../game/src/entities/CharacterAnimator.ts#L60) | Legacy 4x4 / Ronin Standard: Row 0: FRONT, Row 1: LEFT, Row 2: RIGHT, Row 3... |
| `ANIM_LAYOUT_NECROMANCER` | `const` | [`game/src/entities/CharacterAnimator.ts:45`](../../game/src/entities/CharacterAnimator.ts#L45) | Necromancer / Transition Layout: Row 0: FRONT, Row 1: BACK, Row 2: LEFT, Ro... |
| `ANIM_LAYOUT_V2` | `const` | [`game/src/entities/CharacterAnimator.ts:30`](../../game/src/entities/CharacterAnimator.ts#L30) | V2 Pipeline Standard Layout: Row 0: FRONT (Лицо) Row 1: BACK (Спина) Row 2:... |
| `ANIM_STATES` | `const` | [`game/src/shared/types/registry.ts:13`](../../game/src/shared/types/registry.ts#L13) | - |
| `AnimatedCharacterTextures` | `interface` | [`game/src/core/TextureManager.ts:26`](../../game/src/core/TextureManager.ts#L26) | - |
| `AssaultRifleWeapon` | `class` | [`game/src/combat/weapons/RangedWeapons.ts:242`](../../game/src/combat/weapons/RangedWeapons.ts#L242) | Assault Rifle (Штурмовая Винтовка) Rapid automatic bursts of bullets |
| `AssaultRifleWeapon.getNextUpgradeDescription` | `method` | [`game/src/combat/weapons/RangedWeapons.ts:330`](../../game/src/combat/weapons/RangedWeapons.ts#L330) | - |
| `AssaultRifleWeapon.setAttackCallback` | `method` | [`game/src/combat/weapons/RangedWeapons.ts:267`](../../game/src/combat/weapons/RangedWeapons.ts#L267) | - |
| `AssaultRifleWeapon.upgrade` | `method` | [`game/src/combat/weapons/RangedWeapons.ts:323`](../../game/src/combat/weapons/RangedWeapons.ts#L323) | - |
| `AssetPreloader` | `class` | [`game/src/core/AssetPreloader.ts:4`](../../game/src/core/AssetPreloader.ts#L4) | - |
| `AssetPreloader.init` | `method` | [`game/src/core/AssetPreloader.ts:5`](../../game/src/core/AssetPreloader.ts#L5) | - |
| `AssetPreloader.showMapLoadingProgress` | `method` | [`game/src/core/AssetPreloader.ts:45`](../../game/src/core/AssetPreloader.ts#L45) | - |
| `AssetResolver` | `class` | [`game/src/utils/AssetResolver.ts:10`](../../game/src/utils/AssetResolver.ts#L10) | Centralized Asset Resolver Handles structured and legacy asset URLs with tr... |
| `AssetResolver.getBiomeTexture` | `method` | [`game/src/utils/AssetResolver.ts:24`](../../game/src/utils/AssetResolver.ts#L24) | Get biome texture URL. Path: /textures/biomes/<biomeId>/surface.jpg or tree... |
| `AssetResolver.getHeroTexture` | `method` | [`game/src/utils/AssetResolver.ts:15`](../../game/src/utils/AssetResolver.ts#L15) | Get hero texture URL for a given action. Path: /textures/heroes/<heroId>/<a... |
| `AssetResolver.getWeaponIcon` | `method` | [`game/src/utils/AssetResolver.ts:34`](../../game/src/utils/AssetResolver.ts#L34) | Get weapon icon URL. Path: /textures/weapons/weapon_<weaponId>.png |
| `AssetResolver.normalizeTextureUrl` | `method` | [`game/src/utils/AssetResolver.ts:42`](../../game/src/utils/AssetResolver.ts#L42) | Normalizes legacy URLs to modular structure if applicable. |
| `AstralStaffWeapon` | `class` | [`game/src/combat/weapons/MagicWeapons.ts:268`](../../game/src/combat/weapons/MagicWeapons.ts#L268) | Astral Staff (Звёздный Посох) - Hero 4 Sorceress starting weapon Casts high... |
| `AstralStaffWeapon.getNextUpgradeDescription` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:354`](../../game/src/combat/weapons/MagicWeapons.ts#L354) | - |
| `AstralStaffWeapon.setAttackCallback` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:292`](../../game/src/combat/weapons/MagicWeapons.ts#L292) | - |
| `AstralStaffWeapon.upgrade` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:347`](../../game/src/combat/weapons/MagicWeapons.ts#L347) | - |
| `attachInputListeners` | `function` | [`admin/src/views/controlHelpers.ts:35`](../../admin/src/views/controlHelpers.ts#L35) | - |
| `AuthListener` | `type` | [`game/src/auth/AuthManager.ts:16`](../../game/src/auth/AuthManager.ts#L16) | - |
| `AuthManager` | `class` | [`game/src/auth/AuthManager.ts:26`](../../game/src/auth/AuthManager.ts#L26) | Authentication Manager for The Rift. Handles local Guest mode and Supabase ... |
| `AuthManager.cleanUrlAfterOAuth` | `method` | [`game/src/auth/AuthManager.ts:449`](../../game/src/auth/AuthManager.ts#L449) | - |
| `AuthManager.clearSavedAuthState` | `method` | [`game/src/auth/AuthManager.ts:440`](../../game/src/auth/AuthManager.ts#L440) | - |
| `AuthManager.getInstance` | `method` | [`game/src/auth/AuthManager.ts:34`](../../game/src/auth/AuthManager.ts#L34) | - |
| `AuthManager.getOrCreateGuestProfile` | `method` | [`game/src/auth/AuthManager.ts:381`](../../game/src/auth/AuthManager.ts#L381) | - |
| `AuthManager.getUser` | `method` | [`game/src/auth/AuthManager.ts:160`](../../game/src/auth/AuthManager.ts#L160) | - |
| `AuthManager.init` | `method` | [`game/src/auth/AuthManager.ts:41`](../../game/src/auth/AuthManager.ts#L41) | - |
| `AuthManager.isAuthenticated` | `method` | [`game/src/auth/AuthManager.ts:171`](../../game/src/auth/AuthManager.ts#L171) | - |
| `AuthManager.isGuest` | `method` | [`game/src/auth/AuthManager.ts:167`](../../game/src/auth/AuthManager.ts#L167) | - |
| `AuthManager.loadSavedAuthState` | `method` | [`game/src/auth/AuthManager.ts:418`](../../game/src/auth/AuthManager.ts#L418) | - |
| `AuthManager.loginAsGuest` | `method` | [`game/src/auth/AuthManager.ts:315`](../../game/src/auth/AuthManager.ts#L315) | Log in / switch to Guest mode. All data is saved locally on device. |
| `AuthManager.notify` | `method` | [`game/src/auth/AuthManager.ts:370`](../../game/src/auth/AuthManager.ts#L370) | - |
| `AuthManager.onAuthStateChanged` | `method` | [`game/src/auth/AuthManager.ts:359`](../../game/src/auth/AuthManager.ts#L359) | - |
| `AuthManager.saveAuthState` | `method` | [`game/src/auth/AuthManager.ts:431`](../../game/src/auth/AuthManager.ts#L431) | - |
| `AuthManager.saveGuestProfile` | `method` | [`game/src/auth/AuthManager.ts:409`](../../game/src/auth/AuthManager.ts#L409) | - |
| `AuthManager.sendOtp` | `method` | [`game/src/auth/AuthManager.ts:222`](../../game/src/auth/AuthManager.ts#L222) | Request a one-time OTP code or magic link to be sent to the player's email. |
| `AuthManager.setGuestName` | `method` | [`game/src/auth/AuthManager.ts:330`](../../game/src/auth/AuthManager.ts#L330) | Update the display name for the guest user. |
| `AuthManager.signInWithGoogle` | `method` | [`game/src/auth/AuthManager.ts:179`](../../game/src/auth/AuthManager.ts#L179) | Initiates Google OAuth sign-in via Supabase. Redirects the player to the Go... |
| `AuthManager.signOut` | `method` | [`game/src/auth/AuthManager.ts:345`](../../game/src/auth/AuthManager.ts#L345) | Sign out from the current account. Automatically reverts to Guest mode. |
| `AuthManager.verifyOtp` | `method` | [`game/src/auth/AuthManager.ts:264`](../../game/src/auth/AuthManager.ts#L264) | Verify the 6-digit OTP code received by the player via email. On success, e... |
| `AuthModalScreen` | `class` | [`game/src/ui/screens/Auth/AuthModalScreen.ts:16`](../../game/src/ui/screens/Auth/AuthModalScreen.ts#L16) | Modular Auth Modal Screen. Provides local Guest authorization and Google OA... |
| `AuthModalScreen.bindElements` | `method` | [`game/src/ui/screens/Auth/AuthModalScreen.ts:37`](../../game/src/ui/screens/Auth/AuthModalScreen.ts#L37) | - |
| `AuthModalScreen.bindEvents` | `method` | [`game/src/ui/screens/Auth/AuthModalScreen.ts:39`](../../game/src/ui/screens/Auth/AuthModalScreen.ts#L39) | - |
| `AuthModalScreen.closeModal` | `method` | [`game/src/ui/screens/Auth/AuthModalScreen.ts:211`](../../game/src/ui/screens/Auth/AuthModalScreen.ts#L211) | - |
| `AuthModalScreen.destroy` | `method` | [`game/src/ui/screens/Auth/AuthModalScreen.ts:226`](../../game/src/ui/screens/Auth/AuthModalScreen.ts#L226) | - |
| `AuthModalScreen.getTemplate` | `method` | [`game/src/ui/screens/Auth/AuthModalScreen.ts:33`](../../game/src/ui/screens/Auth/AuthModalScreen.ts#L33) | - |
| `AuthModalScreen.onHide` | `method` | [`game/src/ui/screens/Auth/AuthModalScreen.ts:224`](../../game/src/ui/screens/Auth/AuthModalScreen.ts#L224) | - |
| `AuthModalScreen.onShow` | `method` | [`game/src/ui/screens/Auth/AuthModalScreen.ts:216`](../../game/src/ui/screens/Auth/AuthModalScreen.ts#L216) | - |
| `AuthModalScreen.setStatus` | `method` | [`game/src/ui/screens/Auth/AuthModalScreen.ts:132`](../../game/src/ui/screens/Auth/AuthModalScreen.ts#L132) | - |
| `AuthModalScreen.updateView` | `method` | [`game/src/ui/screens/Auth/AuthModalScreen.ts:146`](../../game/src/ui/screens/Auth/AuthModalScreen.ts#L146) | - |
| `AuthModalScreenOptions` | `interface` | [`game/src/ui/screens/Auth/AuthModalScreen.ts:7`](../../game/src/ui/screens/Auth/AuthModalScreen.ts#L7) | - |
| `AuthType` | `type` | [`game/src/auth/AuthManager.ts:3`](../../game/src/auth/AuthManager.ts#L3) | - |
| `AuthUser` | `interface` | [`game/src/auth/AuthManager.ts:5`](../../game/src/auth/AuthManager.ts#L5) | - |
| `AVAILABLE_SLOT_IDS` | `const` | [`game/src/shared/types/network.ts:171`](../../game/src/shared/types/network.ts#L171) | - |
| `BalanceCategory` | `type` | [`game/src/balance/BalanceTypes.ts:1`](../../game/src/balance/BalanceTypes.ts#L1) | - |
| `BalanceChangeEvent` | `interface` | [`game/src/balance/BalanceTypes.ts:136`](../../game/src/balance/BalanceTypes.ts#L136) | - |
| `BalanceManager` | `const` | [`game/src/balance/BalanceManager.ts:310`](../../game/src/balance/BalanceManager.ts#L310) | - |
| `BalanceRow` | `interface` | [`game/src/balance/BalanceTypes.ts:124`](../../game/src/balance/BalanceTypes.ts#L124) | - |
| `BalanceState` | `class` | [`admin/src/state/balanceState.ts:6`](../../admin/src/state/balanceState.ts#L6) | - |
| `BalanceState.applyFieldChange` | `method` | [`admin/src/state/balanceState.ts:40`](../../admin/src/state/balanceState.ts#L40) | - |
| `BalanceState.checkAllCategoryChanges` | `method` | [`admin/src/state/balanceState.ts:57`](../../admin/src/state/balanceState.ts#L57) | - |
| `BalanceState.discardDraft` | `method` | [`admin/src/state/balanceState.ts:105`](../../admin/src/state/balanceState.ts#L105) | - |
| `BalanceState.getDiffList` | `method` | [`admin/src/state/balanceState.ts:145`](../../admin/src/state/balanceState.ts#L145) | - |
| `BalanceState.getModifiedCount` | `method` | [`admin/src/state/balanceState.ts:141`](../../admin/src/state/balanceState.ts#L141) | - |
| `BalanceState.getOriginalValue` | `method` | [`admin/src/state/balanceState.ts:30`](../../admin/src/state/balanceState.ts#L30) | - |
| `BalanceState.mergeRemoteRow` | `method` | [`admin/src/state/balanceState.ts:110`](../../admin/src/state/balanceState.ts#L110) | - |
| `BalanceState.resetSingleItem` | `method` | [`admin/src/state/balanceState.ts:87`](../../admin/src/state/balanceState.ts#L87) | - |
| `BATTLE_PASS_REWARDS` | `const` | [`game/src/core/BattlePassManager.ts:40`](../../game/src/core/BattlePassManager.ts#L40) | - |
| `BattlePassData` | `interface` | [`game/src/core/ProgressionManager.ts:22`](../../game/src/core/ProgressionManager.ts#L22) | - |
| `BattlePassGameOverResult` | `interface` | [`game/src/ui/screens/GameOver/GameOverScreen.ts:23`](../../game/src/ui/screens/GameOver/GameOverScreen.ts#L23) | - |
| `BattlePassManager` | `class` | [`game/src/core/BattlePassManager.ts:155`](../../game/src/core/BattlePassManager.ts#L155) | - |
| `BattlePassManager.addPointsForSurvival` | `method` | [`game/src/core/BattlePassManager.ts:302`](../../game/src/core/BattlePassManager.ts#L302) | - |
| `BattlePassManager.canClaim` | `method` | [`game/src/core/BattlePassManager.ts:230`](../../game/src/core/BattlePassManager.ts#L230) | - |
| `BattlePassManager.claimAllAvailable` | `method` | [`game/src/core/BattlePassManager.ts:270`](../../game/src/core/BattlePassManager.ts#L270) | - |
| `BattlePassManager.claimReward` | `method` | [`game/src/core/BattlePassManager.ts:242`](../../game/src/core/BattlePassManager.ts#L242) | - |
| `BattlePassManager.getAllRewards` | `method` | [`game/src/core/BattlePassManager.ts:238`](../../game/src/core/BattlePassManager.ts#L238) | - |
| `BattlePassManager.getClaimedLevels` | `method` | [`game/src/core/BattlePassManager.ts:218`](../../game/src/core/BattlePassManager.ts#L218) | - |
| `BattlePassManager.getData` | `method` | [`game/src/core/BattlePassManager.ts:171`](../../game/src/core/BattlePassManager.ts#L171) | - |
| `BattlePassManager.getInstance` | `method` | [`game/src/core/BattlePassManager.ts:161`](../../game/src/core/BattlePassManager.ts#L161) | - |
| `BattlePassManager.getLevel` | `method` | [`game/src/core/BattlePassManager.ts:198`](../../game/src/core/BattlePassManager.ts#L198) | - |
| `BattlePassManager.getPoints` | `method` | [`game/src/core/BattlePassManager.ts:194`](../../game/src/core/BattlePassManager.ts#L194) | - |
| `BattlePassManager.getPointsInCurrentLevel` | `method` | [`game/src/core/BattlePassManager.ts:204`](../../game/src/core/BattlePassManager.ts#L204) | - |
| `BattlePassManager.getProgressPercent` | `method` | [`game/src/core/BattlePassManager.ts:212`](../../game/src/core/BattlePassManager.ts#L212) | - |
| `BattlePassManager.getRewardForLevel` | `method` | [`game/src/core/BattlePassManager.ts:234`](../../game/src/core/BattlePassManager.ts#L234) | - |
| `BattlePassManager.getRewardIconUrl` | `method` | [`game/src/core/BattlePassManager.ts:345`](../../game/src/core/BattlePassManager.ts#L345) | - |
| `BattlePassManager.isLevelClaimed` | `method` | [`game/src/core/BattlePassManager.ts:226`](../../game/src/core/BattlePassManager.ts#L226) | - |
| `BattlePassManager.isLevelUnlocked` | `method` | [`game/src/core/BattlePassManager.ts:222`](../../game/src/core/BattlePassManager.ts#L222) | - |
| `BattlePassManager.notifyChanged` | `method` | [`game/src/core/BattlePassManager.ts:335`](../../game/src/core/BattlePassManager.ts#L335) | - |
| `BattlePassManager.reset` | `method` | [`game/src/core/BattlePassManager.ts:183`](../../game/src/core/BattlePassManager.ts#L183) | - |
| `BattlePassReward` | `interface` | [`game/src/core/BattlePassManager.ts:4`](../../game/src/core/BattlePassManager.ts#L4) | - |
| `BattlePassUI` | `class` | [`game/src/ui/modules/BattlePassUI.ts:29`](../../game/src/ui/modules/BattlePassUI.ts#L29) | - |
| `BattlePassUI.bindListeners` | `method` | [`game/src/ui/modules/BattlePassUI.ts:37`](../../game/src/ui/modules/BattlePassUI.ts#L37) | - |
| `BattlePassUI.handleClaimAllBattlePass` | `method` | [`game/src/ui/modules/BattlePassUI.ts:258`](../../game/src/ui/modules/BattlePassUI.ts#L258) | - |
| `BattlePassUI.hideBattlePassModal` | `method` | [`game/src/ui/modules/BattlePassUI.ts:253`](../../game/src/ui/modules/BattlePassUI.ts#L253) | - |
| `BattlePassUI.openBattlePassModal` | `method` | [`game/src/ui/modules/BattlePassUI.ts:244`](../../game/src/ui/modules/BattlePassUI.ts#L244) | - |
| `BattlePassUI.renderBattlePassModal` | `method` | [`game/src/ui/modules/BattlePassUI.ts:154`](../../game/src/ui/modules/BattlePassUI.ts#L154) | - |
| `BattlePassUI.updateMainMenuBattlePass` | `method` | [`game/src/ui/modules/BattlePassUI.ts:61`](../../game/src/ui/modules/BattlePassUI.ts#L61) | - |
| `BattlePassUIContext` | `interface` | [`game/src/ui/modules/BattlePassUI.ts:10`](../../game/src/ui/modules/BattlePassUI.ts#L10) | - |
| `BIOME_GRADE_CHANCES` | `const` | [`game/src/combat/WeaponGrades.ts:74`](../../game/src/combat/WeaponGrades.ts#L74) | - |
| `BIOME_TREE_CONFIGS` | `const` | [`game/src/world/TreeManager.ts:32`](../../game/src/world/TreeManager.ts#L32) | - |
| `BiomeConfig` | `interface` | [`game/src/world/BiomeManager.ts:28`](../../game/src/world/BiomeManager.ts#L28) | - |
| `BiomeGradeChances` | `interface` | [`game/src/combat/WeaponGrades.ts:67`](../../game/src/combat/WeaponGrades.ts#L67) | - |
| `BiomeLightingConfig` | `interface` | [`game/src/world/BiomeManager.ts:18`](../../game/src/world/BiomeManager.ts#L18) | - |
| `BiomeManager` | `class` | [`game/src/world/BiomeManager.ts:220`](../../game/src/world/BiomeManager.ts#L220) | - |
| `BiomeManager.advanceStage` | `method` | [`game/src/world/BiomeManager.ts:363`](../../game/src/world/BiomeManager.ts#L363) | Advances to the next stage/biome. Caps at stage 4 (final stage). |
| `BiomeManager.applyBiomeToScene` | `method` | [`game/src/world/BiomeManager.ts:290`](../../game/src/world/BiomeManager.ts#L290) | Applies the current biome's atmosphere, lighting, fog, textures and materia... |
| `BiomeManager.getBiomeTexture` | `method` | [`game/src/world/BiomeManager.ts:257`](../../game/src/world/BiomeManager.ts#L257) | - |
| `BiomeManager.initRunBiomes` | `method` | [`game/src/world/BiomeManager.ts:231`](../../game/src/world/BiomeManager.ts#L231) | - |
| `BiomeManager.isFinalStage` | `method` | [`game/src/world/BiomeManager.ts:283`](../../game/src/world/BiomeManager.ts#L283) | - |
| `BiomeManager.reset` | `method` | [`game/src/world/BiomeManager.ts:373`](../../game/src/world/BiomeManager.ts#L373) | - |
| `BiomeManager.setStage` | `method` | [`game/src/world/BiomeManager.ts:351`](../../game/src/world/BiomeManager.ts#L351) | Sets the current stage explicitly (1-based index, up to 4 stages). |
| `BIOMES` | `const` | [`game/src/world/BiomeManager.ts:49`](../../game/src/world/BiomeManager.ts#L49) | - |
| `BiomeTextureElement` | `type` | [`game/src/utils/AssetResolver.ts:4`](../../game/src/utils/AssetResolver.ts#L4) | - |
| `BleedStack` | `interface` | [`game/src/entities/Enemy.ts:41`](../../game/src/entities/Enemy.ts#L41) | - |
| `BOSS_ITEMS` | `const` | [`game/src/items/RiftItemSystem.ts:270`](../../game/src/items/RiftItemSystem.ts#L270) | - |
| `BossAnimState` | `type` | [`game/src/entities/Enemy.ts:19`](../../game/src/entities/Enemy.ts#L19) | - |
| `BossBalanceConfig` | `interface` | [`game/src/balance/BalanceTypes.ts:60`](../../game/src/balance/BalanceTypes.ts#L60) | - |
| `BossHpPayload` | `interface` | [`game/src/mechanics/events/GameEventBus.ts:40`](../../game/src/mechanics/events/GameEventBus.ts#L40) | - |
| `BossSpawnPayload` | `interface` | [`game/src/mechanics/events/GameEventBus.ts:35`](../../game/src/mechanics/events/GameEventBus.ts#L35) | - |
| `BossTextures` | `interface` | [`game/src/core/TextureManager.ts:34`](../../game/src/core/TextureManager.ts#L34) | - |
| `BowWeapon` | `class` | [`game/src/combat/weapons/RangedWeapons.ts:13`](../../game/src/combat/weapons/RangedWeapons.ts#L13) | Hunting Bow (Охотничий Лук) Long-range sharp piercing arrows cutting throug... |
| `BowWeapon.getNextUpgradeDescription` | `method` | [`game/src/combat/weapons/RangedWeapons.ts:100`](../../game/src/combat/weapons/RangedWeapons.ts#L100) | - |
| `BowWeapon.setAttackCallback` | `method` | [`game/src/combat/weapons/RangedWeapons.ts:37`](../../game/src/combat/weapons/RangedWeapons.ts#L37) | - |
| `BowWeapon.upgrade` | `method` | [`game/src/combat/weapons/RangedWeapons.ts:93`](../../game/src/combat/weapons/RangedWeapons.ts#L93) | - |
| `BP_MAX_LEVEL` | `const` | [`game/src/core/BattlePassManager.ts:17`](../../game/src/core/BattlePassManager.ts#L17) | - |
| `BP_MAX_POINTS` | `const` | [`game/src/core/BattlePassManager.ts:19`](../../game/src/core/BattlePassManager.ts#L19) | - |
| `BP_POINTS_PER_LEVEL` | `const` | [`game/src/core/BattlePassManager.ts:18`](../../game/src/core/BattlePassManager.ts#L18) | - |
| `BP_SEASON_ID` | `const` | [`game/src/core/BattlePassManager.ts:14`](../../game/src/core/BattlePassManager.ts#L14) | - |
| `BP_SEASON_SUBTITLE` | `const` | [`game/src/core/BattlePassManager.ts:16`](../../game/src/core/BattlePassManager.ts#L16) | - |
| `BP_SEASON_TITLE` | `const` | [`game/src/core/BattlePassManager.ts:15`](../../game/src/core/BattlePassManager.ts#L15) | - |
| `BUFF_TYPES` | `const` | [`game/src/shared/types/registry.ts:46`](../../game/src/shared/types/registry.ts#L46) | - |
| `BuffType` | `type` | [`game/src/shared/types/entities.ts:12`](../../game/src/shared/types/entities.ts#L12) | - |
| `calculateBattlePassPoints` | `function` | [`game/src/core/BattlePassManager.ts:30`](../../game/src/core/BattlePassManager.ts#L30) | Calculates Battle Pass experience points awarded for a run based on surviva... |
| `CalculatedPlayerStats` | `interface` | [`game/src/mechanics/player/PlayerStats.ts:13`](../../game/src/mechanics/player/PlayerStats.ts#L13) | - |
| `canAcquireInvokerWeapon` | `function` | [`game/src/shared/InvokerSpells.ts:160`](../../game/src/shared/InvokerSpells.ts#L160) | Separate spell weapons require Invoke in the same inventory, and hero must ... |
| `canCharacterAcquireWeapon` | `function` | [`game/src/shared/UniqueCharacters.ts:122`](../../game/src/shared/UniqueCharacters.ts#L122) | The single source of truth for whether a hero is allowed to acquire or upgr... |
| `canRerollWeaponOptions` | `function` | [`game/src/ui/selectWeaponUpgradeOptions.ts:29`](../../game/src/ui/selectWeaponUpgradeOptions.ts#L29) | Determines whether the current weapon selection qualifies for a reroll. Per... |
| `CenterSquareMapRenderContext` | `interface` | [`game/src/ui/MapCenterSquareRenderer.ts:10`](../../game/src/ui/MapCenterSquareRenderer.ts#L10) | - |
| `ChakramWeapon` | `class` | [`game/src/combat/weapons/RangedWeapons.ts:126`](../../game/src/combat/weapons/RangedWeapons.ts#L126) | Chakram (Танцующий Чакрам) Boomerang spinning blades returning to player |
| `ChakramWeapon.getNextUpgradeDescription` | `method` | [`game/src/combat/weapons/RangedWeapons.ts:220`](../../game/src/combat/weapons/RangedWeapons.ts#L220) | - |
| `ChakramWeapon.setAttackCallback` | `method` | [`game/src/combat/weapons/RangedWeapons.ts:151`](../../game/src/combat/weapons/RangedWeapons.ts#L151) | - |
| `ChakramWeapon.upgrade` | `method` | [`game/src/combat/weapons/RangedWeapons.ts:213`](../../game/src/combat/weapons/RangedWeapons.ts#L213) | - |
| `ChapterDef` | `interface` | [`game/src/core/ChapterQuestsConfig.ts:17`](../../game/src/core/ChapterQuestsConfig.ts#L17) | - |
| `ChapterQuestDef` | `interface` | [`game/src/core/ChapterQuestsConfig.ts:3`](../../game/src/core/ChapterQuestsConfig.ts#L3) | - |
| `ChapterQuestItem` | `interface` | [`game/src/ui/screens/Quests/QuestsScreen.ts:9`](../../game/src/ui/screens/Quests/QuestsScreen.ts#L9) | - |
| `ChapterQuestProgress` | `interface` | [`game/src/core/ProgressionManager.ts:28`](../../game/src/core/ProgressionManager.ts#L28) | - |
| `CHAPTERS_CONFIG` | `const` | [`game/src/core/ChapterQuestsConfig.ts:25`](../../game/src/core/ChapterQuestsConfig.ts#L25) | - |
| `CharacterAnimator` | `class` | [`game/src/entities/CharacterAnimator.ts:102`](../../game/src/entities/CharacterAnimator.ts#L102) | Modular Character Animator Handles directional sprite state machines, UV re... |
| `CharacterAnimator.getActiveTexture` | `method` | [`game/src/entities/CharacterAnimator.ts:145`](../../game/src/entities/CharacterAnimator.ts#L145) | - |
| `CharacterAnimator.setDirection` | `method` | [`game/src/entities/CharacterAnimator.ts:125`](../../game/src/entities/CharacterAnimator.ts#L125) | - |
| `CharacterAnimator.setState` | `method` | [`game/src/entities/CharacterAnimator.ts:138`](../../game/src/entities/CharacterAnimator.ts#L138) | - |
| `CharacterAnimator.triggerAttack` | `method` | [`game/src/entities/CharacterAnimator.ts:129`](../../game/src/entities/CharacterAnimator.ts#L129) | - |
| `CharacterAnimLayout` | `interface` | [`game/src/entities/CharacterAnimator.ts:8`](../../game/src/entities/CharacterAnimator.ts#L8) | Grid layout specification for directional spritesheets. |
| `CharacterAnimStateConfig` | `interface` | [`game/src/entities/CharacterAnimator.ts:17`](../../game/src/entities/CharacterAnimator.ts#L17) | State configuration for animation timing and playback. |
| `CharacterPreviewRenderer` | `class` | [`game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts:8`](../../game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts#L8) | Renders an animated 2.5D chibi hero preview on the character selection dais... |
| `CharacterPreviewRenderer.dispose` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts:118`](../../game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts#L118) | - |
| `CharacterPreviewRenderer.loadHero` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts:40`](../../game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts#L40) | - |
| `CharacterPreviewRenderer.preloadHeroIdleImages` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts:31`](../../game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts#L31) | - |
| `CharacterPreviewRenderer.renderCanvasFrame` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts:75`](../../game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts#L75) | - |
| `CharacterPreviewRenderer.setCanvas` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts:25`](../../game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts#L25) | - |
| `CharacterPreviewRenderer.startAnimation` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts:52`](../../game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts#L52) | - |
| `CharacterPreviewRenderer.stopAnimation` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts:68`](../../game/src/ui/screens/CharacterSelect/CharacterPreviewRenderer.ts#L68) | - |
| `CHARACTERS` | `const` | [`game/src/shared/types/registry.ts:15`](../../game/src/shared/types/registry.ts#L15) | - |
| `CharacterSelectScreen` | `class` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:39`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L39) | Modular Character Selection Screen (Rift ARPG UI). Manages carousel track, ... |
| `CharacterSelectScreen.attemptLaunch` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:274`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L274) | - |
| `CharacterSelectScreen.bindElements` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:66`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L66) | - |
| `CharacterSelectScreen.bindEvents` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:71`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L71) | - |
| `CharacterSelectScreen.getSelectedHero` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:292`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L292) | - |
| `CharacterSelectScreen.getStatCeilings` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:266`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L266) | - |
| `CharacterSelectScreen.getTemplate` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:61`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L61) | - |
| `CharacterSelectScreen.onHide` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:151`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L151) | - |
| `CharacterSelectScreen.onShow` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:145`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L145) | - |
| `CharacterSelectScreen.selectHero` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:163`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L163) | - |
| `CharacterSelectScreen.selectNextHero` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:139`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L139) | - |
| `CharacterSelectScreen.selectPreviousHero` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:133`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L133) | - |
| `CharacterSelectScreen.startAnimation` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:155`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L155) | - |
| `CharacterSelectScreen.stopAnimation` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:159`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L159) | - |
| `CharacterSelectScreen.updateInspectorPanel` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:209`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L209) | - |
| `CharacterSelectScreen.updateLockStates` | `method` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:186`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L186) | - |
| `CharacterSelectScreenOptions` | `interface` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:22`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L22) | - |
| `CharacterSelectUI` | `class` | [`game/src/ui/modules/CharacterSelectUI.ts:11`](../../game/src/ui/modules/CharacterSelectUI.ts#L11) | - |
| `CharacterSelectUIOptions` | `type` | [`game/src/ui/modules/CharacterSelectUI.ts:6`](../../game/src/ui/modules/CharacterSelectUI.ts#L6) | - |
| `CharacterType` | `type` | [`game/src/shared/types/entities.ts:6`](../../game/src/shared/types/entities.ts#L6) | Shared Entity Types & Definitions Platform-agnostic core types used across ... |
| `ChartOptions` | `interface` | [`admin/src/chartUtils.ts:15`](../../admin/src/chartUtils.ts#L15) | - |
| `ChartSeries` | `interface` | [`admin/src/chartUtils.ts:6`](../../admin/src/chartUtils.ts#L6) | Lightweight SVG Vector Chart Engine for Admin Panel Zero external dependenc... |
| `CHEST_TIERS` | `const` | [`game/src/shared/types/registry.ts:28`](../../game/src/shared/types/registry.ts#L28) | - |
| `ChestInstance` | `interface` | [`game/src/world/ChestManager.ts:27`](../../game/src/world/ChestManager.ts#L27) | - |
| `ChestManager` | `class` | [`game/src/world/ChestManager.ts:44`](../../game/src/world/ChestManager.ts#L44) | - |
| `ChestManager.clear` | `method` | [`game/src/world/ChestManager.ts:383`](../../game/src/world/ChestManager.ts#L383) | - |
| `ChestManager.getChestGeometry` | `method` | [`game/src/world/ChestManager.ts:57`](../../game/src/world/ChestManager.ts#L57) | - |
| `ChestManager.getSheetTexture` | `method` | [`game/src/world/ChestManager.ts:67`](../../game/src/world/ChestManager.ts#L67) | - |
| `ChestManager.getSnapshot` | `method` | [`game/src/world/ChestManager.ts:391`](../../game/src/world/ChestManager.ts#L391) | - |
| `ChestManager.update` | `method` | [`game/src/world/ChestManager.ts:289`](../../game/src/world/ChestManager.ts#L289) | Updates floating chest hologram visuals, pulse aura, and opening animations... |
| `ChestSyncInfo` | `interface` | [`game/src/shared/types/network.ts:188`](../../game/src/shared/types/network.ts#L188) | - |
| `ChestTier` | `type` | [`game/src/shared/types/registry.ts:29`](../../game/src/shared/types/registry.ts#L29) | - |
| `ChestTier` | `type` | [`game/src/world/ChestManager.ts:25`](../../game/src/world/ChestManager.ts#L25) | - |
| `ChunkManager` | `class` | [`game/src/world/ChunkManager.ts:28`](../../game/src/world/ChunkManager.ts#L28) | - |
| `ChunkManager.clear` | `method` | [`game/src/world/ChunkManager.ts:290`](../../game/src/world/ChunkManager.ts#L290) | Deep cleanup of all chunk geometries and entities. |
| `ChunkManager.cull` | `method` | [`game/src/world/ChunkManager.ts:278`](../../game/src/world/ChunkManager.ts#L278) | Frustum Culling: Hides chunks that are completely outside the camera view. ... |
| `ChunkManager.getElevation` | `method` | [`game/src/world/ChunkManager.ts:60`](../../game/src/world/ChunkManager.ts#L60) | Returns terrain elevation Y at world coordinate (x, z) (always 0 for 2D/2.5... |
| `ChunkManager.getNormal` | `method` | [`game/src/world/ChunkManager.ts:74`](../../game/src/world/ChunkManager.ts#L74) | Returns surface normal vector at world coordinate (x, z). |
| `ChunkManager.getSlowFactor` | `method` | [`game/src/world/ChunkManager.ts:67`](../../game/src/world/ChunkManager.ts#L67) | Returns rough terrain slow multiplier (0.65 on dunes/rough zones, 1.0 norma... |
| `ChunkManager.update` | `method` | [`game/src/world/ChunkManager.ts:270`](../../game/src/world/ChunkManager.ts#L270) | With the fixed preloaded map, update does not need to stream or unload chun... |
| `ClientSyncMessage` | `interface` | [`game/src/shared/types/network.ts:226`](../../game/src/shared/types/network.ts#L226) | - |
| `CloudSyncManager` | `class` | [`game/src/meta/CloudSyncManager.ts:24`](../../game/src/meta/CloudSyncManager.ts#L24) | Cloud Synchronization Manager for The Rift. Bridges local client storage (M... |
| `CloudSyncManager.deleteAccount` | `method` | [`game/src/meta/CloudSyncManager.ts:312`](../../game/src/meta/CloudSyncManager.ts#L312) | Permanently deletes user profile data and unlinks account. |
| `CloudSyncManager.getInstance` | `method` | [`game/src/meta/CloudSyncManager.ts:34`](../../game/src/meta/CloudSyncManager.ts#L34) | - |
| `CloudSyncManager.getStatus` | `method` | [`game/src/meta/CloudSyncManager.ts:72`](../../game/src/meta/CloudSyncManager.ts#L72) | - |
| `CloudSyncManager.init` | `method` | [`game/src/meta/CloudSyncManager.ts:41`](../../game/src/meta/CloudSyncManager.ts#L41) | - |
| `CloudSyncManager.onStatusChanged` | `method` | [`game/src/meta/CloudSyncManager.ts:76`](../../game/src/meta/CloudSyncManager.ts#L76) | - |
| `CloudSyncManager.resetCloudProgress` | `method` | [`game/src/meta/CloudSyncManager.ts:269`](../../game/src/meta/CloudSyncManager.ts#L269) | Resets all game progress in local memory and in the cloud for the current a... |
| `CloudSyncManager.saveToCloud` | `method` | [`game/src/meta/CloudSyncManager.ts:222`](../../game/src/meta/CloudSyncManager.ts#L222) | Directly uploads current local state to player_profiles in Supabase. |
| `CloudSyncManager.scheduleSave` | `method` | [`game/src/meta/CloudSyncManager.ts:202`](../../game/src/meta/CloudSyncManager.ts#L202) | Debounced cloud save after any local mutation. |
| `CloudSyncManager.setStatus` | `method` | [`game/src/meta/CloudSyncManager.ts:83`](../../game/src/meta/CloudSyncManager.ts#L83) | - |
| `CloudSyncManager.syncOnLogin` | `method` | [`game/src/meta/CloudSyncManager.ts:98`](../../game/src/meta/CloudSyncManager.ts#L98) | Called when a player logs in via Google/Email. Pulls existing cloud save or... |
| `CombatDirector` | `class` | [`game/src/combat/CombatDirector.ts:18`](../../game/src/combat/CombatDirector.ts#L18) | - |
| `CombatDirector.clear` | `method` | [`game/src/combat/CombatDirector.ts:780`](../../game/src/combat/CombatDirector.ts#L780) | - |
| `CombatDirector.onLocalPlayerEnemyKill` | `method` | [`game/src/combat/CombatDirector.ts:304`](../../game/src/combat/CombatDirector.ts#L304) | - |
| `CombatDirector.spawnChronosShockwave` | `method` | [`game/src/combat/CombatDirector.ts:394`](../../game/src/combat/CombatDirector.ts#L394) | - |
| `CombatDirector.spawnCosmeticShot` | `method` | [`game/src/combat/CombatDirector.ts:143`](../../game/src/combat/CombatDirector.ts#L143) | - |
| `CombatDirector.spawnFlameTrailPatch` | `method` | [`game/src/combat/CombatDirector.ts:419`](../../game/src/combat/CombatDirector.ts#L419) | - |
| `CombatDirector.updateItemProcs` | `method` | [`game/src/combat/CombatDirector.ts:648`](../../game/src/combat/CombatDirector.ts#L648) | - |
| `CombatDirector.updateProjectiles` | `method` | [`game/src/combat/CombatDirector.ts:448`](../../game/src/combat/CombatDirector.ts#L448) | - |
| `CombatDirector.updateProjectileVisuals` | `method` | [`game/src/combat/CombatDirector.ts:637`](../../game/src/combat/CombatDirector.ts#L637) | - |
| `COMMON_ITEMS` | `const` | [`game/src/items/RiftItemSystem.ts:244`](../../game/src/items/RiftItemSystem.ts#L244) | - |
| `createInvokerBuff` | `function` | [`game/src/shared/InvokerSpells.ts:273`](../../game/src/shared/InvokerSpells.ts#L273) | - |
| `createSimWeaponById` | `function` | [`game/src/sim/weapons/SimWeaponFactory.ts:55`](../../game/src/sim/weapons/SimWeaponFactory.ts#L55) | Creates weapon by ID |
| `createSimWeaponForCharacter` | `function` | [`game/src/sim/weapons/SimWeaponFactory.ts:27`](../../game/src/sim/weapons/SimWeaponFactory.ts#L27) | Creates the starting weapon for character selection. |
| `DamageDealtEvent` | `interface` | [`game/src/shared/types/network.ts:77`](../../game/src/shared/types/network.ts#L77) | - |
| `DamageNumberManager` | `class` | [`game/src/combat/DamageNumberManager.ts:3`](../../game/src/combat/DamageNumberManager.ts#L3) | - |
| `DamageNumberManager.spawnLevelUp` | `method` | [`game/src/combat/DamageNumberManager.ts:152`](../../game/src/combat/DamageNumberManager.ts#L152) | - |
| `DamageNumberManager.spawnPassiveBuff` | `method` | [`game/src/combat/DamageNumberManager.ts:178`](../../game/src/combat/DamageNumberManager.ts#L178) | - |
| `DamageNumberManager.spawnXp` | `method` | [`game/src/combat/DamageNumberManager.ts:114`](../../game/src/combat/DamageNumberManager.ts#L114) | - |
| `DebugHUD` | `class` | [`game/src/ui/DebugHUD.ts:19`](../../game/src/ui/DebugHUD.ts#L19) | - |
| `DebugHUD.formatBandwidth` | `method` | [`game/src/ui/DebugHUD.ts:78`](../../game/src/ui/DebugHUD.ts#L78) | - |
| `DebugHUD.formatEmpty` | `method` | [`game/src/ui/DebugHUD.ts:74`](../../game/src/ui/DebugHUD.ts#L74) | - |
| `DebugHUD.formatHeader` | `method` | [`game/src/ui/DebugHUD.ts:69`](../../game/src/ui/DebugHUD.ts#L69) | - |
| `DebugHUD.formatRow` | `method` | [`game/src/ui/DebugHUD.ts:63`](../../game/src/ui/DebugHUD.ts#L63) | - |
| `DebugHUD.getIsOpen` | `method` | [`game/src/ui/DebugHUD.ts:59`](../../game/src/ui/DebugHUD.ts#L59) | - |
| `DebugHUD.hide` | `method` | [`game/src/ui/DebugHUD.ts:54`](../../game/src/ui/DebugHUD.ts#L54) | - |
| `DebugHUD.show` | `method` | [`game/src/ui/DebugHUD.ts:49`](../../game/src/ui/DebugHUD.ts#L49) | - |
| `DebugHUD.toggle` | `method` | [`game/src/ui/DebugHUD.ts:39`](../../game/src/ui/DebugHUD.ts#L39) | - |
| `DebugHUD.update` | `method` | [`game/src/ui/DebugHUD.ts:83`](../../game/src/ui/DebugHUD.ts#L83) | - |
| `DebugHudStats` | `interface` | [`game/src/ui/DebugHUD.ts:1`](../../game/src/ui/DebugHUD.ts#L1) | - |
| `DedicatedGameServer` | `class` | [`server/dedicatedServer.ts:33`](../../server/dedicatedServer.ts#L33) | - |
| `DedicatedGameServer.broadcast` | `method` | [`server/dedicatedServer.ts:252`](../../server/dedicatedServer.ts#L252) | Broadcasts payload to all connected WebSocket clients |
| `DedicatedGameServer.broadcastLobbyUpdate` | `method` | [`server/dedicatedServer.ts:168`](../../server/dedicatedServer.ts#L168) | - |
| `DedicatedGameServer.handleClientMessage` | `method` | [`server/dedicatedServer.ts:105`](../../server/dedicatedServer.ts#L105) | - |
| `DedicatedGameServer.handleClientSocket` | `method` | [`server/dedicatedServer.ts:77`](../../server/dedicatedServer.ts#L77) | - |
| `DedicatedGameServer.listen` | `method` | [`server/dedicatedServer.ts:62`](../../server/dedicatedServer.ts#L62) | Starts listening for client WebSocket connections |
| `DedicatedGameServer.onPlayerJoin` | `method` | [`server/dedicatedServer.ts:245`](../../server/dedicatedServer.ts#L245) | Handles player connection (programmatic) |
| `DedicatedGameServer.start` | `method` | [`server/dedicatedServer.ts:186`](../../server/dedicatedServer.ts#L186) | Starts the authoritative 30Hz tick simulation loop |
| `DedicatedGameServer.stop` | `method` | [`server/dedicatedServer.ts:229`](../../server/dedicatedServer.ts#L229) | Stops simulation and socket server |
| `DedicatedGameServer.tick` | `method` | [`server/dedicatedServer.ts:201`](../../server/dedicatedServer.ts#L201) | Authoritative tick: updates mobs, bullets, collisions, drops, altars, reviv... |
| `DedicatedServerOptions` | `interface` | [`server/dedicatedServer.ts:18`](../../server/dedicatedServer.ts#L18) | - |
| `DEFAULT_BALANCE` | `const` | [`game/src/balance/defaultBalance.ts:4`](../../game/src/balance/defaultBalance.ts#L4) | - |
| `DetailedPlayerResult` | `interface` | [`game/src/ui/screens/GameOver/GameOverScreen.ts:14`](../../game/src/ui/screens/GameOver/GameOverScreen.ts#L14) | - |
| `DevManager` | `class` | [`game/src/ui/DevManager.ts:8`](../../game/src/ui/DevManager.ts#L8) | - |
| `DevManager.bindEvents` | `method` | [`game/src/ui/DevManager.ts:83`](../../game/src/ui/DevManager.ts#L83) | - |
| `DevManager.getIsOpen` | `method` | [`game/src/ui/DevManager.ts:418`](../../game/src/ui/DevManager.ts#L418) | - |
| `DevManager.reset` | `method` | [`game/src/ui/DevManager.ts:446`](../../game/src/ui/DevManager.ts#L446) | Resets all dev mode cheats and restores default session state |
| `DevManager.setCurrentSeed` | `method` | [`game/src/ui/DevManager.ts:465`](../../game/src/ui/DevManager.ts#L465) | Updates the seed input field with the current active world seed |
| `DevManager.setPauseState` | `method` | [`game/src/ui/DevManager.ts:393`](../../game/src/ui/DevManager.ts#L393) | - |
| `DevManager.toggle` | `method` | [`game/src/ui/DevManager.ts:399`](../../game/src/ui/DevManager.ts#L399) | - |
| `DevManager.updateCoopAccess` | `method` | [`game/src/ui/DevManager.ts:371`](../../game/src/ui/DevManager.ts#L371) | - |
| `DevManager.updateStatusBadge` | `method` | [`game/src/ui/DevManager.ts:361`](../../game/src/ui/DevManager.ts#L361) | - |
| `DevManager.updateTelemetry` | `method` | [`game/src/ui/DevManager.ts:422`](../../game/src/ui/DevManager.ts#L422) | - |
| `DIFFICULTY_TIERS` | `const` | [`game/src/director/DifficultyDirector.ts:8`](../../game/src/director/DifficultyDirector.ts#L8) | - |
| `DifficultyDirector` | `class` | [`game/src/director/DifficultyDirector.ts:22`](../../game/src/director/DifficultyDirector.ts#L22) | - |
| `DifficultyDirector.getBiomeOverstayMultiplier` | `method` | [`game/src/director/DifficultyDirector.ts:66`](../../game/src/director/DifficultyDirector.ts#L66) | Biome Overstay Multiplier: if players stay longer than 5 minutes (300s) on ... |
| `DifficultyDirector.getCurrentTier` | `method` | [`game/src/director/DifficultyDirector.ts:26`](../../game/src/director/DifficultyDirector.ts#L26) | Returns the current difficulty tier definition based on elapsed game time (... |
| `DifficultyDirector.getDifficultyCoefficient` | `method` | [`game/src/director/DifficultyDirector.ts:53`](../../game/src/director/DifficultyDirector.ts#L53) | Computes the global difficulty coefficient D(t, players, stage). Scales inf... |
| `DifficultyDirector.getEliteSpawnChance` | `method` | [`game/src/director/DifficultyDirector.ts:97`](../../game/src/director/DifficultyDirector.ts#L97) | Probability of an enemy spawning as an Elite variant (0% up to 35% before 1... |
| `DifficultyDirector.getScaledChestCost` | `method` | [`game/src/director/DifficultyDirector.ts:88`](../../game/src/director/DifficultyDirector.ts#L88) | Computes dynamic chest cost scaled by time and stage. |
| `DifficultyDirector.getTierProgress` | `method` | [`game/src/director/DifficultyDirector.ts:38`](../../game/src/director/DifficultyDirector.ts#L38) | Returns progress fraction [0..1] towards the next difficulty tier. |
| `DifficultyTier` | `interface` | [`game/src/director/DifficultyDirector.ts:1`](../../game/src/director/DifficultyDirector.ts#L1) | - |
| `DirectionalTextures` | `interface` | [`game/src/core/TextureManager.ts:19`](../../game/src/core/TextureManager.ts#L19) | - |
| `DIRECTIONS` | `const` | [`game/src/shared/types/registry.ts:11`](../../game/src/shared/types/registry.ts#L11) | - |
| `DiscoveredAltar` | `interface` | [`game/src/ui/MapManager.ts:13`](../../game/src/ui/MapManager.ts#L13) | - |
| `DropManager` | `class` | [`game/src/drops/DropManager.ts:15`](../../game/src/drops/DropManager.ts#L15) | - |
| `DropManager.applySnapshot` | `method` | [`game/src/drops/DropManager.ts:192`](../../game/src/drops/DropManager.ts#L192) | - |
| `DropManager.attractAllGemsTo` | `method` | [`game/src/drops/DropManager.ts:90`](../../game/src/drops/DropManager.ts#L90) | Attracts all gems and passive crystals across the map directly to the targe... |
| `DropManager.clear` | `method` | [`game/src/drops/DropManager.ts:257`](../../game/src/drops/DropManager.ts#L257) | - |
| `DropManager.collectAllRemainingGems` | `method` | [`game/src/drops/DropManager.ts:242`](../../game/src/drops/DropManager.ts#L242) | Immediately sweeps and collects all remaining gems on the stage, awarding a... |
| `DropManager.condenseXp` | `method` | [`game/src/drops/DropManager.ts:25`](../../game/src/drops/DropManager.ts#L25) | - |
| `DropManager.getSnapshot` | `method` | [`game/src/drops/DropManager.ts:183`](../../game/src/drops/DropManager.ts#L183) | - |
| `DropManager.spawnGem` | `method` | [`game/src/drops/DropManager.ts:68`](../../game/src/drops/DropManager.ts#L68) | - |
| `DropManager.updateVisuals` | `method` | [`game/src/drops/DropManager.ts:224`](../../game/src/drops/DropManager.ts#L224) | Rendering phase: Viewport/Frustum culling across all ground gems. Culled ge... |
| `DropManager.updateWithCollectors` | `method` | [`game/src/drops/DropManager.ts:100`](../../game/src/drops/DropManager.ts#L100) | Updates gem attraction and pickup with multi-player support. Dead/downed pl... |
| `DropManager.vacuumAll` | `method` | [`game/src/drops/DropManager.ts:212`](../../game/src/drops/DropManager.ts#L212) | - |
| `DropSnapshot` | `interface` | [`game/src/shared/types/network.ts:32`](../../game/src/shared/types/network.ts#L32) | - |
| `DualRevolversWeapon` | `const` | [`game/src/combat/weapons/MeleeWeapons.ts:110`](../../game/src/combat/weapons/MeleeWeapons.ts#L110) | Backwards compatibility alias |
| `DualRevolversWeapon` | `type` | [`game/src/combat/weapons/MeleeWeapons.ts:111`](../../game/src/combat/weapons/MeleeWeapons.ts#L111) | - |
| `ENEMIES` | `const` | [`game/src/shared/types/registry.ts:31`](../../game/src/shared/types/registry.ts#L31) | - |
| `Enemy` | `class` | [`game/src/entities/Enemy.ts:48`](../../game/src/entities/Enemy.ts#L48) | - |
| `Enemy.addBleed` | `method` | [`game/src/entities/Enemy.ts:783`](../../game/src/entities/Enemy.ts#L783) | - |
| `Enemy.applyBurn` | `method` | [`game/src/entities/Enemy.ts:139`](../../game/src/entities/Enemy.ts#L139) | - |
| `Enemy.applyShock` | `method` | [`game/src/entities/Enemy.ts:151`](../../game/src/entities/Enemy.ts#L151) | - |
| `Enemy.applySlow` | `method` | [`game/src/entities/Enemy.ts:87`](../../game/src/entities/Enemy.ts#L87) | - |
| `Enemy.applySpellControl` | `method` | [`game/src/entities/Enemy.ts:392`](../../game/src/entities/Enemy.ts#L392) | - |
| `Enemy.destroy` | `method` | [`game/src/entities/Enemy.ts:830`](../../game/src/entities/Enemy.ts#L830) | - |
| `Enemy.freeze` | `method` | [`game/src/entities/Enemy.ts:105`](../../game/src/entities/Enemy.ts#L105) | - |
| `Enemy.knockbackFrom` | `method` | [`game/src/entities/Enemy.ts:167`](../../game/src/entities/Enemy.ts#L167) | - |
| `Enemy.setDirection` | `method` | [`game/src/entities/Enemy.ts:400`](../../game/src/entities/Enemy.ts#L400) | - |
| `Enemy.stun` | `method` | [`game/src/entities/Enemy.ts:120`](../../game/src/entities/Enemy.ts#L120) | - |
| `Enemy.triggerAttack` | `method` | [`game/src/entities/Enemy.ts:411`](../../game/src/entities/Enemy.ts#L411) | - |
| `Enemy.update` | `method` | [`game/src/entities/Enemy.ts:674`](../../game/src/entities/Enemy.ts#L674) | - |
| `Enemy.updateBleed` | `method` | [`game/src/entities/Enemy.ts:791`](../../game/src/entities/Enemy.ts#L791) | - |
| `Enemy.updateBossAnimation` | `method` | [`game/src/entities/Enemy.ts:424`](../../game/src/entities/Enemy.ts#L424) | - |
| `Enemy.updateMonsterAnimation` | `method` | [`game/src/entities/Enemy.ts:468`](../../game/src/entities/Enemy.ts#L468) | - |
| `Enemy.updateSimulation` | `method` | [`game/src/entities/Enemy.ts:516`](../../game/src/entities/Enemy.ts#L516) | Authoritative simulation update: handles movement, knockback, and AI logic.... |
| `Enemy.updateVisuals` | `method` | [`game/src/entities/Enemy.ts:683`](../../game/src/entities/Enemy.ts#L683) | Rendering phase: Viewport/Frustum culling and visual animations. If inFrust... |
| `EnemyAnimState` | `type` | [`game/src/entities/Enemy.ts:18`](../../game/src/entities/Enemy.ts#L18) | - |
| `EnemyConfig` | `interface` | [`game/src/entities/Enemy.ts:24`](../../game/src/entities/Enemy.ts#L24) | - |
| `EnemyManager` | `class` | [`game/src/entities/EnemyManager.ts:20`](../../game/src/entities/EnemyManager.ts#L20) | - |
| `EnemyManager.applySnapshot` | `method` | [`game/src/entities/EnemyManager.ts:933`](../../game/src/entities/EnemyManager.ts#L933) | - |
| `EnemyManager.clear` | `method` | [`game/src/entities/EnemyManager.ts:1041`](../../game/src/entities/EnemyManager.ts#L1041) | - |
| `EnemyManager.getDamageMultiplier` | `method` | [`game/src/entities/EnemyManager.ts:238`](../../game/src/entities/EnemyManager.ts#L238) | - |
| `EnemyManager.getHpMultiplier` | `method` | [`game/src/entities/EnemyManager.ts:229`](../../game/src/entities/EnemyManager.ts#L229) | Continuous progressive scaling multipliers with endless scaling and biome o... |
| `EnemyManager.getLateGameCcResistance` | `method` | [`game/src/entities/EnemyManager.ts:257`](../../game/src/entities/EnemyManager.ts#L257) | - |
| `EnemyManager.getLateGameDamageResistance` | `method` | [`game/src/entities/EnemyManager.ts:267`](../../game/src/entities/EnemyManager.ts#L267) | - |
| `EnemyManager.getNearbyEnemies` | `method` | [`game/src/entities/EnemyManager.ts:822`](../../game/src/entities/EnemyManager.ts#L822) | Fast query for enemies within radius using the Spatial Grid. |
| `EnemyManager.getSnapshot` | `method` | [`game/src/entities/EnemyManager.ts:920`](../../game/src/entities/EnemyManager.ts#L920) | - |
| `EnemyManager.getSpeedMultiplier` | `method` | [`game/src/entities/EnemyManager.ts:247`](../../game/src/entities/EnemyManager.ts#L247) | - |
| `EnemyManager.killAll` | `method` | [`game/src/entities/EnemyManager.ts:847`](../../game/src/entities/EnemyManager.ts#L847) | - |
| `EnemyManager.registerEnemy` | `method` | [`game/src/entities/EnemyManager.ts:204`](../../game/src/entities/EnemyManager.ts#L204) | - |
| `EnemyManager.resetStageTime` | `method` | [`game/src/entities/EnemyManager.ts:253`](../../game/src/entities/EnemyManager.ts#L253) | - |
| `EnemyManager.setGameTime` | `method` | [`game/src/entities/EnemyManager.ts:904`](../../game/src/entities/EnemyManager.ts#L904) | - |
| `EnemyManager.spawnBossNow` | `method` | [`game/src/entities/EnemyManager.ts:891`](../../game/src/entities/EnemyManager.ts#L891) | - |
| `EnemyManager.spawnHydraNow` | `method` | [`game/src/entities/EnemyManager.ts:896`](../../game/src/entities/EnemyManager.ts#L896) | - |
| `EnemyManager.spawnImmortalBoss` | `method` | [`game/src/entities/EnemyManager.ts:642`](../../game/src/entities/EnemyManager.ts#L642) | Spawns an endgame rift boss |
| `EnemyManager.spawnImmortalBossNow` | `method` | [`game/src/entities/EnemyManager.ts:900`](../../game/src/entities/EnemyManager.ts#L900) | - |
| `EnemyManager.spawnSingleEnemy` | `method` | [`game/src/entities/EnemyManager.ts:783`](../../game/src/entities/EnemyManager.ts#L783) | - |
| `EnemyManager.spawnSpecificEnemy` | `method` | [`game/src/entities/EnemyManager.ts:875`](../../game/src/entities/EnemyManager.ts#L875) | - |
| `EnemyManager.spawnTeleporterBoss` | `method` | [`game/src/entities/EnemyManager.ts:586`](../../game/src/entities/EnemyManager.ts#L586) | Spawns a stage boss explicitly when the Teleporter event is activated. |
| `EnemyManager.spawnTieredBoss` | `method` | [`game/src/entities/EnemyManager.ts:525`](../../game/src/entities/EnemyManager.ts#L525) | Spawns a 5-minute boss with stats scaling by tier (5m, 10m, 15m, 20m, 25m) |
| `EnemyManager.spawnWave` | `method` | [`game/src/entities/EnemyManager.ts:676`](../../game/src/entities/EnemyManager.ts#L676) | - |
| `EnemyManager.syncBalance` | `method` | [`game/src/entities/EnemyManager.ts:180`](../../game/src/entities/EnemyManager.ts#L180) | - |
| `EnemyManager.updateVisuals` | `method` | [`game/src/entities/EnemyManager.ts:1013`](../../game/src/entities/EnemyManager.ts#L1013) | Rendering phase: Viewport/Frustum culling across all active enemies. Enemie... |
| `EnemySnapshot` | `interface` | [`game/src/shared/types/network.ts:21`](../../game/src/shared/types/network.ts#L21) | - |
| `EnemyType` | `type` | [`game/src/shared/types/entities.ts:16`](../../game/src/shared/types/entities.ts#L16) | - |
| `Engine` | `class` | [`game/src/core/Engine.ts:20`](../../game/src/core/Engine.ts#L20) | - |
| `Engine.onWindowResize` | `method` | [`game/src/core/Engine.ts:205`](../../game/src/core/Engine.ts#L205) | - |
| `Engine.render` | `method` | [`game/src/core/Engine.ts:211`](../../game/src/core/Engine.ts#L211) | - |
| `Engine.setShadowQuality` | `method` | [`game/src/core/Engine.ts:153`](../../game/src/core/Engine.ts#L153) | Configures shadow map resolution or disables shadows (0, 512, 1024, 2048). |
| `Engine.setTimeOfDay` | `method` | [`game/src/core/Engine.ts:110`](../../game/src/core/Engine.ts#L110) | Switches lighting between Day (Sun) and Night (Moon). |
| `Engine.setupLighting` | `method` | [`game/src/core/Engine.ts:80`](../../game/src/core/Engine.ts#L80) | - |
| `Engine.updateCamera` | `method` | [`game/src/core/Engine.ts:179`](../../game/src/core/Engine.ts#L179) | - |
| `filterAndShuffleForReroll` | `function` | [`game/src/ui/selectWeaponUpgradeOptions.ts:40`](../../game/src/ui/selectWeaponUpgradeOptions.ts#L40) | Partitions and shuffles the pool for reroll: Options not in `excludedIds` a... |
| `findClosestEnemies` | `function` | [`game/src/combat/WeaponBase.ts:28`](../../game/src/combat/WeaponBase.ts#L28) | Zero-allocation fast O(N) lookup for the top K closest alive enemies. Avoid... |
| `findClosestSimEnemies` | `function` | [`game/src/sim/weapons/SimWeaponBase.ts:54`](../../game/src/sim/weapons/SimWeaponBase.ts#L54) | - |
| `FireballWeapon` | `class` | [`game/src/combat/weapons/MagicWeapons.ts:590`](../../game/src/combat/weapons/MagicWeapons.ts#L590) | Fireball (Огненный Шар) Calls down flaming meteors from the sky that plumme... |
| `FireballWeapon.getNextUpgradeDescription` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:685`](../../game/src/combat/weapons/MagicWeapons.ts#L685) | - |
| `FireballWeapon.setAttackCallback` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:618`](../../game/src/combat/weapons/MagicWeapons.ts#L618) | - |
| `FireballWeapon.upgrade` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:678`](../../game/src/combat/weapons/MagicWeapons.ts#L678) | - |
| `FireRingWeapon` | `class` | [`game/src/combat/weapons/MagicWeapons.ts:123`](../../game/src/combat/weapons/MagicWeapons.ts#L123) | Fire Ring (Огненное Кольцо) Fiery ring of blazing animated flames surroundi... |
| `FireRingWeapon.destroy` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:228`](../../game/src/combat/weapons/MagicWeapons.ts#L228) | - |
| `FireRingWeapon.destroyAll` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:138`](../../game/src/combat/weapons/MagicWeapons.ts#L138) | - |
| `FireRingWeapon.getNextUpgradeDescription` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:252`](../../game/src/combat/weapons/MagicWeapons.ts#L252) | - |
| `FireRingWeapon.initVisual` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:206`](../../game/src/combat/weapons/MagicWeapons.ts#L206) | - |
| `FireRingWeapon.setVfxOpacity` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:127`](../../game/src/combat/weapons/MagicWeapons.ts#L127) | - |
| `FireRingWeapon.upgrade` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:245`](../../game/src/combat/weapons/MagicWeapons.ts#L245) | - |
| `FlailWeapon` | `class` | [`game/src/combat/weapons/MeleeWeapons.ts:378`](../../game/src/combat/weapons/MeleeWeapons.ts#L378) | Steel Flail (Боевой Цеп) - Hero 3 Brigitta starting weapon Whirls a heavy b... |
| `FlailWeapon.getNextUpgradeDescription` | `method` | [`game/src/combat/weapons/MeleeWeapons.ts:457`](../../game/src/combat/weapons/MeleeWeapons.ts#L457) | - |
| `FlailWeapon.setAttackCallback` | `method` | [`game/src/combat/weapons/MeleeWeapons.ts:399`](../../game/src/combat/weapons/MeleeWeapons.ts#L399) | - |
| `FlailWeapon.upgrade` | `method` | [`game/src/combat/weapons/MeleeWeapons.ts:450`](../../game/src/combat/weapons/MeleeWeapons.ts#L450) | - |
| `GameBalanceState` | `interface` | [`game/src/balance/BalanceTypes.ts:113`](../../game/src/balance/BalanceTypes.ts#L113) | - |
| `GameCore` | `class` | [`game/src/sim/GameCore.ts:363`](../../game/src/sim/GameCore.ts#L363) | Headless Deterministic GameCore Simulation Engine Manages all authoritative... |
| `GameCore.addPlayer` | `method` | [`game/src/sim/GameCore.ts:427`](../../game/src/sim/GameCore.ts#L427) | ------------------------------------------------------------- |
| `GameCore.collectDrop` | `method` | [`game/src/sim/GameCore.ts:1095`](../../game/src/sim/GameCore.ts#L1095) | - |
| `GameCore.damagePlayer` | `method` | [`game/src/sim/GameCore.ts:798`](../../game/src/sim/GameCore.ts#L798) | - |
| `GameCore.freezeAndKnockbackAll` | `method` | [`game/src/sim/GameCore.ts:475`](../../game/src/sim/GameCore.ts#L475) | - |
| `GameCore.getSnapshot` | `method` | [`game/src/sim/GameCore.ts:1218`](../../game/src/sim/GameCore.ts#L1218) | ------------------------------------------------------------- |
| `GameCore.grantTeamAltarBuff` | `method` | [`game/src/sim/GameCore.ts:1142`](../../game/src/sim/GameCore.ts#L1142) | - |
| `GameCore.isGameOver` | `method` | [`game/src/sim/GameCore.ts:1201`](../../game/src/sim/GameCore.ts#L1201) | - |
| `GameCore.killEnemy` | `method` | [`game/src/sim/GameCore.ts:1018`](../../game/src/sim/GameCore.ts#L1018) | - |
| `GameCore.removePlayer` | `method` | [`game/src/sim/GameCore.ts:434`](../../game/src/sim/GameCore.ts#L434) | - |
| `GameCore.revivePlayer` | `method` | [`game/src/sim/GameCore.ts:458`](../../game/src/sim/GameCore.ts#L458) | - |
| `GameCore.setPlayerInput` | `method` | [`game/src/sim/GameCore.ts:438`](../../game/src/sim/GameCore.ts#L438) | - |
| `GameCore.spawnBoss` | `method` | [`game/src/sim/GameCore.ts:685`](../../game/src/sim/GameCore.ts#L685) | - |
| `GameCore.spawnEnemyWave` | `method` | [`game/src/sim/GameCore.ts:650`](../../game/src/sim/GameCore.ts#L650) | - |
| `GameCore.tick` | `method` | [`game/src/sim/GameCore.ts:487`](../../game/src/sim/GameCore.ts#L487) | ------------------------------------------------------------- |
| `GameCore.updateAltars` | `method` | [`game/src/sim/GameCore.ts:1125`](../../game/src/sim/GameCore.ts#L1125) | - |
| `GameCore.updateDrops` | `method` | [`game/src/sim/GameCore.ts:1054`](../../game/src/sim/GameCore.ts#L1054) | - |
| `GameCore.updateEnemies` | `method` | [`game/src/sim/GameCore.ts:710`](../../game/src/sim/GameCore.ts#L710) | - |
| `GameCore.updatePlayers` | `method` | [`game/src/sim/GameCore.ts:518`](../../game/src/sim/GameCore.ts#L518) | - |
| `GameCore.updateProjectiles` | `method` | [`game/src/sim/GameCore.ts:829`](../../game/src/sim/GameCore.ts#L829) | - |
| `GameCore.updateRevives` | `method` | [`game/src/sim/GameCore.ts:1166`](../../game/src/sim/GameCore.ts#L1166) | - |
| `GameCore.updateWaves` | `method` | [`game/src/sim/GameCore.ts:629`](../../game/src/sim/GameCore.ts#L629) | - |
| `GameCore.upgradePlayerWeapon` | `method` | [`game/src/sim/GameCore.ts:445`](../../game/src/sim/GameCore.ts#L445) | - |
| `GameCoreConfig` | `interface` | [`game/src/sim/GameCore.ts:32`](../../game/src/sim/GameCore.ts#L32) | - |
| `GameEventBus` | `class` | [`game/src/mechanics/events/GameEventBus.ts:57`](../../game/src/mechanics/events/GameEventBus.ts#L57) | High-performance, decoupled event bus for gameplay systems and UI synchroni... |
| `GameEventBus.clear` | `method` | [`game/src/mechanics/events/GameEventBus.ts:90`](../../game/src/mechanics/events/GameEventBus.ts#L90) | - |
| `GameEventListener` | `type` | [`game/src/mechanics/events/GameEventBus.ts:1`](../../game/src/mechanics/events/GameEventBus.ts#L1) | - |
| `GameNetworkCoordinator` | `class` | [`game/src/net/GameNetworkCoordinator.ts:30`](../../game/src/net/GameNetworkCoordinator.ts#L30) | - |
| `GameNetworkCoordinator.broadcastNetworkState` | `method` | [`game/src/net/GameNetworkCoordinator.ts:561`](../../game/src/net/GameNetworkCoordinator.ts#L561) | - |
| `GameNetworkCoordinator.broadcastTimeFreeze` | `method` | [`game/src/net/GameNetworkCoordinator.ts:939`](../../game/src/net/GameNetworkCoordinator.ts#L939) | - |
| `GameNetworkCoordinator.createRemotePlayer` | `method` | [`game/src/net/GameNetworkCoordinator.ts:99`](../../game/src/net/GameNetworkCoordinator.ts#L99) | - |
| `GameNetworkCoordinator.handleClientDevAction` | `method` | [`game/src/net/GameNetworkCoordinator.ts:781`](../../game/src/net/GameNetworkCoordinator.ts#L781) | - |
| `GameNetworkCoordinator.handleClientSync` | `method` | [`game/src/net/GameNetworkCoordinator.ts:452`](../../game/src/net/GameNetworkCoordinator.ts#L452) | - |
| `GameNetworkCoordinator.handleHostDevAction` | `method` | [`game/src/net/GameNetworkCoordinator.ts:743`](../../game/src/net/GameNetworkCoordinator.ts#L743) | - |
| `GameNetworkCoordinator.handleHostSnapshot` | `method` | [`game/src/net/GameNetworkCoordinator.ts:255`](../../game/src/net/GameNetworkCoordinator.ts#L255) | - |
| `GameNetworkCoordinator.isTeamWiped` | `method` | [`game/src/net/GameNetworkCoordinator.ts:930`](../../game/src/net/GameNetworkCoordinator.ts#L930) | - |
| `GameNetworkCoordinator.setupNetworkCallbacks` | `method` | [`game/src/net/GameNetworkCoordinator.ts:105`](../../game/src/net/GameNetworkCoordinator.ts#L105) | - |
| `GameNetworkCoordinator.syncMapManagerPartners` | `method` | [`game/src/net/GameNetworkCoordinator.ts:94`](../../game/src/net/GameNetworkCoordinator.ts#L94) | - |
| `GameNetworkCoordinator.updateRevives` | `method` | [`game/src/net/GameNetworkCoordinator.ts:837`](../../game/src/net/GameNetworkCoordinator.ts#L837) | - |
| `GameOverScreen` | `class` | [`game/src/ui/screens/GameOver/GameOverScreen.ts:36`](../../game/src/ui/screens/GameOver/GameOverScreen.ts#L36) | - |
| `GameOverScreen.bindElements` | `method` | [`game/src/ui/screens/GameOver/GameOverScreen.ts:88`](../../game/src/ui/screens/GameOver/GameOverScreen.ts#L88) | - |
| `GameOverScreen.bindEvents` | `method` | [`game/src/ui/screens/GameOver/GameOverScreen.ts:125`](../../game/src/ui/screens/GameOver/GameOverScreen.ts#L125) | - |
| `GameOverScreen.getTemplate` | `method` | [`game/src/ui/screens/GameOver/GameOverScreen.ts:84`](../../game/src/ui/screens/GameOver/GameOverScreen.ts#L84) | - |
| `GameOverScreen.hideGameOver` | `method` | [`game/src/ui/screens/GameOver/GameOverScreen.ts:339`](../../game/src/ui/screens/GameOver/GameOverScreen.ts#L339) | - |
| `GameOverScreenOptions` | `interface` | [`game/src/ui/screens/GameOver/GameOverScreen.ts:32`](../../game/src/ui/screens/GameOver/GameOverScreen.ts#L32) | - |
| `GameOverUI` | `class` | [`game/src/ui/modules/GameOverUI.ts:13`](../../game/src/ui/modules/GameOverUI.ts#L13) | - |
| `GameStartMessage` | `interface` | [`game/src/shared/types/network.ts:246`](../../game/src/shared/types/network.ts#L246) | - |
| `GameState` | `enum` | [`game/src/core/SessionDirector.ts:37`](../../game/src/core/SessionDirector.ts#L37) | - |
| `Gem` | `class` | [`game/src/drops/Gem.ts:17`](../../game/src/drops/Gem.ts#L17) | - |
| `Gem.addXp` | `method` | [`game/src/drops/Gem.ts:156`](../../game/src/drops/Gem.ts#L156) | - |
| `Gem.destroy` | `method` | [`game/src/drops/Gem.ts:222`](../../game/src/drops/Gem.ts#L222) | - |
| `Gem.setType` | `method` | [`game/src/drops/Gem.ts:144`](../../game/src/drops/Gem.ts#L144) | - |
| `Gem.update` | `method` | [`game/src/drops/Gem.ts:169`](../../game/src/drops/Gem.ts#L169) | - |
| `Gem.updateVisuals` | `method` | [`game/src/drops/Gem.ts:207`](../../game/src/drops/Gem.ts#L207) | Rendering phase: Viewport/Frustum culling and visual animations. If inFrust... |
| `GemCollector` | `interface` | [`game/src/drops/DropManager.ts:6`](../../game/src/drops/DropManager.ts#L6) | - |
| `GEMS` | `const` | [`game/src/shared/types/registry.ts:44`](../../game/src/shared/types/registry.ts#L44) | - |
| `GemType` | `type` | [`game/src/shared/types/entities.ts:14`](../../game/src/shared/types/entities.ts#L14) | - |
| `getAdminPasscode` | `function` | [`game/src/balance/supabaseClient.ts:51`](../../game/src/balance/supabaseClient.ts#L51) | - |
| `getAdminSupabaseClient` | `function` | [`game/src/balance/supabaseClient.ts:94`](../../game/src/balance/supabaseClient.ts#L94) | Returns read-write (service_role) Supabase client for the local admin panel... |
| `getAssetUrl` | `function` | [`game/src/utils/assetPath.ts:5`](../../game/src/utils/assetPath.ts#L5) | Resolves a public asset path against Vite's base URL (e.g. for GitHub Pages... |
| `getAuthSupabaseClient` | `function` | [`game/src/balance/supabaseClient.ts:117`](../../game/src/balance/supabaseClient.ts#L117) | Returns Supabase client configured for user authentication with session per... |
| `getBiomeGradeChances` | `function` | [`game/src/combat/WeaponGrades.ts:81`](../../game/src/combat/WeaponGrades.ts#L81) | - |
| `getChapterDef` | `function` | [`game/src/core/ChapterQuestsConfig.ts:258`](../../game/src/core/ChapterQuestsConfig.ts#L258) | - |
| `getChapterQuestDef` | `function` | [`game/src/core/ChapterQuestsConfig.ts:262`](../../game/src/core/ChapterQuestsConfig.ts#L262) | - |
| `getCharacterAnimLayout` | `function` | [`game/src/entities/CharacterAnimator.ts:74`](../../game/src/entities/CharacterAnimator.ts#L74) | Resolves standard row layouts for all playable characters. |
| `getEntityTexture` | `function` | [`admin/src/constants.ts:161`](../../admin/src/constants.ts#L161) | - |
| `getExclusiveWeaponOwner` | `function` | [`game/src/shared/UniqueCharacters.ts:100`](../../game/src/shared/UniqueCharacters.ts#L100) | Returns the character type that owns the given weapon ID, or null if it's a... |
| `getGradeColor` | `function` | [`game/src/combat/WeaponGrades.ts:108`](../../game/src/combat/WeaponGrades.ts#L108) | - |
| `getGradeLabel` | `function` | [`game/src/combat/WeaponGrades.ts:104`](../../game/src/combat/WeaponGrades.ts#L104) | - |
| `getGradeTier` | `function` | [`game/src/combat/WeaponGrades.ts:95`](../../game/src/combat/WeaponGrades.ts#L95) | - |
| `getHeroAvatar` | `function` | [`game/src/ui/modules/HeroUIHelpers.ts:33`](../../game/src/ui/modules/HeroUIHelpers.ts#L33) | - |
| `getHeroDetails` | `function` | [`game/src/ui/modules/HeroUIHelpers.ts:54`](../../game/src/ui/modules/HeroUIHelpers.ts#L54) | - |
| `getHeroIcon` | `function` | [`game/src/ui/modules/HeroUIHelpers.ts:6`](../../game/src/ui/modules/HeroUIHelpers.ts#L6) | - |
| `getHeroName` | `function` | [`game/src/ui/modules/HeroUIHelpers.ts:10`](../../game/src/ui/modules/HeroUIHelpers.ts#L10) | - |
| `getHeroRussianName` | `function` | [`game/src/entities/PlayerOverheadRenderer.ts:14`](../../game/src/entities/PlayerOverheadRenderer.ts#L14) | - |
| `getInvokerScaling` | `function` | [`game/src/shared/InvokerSpells.ts:172`](../../game/src/shared/InvokerSpells.ts#L172) | Shared mastery curve for browser and deterministic simulation. Ghost durati... |
| `getInvokerSpellDuration` | `function` | [`game/src/shared/InvokerSpells.ts:182`](../../game/src/shared/InvokerSpells.ts#L182) | - |
| `getItemsByGrade` | `function` | [`game/src/items/RiftItemSystem.ts:275`](../../game/src/items/RiftItemSystem.ts#L275) | - |
| `getMonsterColor` | `function` | [`admin/src/constants.ts:93`](../../admin/src/constants.ts#L93) | - |
| `getPassiveBuffId` | `function` | [`game/src/drops/PassiveBuffs.ts:76`](../../game/src/drops/PassiveBuffs.ts#L76) | Deterministically pick a passive buff ID based on seed (or random if no see... |
| `getPlayerSlotDisplayName` | `function` | [`game/src/shared/types/network.ts:183`](../../game/src/shared/types/network.ts#L183) | - |
| `getPlayerSlotNumber` | `function` | [`game/src/shared/types/network.ts:173`](../../game/src/shared/types/network.ts#L173) | - |
| `getPublicSupabaseClient` | `function` | [`game/src/balance/supabaseClient.ts:65`](../../game/src/balance/supabaseClient.ts#L65) | Returns read-only (anon) Supabase client for game clients. |
| `getSupabaseAnonKey` | `function` | [`game/src/balance/supabaseClient.ts:32`](../../game/src/balance/supabaseClient.ts#L32) | - |
| `getSupabaseServiceRoleKey` | `function` | [`game/src/balance/supabaseClient.ts:40`](../../game/src/balance/supabaseClient.ts#L40) | - |
| `getSupabaseUrl` | `function` | [`game/src/balance/supabaseClient.ts:24`](../../game/src/balance/supabaseClient.ts#L24) | - |
| `getUniqueCharacterConfig` | `function` | [`game/src/shared/UniqueCharacters.ts:86`](../../game/src/shared/UniqueCharacters.ts#L86) | Returns configuration for a unique character, if registered. |
| `getWeaponColor` | `function` | [`admin/src/constants.ts:83`](../../admin/src/constants.ts#L83) | - |
| `getWeaponEffectiveCap` | `function` | [`game/src/combat/WeaponBase.ts:263`](../../game/src/combat/WeaponBase.ts#L263) | Calculates the level cap for a weapon based on tier rules: - Tier 3 (awaken... |
| `getWeaponIconUrl` | `function` | [`game/src/ui/modules/HeroUIHelpers.ts:191`](../../game/src/ui/modules/HeroUIHelpers.ts#L191) | - |
| `getWeaponIconUrl` | `function` | [`game/src/ui/screens/LevelUp/LevelUpScreen.ts:42`](../../game/src/ui/screens/LevelUp/LevelUpScreen.ts#L42) | - |
| `GlobalBalanceConfig` | `interface` | [`game/src/balance/BalanceTypes.ts:94`](../../game/src/balance/BalanceTypes.ts#L94) | - |
| `GreatswordWeapon` | `class` | [`game/src/combat/weapons/MeleeWeapons.ts:290`](../../game/src/combat/weapons/MeleeWeapons.ts#L290) | Greatsword (Двуручный Меч) - Hero 2 Valkyrie starting weapon Massive sweepi... |
| `GreatswordWeapon.getNextUpgradeDescription` | `method` | [`game/src/combat/weapons/MeleeWeapons.ts:360`](../../game/src/combat/weapons/MeleeWeapons.ts#L360) | - |
| `GreatswordWeapon.setAttackCallback` | `method` | [`game/src/combat/weapons/MeleeWeapons.ts:308`](../../game/src/combat/weapons/MeleeWeapons.ts#L308) | - |
| `GreatswordWeapon.upgrade` | `method` | [`game/src/combat/weapons/MeleeWeapons.ts:353`](../../game/src/combat/weapons/MeleeWeapons.ts#L353) | - |
| `HeavyColtWeapon` | `const` | [`game/src/combat/weapons/RangedWeapons.ts:119`](../../game/src/combat/weapons/RangedWeapons.ts#L119) | Backwards compatibility alias |
| `HeavyColtWeapon` | `type` | [`game/src/combat/weapons/RangedWeapons.ts:120`](../../game/src/combat/weapons/RangedWeapons.ts#L120) | - |
| `HERO_ORDER` | `const` | [`game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts:9`](../../game/src/ui/screens/CharacterSelect/CharacterSelectScreen.ts#L9) | - |
| `HeroAbility` | `interface` | [`game/src/ui/modules/HeroUIHelpers.ts:37`](../../game/src/ui/modules/HeroUIHelpers.ts#L37) | - |
| `HeroAnimState` | `type` | [`game/src/shared/types/entities.ts:8`](../../game/src/shared/types/entities.ts#L8) | - |
| `HeroBalanceConfig` | `interface` | [`game/src/balance/BalanceTypes.ts:40`](../../game/src/balance/BalanceTypes.ts#L40) | - |
| `HeroDetails` | `interface` | [`game/src/ui/modules/HeroUIHelpers.ts:42`](../../game/src/ui/modules/HeroUIHelpers.ts#L42) | - |
| `HeroQuestDefinition` | `interface` | [`game/src/core/ProgressionManager.ts:60`](../../game/src/core/ProgressionManager.ts#L60) | - |
| `HeroTextureAction` | `type` | [`game/src/utils/AssetResolver.ts:3`](../../game/src/utils/AssetResolver.ts#L3) | - |
| `HostSnapshotMessage` | `interface` | [`game/src/shared/types/network.ts:206`](../../game/src/shared/types/network.ts#L206) | - |
| `HUD` | `class` | [`game/src/ui/HUD.ts:42`](../../game/src/ui/HUD.ts#L42) | - |
| `HUD.activateSettingsTab` | `method` | [`game/src/ui/HUD.ts:777`](../../game/src/ui/HUD.ts#L777) | - |
| `HUD.applyRandomMenuBackground` | `method` | [`game/src/ui/HUD.ts:93`](../../game/src/ui/HUD.ts#L93) | - |
| `HUD.bindMainMenuListeners` | `method` | [`game/src/ui/HUD.ts:484`](../../game/src/ui/HUD.ts#L484) | --- Main Menu & Navigation Listeners --- |
| `HUD.bindPauseListeners` | `method` | [`game/src/ui/HUD.ts:543`](../../game/src/ui/HUD.ts#L543) | - |
| `HUD.clearTeammates` | `method` | [`game/src/ui/HUD.ts:1271`](../../game/src/ui/HUD.ts#L1271) | - |
| `HUD.getChapterQuests` | `method` | [`game/src/ui/HUD.ts:1044`](../../game/src/ui/HUD.ts#L1044) | - |
| `HUD.getHeroAvatar` | `method` | [`game/src/ui/HUD.ts:1378`](../../game/src/ui/HUD.ts#L1378) | - |
| `HUD.getHeroIcon` | `method` | [`game/src/ui/HUD.ts:1370`](../../game/src/ui/HUD.ts#L1370) | --- Hero Info Static / Instance Helpers --- |
| `HUD.getHeroName` | `method` | [`game/src/ui/HUD.ts:1374`](../../game/src/ui/HUD.ts#L1374) | - |
| `HUD.handleClaimAllBattlePass` | `method` | [`game/src/ui/HUD.ts:1082`](../../game/src/ui/HUD.ts#L1082) | - |
| `HUD.handleEscape` | `method` | [`game/src/ui/HUD.ts:883`](../../game/src/ui/HUD.ts#L883) | - |
| `HUD.hideAuthModal` | `method` | [`game/src/ui/HUD.ts:866`](../../game/src/ui/HUD.ts#L866) | - |
| `HUD.hideBattlePassModal` | `method` | [`game/src/ui/HUD.ts:1078`](../../game/src/ui/HUD.ts#L1078) | - |
| `HUD.hideCharacterSelect` | `method` | [`game/src/ui/HUD.ts:849`](../../game/src/ui/HUD.ts#L849) | - |
| `HUD.hideChestChoice` | `method` | [`game/src/ui/HUD.ts:1210`](../../game/src/ui/HUD.ts#L1210) | - |
| `HUD.hideCoopMenu` | `method` | [`game/src/ui/HUD.ts:764`](../../game/src/ui/HUD.ts#L764) | - |
| `HUD.hideExitModal` | `method` | [`game/src/ui/HUD.ts:789`](../../game/src/ui/HUD.ts#L789) | - |
| `HUD.hideGameOver` | `method` | [`game/src/ui/HUD.ts:1240`](../../game/src/ui/HUD.ts#L1240) | - |
| `HUD.hideHostLobby` | `method` | [`game/src/ui/HUD.ts:1092`](../../game/src/ui/HUD.ts#L1092) | - |
| `HUD.hideInteractionPrompt` | `method` | [`game/src/ui/HUD.ts:1303`](../../game/src/ui/HUD.ts#L1303) | - |
| `HUD.hideInventory` | `method` | [`game/src/ui/HUD.ts:1176`](../../game/src/ui/HUD.ts#L1176) | - |
| `HUD.hideJoinLobby` | `method` | [`game/src/ui/HUD.ts:1128`](../../game/src/ui/HUD.ts#L1128) | - |
| `HUD.hideLevelUp` | `method` | [`game/src/ui/HUD.ts:1158`](../../game/src/ui/HUD.ts#L1158) | - |
| `HUD.hideMainMenu` | `method` | [`game/src/ui/HUD.ts:723`](../../game/src/ui/HUD.ts#L723) | - |
| `HUD.hideMerchant` | `method` | [`game/src/ui/HUD.ts:1194`](../../game/src/ui/HUD.ts#L1194) | - |
| `HUD.hidePartnerHp` | `method` | [`game/src/ui/HUD.ts:1279`](../../game/src/ui/HUD.ts#L1279) | - |
| `HUD.hidePasswordPrompt` | `method` | [`game/src/ui/HUD.ts:1112`](../../game/src/ui/HUD.ts#L1112) | - |
| `HUD.hidePause` | `method` | [`game/src/ui/HUD.ts:814`](../../game/src/ui/HUD.ts#L814) | - |
| `HUD.hideQuestsModal` | `method` | [`game/src/ui/HUD.ts:1040`](../../game/src/ui/HUD.ts#L1040) | - |
| `HUD.hideSettings` | `method` | [`game/src/ui/HUD.ts:773`](../../game/src/ui/HUD.ts#L773) | - |
| `HUD.hideShopModal` | `method` | [`game/src/ui/HUD.ts:742`](../../game/src/ui/HUD.ts#L742) | - |
| `HUD.isAnyMenuOpen` | `method` | [`game/src/ui/HUD.ts:875`](../../game/src/ui/HUD.ts#L875) | - |
| `HUD.isAuthModalOpen` | `method` | [`game/src/ui/HUD.ts:871`](../../game/src/ui/HUD.ts#L871) | - |
| `HUD.isInventoryOpen` | `method` | [`game/src/ui/HUD.ts:1164`](../../game/src/ui/HUD.ts#L1164) | --- Inventory Methods Forwarding --- |
| `HUD.isMerchantOpen` | `method` | [`game/src/ui/HUD.ts:1186`](../../game/src/ui/HUD.ts#L1186) | --- Merchant & Chest Methods Forwarding --- |
| `HUD.openBattlePassModal` | `method` | [`game/src/ui/HUD.ts:1074`](../../game/src/ui/HUD.ts#L1074) | - |
| `HUD.renderAvailableRooms` | `method` | [`game/src/ui/HUD.ts:1120`](../../game/src/ui/HUD.ts#L1120) | - |
| `HUD.renderBattlePassModal` | `method` | [`game/src/ui/HUD.ts:1070`](../../game/src/ui/HUD.ts#L1070) | - |
| `HUD.renderHostRoster` | `method` | [`game/src/ui/HUD.ts:1100`](../../game/src/ui/HUD.ts#L1100) | - |
| `HUD.renderInventory` | `method` | [`game/src/ui/HUD.ts:1180`](../../game/src/ui/HUD.ts#L1180) | - |
| `HUD.renderItemInventory` | `method` | [`game/src/ui/HUD.ts:1307`](../../game/src/ui/HUD.ts#L1307) | - |
| `HUD.renderJoinRoster` | `method` | [`game/src/ui/HUD.ts:1104`](../../game/src/ui/HUD.ts#L1104) | - |
| `HUD.renderQuestsModal` | `method` | [`game/src/ui/HUD.ts:1048`](../../game/src/ui/HUD.ts#L1048) | - |
| `HUD.resetBossUI` | `method` | [`game/src/ui/HUD.ts:1335`](../../game/src/ui/HUD.ts#L1335) | - |
| `HUD.resetExitModal` | `method` | [`game/src/ui/HUD.ts:679`](../../game/src/ui/HUD.ts#L679) | - |
| `HUD.resetLevelUpState` | `method` | [`game/src/ui/HUD.ts:1154`](../../game/src/ui/HUD.ts#L1154) | - |
| `HUD.resetSessionHUD` | `method` | [`game/src/ui/HUD.ts:1339`](../../game/src/ui/HUD.ts#L1339) | - |
| `HUD.selectQuestChapter` | `method` | [`game/src/ui/HUD.ts:1028`](../../game/src/ui/HUD.ts#L1028) | - |
| `HUD.setCoopBadge` | `method` | [`game/src/ui/HUD.ts:1247`](../../game/src/ui/HUD.ts#L1247) | --- In-Game Overlay & Overlays Methods Forwarding --- |
| `HUD.setGuestConnectedMode` | `method` | [`game/src/ui/HUD.ts:1136`](../../game/src/ui/HUD.ts#L1136) | - |
| `HUD.setHostPartnerConnected` | `method` | [`game/src/ui/HUD.ts:1096`](../../game/src/ui/HUD.ts#L1096) | - |
| `HUD.setInGameHUDVisible` | `method` | [`game/src/ui/HUD.ts:1036`](../../game/src/ui/HUD.ts#L1036) | - |
| `HUD.setJoinStatus` | `method` | [`game/src/ui/HUD.ts:1132`](../../game/src/ui/HUD.ts#L1132) | - |
| `HUD.setTrainingModeActive` | `method` | [`game/src/ui/HUD.ts:1355`](../../game/src/ui/HUD.ts#L1355) | - |
| `HUD.setupExitListeners` | `method` | [`game/src/ui/HUD.ts:649`](../../game/src/ui/HUD.ts#L649) | - |
| `HUD.showAuthModal` | `method` | [`game/src/ui/HUD.ts:859`](../../game/src/ui/HUD.ts#L859) | - |
| `HUD.showBalanceToast` | `method` | [`game/src/ui/HUD.ts:1315`](../../game/src/ui/HUD.ts#L1315) | - |
| `HUD.showCharacterSelect` | `method` | [`game/src/ui/HUD.ts:830`](../../game/src/ui/HUD.ts#L830) | - |
| `HUD.showCoopMenu` | `method` | [`game/src/ui/HUD.ts:758`](../../game/src/ui/HUD.ts#L758) | - |
| `HUD.showExitModal` | `method` | [`game/src/ui/HUD.ts:781`](../../game/src/ui/HUD.ts#L781) | - |
| `HUD.showHostLobby` | `method` | [`game/src/ui/HUD.ts:1088`](../../game/src/ui/HUD.ts#L1088) | --- Lobby Methods Forwarding --- |
| `HUD.showInteractionPrompt` | `method` | [`game/src/ui/HUD.ts:1299`](../../game/src/ui/HUD.ts#L1299) | - |
| `HUD.showInventory` | `method` | [`game/src/ui/HUD.ts:1172`](../../game/src/ui/HUD.ts#L1172) | - |
| `HUD.showJoinLobby` | `method` | [`game/src/ui/HUD.ts:1124`](../../game/src/ui/HUD.ts#L1124) | - |
| `HUD.showLevelUp` | `method` | [`game/src/ui/HUD.ts:1150`](../../game/src/ui/HUD.ts#L1150) | --- Level Up Methods Forwarding --- |
| `HUD.showMainMenu` | `method` | [`game/src/ui/HUD.ts:694`](../../game/src/ui/HUD.ts#L694) | --- Modal Navigation Methods --- |
| `HUD.showMerchant` | `method` | [`game/src/ui/HUD.ts:1190`](../../game/src/ui/HUD.ts#L1190) | - |
| `HUD.showPasswordPrompt` | `method` | [`game/src/ui/HUD.ts:1108`](../../game/src/ui/HUD.ts#L1108) | - |
| `HUD.showPasswordPromptError` | `method` | [`game/src/ui/HUD.ts:1116`](../../game/src/ui/HUD.ts#L1116) | - |
| `HUD.showPause` | `method` | [`game/src/ui/HUD.ts:794`](../../game/src/ui/HUD.ts#L794) | - |
| `HUD.showQuestsModal` | `method` | [`game/src/ui/HUD.ts:1032`](../../game/src/ui/HUD.ts#L1032) | - |
| `HUD.showSettings` | `method` | [`game/src/ui/HUD.ts:769`](../../game/src/ui/HUD.ts#L769) | - |
| `HUD.showShopModal` | `method` | [`game/src/ui/HUD.ts:731`](../../game/src/ui/HUD.ts#L731) | - |
| `HUD.switchJoinTab` | `method` | [`game/src/ui/HUD.ts:1144`](../../game/src/ui/HUD.ts#L1144) | - |
| `HUD.toggleInventory` | `method` | [`game/src/ui/HUD.ts:1168`](../../game/src/ui/HUD.ts#L1168) | - |
| `HUD.togglePause` | `method` | [`game/src/ui/HUD.ts:820`](../../game/src/ui/HUD.ts#L820) | - |
| `HUD.toggleQuestsInMainMenu` | `method` | [`game/src/ui/HUD.ts:1024`](../../game/src/ui/HUD.ts#L1024) | --- Quests Methods Forwarding --- |
| `HUD.triggerAltarNotification` | `method` | [`game/src/ui/HUD.ts:1311`](../../game/src/ui/HUD.ts#L1311) | - |
| `HUD.triggerBossWarning` | `method` | [`game/src/ui/HUD.ts:1327`](../../game/src/ui/HUD.ts#L1327) | - |
| `HUD.triggerDamageFlash` | `method` | [`game/src/ui/HUD.ts:1323`](../../game/src/ui/HUD.ts#L1323) | - |
| `HUD.triggerImmortalBossWarning` | `method` | [`game/src/ui/HUD.ts:1331`](../../game/src/ui/HUD.ts#L1331) | - |
| `HUD.updateBuffsTray` | `method` | [`game/src/ui/HUD.ts:1319`](../../game/src/ui/HUD.ts#L1319) | - |
| `HUD.updateCharacterSelectLockStatus` | `method` | [`game/src/ui/HUD.ts:1052`](../../game/src/ui/HUD.ts#L1052) | - |
| `HUD.updateCrystalsCounter` | `method` | [`game/src/ui/HUD.ts:751`](../../game/src/ui/HUD.ts#L751) | - |
| `HUD.updateGuestReadyButtonUI` | `method` | [`game/src/ui/HUD.ts:1140`](../../game/src/ui/HUD.ts#L1140) | - |
| `HUD.updateLobbyHeroesLockStatus` | `method` | [`game/src/ui/HUD.ts:1056`](../../game/src/ui/HUD.ts#L1056) | - |
| `HUD.updateMainMenuBattlePass` | `method` | [`game/src/ui/HUD.ts:1066`](../../game/src/ui/HUD.ts#L1066) | --- Battle Pass Methods Forwarding --- |
| `HUD.updateMainMenuQuests` | `method` | [`game/src/ui/HUD.ts:1060`](../../game/src/ui/HUD.ts#L1060) | - |
| `HUD.updateMerchantTimer` | `method` | [`game/src/ui/HUD.ts:1198`](../../game/src/ui/HUD.ts#L1198) | - |
| `HUD.updatePartnerHp` | `method` | [`game/src/ui/HUD.ts:1275`](../../game/src/ui/HUD.ts#L1275) | - |
| `HUD.updatePassivesBar` | `method` | [`game/src/ui/HUD.ts:1347`](../../game/src/ui/HUD.ts#L1347) | - |
| `HUD.updatePerformance` | `method` | [`game/src/ui/HUD.ts:1351`](../../game/src/ui/HUD.ts#L1351) | - |
| `HUD.updateStageText` | `method` | [`game/src/ui/HUD.ts:1294`](../../game/src/ui/HUD.ts#L1294) | - |
| `HUD.updateWeaponsBar` | `method` | [`game/src/ui/HUD.ts:1343`](../../game/src/ui/HUD.ts#L1343) | - |
| `IceSpikeWeapon` | `class` | [`game/src/combat/weapons/MagicWeapons.ts:483`](../../game/src/combat/weapons/MagicWeapons.ts#L483) | Ice Spike (Ледяной Шип) Piercing glacial spikes erupt from beneath the eart... |
| `IceSpikeWeapon.getNextUpgradeDescription` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:568`](../../game/src/combat/weapons/MagicWeapons.ts#L568) | - |
| `IceSpikeWeapon.setAttackCallback` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:509`](../../game/src/combat/weapons/MagicWeapons.ts#L509) | - |
| `IceSpikeWeapon.upgrade` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:561`](../../game/src/combat/weapons/MagicWeapons.ts#L561) | - |
| `InGameHUDScreen` | `class` | [`game/src/ui/screens/InGameHUD/InGameHUDScreen.ts:12`](../../game/src/ui/screens/InGameHUD/InGameHUDScreen.ts#L12) | Base In-Game HUD Screen. Provides modular Screen lifecycle for the in-comba... |
| `InGameHUDScreen.bindElements` | `method` | [`game/src/ui/screens/InGameHUD/InGameHUDScreen.ts:22`](../../game/src/ui/screens/InGameHUD/InGameHUDScreen.ts#L22) | - |
| `InGameHUDScreen.bindEvents` | `method` | [`game/src/ui/screens/InGameHUD/InGameHUDScreen.ts:23`](../../game/src/ui/screens/InGameHUD/InGameHUDScreen.ts#L23) | - |
| `InGameHUDScreen.getTemplate` | `method` | [`game/src/ui/screens/InGameHUD/InGameHUDScreen.ts:18`](../../game/src/ui/screens/InGameHUD/InGameHUDScreen.ts#L18) | - |
| `InGameHUDScreenOptions` | `interface` | [`game/src/ui/screens/InGameHUD/InGameHUDScreen.ts:4`](../../game/src/ui/screens/InGameHUD/InGameHUDScreen.ts#L4) | - |
| `InGameOverlayUI` | `class` | [`game/src/ui/modules/InGameOverlayUI.ts:16`](../../game/src/ui/modules/InGameOverlayUI.ts#L16) | - |
| `InGameOverlayUI.clearTeammates` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:440`](../../game/src/ui/modules/InGameOverlayUI.ts#L440) | - |
| `InGameOverlayUI.hideInteractionPrompt` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:607`](../../game/src/ui/modules/InGameOverlayUI.ts#L607) | - |
| `InGameOverlayUI.hidePartnerHp` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:467`](../../game/src/ui/modules/InGameOverlayUI.ts#L467) | - |
| `InGameOverlayUI.renderItemInventory` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:613`](../../game/src/ui/modules/InGameOverlayUI.ts#L613) | - |
| `InGameOverlayUI.resetBossUI` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:826`](../../game/src/ui/modules/InGameOverlayUI.ts#L826) | - |
| `InGameOverlayUI.resetSessionHUD` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:922`](../../game/src/ui/modules/InGameOverlayUI.ts#L922) | - |
| `InGameOverlayUI.setCoopBadge` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:156`](../../game/src/ui/modules/InGameOverlayUI.ts#L156) | - |
| `InGameOverlayUI.setInGameHUDVisible` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:151`](../../game/src/ui/modules/InGameOverlayUI.ts#L151) | - |
| `InGameOverlayUI.setTrainingModeActive` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:953`](../../game/src/ui/modules/InGameOverlayUI.ts#L953) | - |
| `InGameOverlayUI.showBalanceToast` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:657`](../../game/src/ui/modules/InGameOverlayUI.ts#L657) | - |
| `InGameOverlayUI.showInteractionPrompt` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:600`](../../game/src/ui/modules/InGameOverlayUI.ts#L600) | - |
| `InGameOverlayUI.triggerAltarNotification` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:639`](../../game/src/ui/modules/InGameOverlayUI.ts#L639) | - |
| `InGameOverlayUI.triggerBossWarning` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:786`](../../game/src/ui/modules/InGameOverlayUI.ts#L786) | - |
| `InGameOverlayUI.triggerDamageFlash` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:771`](../../game/src/ui/modules/InGameOverlayUI.ts#L771) | - |
| `InGameOverlayUI.triggerImmortalBossWarning` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:806`](../../game/src/ui/modules/InGameOverlayUI.ts#L806) | - |
| `InGameOverlayUI.updateBuffsTray` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:704`](../../game/src/ui/modules/InGameOverlayUI.ts#L704) | - |
| `InGameOverlayUI.updatePartnerHp` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:450`](../../game/src/ui/modules/InGameOverlayUI.ts#L450) | - |
| `InGameOverlayUI.updatePassivesBar` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:880`](../../game/src/ui/modules/InGameOverlayUI.ts#L880) | - |
| `InGameOverlayUI.updatePerformance` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:885`](../../game/src/ui/modules/InGameOverlayUI.ts#L885) | - |
| `InGameOverlayUI.updateStageText` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:593`](../../game/src/ui/modules/InGameOverlayUI.ts#L593) | - |
| `InGameOverlayUI.updateWeaponsBar` | `method` | [`game/src/ui/modules/InGameOverlayUI.ts:845`](../../game/src/ui/modules/InGameOverlayUI.ts#L845) | - |
| `InputManager` | `class` | [`game/src/core/InputManager.ts:3`](../../game/src/core/InputManager.ts#L3) | - |
| `InputManager.onKeyDown` | `method` | [`game/src/core/InputManager.ts:25`](../../game/src/core/InputManager.ts#L25) | - |
| `InputManager.onKeyUp` | `method` | [`game/src/core/InputManager.ts:80`](../../game/src/core/InputManager.ts#L80) | - |
| `InputManager.onMouseMove` | `method` | [`game/src/core/InputManager.ts:84`](../../game/src/core/InputManager.ts#L84) | - |
| `InputManager.update` | `method` | [`game/src/core/InputManager.ts:89`](../../game/src/core/InputManager.ts#L89) | - |
| `InventoryScreen` | `class` | [`game/src/ui/screens/Inventory/InventoryScreen.ts:11`](../../game/src/ui/screens/Inventory/InventoryScreen.ts#L11) | - |
| `InventoryScreen.bindElements` | `method` | [`game/src/ui/screens/Inventory/InventoryScreen.ts:41`](../../game/src/ui/screens/Inventory/InventoryScreen.ts#L41) | - |
| `InventoryScreen.bindEvents` | `method` | [`game/src/ui/screens/Inventory/InventoryScreen.ts:54`](../../game/src/ui/screens/Inventory/InventoryScreen.ts#L54) | - |
| `InventoryScreen.getTemplate` | `method` | [`game/src/ui/screens/Inventory/InventoryScreen.ts:37`](../../game/src/ui/screens/Inventory/InventoryScreen.ts#L37) | - |
| `InventoryScreen.getWeaponDetailedInventoryStats` | `method` | [`game/src/ui/screens/Inventory/InventoryScreen.ts:440`](../../game/src/ui/screens/Inventory/InventoryScreen.ts#L440) | - |
| `InventoryScreen.hideInventory` | `method` | [`game/src/ui/screens/Inventory/InventoryScreen.ts:99`](../../game/src/ui/screens/Inventory/InventoryScreen.ts#L99) | - |
| `InventoryScreen.isInventoryOpen` | `method` | [`game/src/ui/screens/Inventory/InventoryScreen.ts:76`](../../game/src/ui/screens/Inventory/InventoryScreen.ts#L76) | - |
| `InventoryScreen.renderInventory` | `method` | [`game/src/ui/screens/Inventory/InventoryScreen.ts:105`](../../game/src/ui/screens/Inventory/InventoryScreen.ts#L105) | - |
| `InventoryScreen.showInventory` | `method` | [`game/src/ui/screens/Inventory/InventoryScreen.ts:91`](../../game/src/ui/screens/Inventory/InventoryScreen.ts#L91) | - |
| `InventoryScreen.toggleInventory` | `method` | [`game/src/ui/screens/Inventory/InventoryScreen.ts:80`](../../game/src/ui/screens/Inventory/InventoryScreen.ts#L80) | - |
| `InventoryScreen.toggleStatDisplayMode` | `method` | [`game/src/ui/screens/Inventory/InventoryScreen.ts:66`](../../game/src/ui/screens/Inventory/InventoryScreen.ts#L66) | - |
| `InventoryScreenOptions` | `interface` | [`game/src/ui/screens/Inventory/InventoryScreen.ts:7`](../../game/src/ui/screens/Inventory/InventoryScreen.ts#L7) | - |
| `InventoryUI` | `class` | [`game/src/ui/modules/InventoryUI.ts:11`](../../game/src/ui/modules/InventoryUI.ts#L11) | - |
| `INVOKE_BASE_DAMAGE` | `const` | [`game/src/shared/InvokerSpells.ts:167`](../../game/src/shared/InvokerSpells.ts#L167) | - |
| `INVOKE_COOLDOWN_FACTOR` | `const` | [`game/src/shared/InvokerSpells.ts:169`](../../game/src/shared/InvokerSpells.ts#L169) | - |
| `INVOKE_DAMAGE_PER_LEVEL` | `const` | [`game/src/shared/InvokerSpells.ts:168`](../../game/src/shared/InvokerSpells.ts#L168) | - |
| `INVOKER_EXCLUSIVE_WEAPONS` | `const` | [`game/src/shared/UniqueCharacters.ts:6`](../../game/src/shared/UniqueCharacters.ts#L6) | All exclusive weapon IDs belonging to Invoker. |
| `INVOKER_SPELL_IDS` | `const` | [`game/src/shared/InvokerSpells.ts:3`](../../game/src/shared/InvokerSpells.ts#L3) | - |
| `INVOKER_SPELLS` | `const` | [`game/src/shared/InvokerSpells.ts:27`](../../game/src/shared/InvokerSpells.ts#L27) | - |
| `InvokerInvokeWeapon` | `class` | [`game/src/combat/InvokerWeapons.ts:168`](../../game/src/combat/InvokerWeapons.ts#L168) | - |
| `InvokerSpellCast` | `interface` | [`game/src/shared/InvokerSpells.ts:197`](../../game/src/shared/InvokerSpells.ts#L197) | - |
| `InvokerSpellDefinition` | `interface` | [`game/src/shared/InvokerSpells.ts:16`](../../game/src/shared/InvokerSpells.ts#L16) | - |
| `InvokerSpellEffects` | `class` | [`game/src/combat/InvokerSpellEffects.ts:35`](../../game/src/combat/InvokerSpellEffects.ts#L35) | Purely visual, bounded effects for local casts and co-op replay. |
| `InvokerSpellEffects.animate` | `method` | [`game/src/combat/InvokerSpellEffects.ts:104`](../../game/src/combat/InvokerSpellEffects.ts#L104) | - |
| `InvokerSpellEffects.clear` | `method` | [`game/src/combat/InvokerSpellEffects.ts:96`](../../game/src/combat/InvokerSpellEffects.ts#L96) | - |
| `InvokerSpellEffects.createSlot` | `method` | [`game/src/combat/InvokerSpellEffects.ts:225`](../../game/src/combat/InvokerSpellEffects.ts#L225) | - |
| `InvokerSpellEffects.play` | `method` | [`game/src/combat/InvokerSpellEffects.ts:46`](../../game/src/combat/InvokerSpellEffects.ts#L46) | - |
| `InvokerSpellEffects.ring` | `method` | [`game/src/combat/InvokerSpellEffects.ts:216`](../../game/src/combat/InvokerSpellEffects.ts#L216) | - |
| `InvokerSpellEffects.update` | `method` | [`game/src/combat/InvokerSpellEffects.ts:88`](../../game/src/combat/InvokerSpellEffects.ts#L88) | - |
| `invokerSpellFromWeaponId` | `function` | [`game/src/shared/InvokerSpells.ts:153`](../../game/src/shared/InvokerSpells.ts#L153) | - |
| `InvokerSpellId` | `type` | [`game/src/shared/InvokerSpells.ts:15`](../../game/src/shared/InvokerSpells.ts#L15) | - |
| `InvokerSpellRuntime` | `class` | [`game/src/shared/InvokerSpellRuntime.ts:36`](../../game/src/shared/InvokerSpellRuntime.ts#L36) | Spell rules are independent of rendering: remote visual events cannot deal ... |
| `InvokerSpellRuntime.clear` | `method` | [`game/src/shared/InvokerSpellRuntime.ts:38`](../../game/src/shared/InvokerSpellRuntime.ts#L38) | - |
| `InvokerSpellRuntime.update` | `method` | [`game/src/shared/InvokerSpellRuntime.ts:83`](../../game/src/shared/InvokerSpellRuntime.ts#L83) | - |
| `InvokerSpellWeapon` | `class` | [`game/src/combat/InvokerWeapons.ts:173`](../../game/src/combat/InvokerWeapons.ts#L173) | - |
| `InvokerWeapon` | `class` | [`game/src/combat/InvokerWeapons.ts:25`](../../game/src/combat/InvokerWeapons.ts#L25) | Invoke powers random casts and any separately acquired spell weapons. |
| `InvokerWeapon.getNextUpgradeDescription` | `method` | [`game/src/combat/InvokerWeapons.ts:146`](../../game/src/combat/InvokerWeapons.ts#L146) | - |
| `InvokerWeapon.setInvokeSource` | `method` | [`game/src/combat/InvokerWeapons.ts:34`](../../game/src/combat/InvokerWeapons.ts#L34) | - |
| `InvokerWeapon.upgrade` | `method` | [`game/src/combat/InvokerWeapons.ts:139`](../../game/src/combat/InvokerWeapons.ts#L139) | - |
| `invokerWeaponId` | `function` | [`game/src/shared/InvokerSpells.ts:150`](../../game/src/shared/InvokerSpells.ts#L150) | - |
| `isBinarySnapshot` | `function` | [`game/src/net/BinarySnapshot.ts:29`](../../game/src/net/BinarySnapshot.ts#L29) | Checks if incoming data is a binary HostSnapshot packet |
| `isExclusiveWeapon` | `function` | [`game/src/shared/UniqueCharacters.ts:93`](../../game/src/shared/UniqueCharacters.ts#L93) | Checks whether a given weapon ID is exclusive to any registered unique char... |
| `isInvokerSpellId` | `function` | [`game/src/shared/InvokerSpells.ts:147`](../../game/src/shared/InvokerSpells.ts#L147) | - |
| `isUniqueCharacter` | `function` | [`game/src/shared/UniqueCharacters.ts:79`](../../game/src/shared/UniqueCharacters.ts#L79) | Checks if a character is defined as a unique character. |
| `ItemBalanceConfig` | `interface` | [`game/src/balance/BalanceTypes.ts:81`](../../game/src/balance/BalanceTypes.ts#L81) | - |
| `ItemRarity` | `type` | [`game/src/items/RiftItemSystem.ts:3`](../../game/src/items/RiftItemSystem.ts#L3) | - |
| `ItemRarity` | `type` | [`game/src/shared/types/entities.ts:45`](../../game/src/shared/types/entities.ts#L45) | - |
| `KatanaSlashWeapon` | `class` | [`game/src/combat/weapons/MeleeWeapons.ts:117`](../../game/src/combat/weapons/MeleeWeapons.ts#L117) | Katana Slash (Рассекающий Клинок) Swift katana slash in an arc hitting all ... |
| `KatanaSlashWeapon.getNextUpgradeDescription` | `method` | [`game/src/combat/weapons/MeleeWeapons.ts:188`](../../game/src/combat/weapons/MeleeWeapons.ts#L188) | - |
| `KatanaSlashWeapon.setAttackCallback` | `method` | [`game/src/combat/weapons/MeleeWeapons.ts:135`](../../game/src/combat/weapons/MeleeWeapons.ts#L135) | - |
| `KatanaSlashWeapon.upgrade` | `method` | [`game/src/combat/weapons/MeleeWeapons.ts:181`](../../game/src/combat/weapons/MeleeWeapons.ts#L181) | - |
| `KukriWeapon` | `class` | [`game/src/combat/weapons/MeleeWeapons.ts:13`](../../game/src/combat/weapons/MeleeWeapons.ts#L13) | Kukri Knife (Нож Кукри) Rapid throws of spinning curved Gurkha kukri blades |
| `KukriWeapon.getNextUpgradeDescription` | `method` | [`game/src/combat/weapons/MeleeWeapons.ts:91`](../../game/src/combat/weapons/MeleeWeapons.ts#L91) | - |
| `KukriWeapon.upgrade` | `method` | [`game/src/combat/weapons/MeleeWeapons.ts:84`](../../game/src/combat/weapons/MeleeWeapons.ts#L84) | - |
| `LEGENDARY_ITEMS` | `const` | [`game/src/items/RiftItemSystem.ts:264`](../../game/src/items/RiftItemSystem.ts#L264) | - |
| `LevelUpScreen` | `class` | [`game/src/ui/screens/LevelUp/LevelUpScreen.ts:84`](../../game/src/ui/screens/LevelUp/LevelUpScreen.ts#L84) | - |
| `LevelUpScreen.bindElements` | `method` | [`game/src/ui/screens/LevelUp/LevelUpScreen.ts:110`](../../game/src/ui/screens/LevelUp/LevelUpScreen.ts#L110) | - |
| `LevelUpScreen.bindEvents` | `method` | [`game/src/ui/screens/LevelUp/LevelUpScreen.ts:118`](../../game/src/ui/screens/LevelUp/LevelUpScreen.ts#L118) | - |
| `LevelUpScreen.generateWeaponOptions` | `method` | [`game/src/ui/screens/LevelUp/LevelUpScreen.ts:361`](../../game/src/ui/screens/LevelUp/LevelUpScreen.ts#L361) | - |
| `LevelUpScreen.getTemplate` | `method` | [`game/src/ui/screens/LevelUp/LevelUpScreen.ts:106`](../../game/src/ui/screens/LevelUp/LevelUpScreen.ts#L106) | - |
| `LevelUpScreen.hideLevelUp` | `method` | [`game/src/ui/screens/LevelUp/LevelUpScreen.ts:349`](../../game/src/ui/screens/LevelUp/LevelUpScreen.ts#L349) | - |
| `LevelUpScreen.resetLevelUpState` | `method` | [`game/src/ui/screens/LevelUp/LevelUpScreen.ts:120`](../../game/src/ui/screens/LevelUp/LevelUpScreen.ts#L120) | - |
| `LevelUpScreen.selectAutoLevelUpOption` | `method` | [`game/src/ui/screens/LevelUp/LevelUpScreen.ts:179`](../../game/src/ui/screens/LevelUp/LevelUpScreen.ts#L179) | - |
| `LevelUpScreen.showLevelUp` | `method` | [`game/src/ui/screens/LevelUp/LevelUpScreen.ts:126`](../../game/src/ui/screens/LevelUp/LevelUpScreen.ts#L126) | - |
| `LevelUpScreenElements` | `interface` | [`game/src/ui/screens/LevelUp/LevelUpScreen.ts:64`](../../game/src/ui/screens/LevelUp/LevelUpScreen.ts#L64) | - |
| `LevelUpScreenOptions` | `interface` | [`game/src/ui/screens/LevelUp/LevelUpScreen.ts:73`](../../game/src/ui/screens/LevelUp/LevelUpScreen.ts#L73) | - |
| `LevelUpUI` | `class` | [`game/src/ui/modules/LevelUpUI.ts:18`](../../game/src/ui/modules/LevelUpUI.ts#L18) | - |
| `LevelUpUIContext` | `type` | [`game/src/ui/modules/LevelUpUI.ts:13`](../../game/src/ui/modules/LevelUpUI.ts#L13) | - |
| `LevelUpUIElements` | `type` | [`game/src/ui/modules/LevelUpUI.ts:12`](../../game/src/ui/modules/LevelUpUI.ts#L12) | - |
| `LightningStrikeWeapon` | `class` | [`game/src/combat/weapons/MagicWeapons.ts:376`](../../game/src/combat/weapons/MagicWeapons.ts#L376) | Lightning Strike (Удар Молнии) Calls down devastating bolts of thunder from... |
| `LightningStrikeWeapon.getNextUpgradeDescription` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:461`](../../game/src/combat/weapons/MagicWeapons.ts#L461) | - |
| `LightningStrikeWeapon.setAttackCallback` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:402`](../../game/src/combat/weapons/MagicWeapons.ts#L402) | - |
| `LightningStrikeWeapon.upgrade` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:454`](../../game/src/combat/weapons/MagicWeapons.ts#L454) | - |
| `LobbyCoordinator` | `class` | [`game/src/net/LobbyCoordinator.ts:6`](../../game/src/net/LobbyCoordinator.ts#L6) | - |
| `LobbyCoordinator.connectAsGuest` | `method` | [`game/src/net/LobbyCoordinator.ts:139`](../../game/src/net/LobbyCoordinator.ts#L139) | - |
| `LobbyCoordinator.openHostLobby` | `method` | [`game/src/net/LobbyCoordinator.ts:82`](../../game/src/net/LobbyCoordinator.ts#L82) | - |
| `LobbyCoordinator.openJoinLobby` | `method` | [`game/src/net/LobbyCoordinator.ts:90`](../../game/src/net/LobbyCoordinator.ts#L90) | - |
| `LobbyCoordinator.setupMenuNavigation` | `method` | [`game/src/net/LobbyCoordinator.ts:26`](../../game/src/net/LobbyCoordinator.ts#L26) | - |
| `LobbyCoordinator.startRoomPolling` | `method` | [`game/src/net/LobbyCoordinator.ts:116`](../../game/src/net/LobbyCoordinator.ts#L116) | - |
| `LobbyCoordinator.stopRoomPolling` | `method` | [`game/src/net/LobbyCoordinator.ts:132`](../../game/src/net/LobbyCoordinator.ts#L132) | - |
| `LobbyPlayerInfo` | `interface` | [`game/src/shared/types/network.ts:151`](../../game/src/shared/types/network.ts#L151) | - |
| `LobbyScreen` | `class` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:58`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L58) | - |
| `LobbyScreen.bindElements` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:88`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L88) | - |
| `LobbyScreen.bindEvents` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:90`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L90) | - |
| `LobbyScreen.getHeroAvatar` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:328`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L328) | - |
| `LobbyScreen.getHeroIcon` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:305`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L305) | - |
| `LobbyScreen.getHeroName` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:309`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L309) | - |
| `LobbyScreen.getTemplate` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:84`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L84) | - |
| `LobbyScreen.hideHostLobby` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:140`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L140) | - |
| `LobbyScreen.hideJoinLobby` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:596`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L596) | - |
| `LobbyScreen.hidePasswordPrompt` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:437`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L437) | - |
| `LobbyScreen.renderAvailableRooms` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:473`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L473) | - |
| `LobbyScreen.renderHostRoster` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:175`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L175) | - |
| `LobbyScreen.renderJoinRoster` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:227`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L227) | - |
| `LobbyScreen.renderRosterGrid` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:252`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L252) | - |
| `LobbyScreen.setCoopBadge` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:612`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L612) | - |
| `LobbyScreen.setGuestConnectedMode` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:345`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L345) | - |
| `LobbyScreen.setHostPartnerConnected` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:147`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L147) | - |
| `LobbyScreen.setJoinStatus` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:605`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L605) | - |
| `LobbyScreen.showHostLobby` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:96`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L96) | - |
| `LobbyScreen.showJoinLobby` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:558`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L558) | - |
| `LobbyScreen.showPasswordPrompt` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:418`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L418) | - |
| `LobbyScreen.showPasswordPromptError` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:446`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L446) | - |
| `LobbyScreen.submitPasswordPrompt` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:457`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L457) | - |
| `LobbyScreen.switchJoinTab` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:395`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L395) | - |
| `LobbyScreen.updateGuestReadyButtonUI` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:332`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L332) | - |
| `LobbyScreen.updateLobbyHeroesLockStatus` | `method` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:622`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L622) | - |
| `LobbyScreenElements` | `interface` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:9`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L9) | - |
| `LobbyScreenOptions` | `interface` | [`game/src/ui/screens/Lobby/LobbyScreen.ts:47`](../../game/src/ui/screens/Lobby/LobbyScreen.ts#L47) | - |
| `LobbyUI` | `class` | [`game/src/ui/modules/LobbyUI.ts:13`](../../game/src/ui/modules/LobbyUI.ts#L13) | - |
| `LobbyUIContext` | `type` | [`game/src/ui/modules/LobbyUI.ts:8`](../../game/src/ui/modules/LobbyUI.ts#L8) | - |
| `LobbyUIElements` | `type` | [`game/src/ui/modules/LobbyUI.ts:7`](../../game/src/ui/modules/LobbyUI.ts#L7) | - |
| `LobbyUpdateMessage` | `interface` | [`game/src/shared/types/network.ts:241`](../../game/src/shared/types/network.ts#L241) | - |
| `MainMenuScreen` | `class` | [`game/src/ui/screens/MainMenu/MainMenuScreen.ts:22`](../../game/src/ui/screens/MainMenu/MainMenuScreen.ts#L22) | Modular Main Menu Screen (Dark ARPG Rift UI). Coordinates singleplayer star... |
| `MainMenuScreen.bindElements` | `method` | [`game/src/ui/screens/MainMenu/MainMenuScreen.ts:48`](../../game/src/ui/screens/MainMenu/MainMenuScreen.ts#L48) | - |
| `MainMenuScreen.bindEvents` | `method` | [`game/src/ui/screens/MainMenu/MainMenuScreen.ts:50`](../../game/src/ui/screens/MainMenu/MainMenuScreen.ts#L50) | - |
| `MainMenuScreen.destroy` | `method` | [`game/src/ui/screens/MainMenu/MainMenuScreen.ts:141`](../../game/src/ui/screens/MainMenu/MainMenuScreen.ts#L141) | - |
| `MainMenuScreen.getTemplate` | `method` | [`game/src/ui/screens/MainMenu/MainMenuScreen.ts:44`](../../game/src/ui/screens/MainMenu/MainMenuScreen.ts#L44) | - |
| `MainMenuScreen.onHide` | `method` | [`game/src/ui/screens/MainMenu/MainMenuScreen.ts:137`](../../game/src/ui/screens/MainMenu/MainMenuScreen.ts#L137) | - |
| `MainMenuScreen.onShow` | `method` | [`game/src/ui/screens/MainMenu/MainMenuScreen.ts:130`](../../game/src/ui/screens/MainMenu/MainMenuScreen.ts#L130) | - |
| `MainMenuScreen.updateAuthDisplay` | `method` | [`game/src/ui/screens/MainMenu/MainMenuScreen.ts:100`](../../game/src/ui/screens/MainMenu/MainMenuScreen.ts#L100) | - |
| `MainMenuScreen.updateCrystalsDisplay` | `method` | [`game/src/ui/screens/MainMenu/MainMenuScreen.ts:92`](../../game/src/ui/screens/MainMenu/MainMenuScreen.ts#L92) | - |
| `MainMenuScreenOptions` | `interface` | [`game/src/ui/screens/MainMenu/MainMenuScreen.ts:7`](../../game/src/ui/screens/MainMenu/MainMenuScreen.ts#L7) | - |
| `MapManager` | `class` | [`game/src/ui/MapManager.ts:22`](../../game/src/ui/MapManager.ts#L22) | - |
| `MapManager.applyOverlayMode` | `method` | [`game/src/ui/MapManager.ts:122`](../../game/src/ui/MapManager.ts#L122) | - |
| `MapManager.bindEvents` | `method` | [`game/src/ui/MapManager.ts:144`](../../game/src/ui/MapManager.ts#L144) | - |
| `MapManager.clear` | `method` | [`game/src/ui/MapManager.ts:1161`](../../game/src/ui/MapManager.ts#L1161) | - |
| `MapManager.close` | `method` | [`game/src/ui/MapManager.ts:230`](../../game/src/ui/MapManager.ts#L230) | - |
| `MapManager.open` | `method` | [`game/src/ui/MapManager.ts:219`](../../game/src/ui/MapManager.ts#L219) | - |
| `MapManager.renderCenterSquareMap` | `method` | [`game/src/ui/MapManager.ts:685`](../../game/src/ui/MapManager.ts#L685) | Renders the square full-world interactive overlay map (Diablo / PoE TAB sty... |
| `MapManager.renderFullMap` | `method` | [`game/src/ui/MapManager.ts:708`](../../game/src/ui/MapManager.ts#L708) | Renders the full-screen vintage parchment surveyor map (TAB). |
| `MapManager.renderMinimap` | `method` | [`game/src/ui/MapManager.ts:311`](../../game/src/ui/MapManager.ts#L311) | Renders the real-time circular Minimap in the corner of the screen. |
| `MapManager.setChestManager` | `method` | [`game/src/ui/MapManager.ts:239`](../../game/src/ui/MapManager.ts#L239) | - |
| `MapManager.setMerchantManager` | `method` | [`game/src/ui/MapManager.ts:247`](../../game/src/ui/MapManager.ts#L247) | - |
| `MapManager.setRiftTeleporter` | `method` | [`game/src/ui/MapManager.ts:243`](../../game/src/ui/MapManager.ts#L243) | - |
| `MapManager.setSeed` | `method` | [`game/src/ui/MapManager.ts:39`](../../game/src/ui/MapManager.ts#L39) | - |
| `MapManager.toggle` | `method` | [`game/src/ui/MapManager.ts:210`](../../game/src/ui/MapManager.ts#L210) | - |
| `MapManager.toggleCenterOverlay` | `method` | [`game/src/ui/MapManager.ts:116`](../../game/src/ui/MapManager.ts#L116) | - |
| `MapManager.update` | `method` | [`game/src/ui/MapManager.ts:251`](../../game/src/ui/MapManager.ts#L251) | - |
| `matchesSearch` | `function` | [`admin/src/ui/filter.ts:9`](../../admin/src/ui/filter.ts#L9) | Smart search filter for balance entities. Supports fuzzy matching across: -... |
| `MeleeAttackEffects` | `class` | [`game/src/combat/MeleeAttackEffects.ts:27`](../../game/src/combat/MeleeAttackEffects.ts#L27) | Bounded, reusable effects for both local attacks and relayed co-op attacks. |
| `MeleeAttackEffects.animate` | `method` | [`game/src/combat/MeleeAttackEffects.ts:77`](../../game/src/combat/MeleeAttackEffects.ts#L77) | - |
| `MeleeAttackEffects.arc` | `method` | [`game/src/combat/MeleeAttackEffects.ts:108`](../../game/src/combat/MeleeAttackEffects.ts#L108) | - |
| `MeleeAttackEffects.blade` | `method` | [`game/src/combat/MeleeAttackEffects.ts:115`](../../game/src/combat/MeleeAttackEffects.ts#L115) | - |
| `MeleeAttackEffects.clear` | `method` | [`game/src/combat/MeleeAttackEffects.ts:68`](../../game/src/combat/MeleeAttackEffects.ts#L68) | - |
| `MeleeAttackEffects.createSlot` | `method` | [`game/src/combat/MeleeAttackEffects.ts:153`](../../game/src/combat/MeleeAttackEffects.ts#L153) | - |
| `MeleeAttackEffects.flail` | `method` | [`game/src/combat/MeleeAttackEffects.ts:129`](../../game/src/combat/MeleeAttackEffects.ts#L129) | - |
| `MeleeAttackEffects.material` | `method` | [`game/src/combat/MeleeAttackEffects.ts:92`](../../game/src/combat/MeleeAttackEffects.ts#L92) | - |
| `MeleeAttackEffects.mesh` | `method` | [`game/src/combat/MeleeAttackEffects.ts:101`](../../game/src/combat/MeleeAttackEffects.ts#L101) | - |
| `MeleeAttackEffects.play` | `method` | [`game/src/combat/MeleeAttackEffects.ts:33`](../../game/src/combat/MeleeAttackEffects.ts#L33) | - |
| `MeleeAttackEffects.update` | `method` | [`game/src/combat/MeleeAttackEffects.ts:56`](../../game/src/combat/MeleeAttackEffects.ts#L56) | - |
| `MeleeAttackInfo` | `interface` | [`game/src/shared/types/combat.ts:4`](../../game/src/shared/types/combat.ts#L4) | Cosmetic attack data; never participates in damage or collision checks. |
| `MeleeWeaponId` | `type` | [`game/src/shared/types/combat.ts:1`](../../game/src/shared/types/combat.ts#L1) | - |
| `MerchantAndChestUI` | `class` | [`game/src/ui/modules/MerchantAndChestUI.ts:8`](../../game/src/ui/modules/MerchantAndChestUI.ts#L8) | - |
| `MerchantAndChestUI.hideChestChoice` | `method` | [`game/src/ui/modules/MerchantAndChestUI.ts:225`](../../game/src/ui/modules/MerchantAndChestUI.ts#L225) | - |
| `MerchantAndChestUI.hideMerchant` | `method` | [`game/src/ui/modules/MerchantAndChestUI.ts:76`](../../game/src/ui/modules/MerchantAndChestUI.ts#L76) | - |
| `MerchantAndChestUI.isMerchantOpen` | `method` | [`game/src/ui/modules/MerchantAndChestUI.ts:44`](../../game/src/ui/modules/MerchantAndChestUI.ts#L44) | - |
| `MerchantAndChestUI.renderMerchantItems` | `method` | [`game/src/ui/modules/MerchantAndChestUI.ts:97`](../../game/src/ui/modules/MerchantAndChestUI.ts#L97) | - |
| `MerchantAndChestUI.showMerchant` | `method` | [`game/src/ui/modules/MerchantAndChestUI.ts:48`](../../game/src/ui/modules/MerchantAndChestUI.ts#L48) | - |
| `MerchantAndChestUI.updateMerchantTimer` | `method` | [`game/src/ui/modules/MerchantAndChestUI.ts:87`](../../game/src/ui/modules/MerchantAndChestUI.ts#L87) | - |
| `MerchantItemStock` | `interface` | [`game/src/world/MerchantManager.ts:22`](../../game/src/world/MerchantManager.ts#L22) | - |
| `MerchantManager` | `class` | [`game/src/world/MerchantManager.ts:34`](../../game/src/world/MerchantManager.ts#L34) | - |
| `MerchantManager.buyItem` | `method` | [`game/src/world/MerchantManager.ts:358`](../../game/src/world/MerchantManager.ts#L358) | - |
| `MerchantManager.createVisuals` | `method` | [`game/src/world/MerchantManager.ts:68`](../../game/src/world/MerchantManager.ts#L68) | - |
| `MerchantManager.despawn` | `method` | [`game/src/world/MerchantManager.ts:196`](../../game/src/world/MerchantManager.ts#L196) | - |
| `MerchantManager.generateStock` | `method` | [`game/src/world/MerchantManager.ts:208`](../../game/src/world/MerchantManager.ts#L208) | - |
| `MerchantManager.getInteraction` | `method` | [`game/src/world/MerchantManager.ts:329`](../../game/src/world/MerchantManager.ts#L329) | - |
| `MerchantManager.isSold` | `method` | [`game/src/world/MerchantManager.ts:346`](../../game/src/world/MerchantManager.ts#L346) | - |
| `MerchantManager.reset` | `method` | [`game/src/world/MerchantManager.ts:422`](../../game/src/world/MerchantManager.ts#L422) | - |
| `MerchantManager.spawn` | `method` | [`game/src/world/MerchantManager.ts:172`](../../game/src/world/MerchantManager.ts#L172) | - |
| `MerchantManager.update` | `method` | [`game/src/world/MerchantManager.ts:132`](../../game/src/world/MerchantManager.ts#L132) | - |
| `META_BRANCHES` | `const` | [`game/src/meta/MetaProgression.ts:62`](../../game/src/meta/MetaProgression.ts#L62) | - |
| `MetaBonuses` | `interface` | [`game/src/meta/MetaProgression.ts:17`](../../game/src/meta/MetaProgression.ts#L17) | - |
| `MetaBranchDef` | `interface` | [`game/src/meta/MetaProgression.ts:7`](../../game/src/meta/MetaProgression.ts#L7) | - |
| `MetaBranchId` | `type` | [`game/src/meta/MetaProgression.ts:5`](../../game/src/meta/MetaProgression.ts#L5) | - |
| `MetaProgression` | `class` | [`game/src/meta/MetaProgression.ts:128`](../../game/src/meta/MetaProgression.ts#L128) | - |
| `MetaProgression.addCrystals` | `method` | [`game/src/meta/MetaProgression.ts:256`](../../game/src/meta/MetaProgression.ts#L256) | - |
| `MetaProgression.canAffordTalent` | `method` | [`game/src/meta/MetaProgression.ts:288`](../../game/src/meta/MetaProgression.ts#L288) | - |
| `MetaProgression.getBonuses` | `method` | [`game/src/meta/MetaProgression.ts:335`](../../game/src/meta/MetaProgression.ts#L335) | - |
| `MetaProgression.getBranchTalents` | `method` | [`game/src/meta/MetaProgression.ts:267`](../../game/src/meta/MetaProgression.ts#L267) | - |
| `MetaProgression.getCrystals` | `method` | [`game/src/meta/MetaProgression.ts:215`](../../game/src/meta/MetaProgression.ts#L215) | - |
| `MetaProgression.getInstance` | `method` | [`game/src/meta/MetaProgression.ts:137`](../../game/src/meta/MetaProgression.ts#L137) | - |
| `MetaProgression.getLifetimeCrystals` | `method` | [`game/src/meta/MetaProgression.ts:219`](../../game/src/meta/MetaProgression.ts#L219) | - |
| `MetaProgression.getState` | `method` | [`game/src/meta/MetaProgression.ts:227`](../../game/src/meta/MetaProgression.ts#L227) | - |
| `MetaProgression.getTalentConfig` | `method` | [`game/src/meta/MetaProgression.ts:263`](../../game/src/meta/MetaProgression.ts#L263) | - |
| `MetaProgression.getTalentLevel` | `method` | [`game/src/meta/MetaProgression.ts:275`](../../game/src/meta/MetaProgression.ts#L275) | - |
| `MetaProgression.getTalentNextCost` | `method` | [`game/src/meta/MetaProgression.ts:279`](../../game/src/meta/MetaProgression.ts#L279) | - |
| `MetaProgression.getTotalSpentCrystals` | `method` | [`game/src/meta/MetaProgression.ts:305`](../../game/src/meta/MetaProgression.ts#L305) | - |
| `MetaProgression.getTotalTalentPoints` | `method` | [`game/src/meta/MetaProgression.ts:319`](../../game/src/meta/MetaProgression.ts#L319) | - |
| `MetaProgression.getUpgrades` | `method` | [`game/src/meta/MetaProgression.ts:223`](../../game/src/meta/MetaProgression.ts#L223) | - |
| `MetaProgression.loadExternalState` | `method` | [`game/src/meta/MetaProgression.ts:236`](../../game/src/meta/MetaProgression.ts#L236) | - |
| `MetaProgression.loadState` | `method` | [`game/src/meta/MetaProgression.ts:144`](../../game/src/meta/MetaProgression.ts#L144) | - |
| `MetaProgression.notify` | `method` | [`game/src/meta/MetaProgression.ts:392`](../../game/src/meta/MetaProgression.ts#L392) | - |
| `MetaProgression.onChange` | `method` | [`game/src/meta/MetaProgression.ts:385`](../../game/src/meta/MetaProgression.ts#L385) | - |
| `MetaProgression.resetAllProgress` | `method` | [`game/src/meta/MetaProgression.ts:249`](../../game/src/meta/MetaProgression.ts#L249) | - |
| `MetaProgression.respecAll` | `method` | [`game/src/meta/MetaProgression.ts:327`](../../game/src/meta/MetaProgression.ts#L327) | - |
| `MetaProgression.saveState` | `method` | [`game/src/meta/MetaProgression.ts:204`](../../game/src/meta/MetaProgression.ts#L204) | - |
| `MetaProgression.upgradeTalent` | `method` | [`game/src/meta/MetaProgression.ts:294`](../../game/src/meta/MetaProgression.ts#L294) | - |
| `MetaProgressionSave` | `interface` | [`game/src/meta/MetaProgression.ts:55`](../../game/src/meta/MetaProgression.ts#L55) | - |
| `ModalManager` | `class` | [`admin/src/ui/modal.ts:3`](../../admin/src/ui/modal.ts#L3) | - |
| `ModalManager.bindEvents` | `method` | [`admin/src/ui/modal.ts:13`](../../admin/src/ui/modal.ts#L13) | - |
| `ModalManager.closeReviewModal` | `method` | [`admin/src/ui/modal.ts:58`](../../admin/src/ui/modal.ts#L58) | - |
| `ModalManager.openReviewModal` | `method` | [`admin/src/ui/modal.ts:21`](../../admin/src/ui/modal.ts#L21) | - |
| `MONSTER_COLORS` | `const` | [`admin/src/constants.ts:70`](../../admin/src/constants.ts#L70) | - |
| `MonsterBalanceConfig` | `interface` | [`game/src/balance/BalanceTypes.ts:50`](../../game/src/balance/BalanceTypes.ts#L50) | - |
| `MonsterTextures` | `interface` | [`game/src/core/TextureManager.ts:39`](../../game/src/core/TextureManager.ts#L39) | - |
| `NetBuffInfo` | `interface` | [`game/src/shared/types/network.ts:46`](../../game/src/shared/types/network.ts#L46) | - |
| `NetEvent` | `interface` | [`game/src/shared/types/network.ts:112`](../../game/src/shared/types/network.ts#L112) | - |
| `NetMessage` | `type` | [`game/src/shared/types/network.ts:260`](../../game/src/shared/types/network.ts#L260) | - |
| `NetRole` | `type` | [`game/src/shared/types/network.ts:19`](../../game/src/shared/types/network.ts#L19) | - |
| `NetShotInfo` | `interface` | [`game/src/shared/types/network.ts:87`](../../game/src/shared/types/network.ts#L87) | - |
| `NetWeaponInfo` | `interface` | [`game/src/shared/types/network.ts:39`](../../game/src/shared/types/network.ts#L39) | - |
| `NetworkManager` | `class` | [`game/src/net/NetworkManager.ts:70`](../../game/src/net/NetworkManager.ts#L70) | - |
| `NetworkManager.broadcastLobbyUpdate` | `method` | [`game/src/net/NetworkManager.ts:504`](../../game/src/net/NetworkManager.ts#L504) | - |
| `NetworkManager.createRoom` | `method` | [`game/src/net/NetworkManager.ts:148`](../../game/src/net/NetworkManager.ts#L148) | Host creates a new multiplayer room for up to 5 players. |
| `NetworkManager.generateRoomCode` | `method` | [`game/src/net/NetworkManager.ts:138`](../../game/src/net/NetworkManager.ts#L138) | Generates a 6-character memorable Western room code like "WEST-48" or "COLT... |
| `NetworkManager.getDebugStats` | `method` | [`game/src/net/NetworkManager.ts:1159`](../../game/src/net/NetworkManager.ts#L1159) | - |
| `NetworkManager.handleDisconnect` | `method` | [`game/src/net/NetworkManager.ts:1197`](../../game/src/net/NetworkManager.ts#L1197) | - |
| `NetworkManager.handleIncomingGuestConnection` | `method` | [`game/src/net/NetworkManager.ts:431`](../../game/src/net/NetworkManager.ts#L431) | Host handles a new guest connecting. |
| `NetworkManager.handleRawMessage` | `method` | [`game/src/net/NetworkManager.ts:516`](../../game/src/net/NetworkManager.ts#L516) | - |
| `NetworkManager.joinRoom` | `method` | [`game/src/net/NetworkManager.ts:296`](../../game/src/net/NetworkManager.ts#L296) | Guest joins an existing room by code. |
| `NetworkManager.notifyAltarCaptured` | `method` | [`game/src/net/NetworkManager.ts:1033`](../../game/src/net/NetworkManager.ts#L1033) | - |
| `NetworkManager.notifyChestOpened` | `method` | [`game/src/net/NetworkManager.ts:1039`](../../game/src/net/NetworkManager.ts#L1039) | - |
| `NetworkManager.notifyStatus` | `method` | [`game/src/net/NetworkManager.ts:1209`](../../game/src/net/NetworkManager.ts#L1209) | - |
| `NetworkManager.pollWebRtcStats` | `method` | [`game/src/net/NetworkManager.ts:1105`](../../game/src/net/NetworkManager.ts#L1105) | - |
| `NetworkManager.removeGuest` | `method` | [`game/src/net/NetworkManager.ts:486`](../../game/src/net/NetworkManager.ts#L486) | - |
| `NetworkManager.reset` | `method` | [`game/src/net/NetworkManager.ts:1215`](../../game/src/net/NetworkManager.ts#L1215) | - |
| `NetworkManager.send` | `method` | [`game/src/net/NetworkManager.ts:896`](../../game/src/net/NetworkManager.ts#L896) | Broadcasts a network message across active channels (WebRTC and/or Broadcas... |
| `NetworkManager.sendToPeer` | `method` | [`game/src/net/NetworkManager.ts:957`](../../game/src/net/NetworkManager.ts#L957) | Sends a targeted message to a specific peer or host. |
| `NetworkManager.setHero` | `method` | [`game/src/net/NetworkManager.ts:999`](../../game/src/net/NetworkManager.ts#L999) | - |
| `NetworkManager.setPassword` | `method` | [`game/src/net/NetworkManager.ts:285`](../../game/src/net/NetworkManager.ts#L285) | Sets or clears room password on an active host. |
| `NetworkManager.setReady` | `method` | [`game/src/net/NetworkManager.ts:1018`](../../game/src/net/NetworkManager.ts#L1018) | - |
| `NetworkManager.startGame` | `method` | [`game/src/net/NetworkManager.ts:1043`](../../game/src/net/NetworkManager.ts#L1043) | - |
| `NetworkManager.startPingLoop` | `method` | [`game/src/net/NetworkManager.ts:1058`](../../game/src/net/NetworkManager.ts#L1058) | - |
| `NetworkManager.updateBandwidth` | `method` | [`game/src/net/NetworkManager.ts:1091`](../../game/src/net/NetworkManager.ts#L1091) | - |
| `Obstacle` | `interface` | [`game/src/world/ObstacleManager.ts:3`](../../game/src/world/ObstacleManager.ts#L3) | - |
| `ObstacleManager` | `class` | [`game/src/world/ObstacleManager.ts:15`](../../game/src/world/ObstacleManager.ts#L15) | - |
| `ObstacleManager.addObstacle` | `method` | [`game/src/world/ObstacleManager.ts:33`](../../game/src/world/ObstacleManager.ts#L33) | Registers an obstacle under a chunk key (spatially hashed by obstacle world... |
| `ObstacleManager.clear` | `method` | [`game/src/world/ObstacleManager.ts:64`](../../game/src/world/ObstacleManager.ts#L64) | Clears all obstacles (for game restart). |
| `ObstacleManager.getObstaclesForChunkKey` | `method` | [`game/src/world/ObstacleManager.ts:56`](../../game/src/world/ObstacleManager.ts#L56) | Returns list of obstacles registered for a chunk key. |
| `ObstacleManager.parseKey` | `method` | [`game/src/world/ObstacleManager.ts:23`](../../game/src/world/ObstacleManager.ts#L23) | - |
| `ObstacleManager.removeChunkObstacles` | `method` | [`game/src/world/ObstacleManager.ts:48`](../../game/src/world/ObstacleManager.ts#L48) | Removes all obstacles belonging to an unloaded chunk. |
| `ObstacleManager.toHash` | `method` | [`game/src/world/ObstacleManager.ts:19`](../../game/src/world/ObstacleManager.ts#L19) | - |
| `ObstacleType` | `type` | [`game/src/world/ObstacleManager.ts:1`](../../game/src/world/ObstacleManager.ts#L1) | - |
| `OccupiedArea` | `interface` | [`game/src/world/ChunkManager.ts:22`](../../game/src/world/ChunkManager.ts#L22) | - |
| `ONE_MONTH_MS` | `const` | [`game/src/auth/AuthManager.ts:20`](../../game/src/auth/AuthManager.ts#L20) | - |
| `packHostSnapshot` | `function` | [`game/src/net/BinarySnapshot.ts:47`](../../game/src/net/BinarySnapshot.ts#L47) | Packs a HostSnapshotMessage into an ultra-compact binary ArrayBuffer. Reduc... |
| `PASSIVE_BUFF_IDS` | `const` | [`game/src/drops/PassiveBuffs.ts:62`](../../game/src/drops/PassiveBuffs.ts#L62) | - |
| `PASSIVE_BUFFS` | `const` | [`game/src/drops/PassiveBuffs.ts:17`](../../game/src/drops/PassiveBuffs.ts#L17) | - |
| `PassiveBalanceConfig` | `interface` | [`game/src/balance/BalanceTypes.ts:69`](../../game/src/balance/BalanceTypes.ts#L69) | - |
| `PassiveBuffDef` | `interface` | [`game/src/drops/PassiveBuffs.ts:10`](../../game/src/drops/PassiveBuffs.ts#L10) | - |
| `PassiveBuffId` | `type` | [`game/src/drops/PassiveBuffs.ts:1`](../../game/src/drops/PassiveBuffs.ts#L1) | - |
| `Player` | `class` | [`game/src/entities/Player.ts:58`](../../game/src/entities/Player.ts#L58) | - |
| `PLAYER_COLORS` | `const` | [`game/src/shared/types/network.ts:163`](../../game/src/shared/types/network.ts#L163) | - |
| `Player.addAmplifierBonus` | `method` | [`game/src/entities/Player.ts:647`](../../game/src/entities/Player.ts#L647) | - |
| `Player.addBuff` | `method` | [`game/src/entities/Player.ts:532`](../../game/src/entities/Player.ts#L532) | - |
| `Player.addCooldownReduction` | `method` | [`game/src/entities/Player.ts:666`](../../game/src/entities/Player.ts#L666) | - |
| `Player.addDamageReduction` | `method` | [`game/src/entities/Player.ts:664`](../../game/src/entities/Player.ts#L664) | - |
| `Player.addFlaskBonus` | `method` | [`game/src/entities/Player.ts:673`](../../game/src/entities/Player.ts#L673) | - |
| `Player.addHpRegen` | `method` | [`game/src/entities/Player.ts:663`](../../game/src/entities/Player.ts#L663) | - |
| `Player.addLevel` | `method` | [`game/src/entities/Player.ts:1162`](../../game/src/entities/Player.ts#L1162) | - |
| `Player.addMagnetBonus` | `method` | [`game/src/entities/Player.ts:680`](../../game/src/entities/Player.ts#L680) | - |
| `Player.addMightElixirBonus` | `method` | [`game/src/entities/Player.ts:648`](../../game/src/entities/Player.ts#L648) | - |
| `Player.addRiftItem` | `method` | [`game/src/entities/Player.ts:544`](../../game/src/entities/Player.ts#L544) | - |
| `Player.addSpeedBonus` | `method` | [`game/src/entities/Player.ts:662`](../../game/src/entities/Player.ts#L662) | - |
| `Player.addSpeedBootsBonus` | `method` | [`game/src/entities/Player.ts:661`](../../game/src/entities/Player.ts#L661) | - |
| `Player.applyBurn` | `method` | [`game/src/entities/Player.ts:126`](../../game/src/entities/Player.ts#L126) | - |
| `Player.applyCharacterPerks` | `method` | [`game/src/entities/Player.ts:465`](../../game/src/entities/Player.ts#L465) | - |
| `Player.applyPassiveBuff` | `method` | [`game/src/entities/Player.ts:718`](../../game/src/entities/Player.ts#L718) | - |
| `Player.applyShock` | `method` | [`game/src/entities/Player.ts:131`](../../game/src/entities/Player.ts#L131) | - |
| `Player.applySlow` | `method` | [`game/src/entities/Player.ts:136`](../../game/src/entities/Player.ts#L136) | - |
| `Player.areAllWeaponsMaxed` | `method` | [`game/src/entities/Player.ts:1123`](../../game/src/entities/Player.ts#L1123) | - |
| `Player.calculateXpToNextLevel` | `method` | [`game/src/entities/Player.ts:1158`](../../game/src/entities/Player.ts#L1158) | - |
| `Player.clearWeapons` | `method` | [`game/src/entities/Player.ts:452`](../../game/src/entities/Player.ts#L452) | - |
| `Player.destroy` | `method` | [`game/src/entities/Player.ts:1254`](../../game/src/entities/Player.ts#L1254) | - |
| `Player.fullHeal` | `method` | [`game/src/entities/Player.ts:1092`](../../game/src/entities/Player.ts#L1092) | - |
| `Player.gainXp` | `method` | [`game/src/entities/Player.ts:1170`](../../game/src/entities/Player.ts#L1170) | onLevelGained queues upgrades; the returned count is for visual feedback on... |
| `Player.getAwakenedCap` | `method` | [`game/src/entities/Player.ts:1119`](../../game/src/entities/Player.ts#L1119) | - |
| `Player.getBuffsNetState` | `method` | [`game/src/entities/Player.ts:1287`](../../game/src/entities/Player.ts#L1287) | - |
| `Player.getCharacterGeometry` | `method` | [`game/src/entities/Player.ts:208`](../../game/src/entities/Player.ts#L208) | - |
| `Player.getDamageMultiplier` | `method` | [`game/src/entities/Player.ts:634`](../../game/src/entities/Player.ts#L634) | Calculates effective damage multiplier for a given weapon. Per rule: initia... |
| `Player.getItemStacks` | `method` | [`game/src/entities/Player.ts:540`](../../game/src/entities/Player.ts#L540) | - |
| `Player.getNaniteDamageReduction` | `method` | [`game/src/entities/Player.ts:687`](../../game/src/entities/Player.ts#L687) | Calculates damage reduction provided by Nanite Plating (Нано-Броня). Level ... |
| `Player.getWeaponsNetState` | `method` | [`game/src/entities/Player.ts:1278`](../../game/src/entities/Player.ts#L1278) | - |
| `Player.giveAllWeapons` | `method` | [`game/src/entities/Player.ts:1128`](../../game/src/entities/Player.ts#L1128) | - |
| `Player.hasBuff` | `method` | [`game/src/entities/Player.ts:536`](../../game/src/entities/Player.ts#L536) | - |
| `Player.heal` | `method` | [`game/src/entities/Player.ts:1087`](../../game/src/entities/Player.ts#L1087) | - |
| `Player.isAnimatedCharacter` | `method` | [`game/src/entities/Player.ts:351`](../../game/src/entities/Player.ts#L351) | - |
| `Player.isStatMaxedForItem` | `method` | [`game/src/entities/Player.ts:693`](../../game/src/entities/Player.ts#L693) | - |
| `Player.loadCharacterTextures` | `method` | [`game/src/entities/Player.ts:355`](../../game/src/entities/Player.ts#L355) | - |
| `Player.maxAllWeapons` | `method` | [`game/src/entities/Player.ts:1150`](../../game/src/entities/Player.ts#L1150) | - |
| `Player.recalculateStats` | `method` | [`game/src/entities/Player.ts:589`](../../game/src/entities/Player.ts#L589) | - |
| `Player.recordWeaponDamage` | `method` | [`game/src/entities/Player.ts:650`](../../game/src/entities/Player.ts#L650) | - |
| `Player.redrawOverhead` | `method` | [`game/src/entities/Player.ts:1232`](../../game/src/entities/Player.ts#L1232) | - |
| `Player.removeRiftItem` | `method` | [`game/src/entities/Player.ts:555`](../../game/src/entities/Player.ts#L555) | - |
| `Player.reset` | `method` | [`game/src/entities/Player.ts:1187`](../../game/src/entities/Player.ts#L1187) | - |
| `Player.revive` | `method` | [`game/src/entities/Player.ts:1068`](../../game/src/entities/Player.ts#L1068) | - |
| `Player.setCharacter` | `method` | [`game/src/entities/Player.ts:392`](../../game/src/entities/Player.ts#L392) | - |
| `Player.setDirection` | `method` | [`game/src/entities/Player.ts:416`](../../game/src/entities/Player.ts#L416) | - |
| `Player.setupAuras` | `method` | [`game/src/entities/Player.ts:295`](../../game/src/entities/Player.ts#L295) | - |
| `Player.syncBalance` | `method` | [`game/src/entities/Player.ts:512`](../../game/src/entities/Player.ts#L512) | - |
| `Player.takeDamage` | `method` | [`game/src/entities/Player.ts:996`](../../game/src/entities/Player.ts#L996) | - |
| `Player.toggleGodMode` | `method` | [`game/src/entities/Player.ts:1096`](../../game/src/entities/Player.ts#L1096) | - |
| `Player.toggleOneHitKill` | `method` | [`game/src/entities/Player.ts:1111`](../../game/src/entities/Player.ts#L1111) | - |
| `Player.toggleSpeedCheat` | `method` | [`game/src/entities/Player.ts:1105`](../../game/src/entities/Player.ts#L1105) | - |
| `Player.triggerAttackAnim` | `method` | [`game/src/entities/Player.ts:428`](../../game/src/entities/Player.ts#L428) | - |
| `Player.triggerDash` | `method` | [`game/src/entities/Player.ts:571`](../../game/src/entities/Player.ts#L571) | - |
| `Player.updateAnimatedCharacterAnimation` | `method` | [`game/src/entities/Player.ts:979`](../../game/src/entities/Player.ts#L979) | - |
| `PlayerAnimation` | `class` | [`game/src/mechanics/player/PlayerAnimation.ts:21`](../../game/src/mechanics/player/PlayerAnimation.ts#L21) | Handles sprite direction, sheet animations (IDLE, WALK, ATTACK), texture lo... |
| `PlayerAnimation.isAnimatedCharacter` | `method` | [`game/src/mechanics/player/PlayerAnimation.ts:78`](../../game/src/mechanics/player/PlayerAnimation.ts#L78) | - |
| `PlayerAnimation.loadCharacterTextures` | `method` | [`game/src/mechanics/player/PlayerAnimation.ts:82`](../../game/src/mechanics/player/PlayerAnimation.ts#L82) | - |
| `PlayerAnimation.loadTextures` | `method` | [`game/src/mechanics/player/PlayerAnimation.ts:40`](../../game/src/mechanics/player/PlayerAnimation.ts#L40) | - |
| `PlayerAnimation.setDirection` | `method` | [`game/src/mechanics/player/PlayerAnimation.ts:92`](../../game/src/mechanics/player/PlayerAnimation.ts#L92) | - |
| `PlayerAnimation.triggerAttackAnim` | `method` | [`game/src/mechanics/player/PlayerAnimation.ts:99`](../../game/src/mechanics/player/PlayerAnimation.ts#L99) | - |
| `PlayerAnimation.triggerHitFlash` | `method` | [`game/src/mechanics/player/PlayerAnimation.ts:146`](../../game/src/mechanics/player/PlayerAnimation.ts#L146) | - |
| `PlayerAnimationOptions` | `interface` | [`game/src/mechanics/player/PlayerAnimation.ts:10`](../../game/src/mechanics/player/PlayerAnimation.ts#L10) | - |
| `PlayerDamagePayload` | `interface` | [`game/src/mechanics/events/GameEventBus.ts:3`](../../game/src/mechanics/events/GameEventBus.ts#L3) | - |
| `PlayerDeathPayload` | `interface` | [`game/src/mechanics/events/GameEventBus.ts:29`](../../game/src/mechanics/events/GameEventBus.ts#L29) | - |
| `PlayerHealPayload` | `interface` | [`game/src/mechanics/events/GameEventBus.ts:10`](../../game/src/mechanics/events/GameEventBus.ts#L10) | - |
| `PlayerLevelUpPayload` | `interface` | [`game/src/mechanics/events/GameEventBus.ts:17`](../../game/src/mechanics/events/GameEventBus.ts#L17) | - |
| `PlayerMotor` | `class` | [`game/src/mechanics/player/PlayerMotor.ts:16`](../../game/src/mechanics/player/PlayerMotor.ts#L16) | Handles physics, movement calculations, terrain interactions, tactical dash... |
| `PlayerMotor.reset` | `method` | [`game/src/mechanics/player/PlayerMotor.ts:153`](../../game/src/mechanics/player/PlayerMotor.ts#L153) | - |
| `PlayerMotorOptions` | `interface` | [`game/src/mechanics/player/PlayerMotor.ts:5`](../../game/src/mechanics/player/PlayerMotor.ts#L5) | - |
| `PlayerNetState` | `interface` | [`game/src/shared/types/network.ts:55`](../../game/src/shared/types/network.ts#L55) | - |
| `PlayerOverheadData` | `interface` | [`game/src/entities/PlayerOverheadRenderer.ts:3`](../../game/src/entities/PlayerOverheadRenderer.ts#L3) | - |
| `PlayerProfileRow` | `interface` | [`game/src/meta/CloudSyncManager.ts:8`](../../game/src/meta/CloudSyncManager.ts#L8) | - |
| `PlayerStats` | `class` | [`game/src/mechanics/player/PlayerStats.ts:31`](../../game/src/mechanics/player/PlayerStats.ts#L31) | Encapsulates RPG stat computation, passive bonus scaling, dimishing returns... |
| `PlayerStats` | `interface` | [`game/src/shared/types/entities.ts:38`](../../game/src/shared/types/entities.ts#L38) | - |
| `PlayerStats.calculateXpToNextLevel` | `method` | [`game/src/mechanics/player/PlayerStats.ts:32`](../../game/src/mechanics/player/PlayerStats.ts#L32) | - |
| `PlayerStatsConfig` | `interface` | [`game/src/mechanics/player/PlayerStats.ts:6`](../../game/src/mechanics/player/PlayerStats.ts#L6) | - |
| `PlayerStatusManager` | `class` | [`game/src/entities/PlayerStatusManager.ts:1`](../../game/src/entities/PlayerStatusManager.ts#L1) | - |
| `PlayerStatusManager.applyBurn` | `method` | [`game/src/entities/PlayerStatusManager.ts:8`](../../game/src/entities/PlayerStatusManager.ts#L8) | - |
| `PlayerStatusManager.applyShock` | `method` | [`game/src/entities/PlayerStatusManager.ts:12`](../../game/src/entities/PlayerStatusManager.ts#L12) | - |
| `PlayerStatusManager.applySlow` | `method` | [`game/src/entities/PlayerStatusManager.ts:16`](../../game/src/entities/PlayerStatusManager.ts#L16) | - |
| `PlayerStatusManager.reset` | `method` | [`game/src/entities/PlayerStatusManager.ts:67`](../../game/src/entities/PlayerStatusManager.ts#L67) | - |
| `PlayerStatusManager.update` | `method` | [`game/src/entities/PlayerStatusManager.ts:42`](../../game/src/entities/PlayerStatusManager.ts#L42) | - |
| `PlayerTargetInfo` | `interface` | [`game/src/entities/EnemyManager.ts:13`](../../game/src/entities/EnemyManager.ts#L13) | - |
| `PlayerXpPayload` | `interface` | [`game/src/mechanics/events/GameEventBus.ts:23`](../../game/src/mechanics/events/GameEventBus.ts#L23) | - |
| `ProgressionChartState` | `interface` | [`admin/src/types.ts:31`](../../admin/src/types.ts#L31) | - |
| `ProgressionData` | `interface` | [`game/src/core/ProgressionManager.ts:34`](../../game/src/core/ProgressionManager.ts#L34) | - |
| `ProgressionManager` | `class` | [`game/src/core/ProgressionManager.ts:81`](../../game/src/core/ProgressionManager.ts#L81) | - |
| `ProgressionManager.addAccountXp` | `method` | [`game/src/core/ProgressionManager.ts:355`](../../game/src/core/ProgressionManager.ts#L355) | - |
| `ProgressionManager.addCoins` | `method` | [`game/src/core/ProgressionManager.ts:369`](../../game/src/core/ProgressionManager.ts#L369) | - |
| `ProgressionManager.advanceChapterQuestForTest` | `method` | [`game/src/core/ProgressionManager.ts:872`](../../game/src/core/ProgressionManager.ts#L872) | - |
| `ProgressionManager.buyElf` | `method` | [`game/src/core/ProgressionManager.ts:557`](../../game/src/core/ProgressionManager.ts#L557) | - |
| `ProgressionManager.canUnlockElfByAchievement` | `method` | [`game/src/core/ProgressionManager.ts:578`](../../game/src/core/ProgressionManager.ts#L578) | - |
| `ProgressionManager.checkAutoUnlocks` | `method` | [`game/src/core/ProgressionManager.ts:329`](../../game/src/core/ProgressionManager.ts#L329) | - |
| `ProgressionManager.claimChapterFinalReward` | `method` | [`game/src/core/ProgressionManager.ts:858`](../../game/src/core/ProgressionManager.ts#L858) | - |
| `ProgressionManager.claimChapterQuest` | `method` | [`game/src/core/ProgressionManager.ts:828`](../../game/src/core/ProgressionManager.ts#L828) | - |
| `ProgressionManager.claimSidebarQuest` | `method` | [`game/src/core/ProgressionManager.ts:505`](../../game/src/core/ProgressionManager.ts#L505) | - |
| `ProgressionManager.completeLeshyQuest` | `method` | [`game/src/core/ProgressionManager.ts:548`](../../game/src/core/ProgressionManager.ts#L548) | - |
| `ProgressionManager.getChapterQuestProgress` | `method` | [`game/src/core/ProgressionManager.ts:745`](../../game/src/core/ProgressionManager.ts#L745) | - |
| `ProgressionManager.getDailySidebarQuests` | `method` | [`game/src/core/ProgressionManager.ts:423`](../../game/src/core/ProgressionManager.ts#L423) | - |
| `ProgressionManager.getDefaultChapterQuestsProgress` | `method` | [`game/src/core/ProgressionManager.ts:117`](../../game/src/core/ProgressionManager.ts#L117) | - |
| `ProgressionManager.getDefaultData` | `method` | [`game/src/core/ProgressionManager.ts:127`](../../game/src/core/ProgressionManager.ts#L127) | - |
| `ProgressionManager.getDefaultProgressionData` | `method` | [`game/src/core/ProgressionManager.ts:263`](../../game/src/core/ProgressionManager.ts#L263) | - |
| `ProgressionManager.getHeroProgress` | `method` | [`game/src/core/ProgressionManager.ts:1101`](../../game/src/core/ProgressionManager.ts#L1101) | - |
| `ProgressionManager.getHeroQuestDefinition` | `method` | [`game/src/core/ProgressionManager.ts:909`](../../game/src/core/ProgressionManager.ts#L909) | - |
| `ProgressionManager.getInstance` | `method` | [`game/src/core/ProgressionManager.ts:102`](../../game/src/core/ProgressionManager.ts#L102) | - |
| `ProgressionManager.getWeeklySidebarQuests` | `method` | [`game/src/core/ProgressionManager.ts:464`](../../game/src/core/ProgressionManager.ts#L464) | - |
| `ProgressionManager.isChapterComplete` | `method` | [`game/src/core/ProgressionManager.ts:848`](../../game/src/core/ProgressionManager.ts#L848) | - |
| `ProgressionManager.isChapterRewardClaimed` | `method` | [`game/src/core/ProgressionManager.ts:854`](../../game/src/core/ProgressionManager.ts#L854) | - |
| `ProgressionManager.isHeroUnlocked` | `method` | [`game/src/core/ProgressionManager.ts:307`](../../game/src/core/ProgressionManager.ts#L307) | - |
| `ProgressionManager.loadExternalData` | `method` | [`game/src/core/ProgressionManager.ts:267`](../../game/src/core/ProgressionManager.ts#L267) | - |
| `ProgressionManager.loadFromStorage` | `method` | [`game/src/core/ProgressionManager.ts:175`](../../game/src/core/ProgressionManager.ts#L175) | - |
| `ProgressionManager.onSave` | `method` | [`game/src/core/ProgressionManager.ts:256`](../../game/src/core/ProgressionManager.ts#L256) | - |
| `ProgressionManager.progressLeshyStep` | `method` | [`game/src/core/ProgressionManager.ts:537`](../../game/src/core/ProgressionManager.ts#L537) | - |
| `ProgressionManager.recordAltarCaptured` | `method` | [`game/src/core/ProgressionManager.ts:604`](../../game/src/core/ProgressionManager.ts#L604) | - |
| `ProgressionManager.recordBossDefeat` | `method` | [`game/src/core/ProgressionManager.ts:723`](../../game/src/core/ProgressionManager.ts#L723) | - |
| `ProgressionManager.recordBossKilled` | `method` | [`game/src/core/ProgressionManager.ts:377`](../../game/src/core/ProgressionManager.ts#L377) | - |
| `ProgressionManager.recordBossSpawn` | `method` | [`game/src/core/ProgressionManager.ts:719`](../../game/src/core/ProgressionManager.ts#L719) | - |
| `ProgressionManager.recordCrawlerOrCoyoteKilled` | `method` | [`game/src/core/ProgressionManager.ts:632`](../../game/src/core/ProgressionManager.ts#L632) | - |
| `ProgressionManager.recordEnemyKilled` | `method` | [`game/src/core/ProgressionManager.ts:393`](../../game/src/core/ProgressionManager.ts#L393) | - |
| `ProgressionManager.recordForestGoldenChestOpened` | `method` | [`game/src/core/ProgressionManager.ts:642`](../../game/src/core/ProgressionManager.ts#L642) | - |
| `ProgressionManager.recordForestSurvivalTime` | `method` | [`game/src/core/ProgressionManager.ts:652`](../../game/src/core/ProgressionManager.ts#L652) | - |
| `ProgressionManager.recordLeshyDefeated` | `method` | [`game/src/core/ProgressionManager.ts:667`](../../game/src/core/ProgressionManager.ts#L667) | - |
| `ProgressionManager.recordMeleeOrSpellKill` | `method` | [`game/src/core/ProgressionManager.ts:584`](../../game/src/core/ProgressionManager.ts#L584) | --- Chapter Quests Tracking & Claiming --- |
| `ProgressionManager.recordMerchantPurchaseInRun` | `method` | [`game/src/core/ProgressionManager.ts:705`](../../game/src/core/ProgressionManager.ts#L705) | - |
| `ProgressionManager.recordRangedKill` | `method` | [`game/src/core/ProgressionManager.ts:735`](../../game/src/core/ProgressionManager.ts#L735) | - |
| `ProgressionManager.recordResourceGather` | `method` | [`game/src/core/ProgressionManager.ts:414`](../../game/src/core/ProgressionManager.ts#L414) | - |
| `ProgressionManager.recordRunCrit` | `method` | [`game/src/core/ProgressionManager.ts:677`](../../game/src/core/ProgressionManager.ts#L677) | - |
| `ProgressionManager.recordSimultaneousPassives` | `method` | [`game/src/core/ProgressionManager.ts:691`](../../game/src/core/ProgressionManager.ts#L691) | - |
| `ProgressionManager.recordTeleporterBossKilled` | `method` | [`game/src/core/ProgressionManager.ts:614`](../../game/src/core/ProgressionManager.ts#L614) | - |
| `ProgressionManager.recordXpGemCollected` | `method` | [`game/src/core/ProgressionManager.ts:594`](../../game/src/core/ProgressionManager.ts#L594) | - |
| `ProgressionManager.resetAllProgress` | `method` | [`game/src/core/ProgressionManager.ts:902`](../../game/src/core/ProgressionManager.ts#L902) | - |
| `ProgressionManager.resetAllTasksToZero` | `method` | [`game/src/core/ProgressionManager.ts:884`](../../game/src/core/ProgressionManager.ts#L884) | - |
| `ProgressionManager.resetRunSessionProgress` | `method` | [`game/src/core/ProgressionManager.ts:109`](../../game/src/core/ProgressionManager.ts#L109) | - |
| `ProgressionManager.save` | `method` | [`game/src/core/ProgressionManager.ts:237`](../../game/src/core/ProgressionManager.ts#L237) | - |
| `ProgressionManager.unlockElfByAchievement` | `method` | [`game/src/core/ProgressionManager.ts:568`](../../game/src/core/ProgressionManager.ts#L568) | - |
| `ProgressionManager.unlockHero` | `method` | [`game/src/core/ProgressionManager.ts:320`](../../game/src/core/ProgressionManager.ts#L320) | - |
| `ProgressionView` | `class` | [`admin/src/views/progressionView.ts:6`](../../admin/src/views/progressionView.ts#L6) | - |
| `ProgressionView.bindEvents` | `method` | [`admin/src/views/progressionView.ts:25`](../../admin/src/views/progressionView.ts#L25) | - |
| `ProgressionView.render` | `method` | [`admin/src/views/progressionView.ts:194`](../../admin/src/views/progressionView.ts#L194) | - |
| `ProgressionView.renderHeroesProgression` | `method` | [`admin/src/views/progressionView.ts:410`](../../admin/src/views/progressionView.ts#L410) | - |
| `ProgressionView.renderMonstersProgression` | `method` | [`admin/src/views/progressionView.ts:289`](../../admin/src/views/progressionView.ts#L289) | - |
| `ProgressionView.renderMonstersProgressionChips` | `method` | [`admin/src/views/progressionView.ts:372`](../../admin/src/views/progressionView.ts#L372) | - |
| `ProgressionView.renderWeaponsProgression` | `method` | [`admin/src/views/progressionView.ts:204`](../../admin/src/views/progressionView.ts#L204) | - |
| `ProgressionView.renderWeaponsProgressionChips` | `method` | [`admin/src/views/progressionView.ts:256`](../../admin/src/views/progressionView.ts#L256) | - |
| `ProgressionView.updateTimeSliderUI` | `method` | [`admin/src/views/progressionView.ts:177`](../../admin/src/views/progressionView.ts#L177) | - |
| `Projectile` | `class` | [`game/src/combat/Projectile.ts:47`](../../game/src/combat/Projectile.ts#L47) | - |
| `Projectile.destroy` | `method` | [`game/src/combat/Projectile.ts:790`](../../game/src/combat/Projectile.ts#L790) | - |
| `Projectile.getOrbMaterial` | `method` | [`game/src/combat/Projectile.ts:228`](../../game/src/combat/Projectile.ts#L228) | - |
| `Projectile.onHit` | `method` | [`game/src/combat/Projectile.ts:773`](../../game/src/combat/Projectile.ts#L773) | - |
| `Projectile.setVfxOpacity` | `method` | [`game/src/combat/Projectile.ts:113`](../../game/src/combat/Projectile.ts#L113) | - |
| `Projectile.update` | `method` | [`game/src/combat/Projectile.ts:596`](../../game/src/combat/Projectile.ts#L596) | - |
| `Projectile.updateVisuals` | `method` | [`game/src/combat/Projectile.ts:782`](../../game/src/combat/Projectile.ts#L782) | - |
| `ProjectileOptions` | `interface` | [`game/src/combat/Projectile.ts:18`](../../game/src/combat/Projectile.ts#L18) | - |
| `PublicRoomInfo` | `interface` | [`game/src/net/RoomDirectory.ts:3`](../../game/src/net/RoomDirectory.ts#L3) | - |
| `QuestsScreen` | `class` | [`game/src/ui/screens/Quests/QuestsScreen.ts:38`](../../game/src/ui/screens/Quests/QuestsScreen.ts#L38) | - |
| `QuestsScreen.bindElements` | `method` | [`game/src/ui/screens/Quests/QuestsScreen.ts:60`](../../game/src/ui/screens/Quests/QuestsScreen.ts#L60) | - |
| `QuestsScreen.bindEvents` | `method` | [`game/src/ui/screens/Quests/QuestsScreen.ts:62`](../../game/src/ui/screens/Quests/QuestsScreen.ts#L62) | - |
| `QuestsScreen.getChapterQuests` | `method` | [`game/src/ui/screens/Quests/QuestsScreen.ts:182`](../../game/src/ui/screens/Quests/QuestsScreen.ts#L182) | - |
| `QuestsScreen.getTemplate` | `method` | [`game/src/ui/screens/Quests/QuestsScreen.ts:56`](../../game/src/ui/screens/Quests/QuestsScreen.ts#L56) | - |
| `QuestsScreen.hideQuestsModal` | `method` | [`game/src/ui/screens/Quests/QuestsScreen.ts:170`](../../game/src/ui/screens/Quests/QuestsScreen.ts#L170) | - |
| `QuestsScreen.isChapterUnlocked` | `method` | [`game/src/ui/screens/Quests/QuestsScreen.ts:109`](../../game/src/ui/screens/Quests/QuestsScreen.ts#L109) | - |
| `QuestsScreen.selectQuestChapter` | `method` | [`game/src/ui/screens/Quests/QuestsScreen.ts:123`](../../game/src/ui/screens/Quests/QuestsScreen.ts#L123) | - |
| `QuestsScreen.toggleQuestsInMainMenu` | `method` | [`game/src/ui/screens/Quests/QuestsScreen.ts:115`](../../game/src/ui/screens/Quests/QuestsScreen.ts#L115) | - |
| `QuestsScreen.updateCharacterSelectLockStatus` | `method` | [`game/src/ui/screens/Quests/QuestsScreen.ts:404`](../../game/src/ui/screens/Quests/QuestsScreen.ts#L404) | - |
| `QuestsScreen.updateMainMenuQuests` | `method` | [`game/src/ui/screens/Quests/QuestsScreen.ts:431`](../../game/src/ui/screens/Quests/QuestsScreen.ts#L431) | - |
| `QuestsScreenOptions` | `interface` | [`game/src/ui/screens/Quests/QuestsScreen.ts:24`](../../game/src/ui/screens/Quests/QuestsScreen.ts#L24) | - |
| `QuestStepItem` | `interface` | [`game/src/core/ProgressionManager.ts:54`](../../game/src/core/ProgressionManager.ts#L54) | - |
| `QuestsUI` | `class` | [`game/src/ui/modules/QuestsUI.ts:13`](../../game/src/ui/modules/QuestsUI.ts#L13) | - |
| `QuestsUIContext` | `type` | [`game/src/ui/modules/QuestsUI.ts:8`](../../game/src/ui/modules/QuestsUI.ts#L8) | - |
| `RARE_ITEMS` | `const` | [`game/src/items/RiftItemSystem.ts:258`](../../game/src/items/RiftItemSystem.ts#L258) | - |
| `ReaperScytheWeapon` | `class` | [`game/src/combat/weapons/MagicWeapons.ts:23`](../../game/src/combat/weapons/MagicWeapons.ts#L23) | Reaper's Scythe (Коса Жнеца) Rotating scythes circle the hero, cutting thro... |
| `ReaperScytheWeapon.getBleedDps` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:49`](../../game/src/combat/weapons/MagicWeapons.ts#L49) | - |
| `ReaperScytheWeapon.getNextUpgradeDescription` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:103`](../../game/src/combat/weapons/MagicWeapons.ts#L103) | - |
| `ReaperScytheWeapon.upgrade` | `method` | [`game/src/combat/weapons/MagicWeapons.ts:96`](../../game/src/combat/weapons/MagicWeapons.ts#L96) | - |
| `registerUniqueCharacter` | `function` | [`game/src/shared/UniqueCharacters.ts:72`](../../game/src/shared/UniqueCharacters.ts#L72) | Register a new unique character into the system (for future character addit... |
| `RemotePlayer` | `class` | [`game/src/entities/RemotePlayer.ts:27`](../../game/src/entities/RemotePlayer.ts#L27) | - |
| `RemotePlayer.destroy` | `method` | [`game/src/entities/RemotePlayer.ts:559`](../../game/src/entities/RemotePlayer.ts#L559) | - |
| `RemotePlayer.gainXp` | `method` | [`game/src/entities/RemotePlayer.ts:338`](../../game/src/entities/RemotePlayer.ts#L338) | - |
| `RemotePlayer.loadCharacterTextures` | `method` | [`game/src/entities/RemotePlayer.ts:233`](../../game/src/entities/RemotePlayer.ts#L233) | - |
| `RemotePlayer.redrawOverhead` | `method` | [`game/src/entities/RemotePlayer.ts:431`](../../game/src/entities/RemotePlayer.ts#L431) | - |
| `RemotePlayer.setCharacter` | `method` | [`game/src/entities/RemotePlayer.ts:277`](../../game/src/entities/RemotePlayer.ts#L277) | - |
| `RemotePlayer.setupAuras` | `method` | [`game/src/entities/RemotePlayer.ts:177`](../../game/src/entities/RemotePlayer.ts#L177) | - |
| `RemotePlayer.syncState` | `method` | [`game/src/entities/RemotePlayer.ts:292`](../../game/src/entities/RemotePlayer.ts#L292) | - |
| `RemotePlayer.update` | `method` | [`game/src/entities/RemotePlayer.ts:349`](../../game/src/entities/RemotePlayer.ts#L349) | - |
| `RemotePlayer.updateAnimation` | `method` | [`game/src/entities/RemotePlayer.ts:423`](../../game/src/entities/RemotePlayer.ts#L423) | - |
| `renderBosses` | `function` | [`admin/src/views/bossesView.ts:6`](../../admin/src/views/bossesView.ts#L6) | - |
| `renderCenterSquareMap` | `function` | [`game/src/ui/MapCenterSquareRenderer.ts:34`](../../game/src/ui/MapCenterSquareRenderer.ts#L34) | Renders the square full-world interactive overlay map (Diablo / PoE TAB sty... |
| `renderDashboard` | `function` | [`admin/src/views/dashboardView.ts:4`](../../admin/src/views/dashboardView.ts#L4) | - |
| `renderEmptySearchState` | `function` | [`admin/src/ui/filter.ts:54`](../../admin/src/ui/filter.ts#L54) | - |
| `renderGlobal` | `function` | [`admin/src/views/globalView.ts:4`](../../admin/src/views/globalView.ts#L4) | - |
| `renderHeroes` | `function` | [`admin/src/views/heroesView.ts:6`](../../admin/src/views/heroesView.ts#L6) | - |
| `renderItems` | `function` | [`admin/src/views/itemsView.ts:5`](../../admin/src/views/itemsView.ts#L5) | - |
| `renderMerchant` | `function` | [`admin/src/views/merchantView.ts:4`](../../admin/src/views/merchantView.ts#L4) | - |
| `renderMonsters` | `function` | [`admin/src/views/monstersView.ts:6`](../../admin/src/views/monstersView.ts#L6) | - |
| `renderPassives` | `function` | [`admin/src/views/passivesView.ts:5`](../../admin/src/views/passivesView.ts#L5) | - |
| `renderPlayerOverhead` | `function` | [`game/src/entities/PlayerOverheadRenderer.ts:40`](../../game/src/entities/PlayerOverheadRenderer.ts#L40) | - |
| `renderStatControl` | `function` | [`admin/src/views/controlHelpers.ts:3`](../../admin/src/views/controlHelpers.ts#L3) | - |
| `renderTalents` | `function` | [`admin/src/views/talentsView.ts:5`](../../admin/src/views/talentsView.ts#L5) | - |
| `renderWeapons` | `function` | [`admin/src/views/weaponsView.ts:6`](../../admin/src/views/weaponsView.ts#L6) | - |
| `resetSupabaseClients` | `function` | [`game/src/balance/supabaseClient.ts:140`](../../game/src/balance/supabaseClient.ts#L140) | - |
| `ReviveActionMessage` | `interface` | [`game/src/shared/types/network.ts:252`](../../game/src/shared/types/network.ts#L252) | - |
| `RIFT_ITEMS` | `const` | [`game/src/items/RiftItemSystem.ts:43`](../../game/src/items/RiftItemSystem.ts#L43) | - |
| `RiftItemDef` | `interface` | [`game/src/items/RiftItemSystem.ts:33`](../../game/src/items/RiftItemSystem.ts#L33) | - |
| `RiftItemId` | `type` | [`game/src/items/RiftItemSystem.ts:5`](../../game/src/items/RiftItemSystem.ts#L5) | - |
| `RiftItemId` | `type` | [`game/src/shared/types/entities.ts:47`](../../game/src/shared/types/entities.ts#L47) | - |
| `RiftTeleporter` | `class` | [`game/src/world/RiftTeleporter.ts:32`](../../game/src/world/RiftTeleporter.ts#L32) | 2.5D Dimensional Rift (Разлом) for biome transitions. - Closed state: Dark ... |
| `RiftTeleporter.activate` | `method` | [`game/src/world/RiftTeleporter.ts:124`](../../game/src/world/RiftTeleporter.ts#L124) | - |
| `RiftTeleporter.createTeleporterVisuals` | `method` | [`game/src/world/RiftTeleporter.ts:68`](../../game/src/world/RiftTeleporter.ts#L68) | - |
| `RiftTeleporter.destroy` | `method` | [`game/src/world/RiftTeleporter.ts:302`](../../game/src/world/RiftTeleporter.ts#L302) | - |
| `RiftTeleporter.disableForFinalStage` | `method` | [`game/src/world/RiftTeleporter.ts:239`](../../game/src/world/RiftTeleporter.ts#L239) | Disables the teleporter for the final stage (Rift Core) where no transition... |
| `RiftTeleporter.getInteraction` | `method` | [`game/src/world/RiftTeleporter.ts:272`](../../game/src/world/RiftTeleporter.ts#L272) | - |
| `RiftTeleporter.getSnapshot` | `method` | [`game/src/world/RiftTeleporter.ts:310`](../../game/src/world/RiftTeleporter.ts#L310) | - |
| `RiftTeleporter.resetForStage` | `method` | [`game/src/world/RiftTeleporter.ts:212`](../../game/src/world/RiftTeleporter.ts#L212) | Resets teleporter for a new stage at new random location. |
| `RiftTeleporter.stabilizeVoluntaryPortal` | `method` | [`game/src/world/RiftTeleporter.ts:251`](../../game/src/world/RiftTeleporter.ts#L251) | Automatically stabilizes the teleporter when 5 minutes on the biome have el... |
| `RiftTeleporter.update` | `method` | [`game/src/world/RiftTeleporter.ts:147`](../../game/src/world/RiftTeleporter.ts#L147) | - |
| `RiftUpdateResult` | `interface` | [`game/src/world/RiftTeleporter.ts:19`](../../game/src/world/RiftTeleporter.ts#L19) | - |
| `rollChestDropPair` | `function` | [`game/src/items/RiftItemSystem.ts:311`](../../game/src/items/RiftItemSystem.ts#L311) | Rolls two distinct item drops from a chest (no duplicates allowed). Filters... |
| `rollRiftItem` | `function` | [`game/src/items/RiftItemSystem.ts:348`](../../game/src/items/RiftItemSystem.ts#L348) | Legacy weights roller kept for backwards compatibility. |
| `rollRiftItemByStage` | `function` | [`game/src/items/RiftItemSystem.ts:288`](../../game/src/items/RiftItemSystem.ts#L288) | Rolls an item drop based on stage/biome probabilities. Filters out items wh... |
| `rollWeaponGrade` | `function` | [`game/src/combat/WeaponGrades.ts:86`](../../game/src/combat/WeaponGrades.ts#L86) | - |
| `RoomDirectory` | `class` | [`game/src/net/RoomDirectory.ts:15`](../../game/src/net/RoomDirectory.ts#L15) | - |
| `RoomDirectory.announce` | `method` | [`game/src/net/RoomDirectory.ts:127`](../../game/src/net/RoomDirectory.ts#L127) | - |
| `RoomDirectory.broadcastClose` | `method` | [`game/src/net/RoomDirectory.ts:160`](../../game/src/net/RoomDirectory.ts#L160) | - |
| `RoomDirectory.fetchRooms` | `method` | [`game/src/net/RoomDirectory.ts:190`](../../game/src/net/RoomDirectory.ts#L190) | - |
| `RoomDirectory.getActiveRoomsList` | `method` | [`game/src/net/RoomDirectory.ts:233`](../../game/src/net/RoomDirectory.ts#L233) | - |
| `RoomDirectory.init` | `method` | [`game/src/net/RoomDirectory.ts:27`](../../game/src/net/RoomDirectory.ts#L27) | - |
| `RoomDirectory.loadFromStorage` | `method` | [`game/src/net/RoomDirectory.ts:269`](../../game/src/net/RoomDirectory.ts#L269) | - |
| `RoomDirectory.notifyListeners` | `method` | [`game/src/net/RoomDirectory.ts:77`](../../game/src/net/RoomDirectory.ts#L77) | - |
| `RoomDirectory.onRoomsUpdated` | `method` | [`game/src/net/RoomDirectory.ts:67`](../../game/src/net/RoomDirectory.ts#L67) | - |
| `RoomDirectory.readStorageMap` | `method` | [`game/src/net/RoomDirectory.ts:260`](../../game/src/net/RoomDirectory.ts#L260) | - |
| `RoomDirectory.startHosting` | `method` | [`game/src/net/RoomDirectory.ts:88`](../../game/src/net/RoomDirectory.ts#L88) | - |
| `RoomDirectory.stopHosting` | `method` | [`game/src/net/RoomDirectory.ts:115`](../../game/src/net/RoomDirectory.ts#L115) | - |
| `RoomDirectory.updateHosting` | `method` | [`game/src/net/RoomDirectory.ts:108`](../../game/src/net/RoomDirectory.ts#L108) | - |
| `RoughTerrainManager` | `class` | [`game/src/world/RoughTerrainManager.ts:24`](../../game/src/world/RoughTerrainManager.ts#L24) | - |
| `RoughTerrainManager.clear` | `method` | [`game/src/world/RoughTerrainManager.ts:291`](../../game/src/world/RoughTerrainManager.ts#L291) | Cleans up all zones and materials. |
| `RoughTerrainManager.getSlowFactor` | `method` | [`game/src/world/RoughTerrainManager.ts:258`](../../game/src/world/RoughTerrainManager.ts#L258) | Fast O(1) query returning speed multiplier (0.65 if in rough terrain/dune, ... |
| `RoughTerrainManager.getTexture` | `method` | [`game/src/world/RoughTerrainManager.ts:41`](../../game/src/world/RoughTerrainManager.ts#L41) | - |
| `RoughTerrainManager.isSlowed` | `method` | [`game/src/world/RoughTerrainManager.ts:284`](../../game/src/world/RoughTerrainManager.ts#L284) | Returns true if given world coordinate is inside any dune / rough zone. |
| `RoughTerrainManager.toHash` | `method` | [`game/src/world/RoughTerrainManager.ts:53`](../../game/src/world/RoughTerrainManager.ts#L53) | - |
| `RoughZone` | `interface` | [`game/src/world/RoughTerrainManager.ts:17`](../../game/src/world/RoughTerrainManager.ts#L17) | - |
| `SafeDOM` | `class` | [`game/src/ui/core/SafeDOM.ts:5`](../../game/src/ui/core/SafeDOM.ts#L5) | SafeDOM utility for resilient UI interaction. Prevents application-wide cra... |
| `SafeDOM.setText` | `method` | [`game/src/ui/core/SafeDOM.ts:65`](../../game/src/ui/core/SafeDOM.ts#L65) | - |
| `SafeDOM.setVisible` | `method` | [`game/src/ui/core/SafeDOM.ts:71`](../../game/src/ui/core/SafeDOM.ts#L71) | - |
| `Screen` | `class` | [`game/src/ui/core/Screen.ts:5`](../../game/src/ui/core/Screen.ts#L5) | Base abstract class for modular UI screens. Implements standard lifecycle: ... |
| `Screen.destroy` | `method` | [`game/src/ui/core/Screen.ts:48`](../../game/src/ui/core/Screen.ts#L48) | - |
| `Screen.getContainer` | `method` | [`game/src/ui/core/Screen.ts:54`](../../game/src/ui/core/Screen.ts#L54) | - |
| `Screen.hide` | `method` | [`game/src/ui/core/Screen.ts:38`](../../game/src/ui/core/Screen.ts#L38) | - |
| `Screen.isVisible` | `method` | [`game/src/ui/core/Screen.ts:44`](../../game/src/ui/core/Screen.ts#L44) | - |
| `Screen.mount` | `method` | [`game/src/ui/core/Screen.ts:20`](../../game/src/ui/core/Screen.ts#L20) | - |
| `Screen.onHide` | `method` | [`game/src/ui/core/Screen.ts:62`](../../game/src/ui/core/Screen.ts#L62) | - |
| `Screen.onShow` | `method` | [`game/src/ui/core/Screen.ts:61`](../../game/src/ui/core/Screen.ts#L61) | - |
| `Screen.show` | `method` | [`game/src/ui/core/Screen.ts:32`](../../game/src/ui/core/Screen.ts#L32) | - |
| `ScreenManager` | `class` | [`game/src/ui/core/ScreenManager.ts:6`](../../game/src/ui/core/ScreenManager.ts#L6) | ScreenManager coordinates navigation, modal transitions, and UI screen stat... |
| `ScreenManager.back` | `method` | [`game/src/ui/core/ScreenManager.ts:63`](../../game/src/ui/core/ScreenManager.ts#L63) | - |
| `ScreenManager.getActiveScreenId` | `method` | [`game/src/ui/core/ScreenManager.ts:76`](../../game/src/ui/core/ScreenManager.ts#L76) | - |
| `ScreenManager.getInstance` | `method` | [`game/src/ui/core/ScreenManager.ts:12`](../../game/src/ui/core/ScreenManager.ts#L12) | - |
| `ScreenManager.hide` | `method` | [`game/src/ui/core/ScreenManager.ts:50`](../../game/src/ui/core/ScreenManager.ts#L50) | - |
| `ScreenManager.hideAll` | `method` | [`game/src/ui/core/ScreenManager.ts:58`](../../game/src/ui/core/ScreenManager.ts#L58) | - |
| `ScreenManager.register` | `method` | [`game/src/ui/core/ScreenManager.ts:27`](../../game/src/ui/core/ScreenManager.ts#L27) | - |
| `ScreenManager.setRoot` | `method` | [`game/src/ui/core/ScreenManager.ts:19`](../../game/src/ui/core/ScreenManager.ts#L19) | - |
| `ScreenManager.show` | `method` | [`game/src/ui/core/ScreenManager.ts:38`](../../game/src/ui/core/ScreenManager.ts#L38) | - |
| `SeededRNG` | `class` | [`game/src/core/SeededRNG.ts:5`](../../game/src/core/SeededRNG.ts#L5) | Deterministic PRNG using the Mulberry32 algorithm with string hashing suppo... |
| `SeededRNG.getState` | `method` | [`game/src/core/SeededRNG.ts:68`](../../game/src/core/SeededRNG.ts#L68) | - |
| `SeededRNG.hashString` | `method` | [`game/src/core/SeededRNG.ts:16`](../../game/src/core/SeededRNG.ts#L16) | Fast, reliable FNV-1a 32-bit hash function for string seeds. |
| `SeededRNG.next` | `method` | [`game/src/core/SeededRNG.ts:28`](../../game/src/core/SeededRNG.ts#L28) | Generates a deterministic float in range [0, 1) |
| `SeededRNG.range` | `method` | [`game/src/core/SeededRNG.ts:38`](../../game/src/core/SeededRNG.ts#L38) | Generates a deterministic float in range [min, max) |
| `SeededRNG.rangeInt` | `method` | [`game/src/core/SeededRNG.ts:45`](../../game/src/core/SeededRNG.ts#L45) | Generates a deterministic integer in range [min, max] inclusive |
| `selectWeaponUpgradeOptions` | `function` | [`game/src/ui/selectWeaponUpgradeOptions.ts:5`](../../game/src/ui/selectWeaponUpgradeOptions.ts#L5) | The pool is already shuffled and filtered for ownership, prerequisites and ... |
| `SessionDirector` | `class` | [`game/src/core/SessionDirector.ts:57`](../../game/src/core/SessionDirector.ts#L57) | - |
| `SessionDirector.activateRift` | `method` | [`game/src/core/SessionDirector.ts:679`](../../game/src/core/SessionDirector.ts#L679) | Activates the dimensional rift: summons the stage boss directly from the ri... |
| `SessionDirector.applyStageTransition` | `method` | [`game/src/core/SessionDirector.ts:814`](../../game/src/core/SessionDirector.ts#L814) | - |
| `SessionDirector.finishRewardChoice` | `method` | [`game/src/core/SessionDirector.ts:422`](../../game/src/core/SessionDirector.ts#L422) | - |
| `SessionDirector.handleInteract` | `method` | [`game/src/core/SessionDirector.ts:537`](../../game/src/core/SessionDirector.ts#L537) | - |
| `SessionDirector.resetRewardChoices` | `method` | [`game/src/core/SessionDirector.ts:413`](../../game/src/core/SessionDirector.ts#L413) | - |
| `SessionDirector.restartGame` | `method` | [`game/src/core/SessionDirector.ts:464`](../../game/src/core/SessionDirector.ts#L464) | - |
| `SessionDirector.resumeGame` | `method` | [`game/src/core/SessionDirector.ts:405`](../../game/src/core/SessionDirector.ts#L405) | - |
| `SessionDirector.returnToMainMenu` | `method` | [`game/src/core/SessionDirector.ts:361`](../../game/src/core/SessionDirector.ts#L361) | - |
| `SessionDirector.startCoopGameAsClient` | `method` | [`game/src/core/SessionDirector.ts:313`](../../game/src/core/SessionDirector.ts#L313) | - |
| `SessionDirector.startCoopGameAsHost` | `method` | [`game/src/core/SessionDirector.ts:258`](../../game/src/core/SessionDirector.ts#L258) | - |
| `SessionDirector.toggleDevMode` | `method` | [`game/src/core/SessionDirector.ts:176`](../../game/src/core/SessionDirector.ts#L176) | - |
| `SessionDirector.triggerGameOver` | `method` | [`game/src/core/SessionDirector.ts:892`](../../game/src/core/SessionDirector.ts#L892) | - |
| `SessionDirector.triggerLevelUp` | `method` | [`game/src/core/SessionDirector.ts:432`](../../game/src/core/SessionDirector.ts#L432) | - |
| `SessionDirector.warpToNextStage` | `method` | [`game/src/core/SessionDirector.ts:698`](../../game/src/core/SessionDirector.ts#L698) | - |
| `SessionDirector.wireCoordinatorCallbacks` | `method` | [`game/src/core/SessionDirector.ts:154`](../../game/src/core/SessionDirector.ts#L154) | - |
| `SettingsScreen` | `class` | [`game/src/ui/screens/Settings/SettingsScreen.ts:29`](../../game/src/ui/screens/Settings/SettingsScreen.ts#L29) | Modular Settings Screen. Manages Graphics, Audio, HUD preferences, Controls... |
| `SettingsScreen.activateSettingsTab` | `method` | [`game/src/ui/screens/Settings/SettingsScreen.ts:325`](../../game/src/ui/screens/Settings/SettingsScreen.ts#L325) | - |
| `SettingsScreen.bindElements` | `method` | [`game/src/ui/screens/Settings/SettingsScreen.ts:53`](../../game/src/ui/screens/Settings/SettingsScreen.ts#L53) | - |
| `SettingsScreen.bindEvents` | `method` | [`game/src/ui/screens/Settings/SettingsScreen.ts:55`](../../game/src/ui/screens/Settings/SettingsScreen.ts#L55) | - |
| `SettingsScreen.getTemplate` | `method` | [`game/src/ui/screens/Settings/SettingsScreen.ts:49`](../../game/src/ui/screens/Settings/SettingsScreen.ts#L49) | - |
| `SettingsScreen.hideSettings` | `method` | [`game/src/ui/screens/Settings/SettingsScreen.ts:320`](../../game/src/ui/screens/Settings/SettingsScreen.ts#L320) | - |
| `SettingsScreen.showSettings` | `method` | [`game/src/ui/screens/Settings/SettingsScreen.ts:285`](../../game/src/ui/screens/Settings/SettingsScreen.ts#L285) | - |
| `SettingsScreenOptions` | `interface` | [`game/src/ui/screens/Settings/SettingsScreen.ts:10`](../../game/src/ui/screens/Settings/SettingsScreen.ts#L10) | - |
| `SettingsUI` | `class` | [`game/src/ui/modules/SettingsUI.ts:8`](../../game/src/ui/modules/SettingsUI.ts#L8) | - |
| `SettingsUIContext` | `type` | [`game/src/ui/modules/SettingsUI.ts:3`](../../game/src/ui/modules/SettingsUI.ts#L3) | - |
| `ShopScreen` | `class` | [`game/src/ui/screens/Shop/ShopScreen.ts:20`](../../game/src/ui/screens/Shop/ShopScreen.ts#L20) | Modular Shop / Meta Progression Screen. Displays 3 branches of 10 persisten... |
| `ShopScreen.bindElements` | `method` | [`game/src/ui/screens/Shop/ShopScreen.ts:44`](../../game/src/ui/screens/Shop/ShopScreen.ts#L44) | - |
| `ShopScreen.bindEvents` | `method` | [`game/src/ui/screens/Shop/ShopScreen.ts:46`](../../game/src/ui/screens/Shop/ShopScreen.ts#L46) | - |
| `ShopScreen.close` | `method` | [`game/src/ui/screens/Shop/ShopScreen.ts:93`](../../game/src/ui/screens/Shop/ShopScreen.ts#L93) | - |
| `ShopScreen.destroy` | `method` | [`game/src/ui/screens/Shop/ShopScreen.ts:254`](../../game/src/ui/screens/Shop/ShopScreen.ts#L254) | - |
| `ShopScreen.getTemplate` | `method` | [`game/src/ui/screens/Shop/ShopScreen.ts:40`](../../game/src/ui/screens/Shop/ShopScreen.ts#L40) | - |
| `ShopScreen.handleRespec` | `method` | [`game/src/ui/screens/Shop/ShopScreen.ts:109`](../../game/src/ui/screens/Shop/ShopScreen.ts#L109) | - |
| `ShopScreen.handleUpgradeTalent` | `method` | [`game/src/ui/screens/Shop/ShopScreen.ts:98`](../../game/src/ui/screens/Shop/ShopScreen.ts#L98) | - |
| `ShopScreen.onHide` | `method` | [`game/src/ui/screens/Shop/ShopScreen.ts:252`](../../game/src/ui/screens/Shop/ShopScreen.ts#L252) | - |
| `ShopScreen.onShow` | `method` | [`game/src/ui/screens/Shop/ShopScreen.ts:248`](../../game/src/ui/screens/Shop/ShopScreen.ts#L248) | - |
| `ShopScreen.renderTalentsList` | `method` | [`game/src/ui/screens/Shop/ShopScreen.ts:159`](../../game/src/ui/screens/Shop/ShopScreen.ts#L159) | - |
| `ShopScreen.switchBranch` | `method` | [`game/src/ui/screens/Shop/ShopScreen.ts:76`](../../game/src/ui/screens/Shop/ShopScreen.ts#L76) | - |
| `ShopScreen.updateUI` | `method` | [`game/src/ui/screens/Shop/ShopScreen.ts:124`](../../game/src/ui/screens/Shop/ShopScreen.ts#L124) | - |
| `ShopScreenOptions` | `interface` | [`game/src/ui/screens/Shop/ShopScreen.ts:10`](../../game/src/ui/screens/Shop/ShopScreen.ts#L10) | - |
| `showToast` | `function` | [`admin/src/ui/toast.ts:1`](../../admin/src/ui/toast.ts#L1) | - |
| `SidebarQuestItem` | `interface` | [`game/src/core/ProgressionManager.ts:6`](../../game/src/core/ProgressionManager.ts#L6) | - |
| `SimAltarInternal` | `class` | [`game/src/sim/GameCore.ts:339`](../../game/src/sim/GameCore.ts#L339) | - |
| `SimAltarState` | `interface` | [`game/src/sim/types.ts:96`](../../game/src/sim/types.ts#L96) | - |
| `SimAssaultRifleWeapon` | `class` | [`game/src/sim/weapons/SimRangedWeapons.ts:197`](../../game/src/sim/weapons/SimRangedWeapons.ts#L197) | Assault Rifle (Штурмовая Винтовка) |
| `SimAssaultRifleWeapon.getNextUpgradeDescription` | `method` | [`game/src/sim/weapons/SimRangedWeapons.ts:273`](../../game/src/sim/weapons/SimRangedWeapons.ts#L273) | - |
| `SimAssaultRifleWeapon.upgrade` | `method` | [`game/src/sim/weapons/SimRangedWeapons.ts:262`](../../game/src/sim/weapons/SimRangedWeapons.ts#L262) | - |
| `SimAstralStaffWeapon` | `class` | [`game/src/sim/weapons/SimMagicWeapons.ts:13`](../../game/src/sim/weapons/SimMagicWeapons.ts#L13) | Astral Staff (Звездный Посох) - Sorceress |
| `SimAstralStaffWeapon.getNextUpgradeDescription` | `method` | [`game/src/sim/weapons/SimMagicWeapons.ts:87`](../../game/src/sim/weapons/SimMagicWeapons.ts#L87) | - |
| `SimAstralStaffWeapon.upgrade` | `method` | [`game/src/sim/weapons/SimMagicWeapons.ts:76`](../../game/src/sim/weapons/SimMagicWeapons.ts#L76) | - |
| `SimBowWeapon` | `class` | [`game/src/sim/weapons/SimRangedWeapons.ts:13`](../../game/src/sim/weapons/SimRangedWeapons.ts#L13) | Hunting Bow (Охотничий Лук) |
| `SimBowWeapon.getNextUpgradeDescription` | `method` | [`game/src/sim/weapons/SimRangedWeapons.ts:90`](../../game/src/sim/weapons/SimRangedWeapons.ts#L90) | - |
| `SimBowWeapon.upgrade` | `method` | [`game/src/sim/weapons/SimRangedWeapons.ts:79`](../../game/src/sim/weapons/SimRangedWeapons.ts#L79) | - |
| `SimChakramWeapon` | `class` | [`game/src/sim/weapons/SimMagicWeapons.ts:147`](../../game/src/sim/weapons/SimMagicWeapons.ts#L147) | Boomerang Chakram simulation weapon |
| `SimChakramWeapon.getNextUpgradeDescription` | `method` | [`game/src/sim/weapons/SimMagicWeapons.ts:237`](../../game/src/sim/weapons/SimMagicWeapons.ts#L237) | - |
| `SimChakramWeapon.upgrade` | `method` | [`game/src/sim/weapons/SimMagicWeapons.ts:222`](../../game/src/sim/weapons/SimMagicWeapons.ts#L222) | - |
| `SimDropInternal` | `class` | [`game/src/sim/GameCore.ts:324`](../../game/src/sim/GameCore.ts#L324) | - |
| `SimDropState` | `interface` | [`game/src/sim/types.ts:89`](../../game/src/sim/types.ts#L89) | - |
| `SimDualRevolversWeapon` | `const` | [`game/src/sim/weapons/SimRangedWeapons.ts:191`](../../game/src/sim/weapons/SimRangedWeapons.ts#L191) | - |
| `SimDualRevolversWeapon` | `type` | [`game/src/sim/weapons/SimRangedWeapons.ts:192`](../../game/src/sim/weapons/SimRangedWeapons.ts#L192) | - |
| `SimEnemyConfig` | `interface` | [`game/src/sim/GameCore.ts:39`](../../game/src/sim/GameCore.ts#L39) | - |
| `SimEnemyInternal` | `class` | [`game/src/sim/GameCore.ts:193`](../../game/src/sim/GameCore.ts#L193) | - |
| `SimEnemyInternal.addBleed` | `method` | [`game/src/sim/GameCore.ts:259`](../../game/src/sim/GameCore.ts#L259) | - |
| `SimEnemyInternal.freeze` | `method` | [`game/src/sim/GameCore.ts:237`](../../game/src/sim/GameCore.ts#L237) | - |
| `SimEnemyInternal.knockbackFrom` | `method` | [`game/src/sim/GameCore.ts:241`](../../game/src/sim/GameCore.ts#L241) | - |
| `SimEnemyRef` | `interface` | [`game/src/sim/weapons/SimWeaponBase.ts:39`](../../game/src/sim/weapons/SimWeaponBase.ts#L39) | - |
| `SimEnemyState` | `interface` | [`game/src/sim/types.ts:59`](../../game/src/sim/types.ts#L59) | - |
| `SimEvent` | `type` | [`game/src/sim/types.ts:106`](../../game/src/sim/types.ts#L106) | - |
| `SimFireballWeapon` | `class` | [`game/src/sim/weapons/SimMagicWeapons.ts:407`](../../game/src/sim/weapons/SimMagicWeapons.ts#L407) | Fireball (Огненный Шар) simulation weapon |
| `SimFireballWeapon.getNextUpgradeDescription` | `method` | [`game/src/sim/weapons/SimMagicWeapons.ts:480`](../../game/src/sim/weapons/SimMagicWeapons.ts#L480) | - |
| `SimFireballWeapon.upgrade` | `method` | [`game/src/sim/weapons/SimMagicWeapons.ts:465`](../../game/src/sim/weapons/SimMagicWeapons.ts#L465) | - |
| `SimFireRingWeapon` | `class` | [`game/src/sim/weapons/SimMagicWeapons.ts:101`](../../game/src/sim/weapons/SimMagicWeapons.ts#L101) | Fire Ring (Огненное Кольцо) |
| `SimFireRingWeapon.getNextUpgradeDescription` | `method` | [`game/src/sim/weapons/SimMagicWeapons.ts:138`](../../game/src/sim/weapons/SimMagicWeapons.ts#L138) | - |
| `SimFireRingWeapon.upgrade` | `method` | [`game/src/sim/weapons/SimMagicWeapons.ts:130`](../../game/src/sim/weapons/SimMagicWeapons.ts#L130) | - |
| `SimFlailWeapon` | `class` | [`game/src/sim/weapons/SimMeleeWeapons.ts:130`](../../game/src/sim/weapons/SimMeleeWeapons.ts#L130) | Steel Flail (Боевой Цеп) - Brigitta |
| `SimFlailWeapon.getNextUpgradeDescription` | `method` | [`game/src/sim/weapons/SimMeleeWeapons.ts:180`](../../game/src/sim/weapons/SimMeleeWeapons.ts#L180) | - |
| `SimFlailWeapon.upgrade` | `method` | [`game/src/sim/weapons/SimMeleeWeapons.ts:172`](../../game/src/sim/weapons/SimMeleeWeapons.ts#L172) | - |
| `SimGreatswordWeapon` | `class` | [`game/src/sim/weapons/SimMeleeWeapons.ts:71`](../../game/src/sim/weapons/SimMeleeWeapons.ts#L71) | Greatsword (Двуручный Меч) - Valkyrie |
| `SimGreatswordWeapon.getNextUpgradeDescription` | `method` | [`game/src/sim/weapons/SimMeleeWeapons.ts:121`](../../game/src/sim/weapons/SimMeleeWeapons.ts#L121) | - |
| `SimGreatswordWeapon.upgrade` | `method` | [`game/src/sim/weapons/SimMeleeWeapons.ts:113`](../../game/src/sim/weapons/SimMeleeWeapons.ts#L113) | - |
| `SimHeavyColtWeapon` | `const` | [`game/src/sim/weapons/SimRangedWeapons.ts:101`](../../game/src/sim/weapons/SimRangedWeapons.ts#L101) | - |
| `SimHeavyColtWeapon` | `type` | [`game/src/sim/weapons/SimRangedWeapons.ts:102`](../../game/src/sim/weapons/SimRangedWeapons.ts#L102) | - |
| `SimIceSpikeWeapon` | `class` | [`game/src/sim/weapons/SimMagicWeapons.ts:329`](../../game/src/sim/weapons/SimMagicWeapons.ts#L329) | Ice Spike (Ледяной Шип) simulation weapon |
| `SimIceSpikeWeapon.getNextUpgradeDescription` | `method` | [`game/src/sim/weapons/SimMagicWeapons.ts:393`](../../game/src/sim/weapons/SimMagicWeapons.ts#L393) | - |
| `SimIceSpikeWeapon.upgrade` | `method` | [`game/src/sim/weapons/SimMagicWeapons.ts:378`](../../game/src/sim/weapons/SimMagicWeapons.ts#L378) | - |
| `SimInvokerWeapon` | `class` | [`game/src/sim/weapons/SimInvokerWeapon.ts:22`](../../game/src/sim/weapons/SimInvokerWeapon.ts#L22) | - |
| `SimInvokerWeapon.getNextUpgradeDescription` | `method` | [`game/src/sim/weapons/SimInvokerWeapon.ts:106`](../../game/src/sim/weapons/SimInvokerWeapon.ts#L106) | - |
| `SimInvokerWeapon.setInvokeSource` | `method` | [`game/src/sim/weapons/SimInvokerWeapon.ts:26`](../../game/src/sim/weapons/SimInvokerWeapon.ts#L26) | - |
| `SimInvokerWeapon.upgrade` | `method` | [`game/src/sim/weapons/SimInvokerWeapon.ts:99`](../../game/src/sim/weapons/SimInvokerWeapon.ts#L99) | - |
| `SimKatanaSlashWeapon` | `class` | [`game/src/sim/weapons/SimMeleeWeapons.ts:259`](../../game/src/sim/weapons/SimMeleeWeapons.ts#L259) | Katana Slash (Рассекающий Клинок) |
| `SimKatanaSlashWeapon.getNextUpgradeDescription` | `method` | [`game/src/sim/weapons/SimMeleeWeapons.ts:309`](../../game/src/sim/weapons/SimMeleeWeapons.ts#L309) | - |
| `SimKatanaSlashWeapon.upgrade` | `method` | [`game/src/sim/weapons/SimMeleeWeapons.ts:301`](../../game/src/sim/weapons/SimMeleeWeapons.ts#L301) | - |
| `SimKukriWeapon` | `class` | [`game/src/sim/weapons/SimRangedWeapons.ts:107`](../../game/src/sim/weapons/SimRangedWeapons.ts#L107) | Kukri Knife (Нож Кукри) |
| `SimKukriWeapon.getNextUpgradeDescription` | `method` | [`game/src/sim/weapons/SimRangedWeapons.ts:180`](../../game/src/sim/weapons/SimRangedWeapons.ts#L180) | - |
| `SimKukriWeapon.upgrade` | `method` | [`game/src/sim/weapons/SimRangedWeapons.ts:169`](../../game/src/sim/weapons/SimRangedWeapons.ts#L169) | - |
| `SimLightningStrikeWeapon` | `class` | [`game/src/sim/weapons/SimMagicWeapons.ts:251`](../../game/src/sim/weapons/SimMagicWeapons.ts#L251) | Lightning Strike (Удар Молнии) simulation weapon |
| `SimLightningStrikeWeapon.getNextUpgradeDescription` | `method` | [`game/src/sim/weapons/SimMagicWeapons.ts:315`](../../game/src/sim/weapons/SimMagicWeapons.ts#L315) | - |
| `SimLightningStrikeWeapon.upgrade` | `method` | [`game/src/sim/weapons/SimMagicWeapons.ts:300`](../../game/src/sim/weapons/SimMagicWeapons.ts#L300) | - |
| `SimPlayerInput` | `interface` | [`game/src/sim/types.ts:24`](../../game/src/sim/types.ts#L24) | - |
| `SimPlayerInternal` | `class` | [`game/src/sim/GameCore.ts:53`](../../game/src/sim/GameCore.ts#L53) | - |
| `SimPlayerInternal.getDamageMultiplier` | `method` | [`game/src/sim/GameCore.ts:163`](../../game/src/sim/GameCore.ts#L163) | - |
| `SimPlayerInternal.recalculateStats` | `method` | [`game/src/sim/GameCore.ts:173`](../../game/src/sim/GameCore.ts#L173) | - |
| `SimPlayerRef` | `interface` | [`game/src/sim/weapons/SimWeaponBase.ts:46`](../../game/src/sim/weapons/SimWeaponBase.ts#L46) | - |
| `SimPlayerState` | `interface` | [`game/src/sim/types.ts:37`](../../game/src/sim/types.ts#L37) | - |
| `SimPlayerStats` | `interface` | [`game/src/sim/types.ts:30`](../../game/src/sim/types.ts#L30) | - |
| `SimPoint2D` | `interface` | [`game/src/world/ObstacleManager.ts:10`](../../game/src/world/ObstacleManager.ts#L10) | - |
| `SimProjectileData` | `interface` | [`game/src/sim/weapons/SimWeaponBase.ts:13`](../../game/src/sim/weapons/SimWeaponBase.ts#L13) | - |
| `SimProjectileInternal` | `class` | [`game/src/sim/GameCore.ts:264`](../../game/src/sim/GameCore.ts#L264) | - |
| `SimProjectileState` | `interface` | [`game/src/sim/types.ts:73`](../../game/src/sim/types.ts#L73) | - |
| `SimReaperScytheWeapon` | `class` | [`game/src/sim/weapons/SimMeleeWeapons.ts:189`](../../game/src/sim/weapons/SimMeleeWeapons.ts#L189) | Reaper's Scythe (Коса Жнеца) |
| `SimReaperScytheWeapon.getNextUpgradeDescription` | `method` | [`game/src/sim/weapons/SimMeleeWeapons.ts:247`](../../game/src/sim/weapons/SimMeleeWeapons.ts#L247) | - |
| `SimReaperScytheWeapon.upgrade` | `method` | [`game/src/sim/weapons/SimMeleeWeapons.ts:236`](../../game/src/sim/weapons/SimMeleeWeapons.ts#L236) | - |
| `SimRNG` | `class` | [`game/src/sim/SimRNG.ts:5`](../../game/src/sim/SimRNG.ts#L5) | Deterministic PRNG using Mulberry32 algorithm. Guarantees exact reproducibl... |
| `SimRNG.getState` | `method` | [`game/src/sim/SimRNG.ts:38`](../../game/src/sim/SimRNG.ts#L38) | - |
| `SimRNG.nextFloat` | `method` | [`game/src/sim/SimRNG.ts:16`](../../game/src/sim/SimRNG.ts#L16) | Generates a deterministic float in range [0, 1) |
| `SimRNG.nextInt` | `method` | [`game/src/sim/SimRNG.ts:26`](../../game/src/sim/SimRNG.ts#L26) | Generates a deterministic integer in range [min, max] inclusive |
| `SimRNG.nextRange` | `method` | [`game/src/sim/SimRNG.ts:34`](../../game/src/sim/SimRNG.ts#L34) | Generates a deterministic float in range [min, max) |
| `SimRNG.setState` | `method` | [`game/src/sim/SimRNG.ts:42`](../../game/src/sim/SimRNG.ts#L42) | - |
| `SimSnapshot` | `interface` | [`game/src/sim/types.ts:187`](../../game/src/sim/types.ts#L187) | - |
| `SimulationSlot` | `interface` | [`admin/src/types.ts:13`](../../admin/src/types.ts#L13) | - |
| `SimulationState` | `interface` | [`admin/src/types.ts:19`](../../admin/src/types.ts#L19) | - |
| `SimulationView` | `class` | [`admin/src/views/simulationView.ts:8`](../../admin/src/views/simulationView.ts#L8) | - |
| `SimulationView.applyPreset` | `method` | [`admin/src/views/simulationView.ts:158`](../../admin/src/views/simulationView.ts#L158) | - |
| `SimulationView.bindEvents` | `method` | [`admin/src/views/simulationView.ts:33`](../../admin/src/views/simulationView.ts#L33) | - |
| `SimulationView.render` | `method` | [`admin/src/views/simulationView.ts:456`](../../admin/src/views/simulationView.ts#L456) | - |
| `SimulationView.renderHeroDropdown` | `method` | [`admin/src/views/simulationView.ts:301`](../../admin/src/views/simulationView.ts#L301) | - |
| `SimulationView.renderSimulationWeaponSlots` | `method` | [`admin/src/views/simulationView.ts:592`](../../admin/src/views/simulationView.ts#L592) | - |
| `SimulationView.updatePassiveUIValues` | `method` | [`admin/src/views/simulationView.ts:317`](../../admin/src/views/simulationView.ts#L317) | - |
| `SimVec3` | `class` | [`game/src/sim/math/SimVector.ts:5`](../../game/src/sim/math/SimVector.ts#L5) | Lightweight, zero-dependency 3D vector for headless deterministic simulatio... |
| `SimVec3.clone` | `method` | [`game/src/sim/math/SimVector.ts:30`](../../game/src/sim/math/SimVector.ts#L30) | - |
| `SimVec3.length` | `method` | [`game/src/sim/math/SimVector.ts:66`](../../game/src/sim/math/SimVector.ts#L66) | - |
| `SimVec3.lengthSq` | `method` | [`game/src/sim/math/SimVector.ts:62`](../../game/src/sim/math/SimVector.ts#L62) | - |
| `SimVec3.multiplyScalar` | `method` | [`game/src/sim/math/SimVector.ts:55`](../../game/src/sim/math/SimVector.ts#L55) | - |
| `SimVec3.normalize` | `method` | [`game/src/sim/math/SimVector.ts:81`](../../game/src/sim/math/SimVector.ts#L81) | - |
| `SimVec3.set` | `method` | [`game/src/sim/math/SimVector.ts:16`](../../game/src/sim/math/SimVector.ts#L16) | - |
| `SimWeapon` | `class` | [`game/src/sim/weapons/SimWeaponBase.ts:117`](../../game/src/sim/weapons/SimWeaponBase.ts#L117) | - |
| `SimWeapon.getInfo` | `method` | [`game/src/sim/weapons/SimWeaponBase.ts:155`](../../game/src/sim/weapons/SimWeaponBase.ts#L155) | - |
| `SimWeaponInfo` | `interface` | [`game/src/sim/weapons/SimWeaponBase.ts:3`](../../game/src/sim/weapons/SimWeaponBase.ts#L3) | - |
| `SimWhirlwindSlashWeapon` | `class` | [`game/src/sim/weapons/SimMeleeWeapons.ts:12`](../../game/src/sim/weapons/SimMeleeWeapons.ts#L12) | Crimson Whirlwind (Багровый Вихрь) - Ronin |
| `SimWhirlwindSlashWeapon.getNextUpgradeDescription` | `method` | [`game/src/sim/weapons/SimMeleeWeapons.ts:62`](../../game/src/sim/weapons/SimMeleeWeapons.ts#L62) | - |
| `SimWhirlwindSlashWeapon.upgrade` | `method` | [`game/src/sim/weapons/SimMeleeWeapons.ts:54`](../../game/src/sim/weapons/SimMeleeWeapons.ts#L54) | - |
| `SlotId` | `type` | [`game/src/shared/types/registry.ts:9`](../../game/src/shared/types/registry.ts#L9) | - |
| `SLOTS` | `const` | [`game/src/shared/types/registry.ts:8`](../../game/src/shared/types/registry.ts#L8) | - |
| `SoundManager` | `class` | [`game/src/core/SoundManager.ts:5`](../../game/src/core/SoundManager.ts#L5) | SoundManager handles lightweight procedural audio synthesis via Web Audio A... |
| `SoundManager.getMasterGain` | `method` | [`game/src/core/SoundManager.ts:24`](../../game/src/core/SoundManager.ts#L24) | - |
| `SoundManager.getMuted` | `method` | [`game/src/core/SoundManager.ts:51`](../../game/src/core/SoundManager.ts#L51) | - |
| `SoundManager.getVolume` | `method` | [`game/src/core/SoundManager.ts:40`](../../game/src/core/SoundManager.ts#L40) | - |
| `SoundManager.init` | `method` | [`game/src/core/SoundManager.ts:11`](../../game/src/core/SoundManager.ts#L11) | - |
| `SoundManager.playAltarCaptured` | `method` | [`game/src/core/SoundManager.ts:376`](../../game/src/core/SoundManager.ts#L376) | Grand triumphant chord on altar capture completion |
| `SoundManager.playAltarCapturing` | `method` | [`game/src/core/SoundManager.ts:346`](../../game/src/core/SoundManager.ts#L346) | - |
| `SoundManager.playBowShoot` | `method` | [`game/src/core/SoundManager.ts:124`](../../game/src/core/SoundManager.ts#L124) | Sound when bow releases an arrow (bowstring twang + swift aerodynamic whoos... |
| `SoundManager.playBuffExpire` | `method` | [`game/src/core/SoundManager.ts:404`](../../game/src/core/SoundManager.ts#L404) | Soft chime when buff expires |
| `SoundManager.playButtonClick` | `method` | [`game/src/core/SoundManager.ts:819`](../../game/src/core/SoundManager.ts#L819) | Sound when clicking UI buttons/cards |
| `SoundManager.playChainLightning` | `method` | [`game/src/core/SoundManager.ts:629`](../../game/src/core/SoundManager.ts#L629) | Sound when chain lightning procs |
| `SoundManager.playChakram` | `method` | [`game/src/core/SoundManager.ts:214`](../../game/src/core/SoundManager.ts#L214) | Whistling spinning sound for returning chakram |
| `SoundManager.playChestOpen` | `method` | [`game/src/core/SoundManager.ts:529`](../../game/src/core/SoundManager.ts#L529) | Sound when opening a loot chest/capsule |
| `SoundManager.playCrit` | `method` | [`game/src/core/SoundManager.ts:776`](../../game/src/core/SoundManager.ts#L776) | Sound when critical strike hits |
| `SoundManager.playDash` | `method` | [`game/src/core/SoundManager.ts:608`](../../game/src/core/SoundManager.ts#L608) | Sound when player dashes |
| `SoundManager.playFireballImpact` | `method` | [`game/src/core/SoundManager.ts:741`](../../game/src/core/SoundManager.ts#L741) | Sound when falling fireball impacts ground and explodes |
| `SoundManager.playFireballLaunch` | `method` | [`game/src/core/SoundManager.ts:720`](../../game/src/core/SoundManager.ts#L720) | Sound when fireball descends from the sky (whistling fiery fall whoosh) |
| `SoundManager.playGameOver` | `method` | [`game/src/core/SoundManager.ts:429`](../../game/src/core/SoundManager.ts#L429) | Game Over sound |
| `SoundManager.playGem` | `method` | [`game/src/core/SoundManager.ts:265`](../../game/src/core/SoundManager.ts#L265) | Crystal / XP Gem pickup chime |
| `SoundManager.playHit` | `method` | [`game/src/core/SoundManager.ts:240`](../../game/src/core/SoundManager.ts#L240) | Sound when enemy gets hit |
| `SoundManager.playIceSpike` | `method` | [`game/src/core/SoundManager.ts:685`](../../game/src/core/SoundManager.ts#L685) | Sound when ice spike bursts from beneath the ground (sharp frost crack + cr... |
| `SoundManager.playItemPickup` | `method` | [`game/src/core/SoundManager.ts:797`](../../game/src/core/SoundManager.ts#L797) | Sound when collecting an item |
| `SoundManager.playLevelUp` | `method` | [`game/src/core/SoundManager.ts:318`](../../game/src/core/SoundManager.ts#L318) | Level up fanfare |
| `SoundManager.playLightning` | `method` | [`game/src/core/SoundManager.ts:650`](../../game/src/core/SoundManager.ts#L650) | Sound when lightning strikes from above (electric discharge snap + thunder ... |
| `SoundManager.playMachineGunShoot` | `method` | [`game/src/core/SoundManager.ts:83`](../../game/src/core/SoundManager.ts#L83) | Sound when automatic rifle / machine gun fires a round |
| `SoundManager.playMagic` | `method` | [`game/src/core/SoundManager.ts:188`](../../game/src/core/SoundManager.ts#L188) | Sound when magical spell or staff projectile casts |
| `SoundManager.playPlayerHurt` | `method` | [`game/src/core/SoundManager.ts:293`](../../game/src/core/SoundManager.ts#L293) | Player damaged sound |
| `SoundManager.playReaperSpawn` | `method` | [`game/src/core/SoundManager.ts:504`](../../game/src/core/SoundManager.ts#L504) | Ominous death drone when Immortal Reaper spawns at 30 minutes |
| `SoundManager.playReroll` | `method` | [`game/src/core/SoundManager.ts:839`](../../game/src/core/SoundManager.ts#L839) | Sound when rerolling weapon selection |
| `SoundManager.playShoot` | `method` | [`game/src/core/SoundManager.ts:58`](../../game/src/core/SoundManager.ts#L58) | Sound when projectile shoots |
| `SoundManager.playSlash` | `method` | [`game/src/core/SoundManager.ts:163`](../../game/src/core/SoundManager.ts#L163) | Sound when sword slashes |
| `SoundManager.playTeleporterActivate` | `method` | [`game/src/core/SoundManager.ts:565`](../../game/src/core/SoundManager.ts#L565) | Sound when activating the teleporter event |
| `SoundManager.playTeleporterComplete` | `method` | [`game/src/core/SoundManager.ts:586`](../../game/src/core/SoundManager.ts#L586) | Sound when teleporter charge reaches 100% and rift stabilizes |
| `SoundManager.playTimeFreeze` | `method` | [`game/src/core/SoundManager.ts:860`](../../game/src/core/SoundManager.ts#L860) | Sound when Time Crystal activates (temporal freeze + deep shockwave) |
| `SoundManager.playVictory` | `method` | [`game/src/core/SoundManager.ts:454`](../../game/src/core/SoundManager.ts#L454) | Triumphant victory fanfare (30 minutes survived!) |
| `SoundManager.setMuted` | `method` | [`game/src/core/SoundManager.ts:44`](../../game/src/core/SoundManager.ts#L44) | - |
| `SoundManager.setVolume` | `method` | [`game/src/core/SoundManager.ts:33`](../../game/src/core/SoundManager.ts#L33) | - |
| `SpatialGrid` | `class` | [`game/src/entities/SpatialGrid.ts:10`](../../game/src/entities/SpatialGrid.ts#L10) | High-performance 2D Spatial Hash Grid for entity collisions, separation, an... |
| `SpatialGrid.clear` | `method` | [`game/src/entities/SpatialGrid.ts:30`](../../game/src/entities/SpatialGrid.ts#L30) | - |
| `SpatialGrid.getCellSize` | `method` | [`game/src/entities/SpatialGrid.ts:22`](../../game/src/entities/SpatialGrid.ts#L22) | - |
| `SpatialGrid.insert` | `method` | [`game/src/entities/SpatialGrid.ts:42`](../../game/src/entities/SpatialGrid.ts#L42) | - |
| `SpatialGrid.insertAll` | `method` | [`game/src/entities/SpatialGrid.ts:56`](../../game/src/entities/SpatialGrid.ts#L56) | - |
| `SpatialGrid.queryRadius` | `method` | [`game/src/entities/SpatialGrid.ts:145`](../../game/src/entities/SpatialGrid.ts#L145) | Fast query for nearby enemies within a circular radius. Reuses an output ar... |
| `SpatialGrid.resolveSeparation` | `method` | [`game/src/entities/SpatialGrid.ts:69`](../../game/src/entities/SpatialGrid.ts#L69) | O(N) soft separation using cell neighborhood pairs. Every potentially overl... |
| `SpatialGrid.separateCellPair` | `method` | [`game/src/entities/SpatialGrid.ts:101`](../../game/src/entities/SpatialGrid.ts#L101) | - |
| `SpatialGrid.separatePair` | `method` | [`game/src/entities/SpatialGrid.ts:121`](../../game/src/entities/SpatialGrid.ts#L121) | - |
| `SpatialGrid.toKey` | `method` | [`game/src/entities/SpatialGrid.ts:26`](../../game/src/entities/SpatialGrid.ts#L26) | - |
| `SPAWN_OFFSETS` | `const` | [`game/src/core/SessionDirector.ts:48`](../../game/src/core/SessionDirector.ts#L48) | - |
| `SpellContext` | `interface` | [`game/src/shared/InvokerSpellRuntime.ts:20`](../../game/src/shared/InvokerSpellRuntime.ts#L20) | - |
| `SpellControl` | `interface` | [`game/src/shared/InvokerSpells.ts:213`](../../game/src/shared/InvokerSpells.ts#L213) | - |
| `SpellControlState` | `class` | [`game/src/shared/InvokerSpells.ts:223`](../../game/src/shared/InvokerSpells.ts#L223) | Countdown state shared by the browser and dedicated simulation. |
| `SpellControlState.update` | `method` | [`game/src/shared/InvokerSpells.ts:235`](../../game/src/shared/InvokerSpells.ts#L235) | - |
| `SpellEnemy` | `interface` | [`game/src/shared/InvokerSpellRuntime.ts:15`](../../game/src/shared/InvokerSpellRuntime.ts#L15) | - |
| `SpellPosition` | `interface` | [`game/src/shared/InvokerSpellRuntime.ts:10`](../../game/src/shared/InvokerSpellRuntime.ts#L10) | - |
| `SpriteDirection` | `type` | [`game/src/shared/types/entities.ts:10`](../../game/src/shared/types/entities.ts#L10) | - |
| `SulfurSmokeManager` | `class` | [`game/src/vfx/SulfurSmokeVfx.ts:131`](../../game/src/vfx/SulfurSmokeVfx.ts#L131) | Global manager for Brimstone / Sulfur Smoke teleport and disappearance effe... |
| `SulfurSmokeManager.clear` | `method` | [`game/src/vfx/SulfurSmokeVfx.ts:154`](../../game/src/vfx/SulfurSmokeVfx.ts#L154) | - |
| `SulfurSmokeManager.update` | `method` | [`game/src/vfx/SulfurSmokeVfx.ts:144`](../../game/src/vfx/SulfurSmokeVfx.ts#L144) | - |
| `SulfurSmokeOptions` | `interface` | [`game/src/vfx/SulfurSmokeVfx.ts:13`](../../game/src/vfx/SulfurSmokeVfx.ts#L13) | - |
| `SulfurSmokeVfxInstance` | `class` | [`game/src/vfx/SulfurSmokeVfx.ts:25`](../../game/src/vfx/SulfurSmokeVfx.ts#L25) | Individual instance of the Brimstone Smoke cloud VFX. Plays sequential 6-fr... |
| `SulfurSmokeVfxInstance.dispose` | `method` | [`game/src/vfx/SulfurSmokeVfx.ts:110`](../../game/src/vfx/SulfurSmokeVfx.ts#L110) | - |
| `SulfurSmokeVfxInstance.update` | `method` | [`game/src/vfx/SulfurSmokeVfx.ts:76`](../../game/src/vfx/SulfurSmokeVfx.ts#L76) | - |
| `SupabaseService` | `class` | [`admin/src/api/supabaseService.ts:9`](../../admin/src/api/supabaseService.ts#L9) | - |
| `SupabaseService.connect` | `method` | [`admin/src/api/supabaseService.ts:60`](../../admin/src/api/supabaseService.ts#L60) | - |
| `SupabaseService.deploy` | `method` | [`admin/src/api/supabaseService.ts:397`](../../admin/src/api/supabaseService.ts#L397) | - |
| `SupabaseService.getClient` | `method` | [`admin/src/api/supabaseService.ts:27`](../../admin/src/api/supabaseService.ts#L27) | - |
| `SupabaseService.loadConfig` | `method` | [`admin/src/api/supabaseService.ts:31`](../../admin/src/api/supabaseService.ts#L31) | - |
| `SupabaseService.saveConnectionSettings` | `method` | [`admin/src/api/supabaseService.ts:173`](../../admin/src/api/supabaseService.ts#L173) | - |
| `SupabaseService.seedDatabase` | `method` | [`admin/src/api/supabaseService.ts:231`](../../admin/src/api/supabaseService.ts#L231) | - |
| `SupabaseService.setupRealtime` | `method` | [`admin/src/api/supabaseService.ts:147`](../../admin/src/api/supabaseService.ts#L147) | - |
| `SupabaseService.testConnection` | `method` | [`admin/src/api/supabaseService.ts:202`](../../admin/src/api/supabaseService.ts#L202) | - |
| `SvgChartRenderer` | `class` | [`admin/src/chartUtils.ts:30`](../../admin/src/chartUtils.ts#L30) | - |
| `SwordsmanTextures` | `type` | [`game/src/core/TextureManager.ts:44`](../../game/src/core/TextureManager.ts#L44) | - |
| `SyncState` | `type` | [`game/src/meta/CloudSyncManager.ts:6`](../../game/src/meta/CloudSyncManager.ts#L6) | - |
| `TableSort` | `interface` | [`admin/src/types.ts:1`](../../admin/src/types.ts#L1) | - |
| `TalentBalanceConfig` | `interface` | [`game/src/balance/BalanceTypes.ts:3`](../../game/src/balance/BalanceTypes.ts#L3) | - |
| `TeleporterState` | `type` | [`game/src/world/RiftTeleporter.ts:17`](../../game/src/world/RiftTeleporter.ts#L17) | - |
| `TeleporterSyncInfo` | `interface` | [`game/src/shared/types/network.ts:197`](../../game/src/shared/types/network.ts#L197) | - |
| `TerrainElevation` | `class` | [`game/src/world/TerrainElevation.ts:8`](../../game/src/world/TerrainElevation.ts#L8) | Procedural Terrain Elevation Generator. Provides deterministic, continuous,... |
| `TerrainElevation.getElevation` | `method` | [`game/src/world/TerrainElevation.ts:21`](../../game/src/world/TerrainElevation.ts#L21) | Returns flat ground elevation Y = 0 to preserve 2D/2.5D pixel-art plane con... |
| `TerrainElevation.getNormal` | `method` | [`game/src/world/TerrainElevation.ts:28`](../../game/src/world/TerrainElevation.ts#L28) | Returns flat ground normal (0, 1, 0). |
| `TerrainElevation.setSeed` | `method` | [`game/src/world/TerrainElevation.ts:14`](../../game/src/world/TerrainElevation.ts#L14) | Reconfigures harmonic parameters based on seed for varied topography per st... |
| `TerrainMaterials` | `class` | [`game/src/world/TerrainProps.ts:21`](../../game/src/world/TerrainProps.ts#L21) | Reusable shared materials for high performance and low draw overhead |
| `TerrainMaterials.init` | `method` | [`game/src/world/TerrainProps.ts:41`](../../game/src/world/TerrainProps.ts#L41) | - |
| `TerrainProps` | `class` | [`game/src/world/TerrainProps.ts:217`](../../game/src/world/TerrainProps.ts#L217) | - |
| `TerrainProps.createBoulder` | `method` | [`game/src/world/TerrainProps.ts:414`](../../game/src/world/TerrainProps.ts#L414) | Builds an earthy sandstone boulder formation. |
| `TerrainProps.createCactus` | `method` | [`game/src/world/TerrainProps.ts:221`](../../game/src/world/TerrainProps.ts#L221) | Builds an authentic 3D Saguaro Cactus with fluting and 0-2 curved arms. |
| `TerrainProps.createOasis` | `method` | [`game/src/world/TerrainProps.ts:680`](../../game/src/world/TerrainProps.ts#L680) | Builds an expansive desert oasis landmark with turquoise pool, wet sand sho... |
| `TerrainProps.createPalmTree` | `method` | [`game/src/world/TerrainProps.ts:602`](../../game/src/world/TerrainProps.ts#L602) | Builds an authentic desert palm tree with curved segmented trunk, radiating... |
| `TerrainProps.createScrub` | `method` | [`game/src/world/TerrainProps.ts:454`](../../game/src/world/TerrainProps.ts#L454) | Builds dry desert grass / sagebrush tuft. |
| `TerrainProps.createSteerSkull` | `method` | [`game/src/world/TerrainProps.ts:479`](../../game/src/world/TerrainProps.ts#L479) | Builds a steer skull landmark (western desert cow skull with horns). |
| `TerrainProps.createTrailPost` | `method` | [`game/src/world/TerrainProps.ts:576`](../../game/src/world/TerrainProps.ts#L576) | Builds a weathered wooden trail marker post. |
| `TerrainProps.createTree` | `method` | [`game/src/world/TerrainProps.ts:331`](../../game/src/world/TerrainProps.ts#L331) | Builds a twisted desert deadwood tree or dry desert acacia. |
| `TerrainProps.createWagonWheel` | `method` | [`game/src/world/TerrainProps.ts:529`](../../game/src/world/TerrainProps.ts#L529) | Builds an abandoned wooden wagon wheel half-buried in the sand. |
| `TEXTURE_MAP` | `const` | [`admin/src/constants.ts:4`](../../admin/src/constants.ts#L4) | - |
| `TextureManager` | `class` | [`game/src/core/TextureManager.ts:46`](../../game/src/core/TextureManager.ts#L46) | - |
| `TextureManager.createShadowMesh` | `method` | [`game/src/core/TextureManager.ts:743`](../../game/src/core/TextureManager.ts#L743) | High-performance contact shadow mesh sharing a single texture and material. |
| `TextureManager.getArrowTexture` | `method` | [`game/src/core/TextureManager.ts:591`](../../game/src/core/TextureManager.ts#L591) | - |
| `TextureManager.getAssetUrl` | `method` | [`game/src/core/TextureManager.ts:51`](../../game/src/core/TextureManager.ts#L51) | - |
| `TextureManager.getBulletTexture` | `method` | [`game/src/core/TextureManager.ts:582`](../../game/src/core/TextureManager.ts#L582) | - |
| `TextureManager.getChakramTexture` | `method` | [`game/src/core/TextureManager.ts:677`](../../game/src/core/TextureManager.ts#L677) | - |
| `TextureManager.getCharacterAnimatedTextures` | `method` | [`game/src/core/TextureManager.ts:578`](../../game/src/core/TextureManager.ts#L578) | - |
| `TextureManager.getFireballTexture` | `method` | [`game/src/core/TextureManager.ts:698`](../../game/src/core/TextureManager.ts#L698) | - |
| `TextureManager.getFireRingTexture` | `method` | [`game/src/core/TextureManager.ts:712`](../../game/src/core/TextureManager.ts#L712) | - |
| `TextureManager.getIceSpikeTexture` | `method` | [`game/src/core/TextureManager.ts:691`](../../game/src/core/TextureManager.ts#L691) | - |
| `TextureManager.getKukriTexture` | `method` | [`game/src/core/TextureManager.ts:670`](../../game/src/core/TextureManager.ts#L670) | - |
| `TextureManager.getLightningTexture` | `method` | [`game/src/core/TextureManager.ts:684`](../../game/src/core/TextureManager.ts#L684) | - |
| `TextureManager.getRiftClosedTexture` | `method` | [`game/src/core/TextureManager.ts:719`](../../game/src/core/TextureManager.ts#L719) | - |
| `TextureManager.getRiftOpenTexture` | `method` | [`game/src/core/TextureManager.ts:726`](../../game/src/core/TextureManager.ts#L726) | - |
| `TextureManager.getScytheTexture` | `method` | [`game/src/core/TextureManager.ts:705`](../../game/src/core/TextureManager.ts#L705) | - |
| `TextureManager.getSulfurSmokeTexture` | `method` | [`game/src/core/TextureManager.ts:733`](../../game/src/core/TextureManager.ts#L733) | - |
| `TextureManager.getWeaponBlobUrl` | `method` | [`game/src/core/TextureManager.ts:110`](../../game/src/core/TextureManager.ts#L110) | - |
| `TextureManager.hasCharacterAnimations` | `method` | [`game/src/core/TextureManager.ts:574`](../../game/src/core/TextureManager.ts#L574) | - |
| `TextureManager.initWeaponBlobs` | `method` | [`game/src/core/TextureManager.ts:127`](../../game/src/core/TextureManager.ts#L127) | - |
| `TextureManager.load` | `method` | [`game/src/core/TextureManager.ts:150`](../../game/src/core/TextureManager.ts#L150) | - |
| `TextureManager.loadAmazonTextures` | `method` | [`game/src/core/TextureManager.ts:570`](../../game/src/core/TextureManager.ts#L570) | - |
| `TextureManager.loadAnimatedTextures` | `method` | [`game/src/core/TextureManager.ts:510`](../../game/src/core/TextureManager.ts#L510) | - |
| `TextureManager.loadArcherTextures` | `method` | [`game/src/core/TextureManager.ts:558`](../../game/src/core/TextureManager.ts#L558) | - |
| `TextureManager.loadBossTextures` | `method` | [`game/src/core/TextureManager.ts:482`](../../game/src/core/TextureManager.ts#L482) | - |
| `TextureManager.loadChakramTextures` | `method` | [`game/src/core/TextureManager.ts:550`](../../game/src/core/TextureManager.ts#L550) | - |
| `TextureManager.loadDirectional` | `method` | [`game/src/core/TextureManager.ts:185`](../../game/src/core/TextureManager.ts#L185) | - |
| `TextureManager.loadFlailTextures` | `method` | [`game/src/core/TextureManager.ts:542`](../../game/src/core/TextureManager.ts#L542) | - |
| `TextureManager.loadInvokerTextures` | `method` | [`game/src/core/TextureManager.ts:554`](../../game/src/core/TextureManager.ts#L554) | - |
| `TextureManager.loadMonsterTextures` | `method` | [`game/src/core/TextureManager.ts:496`](../../game/src/core/TextureManager.ts#L496) | - |
| `TextureManager.loadNecromancerTextures` | `method` | [`game/src/core/TextureManager.ts:566`](../../game/src/core/TextureManager.ts#L566) | - |
| `TextureManager.loadRocketTextures` | `method` | [`game/src/core/TextureManager.ts:562`](../../game/src/core/TextureManager.ts#L562) | - |
| `TextureManager.loadRoninTextures` | `method` | [`game/src/core/TextureManager.ts:534`](../../game/src/core/TextureManager.ts#L534) | - |
| `TextureManager.loadSorceressTextures` | `method` | [`game/src/core/TextureManager.ts:546`](../../game/src/core/TextureManager.ts#L546) | - |
| `TextureManager.loadSwordsmanTextures` | `method` | [`game/src/core/TextureManager.ts:530`](../../game/src/core/TextureManager.ts#L530) | - |
| `TextureManager.loadValkyrieTextures` | `method` | [`game/src/core/TextureManager.ts:538`](../../game/src/core/TextureManager.ts#L538) | - |
| `TextureManager.normalizeTextureUrl` | `method` | [`game/src/core/TextureManager.ts:55`](../../game/src/core/TextureManager.ts#L55) | - |
| `TextureManager.preloadAll` | `method` | [`game/src/core/TextureManager.ts:478`](../../game/src/core/TextureManager.ts#L478) | Preloads all entity sprite sheets upfront to eliminate mid-game texture loa... |
| `toggleRow` | `function` | [`admin/src/views/controlHelpers.ts:52`](../../admin/src/views/controlHelpers.ts#L52) | - |
| `toPluralCategory` | `function` | [`admin/src/constants.ts:132`](../../admin/src/constants.ts#L132) | - |
| `toSingularCategory` | `function` | [`admin/src/constants.ts:103`](../../admin/src/constants.ts#L103) | - |
| `TreeManager` | `class` | [`game/src/world/TreeManager.ts:95`](../../game/src/world/TreeManager.ts#L95) | - |
| `TreeManager.createTreeMesh` | `method` | [`game/src/world/TreeManager.ts:163`](../../game/src/world/TreeManager.ts#L163) | Creates a pseudo-3D tree mesh with directional silhouette shadow matching m... |
| `TreeManager.getDepthMaterial` | `method` | [`game/src/world/TreeManager.ts:146`](../../game/src/world/TreeManager.ts#L146) | - |
| `TreeManager.getGeometry` | `method` | [`game/src/world/TreeManager.ts:118`](../../game/src/world/TreeManager.ts#L118) | - |
| `TreeManager.getMaterial` | `method` | [`game/src/world/TreeManager.ts:129`](../../game/src/world/TreeManager.ts#L129) | - |
| `TreeManager.getTexture` | `method` | [`game/src/world/TreeManager.ts:102`](../../game/src/world/TreeManager.ts#L102) | - |
| `TreeTypeConfig` | `interface` | [`game/src/world/TreeManager.ts:21`](../../game/src/world/TreeManager.ts#L21) | - |
| `UIEventBus` | `class` | [`game/src/ui/core/UIEventBus.ts:6`](../../game/src/ui/core/UIEventBus.ts#L6) | Lightweight, zero-dependency UI Event Bus for decoupled cross-module commun... |
| `UIEventBus.clear` | `method` | [`game/src/ui/core/UIEventBus.ts:39`](../../game/src/ui/core/UIEventBus.ts#L39) | - |
| `UIEventListener` | `type` | [`game/src/ui/core/UIEventBus.ts:1`](../../game/src/ui/core/UIEventBus.ts#L1) | - |
| `UNCOMMON_ITEMS` | `const` | [`game/src/items/RiftItemSystem.ts:251`](../../game/src/items/RiftItemSystem.ts#L251) | - |
| `UNIQUE_CHARACTERS` | `const` | [`game/src/shared/UniqueCharacters.ts:54`](../../game/src/shared/UniqueCharacters.ts#L54) | Registry of unique characters. Easily extensible for future unique characte... |
| `UniqueCharacterConfig` | `interface` | [`game/src/shared/UniqueCharacters.ts:24`](../../game/src/shared/UniqueCharacters.ts#L24) | Unique Character Specification. Defines exclusive weapons, restriction rule... |
| `unpackHostSnapshot` | `function` | [`game/src/net/BinarySnapshot.ts:240`](../../game/src/net/BinarySnapshot.ts#L240) | Unpacks an ArrayBuffer back into a complete HostSnapshotMessage object. |
| `UpdateListener` | `type` | [`game/src/core/UpdateNotifier.ts:8`](../../game/src/core/UpdateNotifier.ts#L8) | - |
| `UpdateNotificationUI` | `class` | [`game/src/ui/UpdateNotificationUI.ts:8`](../../game/src/ui/UpdateNotificationUI.ts#L8) | Handles the visual presentation of the game update notification. Designed t... |
| `UpdateNotificationUI.bindEvents` | `method` | [`game/src/ui/UpdateNotificationUI.ts:60`](../../game/src/ui/UpdateNotificationUI.ts#L60) | - |
| `UpdateNotificationUI.clearAutoMinimizeTimer` | `method` | [`game/src/ui/UpdateNotificationUI.ts:184`](../../game/src/ui/UpdateNotificationUI.ts#L184) | - |
| `UpdateNotificationUI.expand` | `method` | [`game/src/ui/UpdateNotificationUI.ts:165`](../../game/src/ui/UpdateNotificationUI.ts#L165) | - |
| `UpdateNotificationUI.getHasUpdate` | `method` | [`game/src/ui/UpdateNotificationUI.ts:197`](../../game/src/ui/UpdateNotificationUI.ts#L197) | - |
| `UpdateNotificationUI.getLatestVersion` | `method` | [`game/src/ui/UpdateNotificationUI.ts:201`](../../game/src/ui/UpdateNotificationUI.ts#L201) | - |
| `UpdateNotificationUI.handleUpdateAvailable` | `method` | [`game/src/ui/UpdateNotificationUI.ts:111`](../../game/src/ui/UpdateNotificationUI.ts#L111) | - |
| `UpdateNotificationUI.initMainMenuVersion` | `method` | [`game/src/ui/UpdateNotificationUI.ts:48`](../../game/src/ui/UpdateNotificationUI.ts#L48) | - |
| `UpdateNotificationUI.minimize` | `method` | [`game/src/ui/UpdateNotificationUI.ts:171`](../../game/src/ui/UpdateNotificationUI.ts#L171) | - |
| `UpdateNotificationUI.onRunEnded` | `method` | [`game/src/ui/UpdateNotificationUI.ts:155`](../../game/src/ui/UpdateNotificationUI.ts#L155) | Called when player dies, wins, or returns to main menu (peaceful phase). Re... |
| `UpdateNotificationUI.preventFocusLoss` | `method` | [`game/src/ui/UpdateNotificationUI.ts:105`](../../game/src/ui/UpdateNotificationUI.ts#L105) | Prevents UI buttons from capturing keyboard focus (e.g. Space to dash, WASD... |
| `UpdateNotificationUI.scheduleAutoMinimize` | `method` | [`game/src/ui/UpdateNotificationUI.ts:177`](../../game/src/ui/UpdateNotificationUI.ts#L177) | - |
| `UpdateNotificationUI.setCombatActive` | `method` | [`game/src/ui/UpdateNotificationUI.ts:143`](../../game/src/ui/UpdateNotificationUI.ts#L143) | Called by Game / HUD when entering gameplay. |
| `UpdateNotificationUI.triggerUpdate` | `method` | [`game/src/ui/UpdateNotificationUI.ts:191`](../../game/src/ui/UpdateNotificationUI.ts#L191) | - |
| `UpdateNotifier` | `class` | [`game/src/core/UpdateNotifier.ts:14`](../../game/src/core/UpdateNotifier.ts#L14) | UpdateNotifier checks for new client builds/patches deployed to the host. E... |
| `UpdateNotifier.addListener` | `method` | [`game/src/core/UpdateNotifier.ts:78`](../../game/src/core/UpdateNotifier.ts#L78) | - |
| `UpdateNotifier.applyUpdate` | `method` | [`game/src/core/UpdateNotifier.ts:197`](../../game/src/core/UpdateNotifier.ts#L197) | Applies update by clearing caches and reloading page. |
| `UpdateNotifier.checkForUpdate` | `method` | [`game/src/core/UpdateNotifier.ts:90`](../../game/src/core/UpdateNotifier.ts#L90) | - |
| `UpdateNotifier.compareSemver` | `method` | [`game/src/core/UpdateNotifier.ts:149`](../../game/src/core/UpdateNotifier.ts#L149) | - |
| `UpdateNotifier.destroy` | `method` | [`game/src/core/UpdateNotifier.ts:217`](../../game/src/core/UpdateNotifier.ts#L217) | - |
| `UpdateNotifier.getInstance` | `method` | [`game/src/core/UpdateNotifier.ts:39`](../../game/src/core/UpdateNotifier.ts#L39) | - |
| `UpdateNotifier.getNewVersion` | `method` | [`game/src/core/UpdateNotifier.ts:213`](../../game/src/core/UpdateNotifier.ts#L213) | - |
| `UpdateNotifier.getUpdateAvailable` | `method` | [`game/src/core/UpdateNotifier.ts:209`](../../game/src/core/UpdateNotifier.ts#L209) | - |
| `UpdateNotifier.init` | `method` | [`game/src/core/UpdateNotifier.ts:49`](../../game/src/core/UpdateNotifier.ts#L49) | Initializes polling and listeners. |
| `UpdateNotifier.isNewerVersion` | `method` | [`game/src/core/UpdateNotifier.ts:131`](../../game/src/core/UpdateNotifier.ts#L131) | - |
| `UpdateNotifier.notifyUpdate` | `method` | [`game/src/core/UpdateNotifier.ts:161`](../../game/src/core/UpdateNotifier.ts#L161) | - |
| `UpdateNotifier.simulateUpdate` | `method` | [`game/src/core/UpdateNotifier.ts:184`](../../game/src/core/UpdateNotifier.ts#L184) | Simulates an update event (useful for UI testing and verification in Dev mo... |
| `updateOverviewStats` | `function` | [`admin/src/views/dashboardView.ts:160`](../../admin/src/views/dashboardView.ts#L160) | - |
| `UpgradeOption` | `interface` | [`game/src/ui/screens/LevelUp/LevelUpScreen.ts:31`](../../game/src/ui/screens/LevelUp/LevelUpScreen.ts#L31) | - |
| `VersionInfo` | `interface` | [`game/src/core/UpdateNotifier.ts:1`](../../game/src/core/UpdateNotifier.ts#L1) | - |
| `Weapon` | `class` | [`game/src/combat/WeaponBase.ts:91`](../../game/src/combat/WeaponBase.ts#L91) | - |
| `WEAPON_COLORS` | `const` | [`admin/src/constants.ts:51`](../../admin/src/constants.ts#L51) | - |
| `WEAPON_GRADES` | `const` | [`game/src/combat/WeaponGrades.ts:16`](../../game/src/combat/WeaponGrades.ts#L16) | - |
| `Weapon.applyBalance` | `method` | [`game/src/combat/WeaponBase.ts:145`](../../game/src/combat/WeaponBase.ts#L145) | - |
| `Weapon.applyGradeUpgrade` | `method` | [`game/src/combat/WeaponBase.ts:156`](../../game/src/combat/WeaponBase.ts#L156) | - |
| `Weapon.awakenGrade` | `method` | [`game/src/combat/WeaponBase.ts:167`](../../game/src/combat/WeaponBase.ts#L167) | - |
| `Weapon.emitMeleeAttack` | `method` | [`game/src/combat/WeaponBase.ts:226`](../../game/src/combat/WeaponBase.ts#L226) | - |
| `Weapon.getEffectiveCap` | `method` | [`game/src/combat/WeaponBase.ts:193`](../../game/src/combat/WeaponBase.ts#L193) | - |
| `Weapon.getGradePrefix` | `method` | [`game/src/combat/WeaponBase.ts:187`](../../game/src/combat/WeaponBase.ts#L187) | - |
| `Weapon.getInfo` | `method` | [`game/src/combat/WeaponBase.ts:235`](../../game/src/combat/WeaponBase.ts#L235) | - |
| `Weapon.getMeleeAttackAngle` | `method` | [`game/src/combat/WeaponBase.ts:210`](../../game/src/combat/WeaponBase.ts#L210) | - |
| `Weapon.recalculateStats` | `method` | [`game/src/combat/WeaponBase.ts:197`](../../game/src/combat/WeaponBase.ts#L197) | - |
| `WeaponBalanceConfig` | `interface` | [`game/src/balance/BalanceTypes.ts:17`](../../game/src/balance/BalanceTypes.ts#L17) | - |
| `WeaponGrade` | `type` | [`game/src/combat/WeaponGrades.ts:1`](../../game/src/combat/WeaponGrades.ts#L1) | - |
| `WeaponGradeConfig` | `interface` | [`game/src/combat/WeaponGrades.ts:3`](../../game/src/combat/WeaponGrades.ts#L3) | - |
| `WeaponInfo` | `interface` | [`game/src/combat/WeaponBase.ts:13`](../../game/src/combat/WeaponBase.ts#L13) | - |
| `WhirlwindSlashWeapon` | `class` | [`game/src/combat/weapons/MeleeWeapons.ts:204`](../../game/src/combat/weapons/MeleeWeapons.ts#L204) | Crimson Whirlwind (Багровый Вихрь) - Hero 4 Ronin starting weapon Rapid fur... |
| `WhirlwindSlashWeapon.getNextUpgradeDescription` | `method` | [`game/src/combat/weapons/MeleeWeapons.ts:274`](../../game/src/combat/weapons/MeleeWeapons.ts#L274) | - |
| `WhirlwindSlashWeapon.setAttackCallback` | `method` | [`game/src/combat/weapons/MeleeWeapons.ts:222`](../../game/src/combat/weapons/MeleeWeapons.ts#L222) | - |
| `WhirlwindSlashWeapon.upgrade` | `method` | [`game/src/combat/weapons/MeleeWeapons.ts:267`](../../game/src/combat/weapons/MeleeWeapons.ts#L267) | - |
