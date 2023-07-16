'use strict';

const Table = require('cli-table');
const c = require("../colors");

const Totems = {
   10614: "Windfury R3",
   10613: "Windfury R2",
   8512: "Windfury R1",
   25361: "Strength R5",
   10442: "Strength R4",
   8161: "Strength R3",
   8160: "Strength R2",
   8075: "Strength R1",
   25359: "Grace of Air R3",
   10627: "Grace of Air R2",
   8835: "Grace of Air R1",
   10497: "Mana R4",
   10496: "Mana R3",
   10495: "Mana R2",
   5675: "Mana R1",
   10601: "NR R3",
   10600: "NR R2",
   10595: "NR R1",
   10538: "FR R3",
   10537: "FR R2",
   8184: "FR R1",
   25908: "Tranquil Air",
   8177: "Grounding",
   10479: "FrR R3",
   10478: "FrR R2",
   8181: "FrR R1",
};
const totalTotems = {};

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
      if (event.event === "SPELL_CAST_SUCCESS" && event.source && event.spell && Totems[event.spell.id]) {
         // result.printPretty = true;
         if (!totalTotems[event.source.name])
            totalTotems[event.source.name] = {};
         totalTotems[event.source.name][event.spell.id] = (totalTotems[event.source.name][event.spell.id] || 0) + 1;
      }
      return result;
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      for (let totemId of Object.keys(Totems)) {
         let used = false;
         for (let name in totalTotems) {
            const playerTotems = totalTotems[name];
            if (playerTotems[totemId] > 0) {
               used = true;
               break;
            }
         }
         if (!used) 
            delete Totems[totemId];
      }

      var table = new Table({
         head: ['Player'].concat(Object.keys(Totems).map(totemId => Totems[totemId].replace(/ Totem/g, ""))).concat(['Total']),
      });

      let rows = [];
      for (let name in totalTotems) {
         const playerTotems = totalTotems[name];
         let row = [name];
         let total = 0;
         for (let totemId of Object.keys(Totems)) {
            row.push(playerTotems[totemId] || 0);
            total += (playerTotems[totemId] || 0);
         }
         row.push(total);
         rows.push(row);
      }
      rows = rows.sort((a, b) => b[1] - a[1]);
      rows.forEach(row => table.push(row));
      console.log(table.toString());
   },
}
