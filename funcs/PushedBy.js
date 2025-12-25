'use strict';

module.exports = {
   /**
    * Finds which debuffs were pushed out due to max slot limitation.
    * @param log sender obj
    * @param options sent in CLI
    * @param lineNumber of processed event
    * @param event object
    */
   processEvent: function (log, options, lineNumber, event) {
      if (!log._pushedBy) {
         log._pushedBy = {
            eventsByTimestamp: {},
            debuffs: [],
         }
      }

      if (!event.target || event.auraType !== "DEBUFF")
         return;

      const targetGuid = event.target.guid;
      const mobBuffs = log._pushedBy.debuffs;

      if (event.event === 'SPELL_AURA_APPLIED') {
         mobBuffs.push({name: event.spell.name});
      } else if (event.event === 'SPELL_AURA_REMOVED') {
         const buffIndex = mobBuffs.findIndex(b => b.name === event.spell.name);
         if (buffIndex !== -1) {
            mobBuffs.splice(buffIndex, 1);
         }
      }

      if (event.event === 'SPELL_AURA_APPLIED' || event.event === 'SPELL_AURA_REMOVED') {
         const timestamp = event.dateStr;
         const key = `${timestamp}_${targetGuid}`;

         if (!log._pushedBy.eventsByTimestamp[key]) {
            log._pushedBy.eventsByTimestamp[key] = {
               applied: [],
               removed: [],
               timestamp: timestamp,
               target: event.target.name,
               targetGuid: targetGuid,
            };
         }

         const data = log._pushedBy.eventsByTimestamp[key];

         if (event.event === 'SPELL_AURA_APPLIED') {
            data.applied.push({
               spell: event.spell.name,
               source: event.source.name,
            });
         } else {
            data.removed.push({
               spell: event.spell.name,
               source: event.source.name,
            });
         }

         if (data.applied.length > 0 && data.removed.length > 0) {
            const actualCount = mobBuffs.length + data.removed.length;
            const activeDebuffs = mobBuffs.map(b => b.name).join(', ');
            for (let applied of data.applied) {
               for (let removed of data.removed) {
                  console.log(`${data.timestamp}  ${actualCount}  ${applied.spell} (${applied.source}) --->| ${removed.spell} (${removed.source})`);
                  console.log(`    Active: ${activeDebuffs}`);
               }
            }
            delete log._pushedBy.eventsByTimestamp[key];
         }
      }
   },

   finishFile: function (log, options) {
      if (!log._pushedBy)
         return;

      const timestamps = Object.keys(log._pushedBy.eventsByTimestamp);

      for (let key of timestamps) {
         const data = log._pushedBy.eventsByTimestamp[key];

         if (data.applied.length > 0 && data.removed.length > 0) {
            for (let applied of data.applied) {
               for (let removed of data.removed) {
                  console.log(`  ${applied.spell} (${applied.source}) --->| ${removed.spell} (${removed.source})`);
               }
            }
         }
      }

      delete log._pushedBy;
   },

   finishReport: function (report, options) {
   },
}
