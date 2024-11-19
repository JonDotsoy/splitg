type Span = {
  name: string;
  start: number;
  end: number;
};

class Ctx {
  bracketsDepths: { name: string; pos: number }[] = [];
  blocksKeys = new Set<string>();
  quoteOpen: { name: string; pos: number } | null = null;
  spans = new Set<Span>();

  isSplitBlocked() {
    return this.blocksKeys.size > 0 || this.bracketsDepths.length;
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
   * End block
   */
  endBlock?: boolean;
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

const createOpenBlockOptions = (
  name: string,
  _open: string,
  _close: string,
): CharOption => ({
  check(ctx, pos) {
    ctx.bracketsDepths.push({ name, pos: pos });
  },
});

const createCloseBlockOptions = (
  name: string,
  _open: string,
  _close: string,
): CharOption => ({
  check(ctx, i, char) {
    const index = ctx.bracketsDepths.findLastIndex(
      (storeName) => storeName.name === name,
    );
    const bracketsDepth = ctx.bracketsDepths.at(index)!;
    if (index === -1) return;
    ctx.bracketsDepths = ctx.bracketsDepths.slice(0, index);

    const span: Span = {
      name,
      start: bracketsDepth.pos,
      end: i,
    };

    ctx.spans.add(span);
  },
});

const createQuoteOptions = (name: string, escapes: string[]): CharOption => {
  const escapeSymbol = "\\";
  return {
    check: (ctx, i, char) => {
      if (ctx.blocksKeys.has(name)) {
        ctx.blocksKeys.delete(name);
        if (ctx.quoteOpen) {
          const span: Span = {
            name,
            start: ctx.quoteOpen.pos,
            end: i,
          };
          ctx.spans.add(span);
        }
        ctx.quoteOpen = null;
        return {};
      }

      ctx.blocksKeys.add(name);
      ctx.quoteOpen = { name, pos: i };

      const transformNextBeforeCheck: TransformNextBeforeCheck = (
        next,
        index,
        char,
      ) => {
        if (escapes.includes(char)) {
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

export const defaultOptions: Required<Options> = {
  splitters: [" "],
  escapes: ["\\"],
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
  quotes: ["'", '"'],
};

type Options = {
  splitters?: string[];
  escapes?: string[];
  brackets?: [string, string][];
  quotes?: string[];
};

type PropsFalsables<T> = T extends {}
  ? { [K in keyof T]: T[K] | false }
  : never;
type SingleOption<T> = T extends (infer R)[] ? T | R : T;
type SingleOptions<T> = T extends {}
  ? { [K in keyof T]: SingleOption<T[K]> }
  : never;

type OptionsFalsable = PropsFalsables<SingleOptions<Options>>;

const unFalsable = <T>(prop: T) =>
  prop === false ? undefined : (prop as Exclude<T, false>);
const toArray = <T>(value: T): T extends any[] ? T : T[] =>
  Array.isArray(value) ? value : ([value] as any);

function* splitString(
  input: string,
  options?: OptionsFalsable,
  extraOptions?: { onCtx: (ctx: Ctx) => void },
) {
  const v = <T>(v: T) => (v === false ? [] : (v as Exclude<T, false>));

  const splitters = toArray(v(options?.splitters) ?? defaultOptions.splitters);
  const escapes = toArray(v(options?.escapes) ?? defaultOptions.escapes);
  const blocks = toArray(v(options?.brackets) ?? defaultOptions.brackets);
  const quotes = toArray(v(options?.quotes) ?? defaultOptions.quotes);

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
          [open, createOpenBlockOptions(`${open}${close}`, open, close)],
          [close, createCloseBlockOptions(`${open}${close}`, open, close)],
        ])
        .flat(),
    ),
    ...Object.fromEntries(
      quotes.map((quoteSymbol) => [
        quoteSymbol,
        createQuoteOptions(quoteSymbol, escapes),
      ]),
    ),
  };

  let index = -1;
  let startFrom = 0;
  const ctx: Ctx = new Ctx();
  extraOptions?.onCtx(ctx);
  /** @deprecated */
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
    // console.log("🚀 ~ function*splitString ~ ", "char:", char, "charType:", charType)

    if (char === null) break;

    /** @deprecated */
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
    /** @deprecated */
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
  | [splitterOrOptions?: string | OptionsFalsable | false]
  | [splitter?: string | false, options?: OptionsFalsable];

const parseSplitgOptions = (
  ...options: SplitgOptions
): { splitter?: string; options?: OptionsFalsable } => {
  const [splitterOrOptions, optionsValue] = options;
  if (typeof splitterOrOptions === "object")
    return { options: splitterOrOptions };
  if (typeof optionsValue === "object")
    return {
      splitter: unFalsable(splitterOrOptions),
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
        ? [splitter, ...(unFalsable(optionsValue?.splitters) ?? [])]
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

splitg.spans = (input: string, ...options: SplitgOptions) => {
  const { input: inputValue, options: optionsValue } = splitgOptions(
    input,
    ...options,
  );

  let spans: Set<Span> | null = null;

  Array.from(
    splitString(inputValue, optionsValue, {
      onCtx: (ctx) => {
        spans = ctx.spans;
      },
    }),
  );

  return spans!;
};

export namespace paths {
  const quote = '"';

  const options: OptionsFalsable = {
    brackets: [],
    escapes: [`\\`],
    quotes: [`"`],
    splitters: [`.`],
  };

  export const stringify = (parts: (string | number)[]) => {
    return parts
      .map((part) => {
        // return part.toString().replace(/(\.|\")/g, '\\$1')
        const partString = part.toString();
        return /\W/.test(partString) ? JSON.stringify(partString) : partString;
      })
      .join(".");
  };

  export const parse = (value: string) => {
    return splitg(value, options).map((part) => {
      try {
        return JSON.parse(part);
      } catch {
        return part;
      }
    });
  };
}

splitg.paths = paths;

export default splitg;
