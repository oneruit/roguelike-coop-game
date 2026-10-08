/**
 * Network Transport Abstraction
 *
 * Defines a unified interface for message delivery across:
 * - LoopbackTransport (Solo local play, in-memory)
 * - PeerJsTransport (WebRTC P2P DataChannels)
 * - WebSocketTransport (Dedicated Node.js / Bun server)
 */

export type MessageHandler = (senderId: string, packet: any) => void;
export type ConnectionHandler = (peerId: string) => void;

export interface INetworkTransport {
  readonly isConnected: boolean;
  onMessage?: MessageHandler;
  onConnect?: ConnectionHandler;
  onDisconnect?: ConnectionHandler;

  send(targetId: string, packet: any): void;
  broadcast(packet: any): void;
  disconnect(): void;
}

/**
 * LoopbackTransport
 * Direct zero-overhead in-memory transport connecting a local client directly to GameCore.
 */
export class LoopbackTransport implements INetworkTransport {
  public isConnected: boolean = true;
  public onMessage?: MessageHandler;
  public onConnect?: ConnectionHandler;
  public onDisconnect?: ConnectionHandler;

  private peer?: LoopbackTransport;

  public connectPeer(peer: LoopbackTransport) {
    this.peer = peer;
    peer.peer = this;
    if (this.onConnect) this.onConnect('peer');
    if (peer.onConnect) peer.onConnect('peer');
  }

  public send(_targetId: string, packet: any): void {
    if (this.peer && this.peer.onMessage) {
      this.peer.onMessage('local', packet);
    }
  }

  public broadcast(packet: any): void {
    if (this.peer && this.peer.onMessage) {
      this.peer.onMessage('local', packet);
    }
  }

  public disconnect(): void {
    this.isConnected = false;
    if (this.peer) {
      this.peer.isConnected = false;
      if (this.peer.onDisconnect) this.peer.onDisconnect('peer');
      this.peer = undefined;
    }
    if (this.onDisconnect) this.onDisconnect('peer');
  }
}
