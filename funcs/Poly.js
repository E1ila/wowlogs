'use strict';

const Table = require('cli-table');

const c = require("../colors");

const firstHit = {};     // player -> mob -> time
const timeToPoly = {}; // player -> [seconds]
const underMindControl = {};
const mageNames = {}
const polyStart = {}

const MindControlSpells = [
   785,   // AQ40  True Fulfillment
   26079, // AQ40  Cause Insanity
   24178, // ZG Will of Hakkar
   14515, // BWL Dominate Mind
   22667, // BWL Shadow Command
   28410, // Chains of Kel'Thuzad
];

const PolymorphSpellIds = {
   118: "Polymorph", // R4
   12824: "Polymorph", // R2
   12825: "Polymorph", // R3
   12826: "Polymorph", // R4
   28272: "Polymorph", // pig
   28271: "Polymorph", // turtle
   28270: "Polymorph: Cow" // cow
}

const MageSpells = {
   116: 1, // frostbolt
   25304: 1, 
   837: 1,
   7322: 1,
   205: 1,
   8406: 1,
   10181: 1,
   8408: 1,
   10180: 1,
   10179: 1,
   8407: 1,
   133: 1, // fireball
   8400: 1,
   25306: 1,
   145: 1,
   3140: 1,
   143: 1,
   10151: 1,
   10148: 1,
   8402: 1,
   8401: 1,
   10149: 1,
   10150: 1,
}

module.exports = {
   /**
    * Finds what spells triggers an aura.
    * @param log sender obj
    * @param options sent in CLI
    * @param lineNumber of processed event
    * @param event object
    * @param lastEvent object
    */
   processEvent: function (log, options, lineNumber, event, lastEvent) {
      const sourceIsPlayer = event.source && event.source.guid.indexOf('Player-') === 0;

      if (event.event == 'SPELL_CAST_START' && event.source && event.spell && MageSpells[event.spell.id]) 
         mageNames[event.source.guid] = event.source.name;

      if (event.event == 'SPELL_AURA_APPLIED' && event.target && event.target.guid.indexOf('Player-') === 0 && event.spell && MindControlSpells.indexOf(event.spell.id) != -1) {
         underMindControl[event.target.guid] = +event.date;
         // console.log(`${c.grayDark}${(''+lineNumber).padStart(10)}   ${event.dateStr} ${`  ${c.grayDark}${event.event}`.padEnd(40)} ${c.cyan}+++ ${c.white}${event.source.name}${c.gray} applies ${c.orange}${event.spell.name} on ${c.white}${event.target.name}${c.off}`);
      }

      if (event.event == 'SPELL_CAST_START' && event.spell && PolymorphSpellIds[event.spell.id] && event.source) 
         polyStart[event.source.name] = +event.date;

      if (['SPELL_CAST_SUCCESS', 'SPELL_MISSED'].indexOf(event.event) != -1 && event.spell && PolymorphSpellIds[event.spell.id] && event.source && event.target && event.source.guid.indexOf('Player-') === 0) { // mobsToCheck.indexOf(event.target.name) !== -1
         let mcTime = underMindControl[event.target.guid];
         if (mcTime === undefined) {
            console.error(`Unknown MC time, line ${lineNumber}`);
         } else {
            let playerTime = timeToPoly[event.source.name];
            if (!playerTime) {
               playerTime = [];
               timeToPoly[event.source.name] = playerTime;
            }
            const castStart = polyStart[event.source.name];
            if (+event.date - castStart > 4000)
               console.error(`Poly cast time too long! castStart=${castStart} delta=${+event.date - castStart} lineNumber=${lineNumber}`);
            else 
               playerTime.push(castStart - mcTime);
         }
      }
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      report.medianTimeToPoly = {};

      var table = new Table({
         head: ['Polymorphs', 'Seconds', 'Player'],
      });

      let rows = [];
      for (let mageName of Object.values(mageNames)) {
         let playerTimeToPoly = timeToPoly[mageName] || [];
         playerTimeToPoly = playerTimeToPoly.sort((a, b) => a - b);
         let medianTime = 0;
         if (playerTimeToPoly.length == 1)
            medianTime = playerTimeToPoly[0];
         else if (playerTimeToPoly.length > 1)
            medianTime = playerTimeToPoly[Math.trunc(playerTimeToPoly.length / 2)];
         report.medianTimeToPoly[mageName] = Math.trunc(medianTime) / 1000;
         rows.push([playerTimeToPoly.length || 0, playerTimeToPoly.length ? report.medianTimeToPoly[mageName] : '--', mageName]);
      }
      rows = rows.sort((a, b) => b[0] - a[0]);
      rows.forEach(row => table.push(row));
      console.log(table.toString());
   },
}
