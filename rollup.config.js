
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import { readdirSync } from 'fs';
import executable from 'rollup-plugin-executable';

const commands = readdirSync('./src/commands');

export default [
  ...[ 'index.js', ...commands.map(item => `commands/${item.replace('ts', 'js')}`) ].map(file => ({
    input: `./dist/src/${file}`,
    output: {
      file: `./lib/${file}`,
      format: 'es'
    },
    external: [ /node_modules/ ],
    plugins: [
      json(),
      commonjs(),
      nodeResolve({
        preferBuiltins: true
      }),
      terser({ keep_classnames: true, keep_fnames: true }),
      executable()
    ],
    onwarn(warning, rollupWarn) {
      // Remove some of the warnings noise:
      // - CIRCULAR_DEPENDENCY -> not sure if this is an issue
      // - THIS_IS_UNDEFINED -> result of using typescript polyfills
      // - EVAL -> sometimes people just use eval. Deal with it.
      if (warning.code !== 'CIRCULAR_DEPENDENCY' && warning.code !== 'THIS_IS_UNDEFINED' && warning.code !== 'EVAL') {
        rollupWarn(warning);
      }
    }
  }))
]