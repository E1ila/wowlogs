'use strict';

const Table = require('cli-table');
const c = require("../colors");

const SpellsToIgnore = [
   16806, // Conflagration
   22311, // Brood Power: Bronze
   19594, // Plague Effect
   26557, // Plague Effect
];
const MindControlSpells = [
   785,   // AQ40  True Fulfillment
   26079, // AQ40  Cause Insanity
   24178, // ZG Will of Hakkar
   14515, // BWL Dominate Mind
   22667, // BWL Shadow Command
   28410, // Chains of Kel'Thuzad
];
const CCEffectSpells = [
   4068,  // Iron Grenade
   122,   // Frost Nova R1
   865,   // Frost Nova R2
   6131,  // Frost Nova R3
   10230, // Frost Nova R4
   8056,  // Frost Shock R1
   11286,  // Gouge R5
   19503,  // Scatter shot
   19254,  // Touch of Weakness (not cc, but not his fault)
];
const underMindControl = {};
const totalFriendlyFireDamage = {};

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
      if (event.event == 'SPELL_AURA_APPLIED' && event.target && event.target.guid.indexOf('Player-') === 0 && event.spell && MindControlSpells.indexOf(event.spell.id) != -1) {
         underMindControl[event.target.guid] = event.spell.id;
         console.log(`${c.grayDark}${(''+lineNumber).padStart(10)}   ${event.dateStr} ${`  ${c.grayDark}${event.event}`.padEnd(40)} ${c.cyan}+++ ${c.white}${event.source.name}${c.gray} applies ${c.orange}${event.spell.name} on ${c.white}${event.target.name}${c.off}`);
      }
      if (event.target && underMindControl[event.target.guid] && event.event == 'SPELL_AURA_REMOVED' && event.spell && event.spell.id == underMindControl[event.target.guid]) {
         delete underMindControl[event.target.guid];
         console.log(`${c.grayDark}${(''+lineNumber).padStart(10)}   ${event.dateStr} ${`  ${c.grayDark}${event.event}`.padEnd(40)} ${c.cyan}--- ${c.white}${event.source.name}${c.gray}'s ${c.orange}${event.spell.name} effect removed from ${c.white}${event.target.name}${c.off}`);
      }

      if (event.amount > 0 && ['SWING_DAMAGE_LANDED', 'SPELL_DAMAGE'].indexOf(event.event) !== -1 && event.source && event.target && !underMindControl[event.source.guid] && 
          (!event.spell || CCEffectSpells.indexOf(event.spell.id) == -1) &&
          event.source.guid.indexOf('Player-') === 0 && event.target.guid.indexOf('Player-') === 0) { // mobsToCheck.indexOf(event.target.name) !== -1
         const reflect = event.source.guid == event.target.guid;
         const spellToIgnore = event.spell && SpellsToIgnore.indexOf(event.spell.id) !== -1;
         if (!reflect && !spellToIgnore) {
               result.printPretty = true;
               if (!totalFriendlyFireDamage[event.source.name])
                  totalFriendlyFireDamage[event.source.name] = {amount: 0, hits: 0, abilities: {}, targets: {}};
                  totalFriendlyFireDamage[event.source.name].amount += event.amount;
                  totalFriendlyFireDamage[event.source.name].hits += 1;
                  totalFriendlyFireDamage[event.source.name].targets[event.target.name] = (totalFriendlyFireDamage[event.source.name].targets[event.target.name] || 0) + 1;
                  if (event.event === 'SWING_DAMAGE_LANDED')
                     totalFriendlyFireDamage[event.source.name].abilities['Swing'] += 1;
                  else 
                     totalFriendlyFireDamage[event.source.name].abilities[event.spell.name] += 1;
               }
      }
      return result;
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      if (Object.keys(underMindControl).length)
         console.error(`Still under mind control effect: ${JSON.stringify(underMindControl)}`);

      var table = new Table({
         head: ['Player', 'Total FF', 'Hits', 'Abilities', 'Targets'],
      });

      let rows = [];
      for (let name in totalFriendlyFireDamage) {
         const stats = totalFriendlyFireDamage[name];
         rows.push([name, stats.amount, stats.hits, Object.keys(stats.abilities).join(', '), Object.keys(stats.targets).join(', ')]);
      }
      rows = rows.sort((a, b) => b[1] - a[1]);
      rows.forEach(row => table.push(row));
      console.log(table.toString());
   },
}
