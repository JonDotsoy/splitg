class Ctx {
  depths: Record<string, number | undefined> = {};
  splitBlocksKeys = new Set<string>();
  isSplitBlocked() {
    return this.splitBlocksKeys.size > 0;
  }
}

export type TransformNextResultCheck = (
  a: ResultCheck,
  index: number,
  char: string,
) => ResultCheck;

export type TransformNextBeforeCheck = (
  next: () => ResultCheck,
  index: number,
  char: string,
  str: string,
) => ResultCheck;

export type ResultCheck = {
  /**
   * Cut here
   */
  split?: boolean;
  /**
   * Transform the next char
   * @deprecated
   */
  transformNextResultCheck?: TransformNextResultCheck;
  transformNextBeforeCheck?: TransformNextBeforeCheck;
};
export type Check = (
  ctx: Ctx,
  index: number,
  char: string,
) => void | ResultCheck;

export type CharOption = { check?: Check };

const splitterOption: CharOption = {
  check: () => ({ split: true }),
};

const escapeOptions: CharOption = {
  check(_, leftIndex) {
    return {
      transformNextResultCheck: (resultCheck, index) => {
        if (leftIndex + 1 === index) {
          return {
            ...resultCheck,
            split: false,
          };
        }
        return resultCheck;
      },
    };
  },
};

const createOpenBlockOptions = (name: string): CharOption => ({
  check(ctx) {
    ctx.depths[name] ??= 0;
    ctx.depths[name] += 1;
    ctx.splitBlocksKeys.add(name);
  },
});

const createCloseBlockOptions = (name: string): CharOption => ({
  check(ctx) {
    ctx.depths[name] ??= 0;
    ctx.depths[name] -= 1;
    if (ctx.depths[name] === 0) {
      ctx.splitBlocksKeys.delete(name);
    }
  },
});

/** @experimental */
const createQuoteOptions = (name: string): CharOption => {
  const escapeSymbol = "\\";
  return {
    check: (ctx) => {
      if (ctx.splitBlocksKeys.has(name)) {
        ctx.splitBlocksKeys.delete(name);
        return {};
      }

      ctx.splitBlocksKeys.add(name);

      const transformNextBeforeCheck: TransformNextBeforeCheck = (
        next,
        index,
        char,
      ) => {
        if (char === escapeSymbol) {
          return {
            transformNextBeforeCheck: () => {
              return { transformNextBeforeCheck };
            },
          };
        }
        if (char !== name) return { transformNextBeforeCheck };
        return next();
      };

      return {
        transformNextBeforeCheck,
      };
    },
  };
};

export const defaultSplitters = [" "];
export const defaultEscapes = ["\\"];
export const defaultBlocks = [
  ["{", "}"],
  ["[", "]"],
  ["(", ")"],
];
export const defaultQuotes: string[] = []; // ["'", '"'];

type Options = {
  splitters?: string[];
  escapes?: string[];
  brackets?: [string, string][];
  /** @experimental */
  quotes?: string[];
};

function* splitString(input: string, options?: Options) {
  const splitters = options?.splitters ?? defaultSplitters;
  const escapes = options?.escapes ?? defaultEscapes;
  const blocks = options?.brackets ?? defaultBlocks;
  const quotes = options?.quotes ?? defaultQuotes;

  const charOptions = {
    ...Object.fromEntries(
      escapes?.map((escape) => [escape, escapeOptions]) ?? [],
    ),
    ...Object.fromEntries(
      splitters.map((splitter) => [splitter, splitterOption]),
    ),
    ...Object.fromEntries(
      blocks
        .map(([open, close]) => [
          [open, createOpenBlockOptions(`${open}${close}`)],
          [close, createCloseBlockOptions(`${open}${close}`)],
        ])
        .flat(),
    ),
    ...Object.fromEntries(
      quotes.map((quoteSymbol) => [
        quoteSymbol,
        createQuoteOptions(quoteSymbol),
      ]),
    ),
  };

  let index = -1;
  let startFrom = 0;
  const ctx: Ctx = new Ctx();
  let nextTransformNextResultCheck: TransformNextResultCheck | null = null;
  let nextTransformNextBeforeCheckPass: TransformNextBeforeCheck = (next) =>
    next();
  let nextTransformNextBeforeCheck: TransformNextBeforeCheck =
    nextTransformNextBeforeCheckPass;

  const at = (i: number) => input[i] ?? null;

  while (true) {
    index++;
    const char = at(index);
    const charType: CharOption | null = charOptions[char] ?? null;

    if (char === null) break;

    const transformResultCheck: TransformNextResultCheck =
      nextTransformNextResultCheck ?? ((a) => a);

    const checking = nextTransformNextBeforeCheck(
      () =>
        transformResultCheck(
          charType?.check?.(ctx, index, char) ?? {},
          index,
          char,
        ),
      index,
      char,
      input,
    );

    const split = checking?.split ?? false;
    const transformNextChar = checking?.transformNextResultCheck;
    nextTransformNextResultCheck = transformNextChar ?? null;
    nextTransformNextBeforeCheck =
      checking.transformNextBeforeCheck ?? nextTransformNextBeforeCheckPass;

    if (split && !ctx.isSplitBlocked()) {
      yield input.slice(startFrom, index);
      startFrom = index + 1;
    }
  }

  yield input.slice(startFrom, index);
}

type SplitgOptions =
  | []
  | [splitterOrOptions?: string | Options]
  | [splitter?: string, options?: Options];

const parseSplitgOptions = (
  ...options: SplitgOptions
): { splitter?: string; options?: Options } => {
  const [splitterOrOptions, optionsValue] = options;
  if (typeof splitterOrOptions === "object")
    return { options: splitterOrOptions };
  if (typeof optionsValue === "object")
    return {
      splitter: splitterOrOptions,
      options: optionsValue,
    };
  if (typeof splitterOrOptions === "string")
    return {
      splitter: splitterOrOptions,
    };
  return {};
};

export function splitgOptions(input: string, ...options: SplitgOptions) {
  const { splitter, options: optionsValue } = parseSplitgOptions(...options);
  return {
    input: input,
    options: {
      ...optionsValue,
      splitters: splitter
        ? [splitter, ...(optionsValue?.splitters ?? [])]
        : optionsValue?.splitters,
    } as Options,
  };
}

export function splitg(input: string, ...options: SplitgOptions) {
  const { input: inputValue, options: optionsValue } = splitgOptions(
    input,
    ...options,
  );

  return Array.from(splitString(inputValue, optionsValue));
}
