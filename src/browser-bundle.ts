import { CompilerOptions, JsxEmit, ModuleKind, ScriptTarget, transpileModule } from 'typescript';

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
}

export const browserBundle = async (code: string, options?: Options) => {
  const { compilerOptions } = options || {}
  const opt = { ...defaultCompilerOptions, ...compilerOptions }
  const { outputText } = transpileModule(code, {
    compilerOptions: opt,
  });

  //import文だけを最初に抽出する
  const importRegex = /import\s+.*\s+from\s+['"].*['"];?/g
  const importStatements = code.match(importRegex)
  // import文をesm.shから読み込むように変換する
  let importCode = ""
  importStatements?.forEach((importStatement) => {
    const convertedCode = importStatement.replace(/from\s*['"]([^'"]*)['"]/g, function(_match, p1) {
      return `from 'https://esm.sh/${p1}'`;
    });
    importCode += convertedCode + "\n"
  })


  return {
    code: importCode + outputText,
  }
}
