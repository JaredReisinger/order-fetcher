/* eslint-disable @typescript-eslint/no-unused-vars */
declare module 'printable-characters' {
  export default {
    // Typescript is evaluating weird meanings for `RegExp`... notice the first
    // one is a `var`, not the interface!
    zeroWidthCharacters: RegExp,
    ansiEscapeCodes: Readonly<RegExp>,
    strlen: (s: string) => number,
    isBlank: (s: string) => boolean,
    blank: (s: string) => string,
    first: (s: string, n: number) => string,
  };
}
