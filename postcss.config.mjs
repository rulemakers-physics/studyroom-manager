// postcss.config.mjs
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {}, // 여기가 변경되었습니다
    autoprefixer: {},
  },
};

export default config;