'use strict';

const moment = require('moment');

const MAX_BUFF_SLOTS = 26;
const IGNORED_BUFFS = {
   "Supercharged Chronoboon Displacer": true,
}
const PERSISTS_BUFFS = {
   "Supercharged Chronoboon Displacer": true,
   "Berserker Stance": true,
   "Defensive Stance": true,
   "Distilled Wisdom": true,
   "Supreme Power": true,
   "Flask of the Titans": true,
}
const ALLOW_MULTI_BUFF = {
   "Holy Strength": true,
   "Ascendance": true,
}
const DONT_PRINT = {
   "Ancestral Fortitude": true,
   "Inspiration": true,
}

function parseDate(d) {
   let date = new Date()
   // including a date library for this would be overkill. works.
   try {
      let m = moment(d, 'MM/DD HH:mm:ss:SSS');
      if (+m > +new Date())
         m.subtract(1, 'year');
      return m.toDate();
   } catch (e) {
      throw new Error(`Failed parsing date "${d}": ${e.stack}`);
   }
}

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
   let st = `${diff.added.length ? diff.added[0].name : '??'} --->| ${diff.pushed[0].name} ${diff.pushed[0].stacks ? '('+diff.pushed[0].stacks+')' : ''}`
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
            playerNames: {},
         }
      }
      if (!event.target) 
         return;
      const playerGuid = event.target.guid;
      if (!playerGuid.startsWith('Player-') || log._pushedBuffs.ignore[playerGuid])
         return;
      if (event.spell && IGNORED_BUFFS[event.spell.name])
         return;

      const doIfBuffFound = (buffIndex, action) => {
         if (buffIndex === -1) {
            if (!PERSISTS_BUFFS[event.spell.name])
               console.error(`${event.dateStr} Couldn't find buff ${event.spell.name} in player's ${event.target.name} buffs`);
            // log._pushedBuffs.ignore[playerGuid] = 1;
         } else
            action();
      }

      if (!log._pushedBuffs.debuffs[playerGuid]) {
         log._pushedBuffs.playerNames[playerGuid] = event.target.name;
         log._pushedBuffs.debuffs[playerGuid] = [];
         log._pushedBuffs.debuffLog[playerGuid] = [];
         log._pushedBuffs.maxDebuffs[playerGuid] = 0;
         if (!log.report.count)
            log.report.count = {};
      }

      let playerBuffs = log._pushedBuffs.debuffs[playerGuid];
      let playerBuffLog = log._pushedBuffs.debuffLog[playerGuid];

      if (event.event === 'UNIT_DIED') {
         // reset buffs - we need to detect feign death by counting removed buffs prior to UNIT_DIED
         let removedBuffs = 0, lastBuffCount = playerBuffs.length;
         for (let i = playerBuffLog.length - 1; i >= 0; i--) {
            const itemDate = +parseDate(playerBuffLog[i][0]);
            if (+event.date - itemDate < 100) {
               if (playerBuffLog[i].length - 1 > lastBuffCount) {
                  lastBuffCount = playerBuffLog[i].length - 1;
                  removedBuffs += 1;
               }
            } else 
               break;
         }
         if (playerBuffs.length <= 2 || removedBuffs > 2) {
            log._pushedBuffs.debuffs[playerGuid] = [];
            playerBuffs = log._pushedBuffs.debuffs[playerGuid];
         }
      } else {
         // debuff added / removed
         if (event.auraType !== "BUFF")
            return;

         const buffIndex = indexOfBuff(playerBuffs, event.spell.name);
         if (event.event.endsWith('_DOSE')) {
            doIfBuffFound(buffIndex, () => {
               playerBuffs[buffIndex].stacks = event.stacks;
            });
         }
         else if (event.event === 'SPELL_AURA_APPLIED' && (buffIndex === -1 || ALLOW_MULTI_BUFF[event.spell.name])) {
            playerBuffs.push({name: event.spell.name, source: event.source.name, target: event.target.name});
            if (playerBuffs.length > (log._pushedBuffs.maxDebuffs[playerGuid] || 0)) {
               log._pushedBuffs.maxDebuffs[playerGuid] = playerBuffs.length;
               // if (playerBuffs.length > MAX_BUFF_SLOTS) 
               //    console.log(`Found ${playerBuffs.length} buffs on ${event.source.name}`);
            }
         }
         else if (event.event === 'SPELL_AURA_REMOVED') {
            // removed
            doIfBuffFound(buffIndex, () => {
               const removedBuff = playerBuffs.splice(buffIndex, 1);
               // if (removedBuff.name === "Winter's Chill")
                  // console.log('123');
            });
         }

         let currBuffs = [event.dateStr].concat(playerBuffs);
         if (playerBuffLog.length && playerBuffLog[playerBuffLog.length - 1].length > 1) {
            const prevBuffs = playerBuffLog[playerBuffLog.length - 1];
            const arr1 = prevBuffs.slice(1, prevBuffs.length - 1);
            const diff = findDiff(arr1, playerBuffs)
            // curr 32 slots and same ts as prev
            if (playerBuffs.length >= MAX_BUFF_SLOTS && parseDate(currBuffs[0]) - parseDate(prevBuffs[0]) < 5 && prevBuffs[prevBuffs.length - 1].removed.length)
               diff.pushed = prevBuffs[prevBuffs.length - 1].removed.map(o => o.name);
            currBuffs.push(diff);
         } else
            currBuffs.push(null);
         playerBuffLog.push(currBuffs);
      }
   },

   finishFile: function (log, options) {
      if (!log._pushedBuffs)
         return;
      for (let playerGuid in log._pushedBuffs.debuffs) {
         const playerBuffs = log._pushedBuffs.debuffs[playerGuid];
         const pushedBuffs = log._pushedBuffs.debuffLog[playerGuid].filter(row => row.length > 2 && row[row.length - 1] && row[row.length - 1].pushed);
         const mobMaxDebuffs = log._pushedBuffs.maxDebuffs[playerGuid];
         const playerName = log._pushedBuffs.playerNames[playerGuid];
         // if (mobMaxDebuffs > MAX_BUFF_SLOTS)
         //    console.log(` >> ${playerName} max ${mobMaxDebuffs} buffs`);
         if (pushedBuffs.length) {
            if (options['verbose']) {
               // print debuff log with pushed timestamp
               let maxSlotBuffs = log._pushedBuffs.debuffLog[playerGuid].filter(row => row.length - 2 >= MAX_BUFF_SLOTS - 1); // it includes timestamp and diff, so +2
               if (maxSlotBuffs.length) {
                  const timestamps = maxSlotBuffs.map(row => row[0]);
                  const changesWithinMaxSlotsTimestamps = log._pushedBuffs.debuffLog[playerGuid].filter(row => timestamps.indexOf(row[0]) !== -1);
                  if (changesWithinMaxSlotsTimestamps.length > 1)
                     console.log(` ** ${playerGuid} ${playerName} #${lineNumber}\n${changesWithinMaxSlotsTimestamps.map(row => `${row[0]}  ${row.length - 2}  ${formatDiff(row[row.length - 1])}`).join("\n")}`);
               }
            } else {
               const printBuffs = pushedBuffs
                  .filter(row => row[row.length - 1].added.length && !DONT_PRINT[row[row.length - 1].added[0].name])
                  .map(row => `${row[0]}  ${row.length - 2}  ${formatPushed(row[row.length - 1])}`);
               if (printBuffs.length)
                  console.log(` ** ${playerGuid} ${playerName} \n${printBuffs.join("\n")}`);
            }

            for (let row of pushedBuffs) {
               const diff = row[row.length - 1];
               const pushedDebuff = `${diff.pushed[0].name}${diff.pushed[0].stacks ? ' ('+diff.pushed[0].stacks+')' : ''},${diff.added.length ? diff.added[0].name : '??'}`;
               log.report.count[pushedDebuff] = (log.report.count[pushedDebuff] || 0) + 1;
            }
         }
      }
   },

   finishReport: function (report, options) {
      // all files finished, print result
      console.log(`Buff,Pushed Off By,Occurrences`);
      const debuffs = Object.keys(report.count).map(key => [key, report.count[key]]).sort((a, b) => b[1] - a[1]);
      console.log(debuffs.map(row => `${row[0]},${row[1]}`).join("\n"));
   },
}
