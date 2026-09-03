// Stands in for the `server-only` package under vitest. The real module throws
// on import outside a server component, which is exactly the behaviour we want
// in a build and exactly the wrong behaviour in a unit test.
export {};
