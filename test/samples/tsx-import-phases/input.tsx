import defer * as feature from './feature.js';
import source wasm from './module.wasm';
import.defer('./feature.js');
import.source('./module.wasm');
import.source('./module.wasm', { with: { type: 'webassembly' } });
import * as ordinaryFeature from './feature.js';
import source from './ordinary.js';
import('./ordinary.js');
