'use strict';

const TrackedSpells = {
   'Multi-Shot': 1,
   'Chain Lightning': 1,
   // 'Blizzard': 1,
   // 'Flamestrike': 1,
}

let stampAttacks = [];
let stamp = 0;

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
      let result = {printPretty: false};

      // reset when time changes
      if (+event.date != stamp) {
         stamp = +event.date;
         stampAttacks = [];
      }

      const sourceIsPlayer = event.source && event.source.guid.indexOf('Player-') === 0;
      const targetIsMob = event.target && event.target.guid.indexOf('Player-') === -1;

      // need to check if it's the first attack on that mob GUID
      if (targetIsMob && sourceIsPlayer && ['SPELL_DAMAGE', 'SPELL_MISSED'].indexOf(event.event) !== -1 && event.spell && TrackedSpells[event.spell.name]) {
         for (let i = 0; i < stampAttacks.length; i++) {
            const item = stampAttacks[i];
            if (item.source.guid === event.source.guid) {
               result.printPretty = true;
               if (stampAttacks.length === 1)
                  log.printPretty('--', item);
               break;
            }
         }
         stampAttacks.push(event);
      }
      return result;
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
   },
}
