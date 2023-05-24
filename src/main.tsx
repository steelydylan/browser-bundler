import React, { useEffect } from "react";
import { render } from "react-dom";
import clsx from "clsx";
import { browserBundle } from "./browser-bundle";

const defaultCode = `import React from "react";
import { render } from "react-dom";
import { Hello } from "./hello";

render(<Hello />, document.getElementById("root"));
`;

const defaultHello = `import React from "react";

export const Hello = () => {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold">Hello, World!</h1>
      <p className="text-gray-500">This is a sample page.</p>
    </div>
  )
}
`;

const buildSrcDoc = (code: string) => {
  return `
  <html>
    <head>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body>
      <div id="root"></div>
      <script type="module">
        ${code}
      </script>
    </body>
  </html>
  `
}

const App = () => {
  const [main, setMain] = React.useState(defaultCode);
  const [hello, setHello] = React.useState(defaultHello);
  const [srcDoc, setSrcDoc] = React.useState("");
  const [tab, setTab] = React.useState<"main" | "hello">("main");
  const handleChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const result = await browserBundle(value, {
      files: {
        "./hello": hello,
      }
    });
    setMain(value);
    setSrcDoc(buildSrcDoc(result.code))
  }
  const handleHelloChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setHello(value);
    const result = await browserBundle(main, {
      files: {
        "./hello": value,
      }
    });
    setSrcDoc(buildSrcDoc(result.code))
  }

  useEffect(() => {
    const init = async () => {
      const result = await browserBundle(main, {
        files: {
          "./hello": hello,
        }
      });
      setSrcDoc(buildSrcDoc(result.code))
    }
    init();
  }, [])

  return (
    <div className="flex gap-5 p-5 h-full">
      <div className="flex-1 h-full">
        <div className="text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:text-gray-400 dark:border-gray-700">
          <ul className="flex flex-wrap -mb-px">
            <li className="mr-2">
              <button
                onClick={() => setTab("main")}

                className={clsx({
                  "inline-block p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300": tab !== "main",
                  "inline-block p-4 text-blue-600 border-b-2 border-blue-600 rounded-t-lg active dark:text-blue-500 dark:border-blue-500": tab === "main",
                })}>index.tsx</button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setTab("hello")}
                className={clsx({
                  "inline-block p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300": tab !== "hello",
                  "inline-block p-4 text-blue-600 border-b-2 border-blue-600 rounded-t-lg active dark:text-blue-500 dark:border-blue-500": tab === "hello",
                })}
              >hello.tsx</button>
            </li>
          </ul>
        </div>
        {tab === "main" && (<textarea className="bg-gray-50 h-full p-2 w-full" onChange={handleChange} value={main}></textarea>)}
        {tab === "hello" && (<textarea className="bg-gray-50 h-full p-2 w-full" onChange={handleHelloChange} value={hello}></textarea>)}
      </div>
      <div className="flex-1 h-full w-full">
        <p className="h-14 text-center font-bold text-lg">プレビュー結果</p>
        <iframe srcDoc={srcDoc} className="flex-1 bg-gray-50 h-full p-2 w-full"></iframe>
      </div>
    </div>
  )
}

render(<App />, document.getElementById("root"));
