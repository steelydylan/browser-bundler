import { beforeAll, describe, expect, test, vi } from "vitest";
import {
  getMatchedFile,
  browserBundle,
  resolvePackage,
} from "./browser-bundle";

describe("getMatchedFile", () => {
  test("should work", async () => {
    const ret = getMatchedFile("test", { test: "test code" });
    expect(ret).toEqual("test code");
  });

  test("should work with ts", async () => {
    const ret = getMatchedFile("test", { "test.ts": "test code" });
    expect(ret).toEqual("test code");
  });

  test("should work with tsx", async () => {
    const ret = getMatchedFile("test", { "test.tsx": "test code" });
    expect(ret).toEqual("test code");
  });

  test("should work with js", async () => {
    const ret = getMatchedFile("test", { "test.js": "test code" });
    expect(ret).toEqual("test code");
  });

  test("should work with jsx", async () => {
    const ret = getMatchedFile("test", { "test.jsx": "test code" });
    expect(ret).toEqual("test code");
  });

  test("should work with empty", async () => {
    const ret = getMatchedFile("test", {});
    expect(ret).toBeUndefined();
  });
});

describe("resolvePackage",() => {
  beforeAll(async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:nodedata:xxx");
  });

  test("external library", async () => {
    const ret = await resolvePackage("react", {}, new Map<string, string>());
    expect(ret).toEqual("https://esm.sh/react");
  });

  test("external css library", async () => {
    const ret = await resolvePackage(
      "@radix-ui/themes/styles.css",
      {},
      new Map<string, string>()
    );
    expect(ret).toEqual("https://esm.sh/@radix-ui/themes/styles.css");
  });

  test("internal library", async () => {
    const ret = await resolvePackage(
      "./test",
      {
        files: { "./test": "const code = 2" },
      },
      new Map<string, string>()
    );
    expect(ret).toEqual("blob:nodedata:xxx");
  });

  test("internal library with extension", async () => {
    const ret = await resolvePackage(
      "./test",
      {
        files: { "./test.ts": "const hoge = 2" },
      },
      new Map<string, string>()
    );
    console.log(ret)
    expect(ret).toEqual("blob:nodedata:xxx");
  });

  test("internal css library", async () => {
    const ret = await resolvePackage(
      "./test.css",
      {
        files: { "./test.css": "test code" },
      },
      new Map<string, string>()
    );
    expect(ret).toEqual("blob:nodedata:xxx");
  });

  test("no match internal library", async () => {
    const ret = await resolvePackage("./test", {}, new Map<string, string>());
    expect(ret).toEqual("./test");
  });
});

describe("browserBundle",() => {
  beforeAll(async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:nodedata:xxx");
  });

  test("should work", async () => {
    const code = `
import React from 'react';
import { Flex, Text, Button } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
// import "comment out import";

export function App() {
    return (
    <Flex direction="column" gap="2">
        <Text>Hello from Radix Themes :)</Text>
        <Button>xxx</Button>
    </Flex>
    );
}
`;
    const res = await browserBundle(code);
    expect(res).toMatchSnapshot();
  });

  test("with files", async () => {
    const defaultCode = `
import React from "react";
import { render } from "react-dom";
import { Hello } from "./hello";

render(<Hello />, document.getElementById("root"));
`;

    const defaultHello = `
import React from "react";

export const Hello = async () => {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold">Hello, World!</h1>
      <p className="text-gray-500">This is a sample page.</p>
    </div>
  )
}
`;

    const res = await browserBundle(defaultCode, {
      files: {
        "./hello.tsx": defaultHello,
      },
    });
    expect(res).toMatchSnapshot();
  });
});
