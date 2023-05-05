'use strict';

const Table = require('cli-table');
const c = require("../colors");

const totalDamage = {};
const rogues = {};
const disarms = {};
let supressionRoom = 0;

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
      let result = { printPretty: false };
      if (event.event === "SPELL_CAST_SUCCESS" && event.spell && ["Sinister Strike", "Backstab"].indexOf(event.spell.name) != -1)
         rogues[event.source.name] = true;
      if (supressionRoom === 0 && event.target && event.target.name && event.target.name.indexOf('Whelp') != -1)
         supressionRoom = 1;
      if (currentEncounter && currentEncounter.encounterName === "Broodlord Lashlayer")
         supressionRoom = 2;
      if (supressionRoom === 1 && event.event === "SPELL_CAST_START" && event.spell && event.spell.name === "Disarm Trap")
         disarms[event.source.name] = (disarms[event.source.name] || 0) + 1;
      if (event.amount > 0 && ['SWING_DAMAGE_LANDED', 'SPELL_DAMAGE'].indexOf(event.event) !== -1 && event.source && event.target &&
         rogues[event.source.name] && supressionRoom === 1) { // mobsToCheck.indexOf(event.target.name) !== -1
         result.printPretty = true;
         totalDamage[event.source.name] = (totalDamage[event.source.name] || 0) + event.amount;
      }
      return result;
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      var table = new Table({
         head: ['Player', 'Supression Room Dmg', 'Traps Disarmed'],
      });

      let rows = [];
      for (let name in rogues) {
         rows.push([name, totalDamage[name] || 0, disarms[name] || 0]);
      }
      rows = rows.sort((a, b) => b[2] - a[2]);
      rows.forEach(row => table.push(row));
      console.log(table.toString());
   },
}
