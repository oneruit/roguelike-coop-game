export interface DebugHudStats {
  fps: number;
  frameTime: number;
  simulationTime: number;
  renderingTime: number;
  entitiesTotal: number;
  entitiesVisible: number;
  entitiesSimulated: number;
  rtt: number;
  jitter: number;
  packetLoss: number;
  connection: string;
  route: string;
  turn: boolean;
  uploadKbps: number;
  downloadKbps: number;
}

export class DebugHUD {
  private container: HTMLElement;
  private pre: HTMLPreElement;
  private isVisible: boolean = false;
  private lastUpdate: number = 0;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'debug-hud';
    this.container.className = 'debug-hud hidden';

    this.pre = document.createElement('pre');
    this.pre.id = 'debug-hud-text';
    this.pre.className = 'debug-hud-text';
    this.container.appendChild(this.pre);

    const overlay = document.getElementById('ui-overlay') || document.body;
    overlay.appendChild(this.container);
  }

  public toggle(): boolean {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.container.classList.remove('hidden');
    } else {
      this.container.classList.add('hidden');
    }
    return this.isVisible;
  }

  public show() {
    this.isVisible = true;
    this.container.classList.remove('hidden');
  }

  public hide() {
    this.isVisible = false;
    this.container.classList.add('hidden');
  }

  public getIsOpen(): boolean {
    return this.isVisible;
  }

  private formatRow(label: string, value: string): string {
    const left = ' ' + label.padEnd(15, ' ');
    const line = left + value;
    return '│' + line.padEnd(33, ' ') + '│';
  }

  private formatHeader(header: string): string {
    const line = ' ' + header;
    return '│' + line.padEnd(33, ' ') + '│';
  }

  private formatEmpty(): string {
    return '│' + ' '.repeat(33) + '│';
  }

  private formatBandwidth(symbol: string, rate: string): string {
    const line = ` ${symbol} ${rate}`;
    return '│' + line.padEnd(33, ' ') + '│';
  }

  public update(stats: DebugHudStats) {
    if (!this.isVisible) return;

    const now = performance.now();
    if (now - this.lastUpdate < 60) return;
    this.lastUpdate = now;

    const lines: string[] = [
      '┌─────────────────────────────────┐',
      this.formatRow('FPS', Math.round(stats.fps).toString()),
      this.formatRow('Frame time', `${stats.frameTime.toFixed(1)} ms`),
      this.formatEmpty(),
      this.formatRow('Simulation', `${stats.simulationTime.toFixed(1)} ms`),
      this.formatRow('Rendering', `${stats.renderingTime.toFixed(1)} ms`),
      this.formatEmpty(),
      this.formatRow('Entities', Math.round(stats.entitiesTotal).toString()),
      this.formatRow('Visible', Math.round(stats.entitiesVisible).toString()),
      this.formatRow('Simulated', Math.round(stats.entitiesSimulated).toString()),
      this.formatEmpty(),
      this.formatHeader('Network'),
      this.formatRow('RTT', `${Math.round(stats.rtt)} ms`),
      this.formatRow('Jitter', `${stats.jitter.toFixed(1)} ms`),
      this.formatRow('Packet loss', `${stats.packetLoss.toFixed(1)} %`),
      this.formatEmpty(),
      this.formatHeader('WebRTC'),
      this.formatRow('Connection', stats.connection),
      this.formatRow('Route', stats.route),
      this.formatRow('TURN', stats.turn ? 'yes' : 'no'),
      this.formatEmpty(),
      this.formatBandwidth('↑', `${Math.round(stats.uploadKbps)} KB/s`),
      this.formatBandwidth('↓', `${Math.round(stats.downloadKbps)} KB/s`),
      '└─────────────────────────────────┘'
    ];

    this.pre.textContent = lines.join('\n');
  }
}
