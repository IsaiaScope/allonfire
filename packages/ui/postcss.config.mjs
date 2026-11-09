// Only the browser tests read it (Vite compiles their stylesheet with it): an
// App's own build compiles ui's classes through the App's PostCSS config.
export default { plugins: { "@tailwindcss/postcss": {} } };
