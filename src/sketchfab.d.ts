declare module "@sketchfab/viewer-api" {
  export type Animation = [uid: string, name: string, duration: number];
  export interface ViewerAPI {
    start(callback?: (error?: unknown) => void): void;
    stop(callback?: (error?: unknown) => void): void;
    play(callback?: (error?: unknown) => void): void;
    pause(callback?: (error?: unknown) => void): void;
    addEventListener(event: string, callback: () => void): void;
    removeEventListener(event: string, callback: () => void): void;
    getAnimations(
      callback: (error: unknown, animations: Animation[]) => void,
    ): void;
    setCurrentAnimationByUID(
      uid: string,
      callback?: (error?: unknown) => void,
    ): void;
    setCycleMode(mode: string, callback?: (error?: unknown) => void): void;
    seekTo(time: number, callback?: (error?: unknown) => void): void;
    focusOnVisibleGeometries(callback?: (error?: unknown) => void): void;
    getCameraLookAt(
      callback: (
        error: unknown,
        camera: { position: number[]; target: number[] },
      ) => void,
    ): void;
    setCameraLookAt(
      position: number[],
      target: number[],
      duration: number,
      callback?: (error?: unknown) => void,
    ): void;
    setEnvironment(
      options: { backgroundEnable?: boolean },
      callback?: (error?: unknown) => void,
    ): void;
  }
  export default class Sketchfab {
    constructor(version: string, iframe: HTMLIFrameElement);
    init(
      uid: string,
      options: Record<string, unknown> & {
        success: (api: ViewerAPI) => void;
        error: (error?: unknown) => void;
      },
    ): void;
    _initializeAPIEmbedBinded?: (event: MessageEvent) => void;
    _client?: { _serverReceiveMessageBinded?: (event: MessageEvent) => void };
  }
}
