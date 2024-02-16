import * as esbuild from "esbuild-wasm";
import { replaceAsync } from "./replace-async";

export interface Options {
  compilerOptions?: esbuild.TsconfigRaw["compilerOptions"];
  files?: Record<string, string>;
  importMap?: Record<string, string>;
}

export function getMatchedFile(path: string, files: Record<string, string>) {
  return ["", ".ts", ".tsx", ".js", ".jsx"]
    .map((e) => files[path + e])
    .find((e) => !!e);
}

export async function resolvePackage(
  packageName: string,
  options: Options,
  fileMapping: Map<string, string>
) {
  if (packageName.startsWith(".") || packageName.startsWith("/")) {
    // import文をBlob URLから読み込むように変換する
    if (options.files) {
      const file = getMatchedFile(packageName, options.files);
      if (file) {
        if (fileMapping.has(packageName)) {
          return fileMapping.get(packageName) as string;
        }
        if (packageName.includes(".css")) {
          const blob = new Blob([file], { type: "text/css" });
          const blobUrl = URL.createObjectURL(blob);
          fileMapping.set(packageName, blobUrl);
          return blobUrl;
        }
        const { code } = await transformCode(file, options, fileMapping);
        const blob = new Blob([code], { type: "text/javascript" });
        const blobUrl = URL.createObjectURL(blob);
        fileMapping.set(packageName, blobUrl);
        return blobUrl;
      }
    }
  } else {
    if (options?.importMap?.[packageName]) {
      return options.importMap[packageName];
    } else {
      return `https://esm.sh/${packageName}`;
    }
  }
  return packageName;
}

export async function transformCode(
  code: string,
  options: Options,
  fileMapping = new Map<string, string>()
): Promise<{
  code: string;
  fileMapping: Map<string, string>;
}> {
  const compilerOptions = {
    jsx: "react-jsx",
    target: "esnext",
    module: "esnext",
  } as const;

  const { code: outputText } = await esbuild.transform(code, {
    loader: "tsx",
    tsconfigRaw: {
      compilerOptions: {
        ...compilerOptions,
        ...options.compilerOptions,
      },
    },
  });

  const fixedText = await replaceAsync(outputText, /import\(['"](.+)['"]\)/g, async (_, packageName: string) => {
      return `import('${await resolvePackage(
        packageName,
        options,
        fileMapping
      )}')`;
    })
  const result = await replaceAsync(fixedText, /(\/\/\s*)?(import\s+)([\s\S]*?\s+from\s+)?['"](.*)['"];?/g,
    async (
      raw,
      commentKey: string = "",
      importKey: string,
      fromKey: string = "",
      packageName: string
    ) => {
      if (commentKey) return raw;
      const resolvedPackageName = await resolvePackage(
        packageName,
        options,
        fileMapping
      );
      if (packageName.endsWith(".css")) {
        return `(function () {
          const css = document.createElement("link");
          css.setAttribute("rel","stylesheet");
          css.setAttribute("type","text/css");
          css.setAttribute("href","${resolvedPackageName}");
          document.getElementsByTagName("head")[0].appendChild(css);
        }());`;
      } else {
        return `${importKey}${fromKey}'${resolvedPackageName}';`;
      }
    }
  );
  return {
    code: result,
    fileMapping,
  }
}

let initializePromise: Promise<void> | null = null;

async function initialize() {
  if (!initializePromise) {
    initializePromise = esbuild.initialize({
      // wasmModule: wasm,
      worker: false,
      wasmURL: "https://esm.sh/esbuild-wasm@0.19.9/esbuild.wasm",
    });
  }
  return initializePromise;
}

export async function browserBundle(code: string, options: Options = {}) {
  if (typeof window !== "undefined") {
    await initialize();
  }
  try {
    return await transformCode(code, options);
  } catch (e) {
    return { 
      code: '',
      fileMapping: new Map<string, string>(),
      error: e
    };
  }
}

export async function revokeAllFileMapping(fileMapping: Map<string, string>) {
  for (const url of fileMapping.values()) {
    URL.revokeObjectURL(url);
  }
}
