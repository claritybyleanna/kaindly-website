// PDF bytes and page/zoom state stay in this document; no upload or storage.
export function initializeSlideViewer(){
 const $=id=>document.getElementById(id),status=$('slide-status'),canvas=$('pdf-canvas'),scroll=$('pdf-scroll');
 let doc=null,blobUrl=null,pageNumber=1,zoom=1,baseScale=1,task=null,renderVersion=0,loadingVersion=0,scrollPosition={top:0,left:0};
 async function render(){
  if(!doc)return;const version=++renderVersion;task?.cancel();
  try{
   if(task)await task.promise.catch(()=>{});
   const page=await doc.getPage(pageNumber);if(version!==renderVersion)return;
   const viewport=page.getViewport({scale:baseScale*zoom}),ratio=Math.min(window.devicePixelRatio||1,2,Math.sqrt(16000000/(viewport.width*viewport.height)));
   canvas.width=Math.ceil(viewport.width*ratio);canvas.height=Math.ceil(viewport.height*ratio);canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';canvas.setAttribute('aria-label',`Workshop slide ${pageNumber} of ${doc.numPages}`);
   $('pdf-page').value=String(pageNumber);$('pdf-page').max=String(doc.numPages);$('pdf-total').textContent='of '+doc.numPages;$('pdf-zoom').textContent=Math.round(zoom*100)+'%';$('pdf-previous').disabled=pageNumber===1;$('pdf-next').disabled=pageNumber===doc.numPages;
   task=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0]});await task.promise;
   if(version===renderVersion){canvas.dataset.page=String(pageNumber);canvas.dataset.zoom=String(zoom);status.textContent='';}
  }catch(error){if(error?.name!=='RenderingCancelledException'&&version===renderVersion)status.textContent='This slide could not be displayed. Use “Open PDF separately”.';}
 }
 function go(value){if(!doc)return;pageNumber=Math.max(1,Math.min(doc.numPages,Number(value)||1));scrollPosition={top:0,left:0};scroll.scrollTop=0;scroll.scrollLeft=0;void render();}
 $('pdf-previous').addEventListener('click',()=>go(pageNumber-1));$('pdf-next').addEventListener('click',()=>go(pageNumber+1));$('pdf-page').addEventListener('change',()=>go($('pdf-page').value));
 $('pdf-zoom-out').addEventListener('click',()=>{zoom=Math.max(.5,Math.round((zoom-.25)*100)/100);void render();});$('pdf-zoom-in').addEventListener('click',()=>{zoom=Math.min(3,Math.round((zoom+.25)*100)/100);void render();});
 $('pdf-fit').addEventListener('click',async()=>{if(!doc)return;const page=await doc.getPage(pageNumber);baseScale=Math.max(240,scroll.clientWidth-24)/page.getViewport({scale:1}).width;zoom=1;void render();});
 async function openFile(file){
  if(!file)return;
  if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')){status.textContent='Please choose a PDF export of your slides.';return;}
  const version=++loadingVersion;status.textContent='Opening slides…';
  if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(file);$('pdf-fallback').href=blobUrl;$('pdf-fallback').hidden=false;
  try{
   const pdfjs=await import('/assets/vendor/pdfjs/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/assets/vendor/pdfjs/pdf.worker.mjs';
   const loaded=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),cMapUrl:'/assets/vendor/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/assets/vendor/pdfjs/standard_fonts/',wasmUrl:'/assets/vendor/pdfjs/wasm/',isEvalSupported:false}).promise;
   if(version!==loadingVersion){await loaded.destroy();return;}
   task?.cancel();if(task)await task.promise.catch(()=>{});if(doc)await doc.destroy();doc=loaded;pageNumber=1;zoom=1;scrollPosition={top:0,left:0};$('slide-empty').hidden=true;$('pdf-viewer').hidden=false;$('slide-settings').open=false;
   const first=await doc.getPage(1);baseScale=Math.max(240,scroll.clientWidth-24)/first.getViewport({scale:1}).width;await render();
  }catch{if(version===loadingVersion)status.textContent='This PDF could not be opened here. Use “Open PDF separately” or choose an unprotected PDF.';}
 }
 $('slide-file').addEventListener('change',event=>{void openFile(event.target.files?.[0]);});
 const defaultPdf=$('slide-file').dataset.defaultPdf;
 if(defaultPdf)void (async()=>{try{const response=await fetch(defaultPdf,{credentials:'same-origin'});if(!response.ok||!response.headers.get('content-type')?.includes('application/pdf'))throw Error();const blob=await response.blob();if(!$('slide-file').files?.length)await openFile(new File([blob],'OneWe Reach workshop slides.pdf',{type:'application/pdf'}));}catch{if(!doc&&!$('slide-file').files?.length)status.textContent='Workshop slides could not load. Choose your PDF from this device.';}})();
 document.addEventListener('owr:before-panel-change',()=>{if(!document.querySelector('[data-section="slides"]').hidden)scrollPosition={top:scroll.scrollTop,left:scroll.scrollLeft};});
 document.addEventListener('owr:panel-change',event=>{if(event.detail==='slides')requestAnimationFrame(()=>{scroll.scrollTop=scrollPosition.top;scroll.scrollLeft=scrollPosition.left;});});
 scroll.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();go(pageNumber+1);}if(event.key==='ArrowLeft'){event.preventDefault();go(pageNumber-1);}});
}
