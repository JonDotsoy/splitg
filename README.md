# splitg

Splits a string into an array of strings, handling spaces and quotes correctly.

```ts
splitg(`abc def g`); // => [`abc`, `def`, `g`]
splitg(`run -c "command to run"`); // => [`run`, `-c`, `"command to run"`]
splitg(`this is a json { "name": "ok" } with a property name`); // => [`this`, `is`, `a`, `json`, `{ "name": "ok" }`, `with`, `a`, `property`, `name`]
```

## Usage

Install the package using npm, bun, pnpm or yarn:

```bash
npm add splitg
```

```ts
import splitg from "splitg";
```

### Custom Delimiters

You can specify a custom delimiter to use when splitting the string. This allows you to split strings based on characters other than spaces. The delimiter can be a single character or a string. Quoted strings are still handled correctly, even if they contain the delimiter.

If you pass a delimiter, the function will split the string using that delimiter instead of spaces.

**Example:**

```ts
splitg(`abc~def~g`, "~"); // => [`abc`, `def`, `g`]
```

### Custom Brackets

**Example:**

```ts
splitg(`abc <def ghi> [jkl mno]`, undefined, {
  brackets: [["<", ">"]],
}); // => [`abc`, `<def ghi>`, `[jkl`, `mno]`]
```

### Multiple splitters

**Example:**

```ts
splitg(`abc~def ghi jkl~mno`, undefined, {
  splitters: ["~", " "],
}); // => [`abc`, `def`, `ghi`, `jkl`, `mno]`]
```
