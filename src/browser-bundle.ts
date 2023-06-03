import { CompilerOptions, JsxEmit, ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import replaceAsync from "string-replace-async";

const defaultCompilerOptions: CompilerOptions = {
  jsx: JsxEmit.React,
  target: ScriptTarget.ESNext,
  module: ModuleKind.ESNext,
};

// typscriptのpnpを無効化する
// @ts-ignore
window.process = {
  versions: {
    pnp: "undefined"
  }
}

type Options = {
  compilerOptions?: CompilerOptions;
  files?: Record<string, string>
}

const getMatchedFile = (path: string, files: Record<string, string>) => {
  const keys = Object.keys(files)
  const matchedKey = keys.find((key) => {
    if (key === path) {
      return true
    }
    if (key.endsWith(".ts") && key.replace(".ts", "") === path) {
      return true
    }
    if (key.endsWith(".tsx") && key.replace(".tsx", "") === path) {
      return true
    }
    if (key.endsWith(".js") && key.replace(".js", "") === path) {
      return true
    }
    if (key.endsWith(".jsx") && key.replace(".jsx", "") === path) {
      return true
    }
    return false
  })
  return matchedKey ? files[matchedKey] : null
}

const transformCode = async (code: string, fileMapping: Map<string, string>, options?: Options): Promise<{ code: string }> => {
  const { compilerOptions } = options || {}
  const { files } = options || {}
  const opt = { ...defaultCompilerOptions, ...compilerOptions }
  const { outputText } = transpileModule(code, {
    compilerOptions: opt,
  });

  const importAllRegex = /import\s+.*\s+from\s+['"].*['"];?/g
  //import文だけを最初に抽出する。ただし、相対パスを含むimport文は対象外とする
  const importRegex = /import\s+.*\s+from\s+['"][^'.].*['"];?/g
  const importStatements = code.match(importRegex)
  // import文をesm.shから読み込むように変換する
  let importCode = ""
  importStatements?.forEach((importStatement) => {
    const convertedCode = importStatement.replace(/from\s*['"]([^'"]*)['"]/g, function(_match, p1) {
      return `from 'https://esm.sh/${p1}'`;
    });
    importCode += convertedCode + "\n"
  })
  // outputTextからimport文を削除する
  const finalOutputText = outputText.replace(importAllRegex, "")

  // 相対パスのimport文をfilesから読み込みblobURLに変換する
  if (files) {
    const relativeImportRegex = /import\s+.*\s+from\s+['"][.].*['"];?/g
    const relativeImportStatements = code.match(relativeImportRegex)
    if (relativeImportStatements) {
      await Promise.all(relativeImportStatements.map(async (relativeImportStatement) => {
        const convertedCode = await replaceAsync(relativeImportStatement, /from\s*['"]([^'"]*)['"]/g, async (_match, p1) => {
          const file = getMatchedFile(p1, files)
          if (file) {
            if (fileMapping.has(p1)) {
              return `from '${fileMapping.get(p1)}'`;
            }
            const { code: converted } = await transformCode(file, fileMapping, options)
            const blob = new Blob([converted], { type: 'text/javascript' })
            const blobURL = URL.createObjectURL(blob)
            fileMapping.set(p1, blobURL)
            return `from '${blobURL}'`;
          } else {
            return `from '${p1}'`;
          }
        });
        importCode += convertedCode + "\n"
      }))
    }
  }

  return {
    code: importCode + finalOutputText,
  }
}

export const browserBundle = async (code: string, options?: Options) => {
  // importのキャッシュを保持する
  const fileMapping = new Map<string, string>()
  const finalCode = await transformCode(code, fileMapping, options)

  return finalCode
}
