import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMatches, teamForm, sourceUrl, statusOf, fetchFootball } from '../lib/football.ts';
const row=(date,team1='A',team2='B',ft=[1,0])=>({date,team1,team2,score:{ft}});
test('scores nuls, futurs, dates invalides et doublons',()=>{
 const data={matches:[row('2026-08-01','A','B',[0,0]),row('2026-08-01','A','B',[0,0]),row('2026-08-02','B','A',null),row('2026-02-31'),row('2027-01-01','A','C',[2,1])]};
 const result=normalizeMatches(data,'2026-27','fr.1','2026-09-04');
 assert.equal(result.matches.length,3);assert.equal(result.skipped,2);assert.deepEqual(result.matches[0].score,[0,0]);assert.equal(result.matches[1].score,null);assert.equal(result.matches[2].score,null);
 assert.equal(statusOf(result.matches[1],'2026-09-04'),'unknown');
});
test('la forme exclut le match sélectionné et les résultats ultérieurs',()=>{
 const data=normalizeMatches({matches:[row('2026-08-01','A','B',[2,0]),row('2026-08-03','C','A',[1,1]),row('2026-08-05','A','D',[0,4]),row('2026-08-08','E','A',[0,5])]},'2026-27','fr.1','2026-09-04');
 const result=teamForm(data.matches,'A','2026-08-05');assert.deepEqual(result.form,['V','N']);assert.equal(result.goalsFor,3);assert.equal(result.goalsAgainst,1);assert.equal(result.cleanSheets,1);assert.equal(result.count,2);
});
test('un report conserve l’identifiant et les filtres bloquent les URLs arbitraires',()=>{
 const a=normalizeMatches({matches:[row('2026-08-01')]},'2026-27','fr.1');const b=normalizeMatches({matches:[row('2026-08-02')]},'2026-27','fr.1');assert.equal(a.matches[0].id,b.matches[0].id);
 assert.throws(()=>sourceUrl('../secret','fr.1'));assert.throws(()=>sourceUrl('2026-27','https://evil.example'));assert.throws(()=>normalizeMatches({matches:[]},'2026-27','fr.1'));
});
test('une équipe sans historique ne reçoit pas de statistiques inventées',()=>{assert.deepEqual(teamForm([],'A','2026-01-01').form,[]);assert.equal(teamForm([],'A','2026-01-01').count,0);});
test('une source indisponible est signalée sans inventer sa couverture',async()=>{
 const original=globalThis.fetch;
 try{globalThis.fetch=async url=>String(url).endsWith('fr.1.json')?new Response('',{status:404}):Response.json({matches:[row('2026-08-01')]});
 const data=await fetchFootball('2026-27');assert.equal(data.sources.length,4);assert.equal(data.errors.length,1);assert.equal(data.matches.length,4);assert.match(data.errors[0],/Ligue 1/);
 }finally{globalThis.fetch=original;}
});
test('une panne totale reste une erreur, sans retour aux données fictives',async()=>{
 const original=globalThis.fetch;try{globalThis.fetch=async()=>new Response('',{status:503});await assert.rejects(fetchFootball('2026-27'),/Aucune donnée accessible/);}finally{globalThis.fetch=original;}
});
