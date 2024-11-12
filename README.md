# splitg

Splits a string into an array of strings, handling spaces and quotes correctly.

```ts
splitg(`abc def g`); // => [`abc`, `def`, `g`]
splitg(`run -c "command to run"`); // => [`run`, `-c`, `"command to run"`]
splitg(`this is a json { "name": "ok" } with a property name`); // => [`this`, `is`, `a`, `json`, `{ "name": "ok" }`, `with`, `a`, `property`, `name`]

// Complex sample:
splitg(
  `{ "name": "freed" }\n[ "name", "freed" ]\n[ [ "name", "freed" ],\n[ "age", 44 ] ]`,
  "\n",
);
// => [
//   '{ "name": "freed" }',
//   '[ "name", "freed" ]',
//   '[ [ "name", "freed" ],\n[ "age", 44 ] ]',
// ]
```

Try it here [https://jondotsoy.github.io/splitg/](https://jondotsoy.github.io/splitg/)

## Usage

Install the package [@jondotsoy/splitg](https://www.npmjs.com/package/@jondotsoy/splitg):

```bash
npm add splitg
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
splitg(`abc <def ghi> [jkl mno]`, {
  brackets: [["<", ">"]],
}); // => [`abc`, `<def ghi>`, `[jkl`, `mno]`]
```

### Multiple splitters

**Example:**

```ts
splitg(`abc~def ghi jkl~mno`, {
  splitters: ["~", " "],
}); // => [`abc`, `def`, `ghi`, `jkl`, `mno]`]
```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
