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
) => ResultCheck;
export type ResultCheck = {
  /**
   * Cut here
   */
  split?: boolean;
  /**
   * Transform the next char
   */
  transformNextResultCheck?: TransformNextResultCheck;
};
export type Check = (ctx: Ctx, index: number) => void | ResultCheck;

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
const createQuoteOptions = (name: string): CharOption => ({
  check: (ctx) => {
    if (ctx.splitBlocksKeys.has(name)) {
      ctx.splitBlocksKeys.delete(name);
    } else {
      ctx.splitBlocksKeys.add(name);
    }
  },
});

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
      splitters.map((splitter) => [splitter, splitterOption]),
    ),
    ...Object.fromEntries(
      escapes?.map((escape) => [escape, escapeOptions]) ?? [],
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
  let nextTransformResultCheck: TransformNextResultCheck | null = null;

  const at = (i: number) => input[i] ?? null;

  while (true) {
    index++;
    const char = at(index);
    const charType: CharOption | null = charOptions[char] ?? null;

    if (char === null) break;

    const transformResultCheck: TransformNextResultCheck =
      nextTransformResultCheck ?? ((a) => a);

    const checking = transformResultCheck(
      charType?.check?.(ctx, index) ?? {},
      index,
    );
    const split = checking?.split ?? false;
    const transformNextChar = checking?.transformNextResultCheck;
    nextTransformResultCheck = transformNextChar ?? null;

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
