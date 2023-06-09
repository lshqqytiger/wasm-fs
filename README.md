<a href="https://www.npmjs.com/package/wasm-fs"><img src="https://img.shields.io/npm/v/wasm-fs.svg?maxAge=3600" alt="npm version" /></a>

# wasm-fs

Extract & Instantiate embedded file structure from WebAssembly.

# Support

- [x] Emscripten SDK
- [ ] Go

# Installation

```
$ npm i wasm-fs
```

or

```
$ yarn add wasm-fs
```

# Example

## Emscripten SDK

### Generate WASM with embedded file

```
$ emcc hello.c -s STANDALONE_WASM -o hello.html --embed-file embedded_file
```

### Generate WASM with embedded directory

```
$ emcc hello.c -s STANDALONE_WASM -o hello.html --embed-file embedded_dir
```

### Extract embedded file structure from WASM

```ts
import fs from "fs";
import { resolve } from "path";

import WASMFileSystem from "wasm-fs";

(async () => {
  const wasmFileSystem = await WASMFileSystem.from(
    fs.readFileSync(resolve(__dirname, "hello.wasm"))
  );
  console.log("root:", wasmFileSystem.root);
  const testDirectory = wasmFileSystem.root.getChild("testDirectory");
  console.log("testDirectory:", testDirectory);
  fs.writeFileSync(
    "./image.png",
    testDirectory.getFile("testImage.png").content
  );
})();
```

## Go

Not Implemented Yet.

# FAQ

## Q: I'm getting `ModuleNotFoundError: Couldn't find required module "MODULE_NAME".`

A: It means your .wasm file requires `MODULE_NAME` key in the `importObject`. (second argument of `WASMFileSystem.from`)
If you know what should be there, import that through `importObject`.
If you don't, consider using `VoidFunctionRecord`.

```ts
import WASMFileSystem, { VoidFunctionRecord } from "wasm-fs";

const fs = await WASMFileSystem.from(
  readFileSync(resolve(__dirname, "hello.wasm")),
  {
    MODULE_NAME: VoidFunctionRecord,
  }
);
```

# License

MIT License

Copyright (c) 2023 이승훈
