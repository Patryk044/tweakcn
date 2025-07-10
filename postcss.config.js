module.exports = {
  plugins: {
    'postcss-import': {},
    'tailwindcss/nesting': {},
    tailwindcss: {
      config: './tailwind.config.js',
    },
    autoprefixer: {},
    // Dodaj plugin dla aliasów, który zamieni import tailwindcss na właściwe dyrektywy
    'postcss-replace': {
      pattern: /@import\s+["']tailwindcss["'];/g,
      replacement: '@tailwind base; @tailwind components; @tailwind utilities;'
    }
  },
};
