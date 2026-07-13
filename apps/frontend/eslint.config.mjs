// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      "vue/max-attributes-per-line": "off",
      "vue/first-attribute-linebreak": "off",
      "vue/html-indent": "off",
      "vue/html-closing-bracket-newline": "off",
      "vue/html-closing-bracket-spacing": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/multiline-html-element-content-newline": "off",
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
)
