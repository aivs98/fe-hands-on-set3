/** "Latest request wins": a response is applied only if no newer request started after it. */
export function createLatest() {
  let current = 0;
  return {
    begin: (): number => ++current,
    isCurrent: (token: number): boolean => token === current,
    cancel: (): void => { current++; },
  };
}
