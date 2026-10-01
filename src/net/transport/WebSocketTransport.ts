import { INetworkTransport, MessageHandler, ConnectionHandler } from './INetworkTransport';

/**
 * WebSocketTransport (Client Side)
 * Connects browser client to a dedicated Node.js / Bun Game Server.
 * Supports binary ArrayBuffer snapshots and JSON control packets.
 */
export class WebSocketTransport implements INetworkTransport {
  public isConnected: boolean = false;
  public onMessage?: MessageHandler;
  public onConnect?: ConnectionHandler;
  public onDisconnect?: ConnectionHandler;

  private socket: WebSocket | null = null;
  private url: string = '';

  constructor(url?: string) {
    if (url) this.url = url;
  }

  public connect(url: string = this.url): Promise<boolean> {
    this.url = url;
    return new Promise((resolve) => {
      try {
        this.socket = new WebSocket(url);
        this.socket.binaryType = 'arraybuffer';

        this.socket.onopen = () => {
          this.isConnected = true;
          if (this.onConnect) this.onConnect('server');
          resolve(true);
        };

        this.socket.onmessage = (event) => {
          if (this.onMessage) {
            let data: any = event.data;
            if (typeof data === 'string') {
              try {
                data = JSON.parse(data);
              } catch {
                // Raw string
              }
            }
            this.onMessage('server', data);
          }
        };

        this.socket.onclose = () => {
          this.isConnected = false;
          if (this.onDisconnect) this.onDisconnect('server');
        };

        this.socket.onerror = () => {
          this.isConnected = false;
          resolve(false);
        };
      } catch (err) {
        console.error('[WebSocketTransport] Connection failed:', err);
        this.isConnected = false;
        resolve(false);
      }
    });
  }

  public send(_targetId: string, packet: any): void {
    this.broadcast(packet);
  }

  public broadcast(packet: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    if (packet instanceof ArrayBuffer) {
      this.socket.send(packet);
    } else if (ArrayBuffer.isView(packet)) {
      this.socket.send(packet.buffer as ArrayBuffer);
    } else if (typeof packet === 'string') {
      this.socket.send(packet);
    } else {
      this.socket.send(JSON.stringify(packet));
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
  }
}
