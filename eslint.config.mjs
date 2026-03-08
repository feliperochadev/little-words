import eslintConfigExpo from "eslint-config-expo/flat.js";

export default [
  ...eslintConfigExpo,
  {
    ignores: ["node_modules/", ".expo/", "dist/", "babel.config.js", "metro.config.js"],
  },
];
