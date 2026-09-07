import { fetchFootball, teamForm } from '../lib/football.ts';
const feed=await fetchFootball('2026-27');
if(feed.sources.length!==5)throw new Error(feed.errors.join('\n'));
const scored=feed.matches.filter(m=>m.score);
if(!scored.length)throw new Error('Aucun score publié disponible.');
const sample=scored.sort((a,b)=>b.date.localeCompare(a.date)).find(m=>m.home.includes('Paris Saint-Germain'))??scored[0];
const stats=teamForm(feed.matches.filter(m=>m.code===sample.code),sample.home,sample.date);
console.log(JSON.stringify({sources:feed.sources.map(s=>({league:s.league,count:s.count,skipped:s.skipped})),matches:feed.matches.length,results:scored.length,sample,priorMatches:stats.count},null,2));
