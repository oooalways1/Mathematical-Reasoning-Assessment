import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const root = process.cwd(), target = path.join(root, 'public', 'scan');
mkdirSync(target, { recursive: true });
const copy = (from, to) => copyFileSync(path.join(root, 'node_modules', from), path.join(target, to));
copy('pdfjs-dist/build/pdf.worker.min.mjs', 'pdf.worker.min.mjs');
copy('tesseract.js/dist/worker.min.js', 'worker.min.js');
for (const name of ['tesseract-core-lstm', 'tesseract-core-simd-lstm', 'tesseract-core-relaxedsimd-lstm']) {
  copy(`tesseract.js-core/${name}.wasm.js`, `${name}.wasm.js`);
  copy(`tesseract.js-core/${name}.wasm`, `${name}.wasm`);
}
for (const language of ['eng', 'kor']) copy(`@tesseract.js-data/${language}/4.0.0_best_int/${language}.traineddata.gz`, `${language}.traineddata.gz`);
copy('tesseract.js/LICENSE.md', 'tesseract-LICENSE.md');
copy('pdfjs-dist/LICENSE', 'pdfjs-LICENSE');
console.log('Local PDF and OCR assets ready.');
