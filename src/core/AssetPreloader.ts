import { WebGLRenderer } from 'three';
import { TextureManager } from './TextureManager';

export class AssetPreloader {
  public static init(renderer: WebGLRenderer, onReady: () => void): void {
    const loaderContainer = document.getElementById('game-loader-container');
    const loaderTitle = document.getElementById('game-loader-title');
    const loaderFill = document.getElementById('game-loader-fill');
    const loaderPercent = document.getElementById('game-loader-percentage');
    const loaderDetails = document.getElementById('game-loader-details');
    const loaderCounter = document.getElementById('game-loader-counter');

    if (!loaderContainer || !loaderFill || !loaderPercent) return;

    TextureManager.preloadAllWithProgress(renderer, (loaded, total, item) => {
      const pct = Math.min(100, Math.round((loaded / total) * 100));
      loaderFill.style.width = `${pct}%`;
      loaderPercent.textContent = `${pct}%`;
      if (loaderCounter) {
        loaderCounter.textContent = `${loaded} / ${total}`;
      }
      if (loaderDetails) {
        loaderDetails.textContent = `Загрузка: ${item}`;
      }
    })
      .then(() => {
        loaderFill.style.width = '100%';
        if (loaderTitle) {
          loaderTitle.textContent = 'ВСЕ РЕСУРСЫ И КАРТА ГОТОВЫ';
        }
        if (loaderDetails) {
          loaderDetails.textContent = 'Текстуры, иконки оружия и карта 500x500м загружены';
        }
        onReady();
        setTimeout(() => {
          loaderContainer.classList.add('loaded');
        }, 550);
      })
      .catch(() => {
        onReady();
        loaderContainer.classList.add('loaded');
      });
  }

  public static showMapLoadingProgress(title: string = 'ГЕНЕРАЦИЯ КАРТЫ...'): void {
    const loaderContainer = document.getElementById('game-loader-container');
    const loaderTitle = document.getElementById('game-loader-title');
    const loaderFill = document.getElementById('game-loader-fill');
    const loaderPercent = document.getElementById('game-loader-percentage');
    const loaderDetails = document.getElementById('game-loader-details');
    const loaderCounter = document.getElementById('game-loader-counter');
    if (!loaderContainer || !loaderFill) return;

    loaderContainer.classList.remove('loaded');
    if (loaderTitle) loaderTitle.textContent = title;
    if (loaderDetails) loaderDetails.textContent = 'Построение ландшафта, дюн и препятствий...';
    if (loaderCounter) loaderCounter.textContent = '100%';
    loaderFill.style.width = '0%';
    if (loaderPercent) loaderPercent.textContent = '0%';

    let step = 0;
    const interval = setInterval(() => {
      step += 25;
      const pct = Math.min(100, step);
      loaderFill.style.width = `${pct}%`;
      if (loaderPercent) loaderPercent.textContent = `${pct}%`;
      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          loaderContainer.classList.add('loaded');
        }, 350);
      }
    }, 40);
  }
}
