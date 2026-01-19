declare module "qr-code-styling" {
  export default class QRCodeStyling {
    constructor(options?: Record<string, unknown>);
    append(node: HTMLElement): void;
    update(options?: Record<string, unknown>): void;
    download(options?: Record<string, unknown>): void;
  }
}
