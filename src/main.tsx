import React, { useEffect, useState } from "react";
import { render } from "react-dom";
import clsx from "clsx";
import { browserBundle } from "./lib/browser-bundle";

const defaultMain = `
import { render } from "react-dom";
import { Hello } from "./hello";
import "./style.css";

render(<Hello />, document.getElementById("root"));
`;

const defaultHello = `import { lazy, Suspense } from "react";
import "react-calendar/dist/Calendar.css";
const LazyCalendar = lazy(() => import("react-calendar"));

export const Hello = () => {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold">Hello, World!</h1>
      <p className="text-gray-500">This is a sample page.</p>
      <Suspense fallback={<div>Loading...</div>}>
        <LazyCalendar />
      </Suspense>
    </div>
  )
}
`;

const defaultHtml = `<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>
`;

const styleCSS = `
 body {
  color: red;
 }
`

const buildSrcDoc = (html: string, code: string) => {
  return html.replace(
    "</body>",
    `  <script type="module">${code}</script>\n</body>`
  );
};

const App = () => {
  const [script, setScript] = useState({
    "main.tsx": defaultMain,
    "hello.tsx": defaultHello,
    "index.html": defaultHtml,
  });
  const [tab, setTab] = useState<keyof typeof script>("main.tsx");
  const [srcDoc, setSrcDoc] = useState("");

  useEffect(() => {
    browserBundle(script["main.tsx"], {
      files: {
        "./hello.tsx": script["hello.tsx"],
        "./style.css": styleCSS,
      },
      // importMap: {
      //   "react": "https://cdn.skypack.dev/react",
      //   "react-dom": "https://cdn.skypack.dev/react-dom",
      // }
    }).then(({ code }) => {
      setSrcDoc(buildSrcDoc(script["index.html"], code));
    });
  }, [script]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setScript((script) => ({ ...script, [tab]: e.target.value }));
  };

  return (
    <div className="flex gap-5 p-5 h-full">
      <div className="flex-1 h-full">
        <div className="text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:text-gray-400 dark:border-gray-700">
          <ul className="flex flex-wrap -mb-px">
            {(["main.tsx", "hello.tsx", "index.html"] as const).map((item) => (
              <li key={item} className="mr-2">
                <button
                  onClick={() => setTab(item)}
                  className={clsx({
                    "inline-block p-4 border-b-2 rounded-t-lg": true,
                    "border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300":
                      tab !== item,
                    "text-blue-600 border-blue-600 active dark:text-blue-500 dark:border-blue-500":
                      tab === item,
                  })}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <textarea
          key={tab}
          className="bg-gray-50 h-full p-2 w-full"
          onChange={handleChange}
          defaultValue={script[tab]}
        ></textarea>
      </div>
      <div className="flex-1 h-full w-full">
        <p className="h-14 text-center font-bold text-lg">プレビュー結果</p>
        <iframe
          srcDoc={srcDoc}
          className="flex-1 bg-gray-50 h-full p-2 w-full"
        ></iframe>
      </div>
    </div>
  );
};

render(<App />, document.getElementById("root"));
