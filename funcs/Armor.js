'use strict';

const Table = require('cli-table');

const c = require("../colors");

let encounterStart = 0;
const sundersById = {};
const hitsDB = {};
const creatureCount = {};

function set(table, value, ...params) {
   if (!params.length)
      return;

   const next = params.shift();

   if (!params.length) {
      if (table[next]) {
         table[next].push(value);
      } else {
         table[next] = [value];
      }
   } else {
      if (!table[next])
         table[next] = {};
      set(table[next], value, ...params);
   }
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
   processEvent: function (log, options, lineNumber, event, lastEvent, currentEncounter) {
      const targetIsCreature = event.target && event.target.guid.indexOf('Creature-') === 0;
      const sourceIsPlayer = event.source && event.source.guid.indexOf('Player-') === 0;

      if (targetIsCreature) {
         if (options.params && options.params.length > 0) {
            if (event.target.name !== options.params[0])
               return;
            if (options.params.length > 1 && event.source.name !== options.params[1])
               return;
         }
         if (event.spell && event.spell.name === 'Sunder Armor') {
            if (event.event === 'SPELL_AURA_APPLIED') {
               sundersById[event.target.guid] = 1;
            } else if (event.event === 'SPELL_AURA_APPLIED_DOSE') {
               sundersById[event.target.guid] = event.stacks;
            } else if (event.event === 'SPELL_AURA_REMOVED') {
               sundersById[event.target.guid] = 0;
            }
         }
         if (sourceIsPlayer && event.event === 'SWING_DAMAGE') {
            const sunders = sundersById[event.target.guid] || 0;
            if (!event.glancing && !event.crushing && event.overkill <= 0) {
               let amount = (event.amount - event.baseAmount);
               if (event.critical)
                  amount /= 2;
               set(hitsDB, amount / event.baseAmount * 100, event.target.name, sunders, event.glancing, event.crushing);
            }
         }
      }
      if (targetIsCreature && event.event === 'UNIT_DIED') {
         creatureCount[event.target.name] = (creatureCount[event.target.name] || 0) + 1;
         delete sundersById[event.target.guid];
      }
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      if (options.params.length) {
         console.log(`Damage done to ${c.blue}${options.params[0]}${c.off}${options.params.length > 1 ? ` by ${c.blue}${options.params[1]}` : ''}${c.off}`);
      }
      let table = new Table({
         head: ['Creature', 'Count', 'Sunders', 'Normal', 'Glancing', 'Crushing'],
      });
      let rows = [];
      for (const creatureName in hitsDB) {
         const creatureHits = hitsDB[creatureName];
         for (const sunders in creatureHits) {
            for (const glancing in creatureHits[sunders]) {
               for (const crushing in creatureHits[sunders][glancing]) {
                  const hits = hitsDB[creatureName][sunders][glancing][crushing];
                  const avgHit = Math.round( hits.reduce((prev, curr) => prev + curr, 0) / hits.length ) + '%';
                  rows.push([creatureName, hits.length, sunders, avgHit, glancing, crushing]);
               }
            }
         }
      }
      rows = rows.sort((a, b) => {
         const bb = `${(''+(creatureCount[b[0]] || 0)).padStart(5, '0')} ${b[0]} gl${b[4] ? '1' : '0'} cr${b[5] ? '1' : '0'} s${b[2]}`;
         const aa = `${(''+(creatureCount[a[0]] || 0)).padStart(5, '0')} ${a[0]} gl${a[4] ? '1' : '0'} cr${a[5] ? '1' : '0'} s${a[2]}`;
         return bb.localeCompare(aa);
      });
      rows.forEach(row => table.push(row));

      console.log(table.toString());
   },
}
