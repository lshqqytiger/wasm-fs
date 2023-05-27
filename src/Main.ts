import { WASI } from "wasi";

import { assert } from "./Utility";

declare module "wasi" {
  export interface WASI {
    getImportObject(): any;
  }
  export interface WASIOptions {
    version: string;
  }
}

// Union
interface Heap {
  u32: Uint32Array;
  u8: Uint8Array;
}

abstract class WASMFileSystemNode {
  public abstract name: string;
  public abstract isDirectory(): this is WASMFileSystemDirectory;
  public abstract isFile(): this is WASMFileSystemFile;
}
export class WASMFileSystemDirectory extends WASMFileSystemNode {
  public name: string;
  public isRoot: boolean;
  public children: WASMFileSystemNode[];
  public static root = new WASMFileSystemDirectory();
  public constructor(name?: string) {
    super();
    this.name = name || "";
    this.isRoot = name === undefined;
    this.children = [];
  }
  public isDirectory(): this is WASMFileSystemDirectory {
    return true;
  }
  public isFile(): this is WASMFileSystemFile {
    return false;
  }
  public has(name: string) {
    return !!this.children.find((v) => v.name === name);
  }
  public getChild(name: string) {
    const node = this.children.find((v) => v.name === name && v.isDirectory());
    if (node === undefined)
      throw new Error(
        `Cannot find child directory of "${this.name}" whose name is "${name}".`
      );
    assert(node instanceof WASMFileSystemDirectory);
    return node;
  }
  public getFile(name: string) {
    const node = this.children.find((v) => v.name === name && v.isFile());
    if (node === undefined)
      throw new Error(
        `Cannot find file of "${this.name}" whose name is "${name}".`
      );
    assert(node instanceof WASMFileSystemFile);
    return node;
  }
  public findChild(name: string) {
    const node = this.children.find((v) => v.name === name && v.isDirectory());
    assert(node === undefined || node instanceof WASMFileSystemDirectory);
    return node;
  }
  public findFile(name: string) {
    const node = this.children.find((v) => v.name === name && v.isFile());
    assert(node === undefined || node instanceof WASMFileSystemFile);
    return node;
  }
}
export class WASMFileSystemFile extends WASMFileSystemNode {
  public location: string;
  public name: string;
  private heap: Heap;
  private contentPointer: number;
  private lengthPointer: number;
  public constructor(heap: Heap, pointer: number) {
    super();
    this.heap = heap;
    const name_addr = this.heap.u32[pointer >> 2];
    pointer += 4;
    this.lengthPointer = this.heap.u32[pointer >> 2];
    pointer += 4;
    this.contentPointer = this.heap.u32[pointer >> 2];
    pointer += 4;
    const name_chunk: number[] = [];
    for (
      let i = name_addr, chunk = this.heap.u8[i];
      chunk;
      chunk = this.heap.u8[++i]
    )
      name_chunk.push(chunk);
    this.location = name_chunk.map((v) => String.fromCharCode(v)).join("");
    this.name = this.location.split("/").at(-1)!;
  }
  public get content() {
    return this.heap.u8.subarray(
      this.contentPointer,
      this.contentPointer + this.lengthPointer
    );
  }
  public isDirectory(): this is WASMFileSystemDirectory {
    return false;
  }
  public isFile(): this is WASMFileSystemFile {
    return true;
  }
}

export default class WASMFileSystem {
  private wasi: WASI;
  private wasm: WebAssembly.Module;
  private instance!: WebAssembly.Instance;
  private embeddedFilePointer!: number;

  private memory!: WebAssembly.Memory;
  private heap!: Heap;

  public root = WASMFileSystemDirectory.root;
  private constructor(wasi: WASI, wasm: WebAssembly.Module) {
    this.wasi = wasi;
    this.wasm = wasm;
  }
  public static async from(buffer: Buffer) {
    const wasi = new WASI({
      version: "preview1",
      args: process.argv,
      env: process.env,
    });
    const wasm = await WebAssembly.compile(buffer);
    const fs = new WASMFileSystem(wasi, wasm);
    const instance = await WebAssembly.instantiate(wasm, {
      env: {
        abort() {
          throw new Error("Abort called from wasm file");
        },
        _emscripten_fs_load_embedded_files(pointer: number) {
          fs.embeddedFilePointer = pointer;
        },
      },
      ...wasi.getImportObject(),
    });
    fs.start(instance);
    let pointer = fs.embeddedFilePointer;
    do {
      const file = new WASMFileSystemFile(fs.heap, pointer);
      const location = file.location.split("/");
      let parent = fs.root;
      let i = 1;
      do {
        const name = location[i];
        if (!parent.has(name))
          parent.children.push(
            i === location.length - 1 ? file : new WASMFileSystemDirectory(name)
          );
      } while ((parent = parent.findChild(location[i++])!));
    } while (fs.heap.u32[(pointer += 12) >> 2]);
    return fs;
  }
  private start(instance: WebAssembly.Instance) {
    this.instance = instance;
    this.memory = this.instance.exports.memory as WebAssembly.Memory;
    this.synchronizeHeap();
    this.wasi.start(this.instance);
  }
  private synchronizeHeap() {
    this.heap = {
      u32: new Uint32Array(this.memory.buffer),
      u8: new Uint8Array(this.memory.buffer),
    };
  }
}
