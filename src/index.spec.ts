import { describe, expect, it } from "bun:test";
import { splitg, splitgOptions } from ".";

it("splits a string by spaces", () =>
  expect(splitg(`abc def g`)).toEqual(["abc", "def", "g"]));
it("splits a string by a custom separator", () =>
  expect(splitg(`abc~def~g`, "~")).toEqual(["abc", "def", "g"]));
it("splits a string preserving curly braces", () =>
  expect(splitg(`{abc def} g`)).toEqual(["{abc def}", "g"]));
it("splits a string preserving parentheses", () =>
  expect(splitg(`(abc def) g`)).toEqual(["(abc def)", "g"]));
it("splits a string preserving square brackets", () =>
  expect(splitg(`[abc def] g`)).toEqual(["[abc def]", "g"]));
it("splits a string preserving nested square brackets", () =>
  expect(splitg(`a [[abc [def]]] g`)).toEqual(["a", "[[abc [def]]]", "g"]));
it("splits a string preserving backslashes", () =>
  expect(splitg(`abc\\ def g`)).toEqual(["abc\\ def", "g"]));
it("splits a string preserving angle brackets (default)", () =>
  expect(splitg(`<abc def> g`)).toEqual(["<abc", "def>", "g"]));
it("splits a string preserving angle brackets (custom)", () =>
  expect(splitg(`<abc def> g`, undefined, { brackets: [["<", ">"]] })).toEqual([
    "<abc def>",
    "g",
  ])),
  it("splits a string with trailing spaces", () =>
    expect(splitg(`abc def g  `)).toEqual(["abc", "def", "g", "", ""]));
it("splits a string with a json object", () =>
  expect(
    splitg(`this is a json { "name": "ok" } with a property name`),
  ).toEqual([
    `this`,
    `is`,
    `a`,
    `json`,
    `{ "name": "ok" }`,
    `with`,
    `a`,
    `property`,
    `name`,
  ]));

describe("parseSplitgOptions", () => {
  it("should parse a string splitter", () =>
    expect(splitgOptions("input", "abc")).toEqual({
      input: "input",
      options: {
        splitters: ["abc"],
      },
    }));
  it("should parse an options object with splitters", () =>
    expect(splitgOptions("input", { splitters: ["abc"] })).toEqual({
      input: "input",
      options: {
        splitters: ["abc"],
      },
    }));
  it("should parse options with splitters", () =>
    expect(splitgOptions("input", undefined, { splitters: ["abc"] })).toEqual({
      input: "input",
      options: {
        splitters: ["abc"],
      },
    }));
  it("should merge splitters from string and options object", () =>
    expect(splitgOptions("input", "abc", { splitters: ["def"] })).toEqual({
      input: "input",
      options: {
        splitters: ["abc", "def"],
      },
    }));
});

describe("quotes", () => {
  it("splits a string preserving single quotes", () =>
    expect(splitg(`'abc def' g`, { quotes: ["'"] })).toEqual([
      "'abc def'",
      "g",
    ]));

  it("splits a string preserving double quotes", () =>
    expect(splitg(`"abc def" g`, { quotes: [`"`] })).toEqual([
      '"abc def"',
      "g",
    ]));

  it("splits a string with double quotes", () =>
    expect(splitg(`hello "world abc"`, { quotes: [`"`] })).toEqual([
      "hello",
      `"world abc"`,
    ]));

  it("splits a string with escaped quotes", () =>
    expect(splitg(`hello "wor[ld" ] ok`, undefined, { quotes: ['"'] })).toEqual(
      ["hello", `"wor[ld"`, `]`, `ok`],
    ));

  it("splits a string with comma as separator and double quotes", () =>
    expect(splitg(`1,2,"3,4,5",6,7`, ",", { quotes: ['"'] })).toEqual([
      "1",
      "2",
      `"3,4,5"`,
      "6",
      "7",
    ]));

  it("splits a string with comma as separator, double quotes and escaped quotes", () =>
    expect(splitg(`1,2,"3,\\"4,5",6,7`, ",", { quotes: ['"'] })).toEqual([
      "1",
      "2",
      `"3,\\"4,5"`,
      "6",
      "7",
    ]));

  it("splits a string with comma as separator, double quotes and escaped quotes and dots", () =>
    expect(splitg(`1,2,"3,3\\.1,\\"4,5",6,7`, ",", { quotes: ['"'] })).toEqual([
      "1",
      "2",
      `"3,3\\.1,\\"4,5"`,
      "6",
      "7",
    ]));

  it("splits a string with spaces as separator, double quotes and escaped characters", () =>
    expect(splitg(`a "b \\c d" e`, " ", { quotes: ['"'] })).toEqual([
      "a",
      `"b \\c d"`,
      "e",
    ]));

  it("splits a string with spaces as separator, double quotes and newline characters", () =>
    expect(splitg(`a "b \n d" e`, " ", { quotes: ['"'] })).toEqual([
      "a",
      `"b \n d"`,
      "e",
    ]));
});
