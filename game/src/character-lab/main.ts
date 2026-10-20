import { CharacterSandboxApp, DEFAULT_CLASS_CONFIGS } from './CharacterSandboxApp';
import { CharacterClass, LightingPreset } from './types';

// Wait for DOM
window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found!');
    return;
  }

  const app = new CharacterSandboxApp(container);

  // Bind Class Buttons
  const classButtons = document.querySelectorAll<HTMLButtonElement>('.class-tab-btn');
  classButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      classButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const classType = btn.dataset.class as CharacterClass;
      app.applyClass(classType);
      syncUIWithConfig(classType);
    });
  });

  // Color Pickers
  const primaryColorInput = document.getElementById('color-primary') as HTMLInputElement;
  const secondaryColorInput = document.getElementById('color-secondary') as HTMLInputElement;
  const accentColorInput = document.getElementById('color-accent') as HTMLInputElement;
  const emissiveColorInput = document.getElementById('color-emissive') as HTMLInputElement;
  const skinColorInput = document.getElementById('color-skin') as HTMLInputElement;
  const hairColorInput = document.getElementById('color-hair') as HTMLInputElement;

  primaryColorInput?.addEventListener('input', (e) => app.updateColor('primaryArmor', (e.target as HTMLInputElement).value));
  secondaryColorInput?.addEventListener('input', (e) => app.updateColor('secondaryArmor', (e.target as HTMLInputElement).value));
  accentColorInput?.addEventListener('input', (e) => app.updateColor('accent', (e.target as HTMLInputElement).value));
  emissiveColorInput?.addEventListener('input', (e) => app.updateColor('emissive', (e.target as HTMLInputElement).value));
  skinColorInput?.addEventListener('input', (e) => app.updateColor('skin', (e.target as HTMLInputElement).value));
  hairColorInput?.addEventListener('input', (e) => app.updateColor('hair', (e.target as HTMLInputElement).value));

  // Materials Sliders
  const metalnessInput = document.getElementById('mat-metalness') as HTMLInputElement;
  const roughnessInput = document.getElementById('mat-roughness') as HTMLInputElement;
  const metalnessVal = document.getElementById('val-metalness');
  const roughnessVal = document.getElementById('val-roughness');

  metalnessInput?.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    app.updateMaterialProperty('metalness', val);
    if (metalnessVal) metalnessVal.textContent = val.toFixed(2);
  });

  roughnessInput?.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    app.updateMaterialProperty('roughness', val);
    if (roughnessVal) roughnessVal.textContent = val.toFixed(2);
  });

  // Equipment Toggles
  const toggleHelmet = document.getElementById('toggle-helmet') as HTMLInputElement;
  const toggleShoulders = document.getElementById('toggle-shoulders') as HTMLInputElement;
  const toggleCape = document.getElementById('toggle-cape') as HTMLInputElement;
  const toggleSecondary = document.getElementById('toggle-secondary') as HTMLInputElement;

  toggleHelmet?.addEventListener('change', (e) => app.toggleEquipment('showHelmet', (e.target as HTMLInputElement).checked));
  toggleShoulders?.addEventListener('change', (e) => app.toggleEquipment('showShoulders', (e.target as HTMLInputElement).checked));
  toggleCape?.addEventListener('change', (e) => app.toggleEquipment('showCape', (e.target as HTMLInputElement).checked));
  toggleSecondary?.addEventListener('change', (e) => app.toggleEquipment('showSecondary', (e.target as HTMLInputElement).checked));

  // Animation Buttons
  const animButtons = document.querySelectorAll<HTMLButtonElement>('.anim-btn');
  animButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      animButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const anim = btn.dataset.anim as 'idle' | 'walk' | 'run';
      app.setAnimation(anim);
    });
  });

  // Attack Trigger Button
  const attackBtn = document.getElementById('btn-attack');
  attackBtn?.addEventListener('click', () => {
    app.triggerAttack();
  });

  // Animation Speed Slider
  const speedInput = document.getElementById('anim-speed') as HTMLInputElement;
  const speedVal = document.getElementById('val-speed');
  speedInput?.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    app.setPlaybackSpeed(val);
    if (speedVal) speedVal.textContent = `${val.toFixed(1)}x`;
  });

  // Lighting Presets
  const lightButtons = document.querySelectorAll<HTMLButtonElement>('.light-preset-btn');
  lightButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      lightButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const preset = btn.dataset.preset as LightingPreset;
      app.setLightingPreset(preset);
    });
  });

  // Camera Presets
  const camButtons = document.querySelectorAll<HTMLButtonElement>('.cam-btn');
  camButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view as 'front' | 'close' | 'iso';
      app.resetCamera(view);
    });
  });

  // Wireframe Toggle
  const toggleWireframe = document.getElementById('toggle-wireframe') as HTMLInputElement;
  toggleWireframe?.addEventListener('change', (e) => {
    app.toggleWireframe((e.target as HTMLInputElement).checked);
  });

  // Mage Texture Render Mode Toggles
  const btnMageModeTextured = document.getElementById('btn-mage-mode-textured');
  const btnMageModeProcedural = document.getElementById('btn-mage-mode-procedural');
  const mageAnglesContainer = document.getElementById('mage-angles-container');

  btnMageModeTextured?.addEventListener('click', () => {
    btnMageModeTextured.classList.add('active');
    btnMageModeProcedural?.classList.remove('active');
    if (mageAnglesContainer) mageAnglesContainer.style.display = 'block';
    app.setMageRenderMode('textured');
  });

  btnMageModeProcedural?.addEventListener('click', () => {
    btnMageModeProcedural.classList.add('active');
    btnMageModeTextured?.classList.remove('active');
    if (mageAnglesContainer) mageAnglesContainer.style.display = 'none';
    app.setMageRenderMode('procedural');
  });

  // Mage Angle Buttons
  const mageAngleButtons = document.querySelectorAll<HTMLButtonElement>('.mage-angle-btn');
  mageAngleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      mageAngleButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const angle = btn.dataset.angle as any;
      app.setMageAngleMode(angle);
    });
  });

  function syncUIWithConfig(classType: CharacterClass) {
    const mageSection = document.getElementById('mage-texture-section');
    if (mageSection) {
      mageSection.style.display = classType === 'mage' ? 'block' : 'none';
    }

    const config = DEFAULT_CLASS_CONFIGS[classType];
    if (primaryColorInput) primaryColorInput.value = config.colors.primaryArmor;
    if (secondaryColorInput) secondaryColorInput.value = config.colors.secondaryArmor;
    if (accentColorInput) accentColorInput.value = config.colors.accent;
    if (emissiveColorInput) emissiveColorInput.value = config.colors.emissive;
    if (skinColorInput) skinColorInput.value = config.colors.skin;
    if (hairColorInput) hairColorInput.value = config.colors.hair;

    if (metalnessInput) metalnessInput.value = config.materials.metalness.toString();
    if (metalnessVal) metalnessVal.textContent = config.materials.metalness.toFixed(2);
    if (roughnessInput) roughnessInput.value = config.materials.roughness.toString();
    if (roughnessVal) roughnessVal.textContent = config.materials.roughness.toFixed(2);

    if (toggleHelmet) toggleHelmet.checked = config.equipment.showHelmet;
    if (toggleShoulders) toggleShoulders.checked = config.equipment.showShoulders;
    if (toggleCape) toggleCape.checked = config.equipment.showCape;
    if (toggleSecondary) toggleSecondary.checked = config.equipment.showSecondary;

    animButtons.forEach((b) => {
      b.classList.toggle('active', b.dataset.anim === 'idle');
    });
  }

  // Initial Sync
  syncUIWithConfig('warrior');
});
