import { questionBlueprints, type Grade } from './diagnosis-blueprint';
import {choiceValue,matchingValue} from './evaluations';
type ScanItems={id:string;number:number;type:'choice'|'short'|'matching';choiceCount?:number;leftOptions?:string[]}[];

export function parseNumberedAnswers(text: string, grade: Grade, customItems?:ScanItems) {
  const answers: Record<string, string> = {}, conflicts = new Set<string>(),uncertain=new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.normalize('NFKC').match(/^\s*(?:문항\s*)?(\d{1,2})\s*(?:번\s*)?(?:[:.)-]|(?=정답|답))\s*(.+?)\s*$/);
    if (!match) continue;
    const item = (customItems??questionBlueprints[grade]).find(item => item.number === Number(match[1]));
    if (!item) continue;
    const explicit=/^(?:정답|답)(?:은|는)?\s*[:：]?\s*/.test(match[2]);
    const raw = match[2].trim().replace(/^(?:정답|답)(?:은|는)?\s*[:：]?\s*/,'').replace(/\s*입니다[.!。]?$/,'').trim();
    if (!raw || /^[_.\-\s]+$/.test(raw) || raw.length > 100) continue;
    const answer = item.type === 'choice' ? choiceValue(raw,'choiceCount' in item ? item.choiceCount??4 : 4) : item.type==='matching'?matchingValue(raw,'leftOptions' in item?item.leftOptions?.length??0:0):raw;
    if (!answer || conflicts.has(item.id)) {uncertain.add(item.id);continue;}
    if(/[?？�]/.test(raw)||!explicit&&/^[a-z가-힣]{1,6}\s*[:：]/i.test(raw)||!explicit&&raw.length>25||!explicit&&item.type==='short'&&/[가-힣]{3}/.test(raw)&&!/^([가나다라마바사아][\s,]*)+$/.test(raw)){uncertain.add(item.id);continue;}
    if (answers[item.id] && answers[item.id] !== answer) { conflicts.add(item.id); delete answers[item.id]; }
    else answers[item.id] = answer;
  }
  return { answers, conflicts: [...conflicts],uncertain:[...new Set([...uncertain,...conflicts])] };
}

export type ScanResult = { answers: Record<string, string>; conflicts: string[]; uncertain:string[]; text: string; previews: string[]; pages: number };
export function inkChannel(data:Uint8ClampedArray,channel:'gray'|'red'|'blue'){
 const output=new Uint8ClampedArray(data.length);for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1],b=data[i+2];let value:number;if(channel==='gray')value=Math.min(r,g,b);else{const ink=channel==='red'?r-Math.max(g,b):b-Math.max(r,g);value=ink>30?Math.max(0,100-ink):Math.min(r,g,b)<85?40:255;}value=Math.max(0,Math.min(255,(value-110)*1.5+128));output[i]=output[i+1]=output[i+2]=value;output[i+3]=255;}return output;
}
export async function readAnswerFiles(files: File[], grade: Grade, onProgress: (message: string) => void, signal: AbortSignal, customItems?:ScanItems): Promise<ScanResult> {
  if (!files.length || files.length > 8 || files.reduce((size, file) => size + file.size, 0) > 20 * 1024 * 1024) throw new Error('총 20MB 이하, 최대 8개 파일을 선택해 주세요.');
  let worker: import('tesseract.js').Worker | undefined;
  const pages: string[] = [], previews: string[] = [];
  let pageCount = 0;
  const check = () => { if (signal.aborted) throw new Error('답안 인식을 취소했습니다.'); };
  const abort = () => { void worker?.terminate(); };
  signal.addEventListener('abort', abort, { once: true });
  async function recognize(canvas: HTMLCanvasElement) {
    check();
    if (!worker) {
      onProgress('답안 인식 도구를 준비하고 있어요. 처음에는 조금 걸릴 수 있어요.');
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker(['eng', 'kor'], 1, { workerPath: '/scan/worker.min.js', corePath: '/scan', langPath: '/scan', legacyCore: false, logger: ({ status, progress }) => {
        if (!signal.aborted && status === 'recognizing text') onProgress(`${pageCount}쪽 답안을 읽고 있어요 · ${Math.round(progress * 100)}%`);
      } });
      if (signal.aborted) { await worker.terminate(); check(); }
      await worker.setParameters({ preserve_interword_spaces: '1',user_defined_dpi:'300' });
    }
    check();
    const context=canvas.getContext('2d');if(!context)throw new Error('이미지 처리 불가');const original=context.getImageData(0,0,canvas.width,canvas.height);const texts:string[]=[];
    for(const channel of ['gray','red','blue'] as const){check();const variant=document.createElement('canvas');variant.width=canvas.width;variant.height=canvas.height;variant.getContext('2d')!.putImageData(new ImageData(inkChannel(original.data,channel),canvas.width,canvas.height),0,0);const data=(await worker.recognize(variant)).data;texts.push(data.text);variant.width=variant.height=0;}
    return texts.join('\n');
  }
  try {
    for (const file of files) {
      check();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
      const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      if (!pdf && !png && !jpeg) throw new Error('PDF, JPG 또는 PNG 파일만 읽을 수 있어요.');
      if (pdf) {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/scan/pdf.worker.min.mjs';
        const task = pdfjs.getDocument({ data: bytes });
        try {
          const document = await task.promise;
          if (pageCount + document.numPages > 8) throw new Error('한 번에 최대 8쪽까지 읽을 수 있어요.');
          for (let number = 1; number <= document.numPages; number++) {
            check(); pageCount++; onProgress(`${pageCount}쪽 PDF를 읽고 있어요.`);
            const page = await document.getPage(number);
            const content = await page.getTextContent();
            let text = '', lastY: number | undefined;
            for (const item of content.items) if ('str' in item) {
              const y = Math.round(item.transform[5]);
              if (lastY !== undefined && Math.abs(y - lastY) > 3) text += '\n';
              text += item.str + (item.hasEOL ? '\n' : ' '); lastY = y;
            }
            const original = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: Math.min(3, 2800 / Math.max(original.width, original.height)) });
            const canvas = window.document.createElement('canvas');
            canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
            await page.render({ canvas, viewport }).promise;
            previews.push(canvas.toDataURL('image/jpeg', .55));
            if (Object.keys(parseNumberedAnswers(text, grade, customItems).answers).length < (customItems?.length??20)) text += '\n' + await recognize(canvas);
            pages.push(text); canvas.width = canvas.height = 0; page.cleanup();
          }
        } finally { await task.destroy(); }
      } else {
        if (++pageCount > 8) throw new Error('한 번에 최대 8쪽까지 읽을 수 있어요.');
        const bitmap = await createImageBitmap(file);
        if (bitmap.width * bitmap.height > 40_000_000) { bitmap.close(); throw new Error('이미지 크기가 너무 커요. 해상도를 낮춰 주세요.'); }
        const scale = Math.min(2, 2800 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('이 기기에서 이미지 읽기를 사용할 수 없어요.');
        context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
        previews.push(canvas.toDataURL('image/jpeg', .55)); pages.push(await recognize(canvas)); canvas.width = canvas.height = 0;
      }
    }
    check(); const text = pages.join('\n');
    return { ...parseNumberedAnswers(text, grade, customItems), text, previews, pages: pageCount };
  } finally { signal.removeEventListener('abort', abort); await worker?.terminate(); }
}
