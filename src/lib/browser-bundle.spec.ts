import { beforeAll, describe, expect, test, vi } from "vitest";
import {
  getMatchedFile,
  browserBundle,
  resolvePackage,
} from "./browser-bundle";

describe("getMatchedFile", () => {
  test("should work", () => {
    const ret = getMatchedFile("test", { test: "test code" });
    expect(ret).toEqual("test code");
  });

  test("should work with ts", () => {
    const ret = getMatchedFile("test", { "test.ts": "test code" });
    expect(ret).toEqual("test code");
  });

  test("should work with tsx", () => {
    const ret = getMatchedFile("test", { "test.tsx": "test code" });
    expect(ret).toEqual("test code");
  });

  test("should work with js", () => {
    const ret = getMatchedFile("test", { "test.js": "test code" });
    expect(ret).toEqual("test code");
  });

  test("should work with jsx", () => {
    const ret = getMatchedFile("test", { "test.jsx": "test code" });
    expect(ret).toEqual("test code");
  });

  test("should work with empty", () => {
    const ret = getMatchedFile("test", {});
    expect(ret).toBeUndefined();
  });
});

describe("resolvePackage", () => {
  beforeAll(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:nodedata:xxx");
  });

  test("external library", () => {
    const ret = resolvePackage("react", {}, new Map<string, string>());
    expect(ret).toEqual("https://esm.sh/react");
  });

  test("external css library", () => {
    const ret = resolvePackage(
      "@radix-ui/themes/styles.css",
      {},
      new Map<string, string>()
    );
    expect(ret).toEqual("https://esm.sh/@radix-ui/themes/styles.css");
  });

  test("internal library", () => {
    const ret = resolvePackage(
      "./test",
      {
        files: { "./test": "test code" },
      },
      new Map<string, string>()
    );
    expect(ret).toEqual("blob:nodedata:xxx");
  });

  test("internal library with extension", () => {
    const ret = resolvePackage(
      "./test",
      {
        files: { "./test.ts": "test code" },
      },
      new Map<string, string>()
    );
    expect(ret).toEqual("blob:nodedata:xxx");
  });

  test("no match internal library", () => {
    const ret = resolvePackage("./test", {}, new Map<string, string>());
    expect(ret).toEqual("./test");
  });
});

describe("browserBundle", () => {
  beforeAll(() => {
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
    const res = browserBundle(code);
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

export const Hello = () => {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold">Hello, World!</h1>
      <p className="text-gray-500">This is a sample page.</p>
    </div>
  )
}
`;

    const res = browserBundle(defaultCode, {
      files: {
        "./hello.tsx": defaultHello,
      },
    });
    expect(res).toMatchSnapshot();
  });
});
