'use strict';

const Table = require('cli-table');
const c = require("../colors");

const totalScarabDamage = {};
const engagedScarabs = {};
const healers = {};
const engagersToBlame = {};

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
      if (currentEncounter && currentEncounter.encounterName != 'Twin Emperors')
         return result;
      if (event.amount > 500 && event.eventSuffix == 'HEAL' && event.source && event.source.guid.indexOf('Player-') != -1 && event.target && event.target.guid != event.source.guid) {
         // result.printPretty = true;
         healers[event.source.guid] = event.source.name;
      }
      if (event.amount > 0 && event.eventSuffix == 'DAMAGE' && event.source && event.target && 
          event.target.name === 'Qiraji Scarab' && !engagedScarabs[event.target.guid]) { // mobsToCheck.indexOf(event.target.name) !== -1
         result.printPretty = true;
         engagedScarabs[event.target.guid] = event.source;
      }
      if (event.eventSuffix == 'DAMAGE' && event.source && event.target && event.source.name === 'Qiraji Scarab' && healers[event.target.guid] &&
          (!event.spell || event.spell.name != 'Explode')) {
         result.printPretty = true;
         totalScarabDamage[event.source.guid] = (totalScarabDamage[event.source.guid] || 0) + 1;
         if (engagedScarabs[event.source.guid])
         engagersToBlame[engagedScarabs[event.source.guid].name] = (engagersToBlame[engagedScarabs[event.source.guid].name] || 0) + 1
      }
      return result;
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      console.log(`Healers: ${Object.values(healers).join(', ')}`);
      console.log(`Distinct scarab hitting healers: ${Object.values(totalScarabDamage).length}`);
      console.log(`Total scarab hits to healers: ${Object.values(totalScarabDamage).reduce((prev, curr) => prev + curr, 0)}`);

      // if (Object.keys(underMindControl).length)
      //    console.error(`Still under mind control effect: ${JSON.stringify(underMindControl)}`);

      var table = new Table({
         head: ['Engager', 'Hits Caused'],
      });

      let rows = [];
      for (let name in engagersToBlame) {
         rows.push([name, engagersToBlame[name]]);
      }
      rows = rows.sort((a, b) => b[1] - a[1]);
      rows.forEach(row => table.push(row));
      console.log(table.toString());
   },
}
