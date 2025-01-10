'use strict';

const Table = require('cli-table');
const c = require("../colors");

const totals = {};
// const eligable = {};

let playerDeaths = 0;
let wipe = true;
let players = {};
let fightStart = 0;
let fightEnd = 0;

module.exports = {
   /**
    * Finds what spells triggers an aura.
    * @param log sender obj
    * @param options sent in CLI
    * @param lineNumber of processed event
    * @param event object
    * @param lastEvent object
    * @param currentEncounter object
    */
   processEvent: function (log, options, lineNumber, event, lastEvent, currentEncounter) {
      let result = {printPretty: false};
      // if (event.event === 'SPELL_CAST_START' && event.source)
      //    eligable[event.source.name] = true;
      if (event.event === 'SPELL_DISPEL' && event.source && event.target) { //  && eligable[event.source.name]
         // result.printPretty = true;
         if (!totals[event.source.name])
            totals[event.source.name] = {};
         totals[event.source.name][event.extraSpellName] = (totals[event.source.name][event.extraSpellName] || 0) + 1;
      } 
      else if (event.event === 'UNIT_DIED') {
         if (event.target.guid.indexOf('Player-') === 0) {
            playerDeaths += 1;
            const player = players[event.target.guid];
            if (player)
               player.died = event.date;
            fightEnd = event.date;
         } else if (currentEncounter && event.target.name === currentEncounter.encounterName)
            wipe = false;
      }
      return result;
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      const head = ['Player'];
      let rows = [];
      for (let name in totals) {
         const stats = totals[name];
         let row = [name];
         for (let i = 0; i < head.length - 1; i++)
            row.push(0);
         for (let spellName in stats) {
            let index = head.indexOf(spellName);
            if (index === -1) {
               head.push(spellName);
               row.push(0);
               index = head.length - 1;
            }
            row[index] = stats[spellName];
         }
         rows.push(row);
      }
      rows.forEach(row => {
         // fix number of items
         for (let i = row.length; i < head.length; i++)
            row.push(0);
      });
      var table = new Table({head});
      rows.forEach(row => table.push(row));
      console.log(table.toString());
   },
}
