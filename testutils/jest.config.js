/*
 * Copyright 2018-2023 Elyra Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* global module */
/*module.exports = {
  testRegex: '.*.spec.tsx?$',
  transform: {
    '\\.(ts|tsx)?$': [
      'ts-jest',
      {
        tsConfig: 'tsconfig.json'
      }
    ],
    '\\.(js|jsx)?$': ['babel-jest', 'ts-jest'],
    '\\.svg$': '@glen/jest-raw-loader',
    '^.+.tsx?$': ['ts-jest', {}]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!@microsoft|@jupyter/react-components|@jupyter/web-components|exenv-es6|@jupyter/ydoc|lib0|y\\-protocols|y\\-websocket|yjs|(@jupyterlab/.*)/).+'
  ],
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot)$': '@jupyterlab/testutils/lib/jest-file-mock.js'
  },
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['../../testutils/jest.setup.js'],
  setupFiles: ['@jupyterlab/testing/lib/jest-shim.js'],
  moduleFileExtensions: ['cjs', 'js', 'json', 'jsx', 'mjs', 'node', 'ts', 'tsx']
};
*/
//const jestJupyterLab = require('@jupyterlab/testutils/lib/jest-config');

const esModules = [
  '@codemirror',
  '@jupyter',
  '@jupyter/ydoc',
  '@jupyterlab/',
  '@microsoft',
  'data-uri-to-buffer',
  'exenv-es6',
  'fetch-blob',
  'formdata-polyfill',
  'lib0',
  'nanoid',
  'node-fetch',
  '@rjsf',
  'vscode-ws-jsonrpc',
  'y-protocols',
  'y-websocket',
  'yjs'
].join('|');

//const baseConfig = jestJupyterLab(__dirname);

module.exports = {
  //...baseConfig,
  automock: false,
  testRegex: '.*.spec.tsx?$',
  transformIgnorePatterns: [`/node_modules/(?!${esModules}).+`],
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot)$': '@jupyterlab/testutils/lib/jest-file-mock.js'
  },
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['../../testutils/jest.setup.js'],
  setupFiles: ['@jupyterlab/testing/lib/jest-shim.js'],
  moduleFileExtensions: [
    'cjs',
    'js',
    'json',
    'jsx',
    'mjs',
    'node',
    'ts',
    'tsx'
  ],
  transform: {
    '^.+\\.(j|t)sx?$': [
      'ts-jest',
      {
        tsConfig: '../../tests/tsconfig.json'
      }
    ],
    //'^.+\\.jsx?$': 'babel-jest',
    '\\.svg$': '@glen/jest-raw-loader'
  }
};
