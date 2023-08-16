import { Blob } from "buffer";

(globalThis.Blob as any) = Blob;
