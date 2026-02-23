import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'providers/index': 'src/providers/index.ts',
    'hooks/index': 'src/hooks/index.ts',
    'components/index': 'src/components/index.ts',
    'cdsso/index': 'src/cdsso/index.ts',
    'merkos/index': 'src/merkos/index.ts',
    'valu/index': 'src/valu/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    'react',
    'react-dom',
    '@chabaduniverse/auth',
    '@arkeytyp/valu-api',
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
