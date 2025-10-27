declare module "html2canvas" {
  // minimal shim for html2canvas when @types/html2canvas isn't installed
  interface Html2CanvasOptions {
    scale?: number;
    useCORS?: boolean;
    allowTaint?: boolean;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    windowWidth?: number;
    windowHeight?: number;
    scrollX?: number;
    scrollY?: number;
  }

  const html2canvas: (
    element: HTMLElement,
    options?: Html2CanvasOptions
  ) => Promise<HTMLCanvasElement>;

  export default html2canvas;
}

declare module "jspdf" {
  // minimal shim for jsPDF when full types aren't available
  export interface JsPDFOptions {
    unit?: string | "pt" | "px" | "mm" | "cm" | "in";
    format?: string | number[];
    orientation?: "portrait" | "landscape";
  }

  export class jsPDF {
    constructor(options?: JsPDFOptions);
    addImage(
      imageData: string,
      format: string,
      x: number,
      y: number,
      w: number,
      h: number
    ): void;
    save(filename?: string): void;
  }

  const _default: { jsPDF: typeof jsPDF };
  export default _default;
}
