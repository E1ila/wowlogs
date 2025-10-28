'use strict';

const fs = require("fs");
const path = require("path");

const MEDIAN_FILTER_THRESHOLD = 2.5; // only used if MAX_SWING is 0
const THRASH_PROC_THRESHOLD = 45 / 1000;
const MAX_SWING = 5.2; // timeout for swing
const MAX_VALID_DELTA = 10;
const SAVE_PATH = [__dirname, '..', 'analysis-results', 'boss-swing'];

let lastSwing = 0;
let lastParry = false;
let normalSwingTimes = [];
let parrySwingTimes = [];
let hitsNormal = [];
let hitsCritical = [];
let hitsCrushing = [];
let thrashProc = 0;
// Measures swing timer with and without parries

module.exports = {
   /**
    * Finds what spells triggers an aura.
    * @param log sender obj
    * @param options sent in CLI
    * @param lineNumber of processed event
    * @param event object
    * @param lastEvent object
    */
   processEvent: function (log, options, lineNumber, event, lastEvent, currentEncounter) {
      let result = {printPretty: false};

      const bossSwing = (hit) => {
         if (lastSwing) {
            if (hit) {
               if (event.critical) {
                  hitsCritical.push(event.amount);
               } else if (event.crushing) {
                  hitsCrushing.push(event.amount);
               } else {
                  hitsNormal.push(event.amount);
               }
            }
            let delta = (+event.date - lastSwing) / 1000;
            if (delta < MAX_VALID_DELTA) { 
               if (delta < THRASH_PROC_THRESHOLD && !lastParry) {
                  thrashProc++;
                  result.extraText = `x2`;
                  return;
               }
               result.extraText = `${lastParry ? 'parry ' : ''}swing ${delta}`;
               if (lastParry)
                  parrySwingTimes.push(delta);
               else 
                  normalSwingTimes.push(delta);
            }
            lastParry = false;
         }
         lastSwing = +event.date;
      }

      if (event.event === 'SWING_MISSED') {
         if (event.target && event.target.name === options.params[0] && event.missType === 'PARRY') {
            // parry the boss
            result.printPretty = true;
            lastParry = true;
         } else if (event.source && event.source.name === options.params[0] && ['PARRY', 'DODGE', 'BLOCK', 'MISS'].indexOf(event.missType) !== -1) {
            // boss misses
            result.printPretty = true;
            bossSwing(0);
         }
      }
      else if (event.event === 'SWING_DAMAGE_LANDED' && event.source && event.source.name === options.params[0]) {
         // boss swing
         result.printPretty = true;
         bossSwing(1);
      }
      return result;
   },

   finishFile: function (log, options) {
      lastSwing = 0;
      lastParry = false;
   },

   finishReport: function (report, options) {

      const avg = (list) => {
         const sum = list.reduce((p, c) => p+c, 0);
         return sum / list.length;
      }

      normalSwingTimes = normalSwingTimes.sort((a, b) => a-b);
      parrySwingTimes = parrySwingTimes.sort((a, b) => a-b);

      const savedir = path.join(...SAVE_PATH);
      const savefilebase = options.params[0].replaceAll(' ', '_').replace(/[^a-zA-Z0-9_-]/g, '');
      fs.writeFileSync(path.join(savedir, `${savefilebase}.normalswings`), normalSwingTimes.join('\n'));
      fs.writeFileSync(path.join(savedir, `${savefilebase}.parryswings`), parrySwingTimes.join('\n'));

      let normalMedian = normalSwingTimes[Math.trunc(normalSwingTimes.length/2)];
      let parryMedian = parrySwingTimes[Math.trunc(parrySwingTimes.length/2)];
      // try to filter no hit procs
      let filteredNormalSwingTimes = normalSwingTimes.filter(t => t <= (MAX_SWING || normalMedian * MEDIAN_FILTER_THRESHOLD));
      let filteredParrySwingTimes = parrySwingTimes.filter(t => t <= (MAX_SWING || parryMedian * MEDIAN_FILTER_THRESHOLD));

      let result =
         `Normal swing time average: ${avg(filteredNormalSwingTimes)}\n` +
         `Parry swing time average: ${avg(filteredParrySwingTimes)}\n`;

      let noHits = normalSwingTimes.length - filteredNormalSwingTimes.length + parrySwingTimes.length - filteredParrySwingTimes.length;
      let totalHits = normalSwingTimes.length + parrySwingTimes.length;
      result += `Chance to not swing: ${Math.round(noHits / totalHits * 100)}%\n`;
      result += `Chance to thrash: ${Math.round(thrashProc / totalHits * 100)}%\n`;

      const _totalHits = hitsNormal.length + hitsCritical.length + hitsCrushing.length;
      // if (totalHits != _totalHits)
      //    console.error(`Total hits are different: ${totalHits}  ${_totalHits}`);
      result += `\nTotal encounters: ${Object.values(report.encounters)[0]}\nHits: ${_totalHits}\n`;
      result += `Normal hit avg damage: ${Math.round(avg(hitsNormal))} ${Math.round(hitsNormal.length/_totalHits*100)}%\n`;
      result += `Critical hit avg damage: ${Math.round(avg(hitsCritical))} ${Math.round(hitsCritical.length/_totalHits*100)}%\n`;
      result += `Crushing hit avg damage: ${Math.round(avg(hitsCrushing))} ${Math.round(hitsCrushing.length/_totalHits*100)}%\n`;

      fs.writeFileSync(path.join(savedir, `${savefilebase}.txt`), result);
   },
}
