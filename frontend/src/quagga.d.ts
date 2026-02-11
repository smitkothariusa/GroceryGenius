declare module 'quagga' {
  export interface QuaggaJSConfigObject {
    inputStream?: {
      name?: string;
      type?: string;
      target?: HTMLElement | null;
      constraints?: {
        facingMode?: string;
        width?: number;
        height?: number;
      };
    };
    decoder?: {
      readers?: string[];
    };
    locate?: boolean;
  }

  export interface QuaggaJSResultObject {
    codeResult: {
      code: string;
      format: string;
    };
  }

  export function init(
    config: QuaggaJSConfigObject,
    callback: (err: any) => void
  ): void;

  export function start(): void;
  export function stop(): void;
  export function onDetected(callback: (result: QuaggaJSResultObject) => void): void;
  export function offDetected(callback: (result: QuaggaJSResultObject) => void): void;
}