// Type declarations for CSS module imports (used in web-only components)
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.module.css' {
  const content: Record<string, string>;
  export default content;
}
