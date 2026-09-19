import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCompanionLinks } from './render-living-system.mjs';
const data = { applications: [
 {code:'pol',parentApp:'gpu',kind:'tool',address:'https://pol.aserdargun.com/',guidingQuestion:{en:'How do languages differ?',tr:'Diller nasıl farklılaşır?'},summary:{en:'Programming foundations, not limited to GPU.',tr:'GPU ile sınırlı olmayan programlama temelleri.'}},
 {code:'gex',parentApp:'gpu',kind:'lab',address:'https://gex.aserdargun.com/',guidingQuestion:{en:'How do kernels execute?',tr:'Kerneller nasıl yürütülür?'}}
]};
for (const locale of ['en','tr']) test(`GPU companions keep tool and lab labels distinct: ${locale}`,()=>{
 const html=renderCompanionLinks({locale,data,parentCode:'gpu'});
 const blocks=html.match(/<p\b[^>]*>[\s\S]*?<\/p>/g)||[];
 const pol=blocks.find(p=>p.includes('https://pol.aserdargun.com/'))||'';
 const gex=blocks.find(p=>p.includes('https://gex.aserdargun.com/'))||'';
 assert.ok(pol.includes(locale==='en'?'Explore the companion learning tool':'Eşlikçi öğrenme aracını keşfet'));
 assert.ok(pol.includes(data.applications[0].summary[locale]));
 assert.ok(gex.includes(locale==='en'?'Try the companion lab':'Eşlikçi laboratuvarı dene'));
 assert.equal(pol.includes(locale==='en'?'Try the companion lab':'Eşlikçi laboratuvarı dene'),false);
});