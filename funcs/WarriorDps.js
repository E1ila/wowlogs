'use strict';

const Table = require('cli-table');

const c = require("../colors");

const firstHit = {};     // player -> mob -> time
const engagedMobs = {}; // warrior -> {mob guid:time}
const warriorNames = {};
const SunderArmorSpellId = 11597;
const HeroicStrikeSpellId = {25286: true, 11567: true};
const FlurrySpellId = {
   12970: 5,
   12969: 4,
   12968: 3,
   12967: 2,
   12966: 1,
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
      if (event.source && event.target) {
         const sourceIsPlayer = event.source.guid.indexOf('Player-') === 0;
         if (sourceIsPlayer && !warriorNames[event.source.guid] && ['SPELL_CAST_SUCCESS', 'SPELL_MISSED'].indexOf(event.event) !== -1 && HeroicStrikeSpellId[event.spell.id]) 
            warriorNames[event.source.guid] = event.source.name;

         const targetIsCreature = event.target.guid.indexOf('Creature-') === 0;
         if (sourceIsPlayer && targetIsCreature) {
            if (!engagedMobs[event.source.name])
               engagedMobs[event.source.name] = {};
            engagedMobs[event.source.name][event.target.guid] = {
               mob: event.target.name,
               t: event.time,
            } 
         }
      }
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      report.avgTimeToSunder = {};

      var table = new Table({
         head: ['Sunders', 'Seconds', 'Player'],
      });

      let rows = [];
      for (let warriorName of Object.values(warriorNames)) {
         let playerTimeToSunder = timeToSunder[warriorName] || [];
         playerTimeToSunder = playerTimeToSunder.sort((a, b) => a - b);
         let medianTime = 0;
         if (playerTimeToSunder.length == 1)
            medianTime = playerTimeToSunder[0];
         else if (playerTimeToSunder.length > 1)
            medianTime = playerTimeToSunder[Math.trunc(playerTimeToSunder.length / 2)];
         report.avgTimeToSunder[warriorName] = Math.trunc(medianTime) / 1000;
         rows.push([playerTimeToSunder.length || 0, playerTimeToSunder.length ? report.avgTimeToSunder[warriorName] : '--', warriorName]);
      }
      rows = rows.sort((a, b) => b[0] - a[0]);
      rows.forEach(row => table.push(row));
      console.log(table.toString());
   },
}
