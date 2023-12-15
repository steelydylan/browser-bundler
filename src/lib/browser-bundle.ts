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
  if (packageName.startsWith(".")) {
    // import文をBlob URLから読み込むように変換する
    if (options.files) {
      const file = getMatchedFile(packageName, options.files);
      if (file) {
        if (fileMapping.has(packageName)) {
          return fileMapping.get(packageName) as string;
        }
        const code = await transformCode(file, options, fileMapping);
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
): Promise<string> {
  const compilerOptions = {
    jsx: "react",
    target: "esnext",
    module: "esnext",
  } as const;
  const { code: outputText } = await esbuild.transform(code, {
    loader: "tsx",
    tsconfigRaw: {
      compilerOptions: {
        ...compilerOptions,
        ...options,
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
  return await replaceAsync(fixedText, /(\/\/\s*)?(import\s+)(.*\s+from\s+)?['"](.*)['"];?/g,
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
      if (resolvedPackageName.endsWith(".css")) {
        const cssName = resolvedPackageName.replace(/[\.\/:-]/g, "").replace(/https?/, "");
        return `import ${cssName} from '${resolvedPackageName}' assert { type: "css" };
        
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, ${cssName}];
        `;
      } else {
        return `${importKey}${fromKey}'${resolvedPackageName}';`;
      }
    }
  );
}

let initialized = false;

export async function browserBundle(code: string, options: Options = {}) {
  if (!initialized) {
    await esbuild.initialize({
      // wasmModule: wasm,
      worker: false,
      wasmURL: "https://esm.sh/esbuild-wasm@0.19.9/esbuild.wasm",
    });
    initialized = true;
  }
  try {
    return { code: await transformCode(code, options) };
  } catch (e) {
    console.error(e);
    return { error: e };
  }
}
