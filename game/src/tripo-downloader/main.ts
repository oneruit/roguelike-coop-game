import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import * as fflate from 'fflate';

type FigureSelection = '3' | '1' | '2' | 'all';

interface ModelMeta {
  id: string;
  projectName: string;
  author: string;
  thumbnailUrl?: string;
  modelUrl: string;
}

class TripoDownloaderApp {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private loader: GLTFLoader;
  private exporter: GLTFExporter;

  // Active 3D objects
  private modelGroup?: THREE.Group;
  private rawModelGroup?: THREE.Group;
  private currentMesh?: THREE.Mesh;
  private rawGeometry?: THREE.BufferGeometry;

  // Active state
  private activeFigure: FigureSelection = '3';
  private currentMeta?: ModelMeta;
  private isAutoRotate: boolean = false;
  private isWireframe: boolean = false;
  private originalGlbBuffer?: ArrayBuffer;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0f19);

    // 2. Camera setup
    const aspect = this.container.clientWidth / (this.container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 1.3, 3.8);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 0.9, 0);

    // 5. Lighting
    this.setupLighting();

    // 6. Ground Grid
    this.setupGrid();

    // 7. GLTFLoader with MeshoptDecoder
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.exporter = new GLTFExporter();

    // 8. Event listeners
    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xa855f7, 1.2);
    fillLight.position.set(-3, 3, -2);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    rimLight.position.set(0, 4, -4);
    this.scene.add(rimLight);
  }

  private setupGrid() {
    const grid = new THREE.GridHelper(10, 20, 0x6366f1, 0x1e293b);
    grid.position.y = 0;
    this.scene.add(grid);

    const shadowPlaneGeo = new THREE.PlaneGeometry(10, 10);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);
  }

  private onResize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / (h || 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private animate = () => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    if (this.isAutoRotate && this.modelGroup) {
      this.modelGroup.rotation.y += 0.008;
    }
    this.renderer.render(this.scene, this.camera);
  };

  public setAutoRotate(val: boolean) {
    this.isAutoRotate = val;
  }

  public setWireframe(val: boolean) {
    this.isWireframe = val;
    if (this.modelGroup) {
      this.modelGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat) mat.wireframe = val;
        }
      });
    }
  }

  public resetCamera() {
    this.camera.position.set(0, 1.3, 3.8);
    this.controls.target.set(0, 0.9, 0);
    this.controls.update();
  }

  /**
   * Loads a GLB directly from a URL or ArrayBuffer.
   */
  public async loadGlb(source: string | ArrayBuffer, meta?: Partial<ModelMeta>) {
    this.showStatus('Загрузка 3D модели...', 'loading');

    let arrayBuffer: ArrayBuffer;
    if (typeof source === 'string') {
      try {
        const res = await fetch(source);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        arrayBuffer = await res.arrayBuffer();
      } catch (err: any) {
        this.showStatus(`Ошибка скачивания: ${err.message}. Проверьте соединение или используйте локальный файл.`, 'error');
        throw err;
      }
    } else {
      arrayBuffer = source;
    }

    this.originalGlbBuffer = arrayBuffer;

    // Check if format is FBX
    const headerStr = new TextDecoder().decode(new Uint8Array(arrayBuffer.slice(0, 24)));
    const isFbx = (typeof source === 'string' && source.split('?')[0].toLowerCase().endsWith('.fbx')) ||
                  headerStr.includes('Kaydara FBX');

    if (isFbx) {
      try {
        const fbxLoader = new FBXLoader();
        const obj = fbxLoader.parse(arrayBuffer, '');
        if (this.modelGroup) {
          this.scene.remove(this.modelGroup);
        }
        this.rawModelGroup = obj;
        this.rawGeometry = undefined;
        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && !this.rawGeometry) {
            this.rawGeometry = (child as THREE.Mesh).geometry.clone();
          }
        });

        this.currentMeta = {
          id: meta?.id || 'model',
          projectName: meta?.projectName || 'TripoModel',
          author: meta?.author || 'Tripo User',
          thumbnailUrl: meta?.thumbnailUrl,
          modelUrl: typeof source === 'string' ? source : '',
        };

        this.applyFigureSelection(this.activeFigure);
        this.showStatus(`Модель "${this.currentMeta.projectName}" (FBX) успешно загружена!`, 'success');
        this.updateStatsUI();
        return Promise.resolve();
      } catch (err: any) {
        this.showStatus(`Ошибка парсинга FBX: ${err.message}`, 'error');
        return Promise.reject(err);
      }
    }

    return new Promise<void>((resolve, reject) => {
      this.loader.parse(
        arrayBuffer,
        '',
        (gltf) => {
          if (this.modelGroup) {
            this.scene.remove(this.modelGroup);
          }

          this.rawModelGroup = gltf.scene;

          // Find primary mesh & store original un-cut geometry
          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && !this.rawGeometry) {
              this.rawGeometry = (child as THREE.Mesh).geometry.clone();
            }
          });

          this.currentMeta = {
            id: meta?.id || 'model',
            projectName: meta?.projectName || 'TripoModel',
            author: meta?.author || 'Tripo User',
            thumbnailUrl: meta?.thumbnailUrl,
            modelUrl: typeof source === 'string' ? source : '',
          };

          this.applyFigureSelection(this.activeFigure);
          this.showStatus(`Модель "${this.currentMeta.projectName}" успешно загружена!`, 'success');
          this.updateStatsUI();
          resolve();
        },
        (err) => {
          this.showStatus(`Ошибка парсинга GLTF: ${err}`, 'error');
          reject(err);
        }
      );
    });
  }

  /**
   * Applies turnaround figure isolation and centers/scales the model.
   */
  public applyFigureSelection(fig: FigureSelection) {
    this.activeFigure = fig;
    if (!this.rawModelGroup || !this.rawGeometry) return;

    if (this.modelGroup) {
      this.scene.remove(this.modelGroup);
    }

    // Clone raw scene
    this.modelGroup = this.rawModelGroup.clone(true);
    let targetMesh: THREE.Mesh | null = null;

    this.modelGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        targetMesh = mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Isolate requested figure
        mesh.geometry = this.isolateFigureGeometry(this.rawGeometry!.clone(), fig);

        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.wireframe = this.isWireframe;
        }
      }
    });

    this.currentMesh = targetMesh || undefined;

    // Normalize height to 1.85m and ground feet
    const bbox = new THREE.Box3().setFromObject(this.modelGroup);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    const targetHeight = 1.85;
    const scale = targetHeight / (size.y || 1);
    this.modelGroup.scale.setScalar(scale);

    const scaledBbox = new THREE.Box3().setFromObject(this.modelGroup);
    const yOffset = -scaledBbox.min.y;
    this.modelGroup.position.set(-center.x * scale, yOffset, -center.z * scale);

    this.scene.add(this.modelGroup);
    this.updateStatsUI();
  }

  private isolateFigureGeometry(geometry: THREE.BufferGeometry, figure: FigureSelection): THREE.BufferGeometry {
    if (figure === 'all') return geometry;

    const pos = geometry.attributes.position;
    const norm = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    const index = geometry.index;

    geometry.computeBoundingBox();
    const origBox = geometry.boundingBox;
    if (!origBox) return geometry;

    const zSpan = origBox.max.z - origBox.min.z;
    if (zSpan <= 0.6 || origBox.min.z >= -0.3) {
      return geometry; // Not a multi-figure turnaround sheet
    }

    const newPositions: number[] = [];
    const newNormals: number[] = [];
    const newUVs: number[] = [];
    const newIndices: number[] = [];
    const vertexMap = new Map<number, number>();

    const getOrAddVertex = (oldIdx: number) => {
      if (vertexMap.has(oldIdx)) return vertexMap.get(oldIdx)!;
      const newIdx = newPositions.length / 3;
      newPositions.push(pos.getX(oldIdx), pos.getY(oldIdx), pos.getZ(oldIdx));
      if (norm) newNormals.push(norm.getX(oldIdx), norm.getY(oldIdx), norm.getZ(oldIdx));
      if (uv) newUVs.push(uv.getX(oldIdx), uv.getY(oldIdx));
      vertexMap.set(oldIdx, newIdx);
      return newIdx;
    };

    const isMatch = (zA: number, zB: number, zC: number) => {
      if (figure === '1') return zA < -0.15 && zB < -0.15 && zC < -0.15;
      if (figure === '3') return zA > 0.15 && zB > 0.15 && zC > 0.15;
      return zA >= -0.15 && zA <= 0.15 && zB >= -0.15 && zB <= 0.15 && zC >= -0.15 && zC <= 0.15;
    };

    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const iA = index.getX(i);
        const iB = index.getX(i + 1);
        const iC = index.getX(i + 2);
        if (isMatch(pos.getZ(iA), pos.getZ(iB), pos.getZ(iC))) {
          newIndices.push(getOrAddVertex(iA), getOrAddVertex(iB), getOrAddVertex(iC));
        }
      }
    }

    if (newIndices.length === 0) return geometry;

    const newGeo = new THREE.BufferGeometry();
    newGeo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    if (newNormals.length) newGeo.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
    if (newUVs.length) newGeo.setAttribute('uv', new THREE.Float32BufferAttribute(newUVs, 2));
    newGeo.setIndex(newIndices);

    // Center isolated character and align
    newGeo.computeBoundingBox();
    const b = newGeo.boundingBox!;
    const center = new THREE.Vector3();
    b.getCenter(center);
    newGeo.translate(-center.x, -b.min.y, -center.z);
    newGeo.rotateY(Math.PI / 2);

    return newGeo;
  }

  /**
   * Generates a 3MF Blob from the currently displayed geometry.
   */
  public generate3MF(scaleMm: number = 120, zUp: boolean = true): Blob {
    if (!this.currentMesh) throw new Error('No active 3D mesh loaded');

    const geometry = this.currentMesh.geometry;
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox || new THREE.Box3();
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const scale = scaleMm / (size.y || 1);
    const pos = geometry.attributes.position;
    const index = geometry.index;

    const vertices: string[] = [];
    for (let i = 0; i < pos.count; i++) {
      const rx = pos.getX(i) * scale;
      const ry = pos.getY(i) * scale;
      const rz = pos.getZ(i) * scale;

      let x: string, y: string, z: string;
      if (zUp) {
        // Z-up for 3D printing
        x = rx.toFixed(3);
        y = rz.toFixed(3);
        z = ry.toFixed(3);
      } else {
        x = rx.toFixed(3);
        y = ry.toFixed(3);
        z = rz.toFixed(3);
      }
      vertices.push(`          <vertex x="${x}" y="${y}" z="${z}" />`);
    }

    const triangles: string[] = [];
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        triangles.push(`          <triangle v1="${index.getX(i)}" v2="${index.getX(i + 1)}" v3="${index.getX(i + 2)}" />`);
      }
    } else {
      for (let i = 0; i < pos.count; i += 3) {
        triangles.push(`          <triangle v1="${i}" v2="${i + 1}" v3="${i + 2}" />`);
      }
    }

    const title = this.currentMeta?.projectName || 'Tripo3D Model';
    const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">${title}</metadata>
  <metadata name="Designer">Tripo3D Downloader &amp; Converter</metadata>
  <metadata name="Application">MyLovelyGame 3D Toolchain</metadata>
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
${vertices.join('\n')}
        </vertices>
        <triangles>
${triangles.join('\n')}
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" />
  </build>
</model>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

    const zip = fflate.zipSync({
      '[Content_Types].xml': fflate.strToU8(contentTypesXml),
      '_rels/.rels': fflate.strToU8(relsXml),
      '3D/3dmodel.model': fflate.strToU8(modelXml),
    });

    return new Blob([zip], { type: 'model/3mf' });
  }

  /**
   * Generates a GLB Blob from the currently displayed model.
   */
  public async generateGLB(): Promise<Blob> {
    if (this.activeFigure === 'all' && this.originalGlbBuffer) {
      return new Blob([this.originalGlbBuffer], { type: 'model/gltf-binary' });
    }

    if (!this.modelGroup) throw new Error('No 3D model loaded');

    return new Promise((resolve, reject) => {
      this.exporter.parse(
        this.modelGroup!,
        (glb) => {
          resolve(new Blob([glb as ArrayBuffer], { type: 'model/gltf-binary' }));
        },
        (err) => reject(err),
        { binary: true }
      );
    });
  }

  private updateStatsUI() {
    const statsEl = document.getElementById('model-stats');
    if (!statsEl) return;

    if (!this.currentMesh) {
      statsEl.innerHTML = '<span class="text-muted">Модель не загружена</span>';
      return;
    }

    const geo = this.currentMesh.geometry;
    const vCount = geo.attributes.position ? geo.attributes.position.count : 0;
    const tCount = geo.index ? geo.index.count / 3 : vCount / 3;

    statsEl.innerHTML = `
      <div class="stat-badge">Вершины: <b>${vCount.toLocaleString()}</b></div>
      <div class="stat-badge">Треугольники: <b>${Math.round(tCount).toLocaleString()}</b></div>
      <div class="stat-badge">Фигура: <b>${this.activeFigure === 'all' ? 'Все' : `№${this.activeFigure}`}</b></div>
    `;
  }

  private showStatus(msg: string, type: 'loading' | 'success' | 'error' | 'info') {
    const el = document.getElementById('status-msg');
    if (!el) return;
    el.textContent = msg;
    el.className = `status-banner status-${type}`;
    el.style.display = 'block';
  }
}

// UI Setup
window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('viewport-container');
  if (!container) return;

  const app = new TripoDownloaderApp(container);

  const inputUrl = document.getElementById('input-url') as HTMLInputElement;
  const btnFetch = document.getElementById('btn-fetch') as HTMLButtonElement;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;

  const btnDlGlb = document.getElementById('btn-dl-glb') as HTMLButtonElement;
  const btnDl3mf = document.getElementById('btn-dl-3mf') as HTMLButtonElement;
  const printScaleInput = document.getElementById('print-scale') as HTMLInputElement;
  const scaleVal = document.getElementById('val-scale');

  const figureButtons = document.querySelectorAll<HTMLButtonElement>('.fig-btn');
  const toggleRotate = document.getElementById('toggle-rotate') as HTMLInputElement;
  const toggleWireframe = document.getElementById('toggle-wireframe') as HTMLInputElement;
  const btnResetCam = document.getElementById('btn-reset-cam');

  // Load Model Handler
  async function loadModelFromInput(inputStr: string) {
    const idMatch = inputStr.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    if (!idMatch) {
      alert('Пожалуйста, введите корректный URL или UUID модели Tripo3D.');
      return;
    }
    const modelId = idMatch[0];

    btnFetch.disabled = true;
    btnFetch.textContent = '⏳ Получение данных...';

    try {
      // 1. Fetch metadata from Tripo API
      const apiUrl = `https://api.tripo3d.ai/v2/studio/project/detail/v3/${modelId}?locale=en`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`API error HTTP ${res.status}`);
      const json = await res.json();

      if (!json.data || !json.data.model_url) {
        throw new Error('Модель не найдена в Tripo Studio или еще генерируется.');
      }

      // Update meta UI
      const meta = json.data;
      const titleEl = document.getElementById('meta-title');
      const authorEl = document.getElementById('meta-author');
      const thumbEl = document.getElementById('meta-thumb') as HTMLImageElement;
      if (titleEl) titleEl.textContent = meta.project_name || 'Tripo Model';
      if (authorEl) authorEl.textContent = `Автор: ${meta.owner_name || 'Неизвестен'}`;
      if (thumbEl && meta.cover_image?.[0]) {
        thumbEl.src = meta.cover_image[0];
        thumbEl.style.display = 'block';
      }

      // 2. Load GLB into Three.js
      await app.loadGlb(meta.model_url, {
        id: modelId,
        projectName: meta.project_name || 'TripoModel',
        author: meta.owner_name,
        thumbnailUrl: meta.cover_image?.[0],
      });

      // Update CLI code preview
      const cliCode = document.getElementById('cli-code');
      if (cliCode) {
        cliCode.textContent = `node scripts/download-tripo.cjs ${modelId} 3mf public/models/model.3mf --figure=3 --scale=${printScaleInput?.value || 120}`;
      }
    } catch (err: any) {
      console.warn('API fetch failed, trying local fallback:', err);
      // Fallback: load local model if available
      try {
        await app.loadGlb('/models/mage_tripo.glb', {
          id: modelId,
          projectName: 'Mage Turnaround (Local)',
          author: 'Local Tripo Cache',
        });
      } catch (e2) {
        alert(`Не удалось загрузить модель: ${err.message}. Попробуйте загрузить локальный файл .glb через кнопку ниже.`);
      }
    } finally {
      btnFetch.disabled = false;
      btnFetch.textContent = '🔍 Получить модель';
    }
  }

  btnFetch?.addEventListener('click', () => {
    loadModelFromInput(inputUrl.value.trim());
  });

  inputUrl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadModelFromInput(inputUrl.value.trim());
  });

  // Local File Upload
  fileInput?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    await app.loadGlb(buf, {
      id: 'local-file',
      projectName: file.name.replace(/\.[^/.]+$/, ''),
      author: 'Local File',
    });
  });

  // Figure Buttons
  figureButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      figureButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const fig = (btn.dataset.fig || '3') as FigureSelection;
      app.applyFigureSelection(fig);
    });
  });

  // Scale slider
  printScaleInput?.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    if (scaleVal) scaleVal.textContent = `${val} мм`;
  });

  // Controls
  toggleRotate?.addEventListener('change', (e) => app.setAutoRotate((e.target as HTMLInputElement).checked));
  toggleWireframe?.addEventListener('change', (e) => app.setWireframe((e.target as HTMLInputElement).checked));
  btnResetCam?.addEventListener('click', () => app.resetCamera());

  // Download GLB
  btnDlGlb?.addEventListener('click', async () => {
    try {
      btnDlGlb.disabled = true;
      btnDlGlb.textContent = '⏳ Экспорт GLB...';
      const blob = await app.generateGLB();
      triggerDownload(blob, 'tripo_model.glb');
    } catch (err: any) {
      alert(`Ошибка экспорта GLB: ${err.message}`);
    } finally {
      btnDlGlb.disabled = false;
      btnDlGlb.textContent = '⬇️ Скачать .GLB (3D Mesh)';
    }
  });

  // Download 3MF
  btnDl3mf?.addEventListener('click', () => {
    try {
      btnDl3mf.disabled = true;
      btnDl3mf.textContent = '⏳ Генерация 3MF архива...';
      const scale = parseFloat(printScaleInput?.value || '120');
      const blob = app.generate3MF(scale, true);
      triggerDownload(blob, `tripo_model_${scale}mm.3mf`);
    } catch (err: any) {
      alert(`Ошибка экспорта 3MF: ${err.message}`);
    } finally {
      btnDl3mf.disabled = false;
      btnDl3mf.textContent = '🖨️ Скачать .3MF (3D Печать)';
    }
  });

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Quick Preset Buttons
  document.querySelectorAll<HTMLButtonElement>('.preset-link-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      if (url) {
        inputUrl.value = url;
        loadModelFromInput(url);
      }
    });
  });

  // Auto-load default model on startup
  loadModelFromInput('256a044c-15eb-408d-806a-841b0b764c07');
});
