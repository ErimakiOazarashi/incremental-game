import { defineConfig } from 'vite';

export default defineConfig({
  // 相対パス出力にして GitHub Pages のサブパス配信でもそのまま動くようにする
  base: './',
  build: {
    target: 'es2020',
  },
});
