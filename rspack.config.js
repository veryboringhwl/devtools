import path from "node:path";

export default (_env, argv) => {
  const isDev = argv.mode === "development";

  return {
    mode: isDev ? "development" : "production",
    devtool: isDev ? "inline-source-map" : false,
    entry: {
      devtools: "./src/devtools/devtools.ts",
      panel: "./src/panel/index.tsx",
    },
    output: {
      path: path.resolve(import.meta.dirname, "build"),
      filename: "[name].js",
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
      tsConfig: path.resolve(import.meta.dirname, "tsconfig.json"),
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ["postcss-loader"],
          type: "css",
        },
        {
          test: /\.(?:js|mjs|jsx|ts|tsx)$/,
          loader: "builtin:swc-loader",
          options: {
            detectSyntax: "auto",
            jsc: {
              transform: {
                react: {
                  runtime: "automatic",
                },
              },
            },
          },
          type: "javascript/auto",
        },
      ],
    },
  };
};
