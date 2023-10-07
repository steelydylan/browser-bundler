import ts from "typescript";

export interface Options {
  compilerOptions?: ts.CompilerOptions;
  files?: Record<string, string>;
  importMap?: Record<string, string>;
}

export function getMatchedFile(path: string, files: Record<string, string>) {
  return ["", ".ts", ".tsx", ".js", ".jsx"]
    .map((e) => files[path + e])
    .find((e) => !!e);
}

export function resolvePackage(
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
        const code = transformCode(file, options, fileMapping);
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

export function transformCode(
  code: string,
  options: Options,
  fileMapping = new Map<string, string>()
): string {
  const defaultCompilerOptions: ts.CompilerOptions = {
    jsx: ts.JsxEmit.React,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
  };
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: {
      ...defaultCompilerOptions,
      ...options.compilerOptions,
    },
  });
  return outputText.replace(
    /(\/\/\s*)?(import\s+)(.*\s+from\s+)?['"](.*)['"];?/g,
    (
      raw,
      commentKey: string = "",
      importKey: string,
      fromKey: string = "",
      packageName: string
    ) => {
      if (commentKey) return raw;
      const resolvedPackageName = resolvePackage(
        packageName,
        options,
        fileMapping
      );
      if (resolvedPackageName.endsWith(".css")) {
        return `(function () {
  var css=document.createElement("link");
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
}

export function browserBundle(code: string, options: Options = {}) {
  if (typeof window !== "undefined") {
    window.process = {
      // @ts-ignore typescriptのpnpを無効化する
      versions: {
        pnp: "undefined",
      },
    };
  }
  return { code: transformCode(code, options) };
}
