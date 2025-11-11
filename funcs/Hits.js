'use strict';

const Table = require('cli-table');
const c = require("../colors");

const playerStats = {};

function getOrCreatePlayerStats(playerName) {
   if (!playerStats[playerName]) {
      playerStats[playerName] = {
         hits: 0,
         misses: 0,
         dodges: 0,
         parries: 0,
         totalSwingDamage: 0,
         totalSpellDamage: 0,
         spellDamageCount: 0,
      };
   }
   return playerStats[playerName];
}

module.exports = {
   processEvent: function (log, options, lineNumber, event, lastEvent, currentEncounter) {
      const sourceIsPlayer = event.source && event.source.guid.indexOf('Player-') === 0;

      if (!sourceIsPlayer) {
         return;
      }

      const stats = getOrCreatePlayerStats(event.source.name);

      if (event.event === 'SWING_DAMAGE') {
         stats.hits++;
         if (event.amount !== undefined) {
            stats.totalSwingDamage += event.amount;
         }
      } else if (event.event === 'SWING_MISSED') {
         if (event.missType === 'MISS') {
            stats.misses++;
         } else if (event.missType === 'DODGE') {
            stats.dodges++;
         } else if (event.missType === 'PARRY') {
            stats.parries++;
         }
      } else if (event.event === 'SPELL_DAMAGE') {
         if (event.amount !== undefined) {
            stats.totalSpellDamage += event.amount;
            stats.spellDamageCount++;
         }
      }
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      const table = new Table({
         head: ['Player', 'Total', 'Hits', 'Miss %', 'Dodge %', 'Parry %', 'Avg Swing', 'Avg Spell'],
      });

      const rows = [];

      for (const playerName in playerStats) {
         const stats = playerStats[playerName];
         const total = stats.hits + stats.misses + stats.dodges + stats.parries;

         if (total === 0) {
            continue;
         }

         const missPercent = ((stats.misses / total) * 100).toFixed(1);
         const dodgePercent = ((stats.dodges / total) * 100).toFixed(1);
         const parryPercent = ((stats.parries / total) * 100).toFixed(1);
         const avgSwingDamage = stats.hits > 0
            ? Math.round(stats.totalSwingDamage / stats.hits)
            : 0;
         const avgSpellDamage = stats.spellDamageCount > 0
            ? Math.round(stats.totalSpellDamage / stats.spellDamageCount)
            : 0;

         rows.push([
            playerName,
            total,
            stats.hits,
            `${missPercent}%`,
            `${dodgePercent}%`,
            `${parryPercent}%`,
            avgSwingDamage || '--',
            avgSpellDamage || '--',
         ]);
      }

      rows.sort((a, b) => b[1] - a[1]);
      rows.forEach(row => table.push(row));
      console.log(table.toString());
   },
};
