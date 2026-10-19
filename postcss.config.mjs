/** Turbopack/Lightning CSS chokes on a leading UTF-8 BOM (misreported as a dangling combinator). */
function stripBom() {
  return {
    postcssPlugin: "strip-bom",
    Once(root) {
      const input = root.source?.input;
      if (input?.hasBOM) input.hasBOM = false;
    },
  };
}
stripBom.postcss = true;

const config = {
  plugins: [stripBom(), "@tailwindcss/postcss"],
};

export default config;
