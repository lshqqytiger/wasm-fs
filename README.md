# wasm-fs

Extract & Instantiate embedded file structure from WebAssembly.

# Installation

```
$ npm i wasm-fs
```

or

```
$ yarn add wasm-fs
```

# Example

## Generate WASM with embedded file

```
$ emcc hello.c -s STANDALONE_WASM -o hello.html --embed-file embedded_file
```

## Generate WASM with embedded directory

```
$ emcc hello.c -s STANDALONE_WASM -o hello.html --embed-file embedded_dir
```

## Extract embedded file structure from WASM

```ts
import fs from "fs";
import { resolve } from "path";

import WASMFileSystem from "wasm-fs";

(async () => {
  const wasmFileSystem = await WASMFileSystem.from(
    readFileSync(resolve(__dirname, "hello.wasm"))
  );
  console.log("root:", wasmFileSystem.root);
  const testDirectory = wasmFileSystem.root.getChild("testDirectory");
  console.log("testDirectory:", testDirectory);
  writeFileSync("./image.png", testDirectory.getFile("testImage.png").content);
})();
```
