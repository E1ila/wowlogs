'use strict';

const Table = require('cli-table');
const c = require("../colors");

const SpellsToTrack = {
   29166: 'Innervate',
   16857: 'FF Feral R1',
   17390: 'FF Feral R2',
   17391: 'FF Feral R3',
   17392: 'FF Feral R4',
   770: 'FF R1',
   778: 'FF R2',
   9749: 'FF R3',
   9907: 'FF R4',
   1126:  'MotW R1',
   5232:  'MotW R2',
   6756:  'MotW R3',
   5234:  'MotW R4',
   8907:  'MotW R5',
   9884:  'MotW R6',
   9885:  'MotW R7',
   21849: 'GotW R1',
   21850: 'GotW R2',
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
      if (event.event === 'SPELL_AURA_APPLIED' && event.source && event.target && event.spell && SpellsToTrack[event.spell.id]) {
         // result.printPretty = true;
         const spellName = SpellsToTrack[event.spell.id];
         if (!spellName)
            console.error(`Missing spell name for ${event.spell}`);
         if (!totals[event.source.name])
            totals[event.source.name] = {'Innervate': []};
         if (spellName === 'Innervate')
            totals[event.source.name][spellName].push(event.target.name);
         else 
            totals[event.source.name][spellName] = (totals[event.source.name][spellName] || 0) + 1;
      }
      return result;
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      const head = ['Player', 'Innervate', 'Innervate Targets'];
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
               if (spellName == 'Innervate')
                  row.push('');
               index = head.length - 1;
            }
            if (spellName === 'Innervate') {
               let innervateTargets = {};
               for (let targetName of stats[spellName])
                  innervateTargets[targetName] = (innervateTargets[targetName] || 0) + 1;
               let str = [];
               for (let targetName in innervateTargets)
                  str.push(`${targetName} x${innervateTargets[targetName]}`);
               row[index] = stats[spellName].length;
               row[index + 1] = str.join(', ');
            } else
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
