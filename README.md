# BrowserBundler

Bundle React and TypeScript online without Node.js

## Install

```
npm install browser-bundler
```

## Example

```js
import { browserBundle } from "./browser-bundle";

const textarea = document.querySelector("#textarea") as HTMLTextAreaElement
const result = document.querySelector("#result") as HTMLTextAreaElement

if (textarea && result) {
  textarea.value = `import React from "react";
    export default App() {
      return (<div>Hellow World</div>
    }
  `;
  textarea.addEventListener("input", async () => {
    const code = textarea.value
    const { code: bundleCode } = await browserBundle(code)
    result.value = `${bundleCode}`
  })
  textarea.dispatchEvent(new Event("input"))
}
```