'use strict';

const Table = require('cli-table');
const c = require("../colors");

const SpellsToTrack = {
   21568: 'Prayer of Fortitude R1',
   21564: 'Prayer of Fortitude R2',
   10938: 'PW: Fortitude R6',
   10937: 'PW: Fortitude R5',
   2791: 'PW: Fortitude R4',
   1245: 'PW: Fortitude R3',
   1244: 'PW: Fortitude R2',
   1243: 'PW: Fortitude R1',
};
const totals = {};

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
      // if (event.event === 'SPELL_CAST_START' && event.source)
      //    eligable[event.source.name] = true;
      if (event.event === 'SPELL_CAST_SUCCESS' && event.source && event.target && event.spell && SpellsToTrack[event.spell.id]) { //  && eligable[event.source.name]
         // result.printPretty = true;
         const spellName = SpellsToTrack[event.spell.id];
         if (!spellName)
            console.error(`Missing spell name for ${event.spell}`);
         if (!totals[event.source.name])
            totals[event.source.name] = {};
         totals[event.source.name][spellName] = (totals[event.source.name][spellName] || 0) + 1;
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
