declare module "pdfjs-dist/legacy/build/pdf" {
  export const GlobalWorkerOptions: { workerSrc: string };
  export const getDocument: (source: { data: ArrayBuffer }) => {
    promise: Promise<{
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getTextContent: () => Promise<{ items: Array<{ str: string }> }>;
      }>;
    }>;
  };
}
