/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __APP_BUILD_TIME__: number;
declare const __APP_BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_PEERJS_HOST?: string;
  readonly VITE_PEERJS_PORT?: string;
  readonly VITE_PEERJS_PATH?: string;
  readonly VITE_PEERJS_KEY?: string;
  readonly VITE_TURN_HOST?: string;
  readonly VITE_TURN_USERNAME?: string;
  readonly VITE_TURN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
