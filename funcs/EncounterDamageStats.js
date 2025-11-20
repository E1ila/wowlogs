'use strict';

const Table = require('cli-table');
const c = require("../colors");
const CsvTable = require('../csvtable');
const path = require('path');

// Whitelist of buffs to track
const BUFF_WHITELIST = new Set([
   'Adrenaline Rush',
   'Blade Flurry',
   'Elixir of the Mongoose',
   'Holy Strength',
   'Increased Agility',
   'Positive Charge',
   'Winterfall Firewater',
   'Fengus\' Ferocity',
   'Orgrimmar Gift of Friendship',
   'Rallying Cry of the Dragonslayer',
   'Sayge\'s Dark Fortune of Damage',
   'Songflower Serenade',
   'Spirit of Zandalar',
   'Warchief\'s Blessing',
]);

let mobStats = {}; // Key: "mobName+buff1,buff2,buff3"
let playerBuffs = {}; // Track current active buffs per player: { playerGuid: { buffName: { playerName } } }
let allAurasSeen = new Set(); // Track all unique auras seen during encounters
let inEncounter = false;
let dbCreature = null;

/**
 * Abbreviate a buff name by taking first 3 letters of each word
 * @param {string} buffName - Full buff name
 * @returns {string} Abbreviated buff name
 */
function abbreviateBuffName(buffName) {
   return buffName
      .split(' ')
      .map(word => {
         // Remove apostrophes and take first 3 letters
         const cleaned = word.replace(/['']/g, '');
         return cleaned.substring(0, 3);
      })
      .join('');
}

module.exports = {
   init: async function() {
      dbCreature = new CsvTable();
      await dbCreature.read(path.join(__dirname, '..', 'creature_levels.csv'), ['name']);
   },
   
   /**
    * Tracks boss swing damage during encounters
    * @param log sender obj
    * @param options sent in CLI
    * @param lineNumber of processed event
    * @param event object
    * @param lastEvent object
    * @param currentEncounter object
    */
   processEvent: function (log, options, lineNumber, event, lastEvent, currentEncounter) {
      let result = { printPretty: false };

      if (event.event === 'ENCOUNTER_START') {
         inEncounter = true;
      }
      else if (event.event === 'ENCOUNTER_END') {
         inEncounter = false;
      }
      
      // Track buff application on players (always, not just in encounter)
      if (event.event === 'SPELL_AURA_APPLIED') {
         const target = event.target;
         if (target && target.guid && target.guid.indexOf('Player-') === 0 && event.spell) {
            // Track all auras seen
            allAurasSeen.add(event.spell.name);
            
            // Only track whitelisted buffs for stats
            if (BUFF_WHITELIST.has(event.spell.name)) {
               // This is a player
               if (!playerBuffs[target.guid]) {
                  playerBuffs[target.guid] = {};
               }
               playerBuffs[target.guid][event.spell.name] = { playerName: target.name };
            }
         }
      }
      // Track buff removal on players (always, not just in encounter)
      else if (event.event === 'SPELL_AURA_REMOVED') {
         const target = event.target;
         if (target && target.guid && target.guid.indexOf('Player-') === 0 && event.spell) {
            // Only track whitelisted buffs
            if (BUFF_WHITELIST.has(event.spell.name)) {
               // This is a player
               if (playerBuffs[target.guid] && playerBuffs[target.guid][event.spell.name]) {
                  delete playerBuffs[target.guid][event.spell.name];
               }
            }
         }
      }
      
      // Track swing damage and associate active buffs with mobs (only during encounters)
      if (inEncounter) {
         if (event.event === 'SWING_DAMAGE_LANDED') {
         // Check if this is damage from a creature (can be in source or dest)
         let creature = null;
         if (event.source && event.source.guid && event.source.guid.indexOf('Creature-') === 0) {
            creature = event.source;
         } else if (event.target && event.target.guid && event.target.guid.indexOf('Creature-') === 0) {
            creature = event.target;
         }
         
         if (creature) {
            const mobName = creature.name;
            const damage = event.amount || 0;
            
               // Collect all currently active buff names
               const activeBuffs = new Set();
               for (let playerGuid in playerBuffs) {
                  for (let buffName in playerBuffs[playerGuid]) {
                     activeBuffs.add(buffName);
                  }
               }
               
               // Create composite key: mobName+sortedBuffs
               const sortedBuffs = Array.from(activeBuffs).sort();
               const compositeKey = `${mobName}+${sortedBuffs.join(',')}`;
               
               // Initialize mob stats if not exists
               if (!mobStats[compositeKey]) {
                  mobStats[compositeKey] = {
                     min: damage,
                     max: damage,
                     total: 0,
                     count: 0,
                  };
               }
               
               const stats = mobStats[compositeKey];
               
               // Update stats
               stats.min = Math.min(stats.min, damage);
               stats.max = Math.max(stats.max, damage);
               stats.total += damage;
               stats.count += 1;
            }
         }
      }

      return result;
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
      console.log(`\n${c.whiteBright}Boss Swing Damage Statistics${c.off}\n`);
      
      if (Object.keys(mobStats).length === 0) {
         console.log('No mob swing damage recorded.\n');
         return;
      }

      var table = new Table({
         head: ['Mob Name', 'Armor', 'Min Damage', 'Max Damage', 'Avg Damage', 'Hit Count', 'Buffs'],
      });
      
      let rows = [];
      for (let compositeKey in mobStats) {
         const stats = mobStats[compositeKey];
         const avgDamage = stats.count > 0 ? Math.round(stats.total / stats.count) : 0;
         
         // Parse the composite key: "mobName+buff1,buff2,buff3"
         const plusIndex = compositeKey.indexOf('+');
         const mobName = compositeKey.substring(0, plusIndex);
         const buffsStr = compositeKey.substring(plusIndex + 1);
         
         // Abbreviate buff names
         let buffsList = 'N/A';
         if (buffsStr) {
            const buffNames = buffsStr.split(',').filter(b => b);
            buffsList = buffNames.map(abbreviateBuffName).join(',');
         }
         
         // Look up creature level and armor for display
            let displayName = mobName;
            let armor = null;
            if (dbCreature) {
               try {
                  const creatureData = dbCreature.get('name', mobName);
                  if (creatureData) {
                     const levelMinCol = dbCreature.headers.indexOf('level_min');
                     const levelMaxCol = dbCreature.headers.indexOf('level_max');
                     const armorCol = dbCreature.headers.indexOf('armor');
                     const levelMin = creatureData[levelMinCol];
                     const levelMax = creatureData[levelMaxCol];
                     armor = creatureData[armorCol];
                     
                     if (levelMin === levelMax) {
                        displayName = `${mobName} (${levelMin})`;
                     } else {
                        displayName = `${mobName} (${levelMin}-${levelMax})`;
                     }
                  }
               } catch (e) {
                  // Creature not found in DB, use name without level
               }
            }
         
         rows.push([
            displayName,
            armor !== null ? armor.toLocaleString() : 'N/A',
            stats.min.toLocaleString(),
            stats.max.toLocaleString(),
            avgDamage.toLocaleString(),
            stats.count.toLocaleString(),
            buffsList,
         ]);
      }
      
      // Sort by mob name
      rows = rows.sort((a, b) => a[0].localeCompare(b[0]));
      rows.forEach(row => table.push(row));
      
      console.log(table.toString());
      console.log('');
      
      // Print all unique auras seen during encounters
      if (allAurasSeen.size > 0) {
         console.log(`\n${c.whiteBright}All Unique Auras Seen During Encounters${c.off}\n`);
         const sortedAuras = Array.from(allAurasSeen).sort();
         sortedAuras.forEach(aura => {
            const abbreviated = abbreviateBuffName(aura);
            const isTracked = BUFF_WHITELIST.has(aura) ? c.greenBright + ' [TRACKED]' + c.off : '';
            console.log(`  ${c.cyanBright}${aura}${c.off} (${c.orangeBright}${abbreviated}${c.off})${isTracked}`);
         });
         console.log('');
      }
   },
}

