import tailwindcss from "@tailwindcss/postcss";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import postcss from "postcss";
import { defineConfig } from "rolldown";

export default defineConfig([
  {
    input: { backend: "./src/backend/backend.ts" },
    output: {
      dir: "build",
      entryFileNames: "[name].js",
      format: "iife"
    }
  },
  {
    input: {
      devtools: "./src/devtools/devtools.ts",
      panel: "./src/panel/index.tsx"
    },
    transform: {
      jsx: "react-jsx"
    },
    plugins: [
      {
        name: "postcss-tailwind",
        async closeBundle() {
          const cssSource = await readFile(resolve("src/panel/style.css"), "utf-8");
          const result = await postcss([tailwindcss()]).process(cssSource, {
            from: resolve("src/panel/style.css"),
            to: resolve("build/panel.css")
          });
          await writeFile(resolve("build/panel.css"), result.css);
          if (result.map) {
            await writeFile(resolve("build/panel.css.map"), JSON.stringify(result.map));
          }
        }
      }
    ],
    output: {
      dir: "build",
      entryFileNames: "[name].js",
      sourcemap: false
    }
  }
]);
