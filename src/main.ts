import { browserBundle } from "./browser-bundle";

const textarea = document.querySelector("#textarea") as HTMLTextAreaElement
const iframe = document.querySelector("#result") as HTMLIFrameElement

if (textarea && iframe) {
  textarea.value = `
import { log } from "./console.ts"
import React from "react";
import ReactDOM from "react-dom";

log("Hello World")

const App = () {
  return (<div>Hello World</div>
}

ReactDOM.render(<App />, document.getElementById("root"));
  `;
  textarea.addEventListener("input", async () => {
    const code = textarea.value
    const { code: bundleCode } = await browserBundle(code, {
      files: {
        "./console.ts": `export const log = (value: unknown) => console.log(value)`
      }
    })
    iframe.srcdoc = `
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
          ${bundleCode}
          </script>
        </body>
      </html>
    `
  })
  textarea.dispatchEvent(new Event("input"))
}
