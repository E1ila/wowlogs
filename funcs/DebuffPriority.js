'use strict';

const MAX_DEBUFF_SLOTS = 16;

let maxDebuffsFound = 0;

function indexOfBuff(buffs, buffName) {
   for (let i = 0 ; i < buffs.length ; i++) {
      if (buffs[i].name === buffName)
         return i;
   }
   return -1;
}

/**
 * Finds diff between two arrays
 * @param arr1
 * @param arr2
 * @returns {added: any[], removed: any[]}
 */
function findDiff(arr1, arr2) {
   let _arr2 = [].concat(arr2);
   const removed = [];
   let oldIndex = 0;
   for (let item of arr1) {
      let pos2 = indexOfBuff(_arr2, item.name);
      if (pos2 !== -1)
         _arr2.splice(pos2, 1);
      else
         removed.push({name: item, index: oldIndex});
      oldIndex++;
   }
   return {added: _arr2, removed}
}


function formatDiff(diff) {
   if (!diff)
      return ``;
   return `added:${JSON.stringify(diff.added.map(o => o.name))} removed:${JSON.stringify(diff.removed.map(o => o.name))} pushed:${JSON.stringify((diff.pushed || []).map(o => o.name))}`
}

function formatPushed(diff) {
   if (!diff)
      return ``;
   let st = `${diff.added[0].name} --->| ${diff.pushed[0].name} ${diff.pushed[0].stacks ? '('+diff.pushed[0].stacks+')' : ''}`
   if (diff.removed.length)
      st += ` !! diff has removed buffs ${JSON.stringify(diff.removed)}`;
   if (diff.added.length > 1)
      st += ` !! diff has more than one added buffs ${JSON.stringify(diff.added)}`;
   if (diff.pushed.length > 1)
      st += ` !! diff has more than one pushed buffs ${JSON.stringify(diff.pushed)}`;
   return st;
}

module.exports = {
   /**
    * Finds which debuffs were pushed out due to max slot limitation.
    * @param log sender obj
    * @param options sent in CLI
    * @param lineNumber of processed event
    * @param event object
    */
   processEvent: function (log, options, lineNumber, event) {
      if (!log._pushedBuffs) {
         log._pushedBuffs = {
            debuffs: {},
            debuffLog: {},
            ignore: {},
            maxDebuffs: {},
         }
      }
      if (!event.target) 
         return;
      const mobGuid = event.target.guid;
      if (!mobGuid.startsWith('Creature') || log._pushedBuffs.ignore[mobGuid])
         return;

      const doIfBuffFound = (buffIndex, action) => {
         if (buffIndex === -1) {
            console.error(`Couldn't find buff ${event.spell.name} in mob's ${event.target.name} debuffs`);
            log._pushedBuffs.ignore[mobGuid] = 1;
         } else
            action();
      }

      if (!log._pushedBuffs.debuffs[mobGuid]) {
         log._pushedBuffs.debuffs[mobGuid] = [];
         log._pushedBuffs.debuffLog[mobGuid] = [];
         log._pushedBuffs.maxDebuffs[mobGuid] = 0;
         if (!log.report.count)
            log.report.count = {};
      }

      if (event.target.name === 'Viscidus')
         return log._pushedBuffs.ignore[mobGuid] = 1;

      const mobBuffs = log._pushedBuffs.debuffs[mobGuid];

      if (event.event === 'UNIT_DIED') {
         const pushedBuffs = log._pushedBuffs.debuffLog[mobGuid].filter(row => row.length > 2 && row[row.length - 1] && row[row.length - 1].pushed);
         const mobMaxDebuffs = log._pushedBuffs.maxDebuffs[mobGuid];
         if (mobMaxDebuffs > 16)
            console.log(` >> ${event.target.name} max ${mobMaxDebuffs} debuffs`);
         if (pushedBuffs.length) {
            if (options['verbose']) {
               // print debuff log with pushed timestamp
               let maxSlotBuffs = log._pushedBuffs.debuffLog[mobGuid].filter(row => row.length - 2 >= MAX_DEBUFF_SLOTS - 1); // it includes timestamp and diff, so +2
               if (maxSlotBuffs.length) {
                  const timestamps = maxSlotBuffs.map(row => row[0]);
                  const changesWithinMaxSlotsTimestamps = log._pushedBuffs.debuffLog[mobGuid].filter(row => timestamps.indexOf(row[0]) !== -1);
                  if (changesWithinMaxSlotsTimestamps.length > 1)
                     console.log(` ** ${mobGuid} ${event.target.name} #${lineNumber}\n${changesWithinMaxSlotsTimestamps.map(row => `${row[0]}  ${row.length - 2}  ${formatDiff(row[row.length - 1])}`).join("\n")}`);
               }
            } else
               console.log(` ** ${mobGuid} ${event.target.name} #${lineNumber}\n${pushedBuffs.map(row => `${row[0]}  ${row.length - 2}  ${formatPushed(row[row.length - 1])}`).join("\n")}`);

            for (let row of pushedBuffs) {
               const diff = row[row.length - 1];
               const pushedDebuff = `${diff.pushed[0].name}${diff.pushed[0].stacks ? ' ('+diff.pushed[0].stacks+')' : ''},${diff.added[0].name}`;
               log.report.count[pushedDebuff] = (log.report.count[pushedDebuff] || 0) + 1;
            }
         }
         if (mobBuffs) {
            delete log._pushedBuffs.debuffs[mobGuid];
            delete log._pushedBuffs.debuffLog[mobGuid];
            delete log._pushedBuffs.maxDebuffs[mobGuid];
         }
         // for (let buffName of Object.keys(mobBuffs)) {
         //    if (mobBuffs[buffName] && ALLOWED_DEATH_SPELLS.indexOf(buffName) === -1)
         //       console.log('mob died with buffs');
         // }
      } else {
         // debuff added / removed
         if (event.auraType !== "DEBUFF")
            return;

         const buffIndex = indexOfBuff(mobBuffs, event.spell.name);
         if (event.event.endsWith('_DOSE')) {
            doIfBuffFound(buffIndex, () => {
               mobBuffs[buffIndex].stacks = event.stacks;
            });
         }
         else if (event.event === 'SPELL_AURA_APPLIED') {
            mobBuffs.push({name: event.spell.name, source: event.source.name, target: event.target.name});
            if (mobBuffs.length > MAX_DEBUFF_SLOTS + 1)
               // probably wiped and pulled again
               return log._pushedBuffs.ignore[mobGuid] = 1;
            if (mobBuffs.length > maxDebuffsFound)
               maxDebuffsFound = mobBuffs.length;
            if (mobBuffs.length > (log._pushedBuffs.maxDebuffs[mobGuid] || 0))
               log._pushedBuffs.maxDebuffs[mobGuid] = mobBuffs.length;
         }
         else if (event.event === 'SPELL_AURA_REMOVED') {
            // removed
            doIfBuffFound(buffIndex, () => {
               const removedBuff = mobBuffs.splice(buffIndex, 1);
               // if (removedBuff.name === "Winter's Chill")
                  // console.log('123');
            });
         }

         const mobDeuffLog = log._pushedBuffs.debuffLog[mobGuid];
         let currBuffs = [event.dateStr].concat(mobBuffs);
         if (mobDeuffLog.length && mobDeuffLog[mobDeuffLog.length - 1].length > 1) {
            const prevBuffs = mobDeuffLog[mobDeuffLog.length - 1];
            const arr1 = prevBuffs.slice(1, prevBuffs.length - 1);
            const diff = findDiff(arr1, mobBuffs)
            // curr 16 slots and same ts as prev
            if (mobBuffs.length === MAX_DEBUFF_SLOTS && currBuffs[0] === prevBuffs[0] && prevBuffs[prevBuffs.length - 1].removed.length)
               diff.pushed = prevBuffs[prevBuffs.length - 1].removed.map(o => o.name);
            currBuffs.push(diff);
         } else
            currBuffs.push(null);
         mobDeuffLog.push(currBuffs);
      }
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
      console.log(` • Max debuffs found: ${maxDebuffsFound}`);
      maxDebuffsFound = 0;
   },

   finishReport: function (report, options) {
      // all files finished, print result
      console.log(`Debuff,Pushed Off By,Number`);
      const debuffs = Object.keys(report.count).map(key => [key, report.count[key]]).sort((a, b) => b[1] - a[1]);
      console.log(debuffs.map(row => `${row[0]},${row[1]}`).join("\n"));
   },
}
