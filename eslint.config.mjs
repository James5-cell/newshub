import { ourongxing, react } from "@ourongxing/eslint-config"

/** @type {any} */
const config = ourongxing({
  type: "app",
  // Stability checks are separate from cosmetic formatting.
  stylistic: false,
  // 貌似不能 ./ 开头，
  ignores: ["src/routeTree.gen.ts", "server/glob.d.ts", "imports.app.d.ts", "public/", ".vscode", "**/*.json", "dist/**", ".wrangler/**", ".data/**", "pnpm-lock.yaml", "docs/**", "**/*.md"],
}).append(react({
  files: ["src/**"],
}))

// These rules were removed in eslint-react 2; retain all supported checks.
const configs = await config
const plugins = Object.assign({}, ...configs.map(item => item.plugins || {}))
export default configs.map(item => !item.rules ? item : ({
  ...item,
  rules: Object.fromEntries(Object.entries(item.rules || {}).filter(([name]) => {
    const slash = name.lastIndexOf("/")
    const plugin = plugins[name.slice(0, slash)]
    return slash < 0 || !plugin || !!plugin.rules?.[name.slice(slash + 1)]
  })),
})).concat({
  // Preserve explicit confirmations before destructive admin actions.
  files: ["src/routes/admin.tsx"],
  rules: { "no-alert": "off" },
}, {
  files: ["**/*.ts", "**/*.tsx"],
  languageOptions: { parserOptions: { project: ["tsconfig.app.json", "tsconfig.node.json"], tsconfigRootDir: import.meta.dirname } },
})
