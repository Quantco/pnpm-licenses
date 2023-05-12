import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/cli.ts',
    api: 'src/api.ts'
  },
  dts: true,
  clean: true,
  target: 'es2020',
  format: ['esm'],
  sourcemap: true,
  minify: false,
  noExternal: []
})
