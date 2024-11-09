import { expect, it } from "bun:test";
import { splitg } from ".";

it("splits a string by spaces", () =>
  expect(splitg(`abc def g`)).toEqual(["abc", "def", "g"]));
it("splits a string by a custom separator", () =>
  expect(splitg(`abc~def~g`, "~")).toEqual(["abc", "def", "g"]));
it("splits a string preserving double quotes", () =>
  expect(splitg(`"abc def" g`)).toEqual(['"abc def"', "g"]));
it("splits a string preserving curly braces", () =>
  expect(splitg(`{abc def} g`)).toEqual(["{abc def}", "g"]));
it("splits a string preserving parentheses", () =>
  expect(splitg(`(abc def) g`)).toEqual(["(abc def)", "g"]));
it("splits a string preserving square brackets", () =>
  expect(splitg(`[abc def] g`)).toEqual(["[abc def]", "g"]));
it("splits a string preserving nested square brackets", () =>
  expect(splitg(`a [[abc [def]]] g`)).toEqual(["a", "[[abc [def]]]", "g"]));
it("splits a string preserving single quotes", () =>
  expect(splitg(`'abc def' g`)).toEqual(["'abc def'", "g"]));
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
