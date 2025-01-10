'use strict';
/*
 *    wow-log-parser - Parse World of Warcraft combat logs
 *   Copyright (C) 2017   Jan Koppe <post@jankoppe.de>
 *
 *   This program is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   This program is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *   You should have received a copy of the GNU General Public License
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

const
   c = require('./constants'),
   moment = require('moment');

const parseHex = (str) => parseInt(str.substring(2), 16)

Array.prototype.mshift = function (elementsToSkip) {
   for (let i = 0; i < elementsToSkip; i++)
      this.shift();
   return this.shift();
}

let parse = {}

/**
 * parse spell school
 * @param  {Integer} school Integer representation of school
 * @return {String}         String representation of spell School
 */
parse.school = (school) => {
   if (typeof school !== 'number') {
      school = parseInt(school)
      if (school.isNaN) throw new TypeError('school has wrong format.')
   }
   if (school < 1 || school > c.schools.length || c.schools[school - 1] === '') {
      throw new TypeError('school #' + school + ' is not valid.')
   }
   return c.schools[school - 1]
}

/**
 * parse power type
 * @param  {Integer} power Integer representation of power
 * @return {String}         String representation of power type
 */
parse.power = (power) => {
   if (typeof power !== 'number') {
      power = parseInt(power)
      if (power.isNaN) throw new TypeError('power has wrong format.')
   }
   if (power < -2 || power > c.powers.length - 3 || c.powers[power + 2] === '') {
      return `??${power + 2}`
      // throw new TypeError('power #' + power + ' is not valid');
   }
   return c.powers[power + 2]
}

parse.date = (d) => {
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

/**
 * parse a single line and return it as Object
 * @param  {number} lineNumber    line from the WoWCombatLog.txt
 * @param  {String} line    line from the WoWCombatLog.txt
 * @param  {Object} versionData { version, advanced, build }
 * @return {Object}         Object representation of line
 */
parse.line = (lineNumber, line, versionData) => {
   if (versionData.version < 9)
      throw new Error("Unsupported version: " + versionData.version);
   if (!line || !line.split)
      throw new Error(`Line ${lineNumber} doesn't have split func: ${line}`);

   let o = {}
   let l = line.split('  ')
   o.date = parse.date(l[0])
   o.dateStr = l[0];

   l = l[1].split(',')

   o.event = l.shift()
   if (o.event === 'ENCOUNTER_START' || o.event === 'ENCOUNTER_END') {
      o.encounterId = parseInt(l.shift()); // https://wow.gamepedia.com/DungeonEncounterID
      o.encounterName = l.shift().replace(/"/g, '');
      o.difficultyID = c.difficultyIDs[l.shift()];
      o.groupSize = parseInt(l.shift());
      return o;
   }
   if (o.event === 'ZONE_CHANGE') {
      o.zoneId = parseInt(l.shift());
      o.zoneName = l.shift().replace(/"/g, '');;
      return o;
   }
   if (o.event === 'MAP_CHANGE') {
      o.mapId = parseInt(l.shift());
      o.mapName = l.shift().replace(/"/g, '');;
      return o;
   }

   if (o.event === 'COMBATANT_INFO') {
      // https://wowpedia.fandom.com/wiki/COMBAT_LOG_EVENT#COMBATANT_INFO
      // COMBATANT_INFO,playerGUID,Strength,Agility,Stamina,Intelligence,Spirit,Dodge,Parry,Block,CritMelee,CritRanged,CritSpell,Speed,Lifesteal,HasteMelee,HasteRanged,HasteSpell,Avoidance,Mastery,VersatilityDamageDone,VersatilityHealingDone,VersatilityDamageTaken,Armor,CurrentSpecID,(Class Talent 1, ...),(PvP Talent 1, ...),[Artifact Trait ID 1, Trait Effective Level 1, ...],[(Equipped Item ID 1,Equipped Item iLvL 1,(Permanent Enchant ID, Temp Enchant ID, On Use Spell Enchant ID),(Bonus List ID 1, ...),(Gem ID 1, Gem iLvL 1, ...)) ...],[Interesting Aura Caster GUID 1, Interesting Aura Spell ID 1, ...]
      o.playerGuid = l.shift();
      o.playerFaction = l.shift() == '0' ? 'H' : 'A';
      o.playerStats = {
         str: parseInt(l.shift()),
         agi: parseInt(l.shift()),
         sta: parseInt(l.shift()),
         int: parseInt(l.shift()),
         spi: parseInt(l.shift()),
         dodge: parseInt(l.shift()),
         parry: parseInt(l.shift()),
         block: parseInt(l.shift()),
         critMelee: parseInt(l.shift()),
         critRanged: parseInt(l.shift()),
         critSpell: parseInt(l.shift()),
         speed: parseInt(l.shift()),
         lifesteal: parseInt(l.shift()),
         hasteMelee: parseInt(l.shift()),
         hasteRanged: parseInt(l.shift()),
         hasteSpell: parseInt(l.shift()),
         avoidance: parseInt(l.shift()),
         //   mastery: parseInt(l.shift()), // something seems to be not in place, no idea what
         versatilityDamageDone: parseInt(l.shift()),
         versatilityHealingDone: parseInt(l.shift()),
         versatilityDamageTaken: parseInt(l.shift()),
         armor: parseInt(l.shift()),
         currentSpecID: parseInt(l.shift()),
      }
      l = l.filter(item => item.length > 0);
      let rest = `[${l.join(',').replace(/\(/g, "[").replace(/\)/g, "]").replace(/0000000000000000/g, "0")}]`;
      let pos1 = rest.indexOf('Player-');
      if (pos1 != -1) {
         let pos2 = rest.indexOf(']', pos1);
         rest = rest.substring(0, pos1) + rest.substring(pos2);
      }
      pos1 = rest.indexOf('Creature-');
      if (pos1 != -1) {
         let pos2 = rest.indexOf(']', pos1);
         rest = rest.substring(0, pos1) + rest.substring(pos2);
      }
      rest = rest.replace(/,\]/g, "]").replace(/,,/g, ",");
      let arr;
      try {
         arr = JSON.parse(rest);
      } catch (e) {
         console.error(`${e.message} line #${lineNumber}: ${rest}`);
         throw e;
      }
      o.playerEquippedGear = arr[2].filter(g => g[0]).map(g => ({ itemId: g[0], iLvl: g[1], permEnchant: g[2], tempEnchant: g[3], onUseSpellEnchantId: g[4] }));
      return o;
   }

   try {
      o.source = extractPlayer(l);
      o.target = extractPlayer(l);
   } catch (e) {
      console.error(`Error parsing source and target players: ${e.message}\n${line}`);
   }

   //sometimes events do not have targets. remove target property.
   if (o.target && o.target.name === undefined) o.target = undefined

   if (o.event === 'SPELL_ABSORBED') {
      if (l.length >= 12)
         o.absorbedSpell = extractSpell(l);
      o.sourceOfAbsorb = extractPlayer(l);
   }

   if (o.event.split('_')[0] === 'SPELL'
      || o.event.split('_')[0] === 'RANGE') {
      o.spell = extractSpell(l);
   } else if (o.event.split('_')[0] === 'ENVIRONMENTAL') {
      o.environmentalType = l.shift()
   }

   // ignore these special events and return immediately
   switch (o.event) {
      case 'ENCHANT_APPLIED':
      case 'ENCHANT_REMOVED':
      case 'PARTY_KILL':
      case 'UNIT_DIED':
      case 'UNIT_DESTROYED':
      case 'UNIT_DISSIPATES':
         return o;
         break
      default:
         break
   }

   let suffix = ''
   if (o.event.split('_')[1] === 'PERIODIC'
      || o.event.split('_')[1] === 'BUILDING') {
      o.eventSuffix = o.event.split('_').splice(2).join('_')
   } else {
      o.eventSuffix = o.event.split('_').splice(1).join('_')
   }

   let elementsToSkip = versionData.build >= 1.15 ? 18 : 16;

   switch (o.eventSuffix) {
      case 'DAMAGE':
      case 'DAMAGE_LANDED':
         o.perspective = extractPerspective(l, versionData);
         o.amount = parseInt(l.shift()) // the damage player will see on his UI
         o.baseAmount = parseInt(l.shift()) // damage before crit and before absorbtion
         o.overkill = parseInt(l.shift()) // wasted damage points, -1 = no overkill
         o.school = parseInt(l.shift()); // 1 = melee, 16 = spell
         o.resisted = parseInt(l.shift());
         o.blocked = parseInt(l.shift());
         o.absorbed = parseInt(l.shift());
         o.critical = l.shift() === '1';
         o.glancing = l.shift() === '1';
         o.crushing = l.shift() === '1';
         o.aoe = l.shift() === 'AOE'; // ST (single target), or AOE
         break
      case 'MISSED':
         o.missType = l.shift() // MISS / ABSORBED
         o.isOffhand = l.shift() === '1'
         o.amount = parseInt(l.shift()) // how much was absorbed / missed
         o.baseAmount = parseInt(l.shift()) // intended damage, before crit mul, before reductions and absorbtion
         break
      case 'HEAL':
         o.amount = parseInt(l.mshift(elementsToSkip)) // the damage player will see on his UI
         o.baseAmount = parseInt(l.shift()) // damage before crit and before absorbtion
         o.overheal = parseInt(l.shift())
         o.absorbed = l.shift() === '1'
         o.critical = l.shift() === '1'
         break
      case 'ENERGIZE':
         o.amount = parseInt(l.mshift(elementsToSkip)) // the damage player will see on his UI
         o.overflow = parseInt(l.shift()) // the damage player will see on his UI
         o.powerType = parse.power(l.shift()) // mana / rage / health / etc..
         break
      case 'LEECH':
      case 'DRAIN': // need to verify
         o.amount = parseInt(l.mshift(elementsToSkip));
         o.powerType = parse.power(l.shift());
         o.extraAmount = parseInt(l.shift());
         break;
      case 'INTERRUPT':
      case 'DISPEL_FAILED':
         o.extraSpellId = parseInt(l.shift());
         o.extraSpellName = l.shift().replace(/"/g, '');
         o.extraSchool = parse.school(l.shift());
         break;
      case 'DISPEL':
      case 'STOLEN':
      case 'AURA_BROKEN_SPELL':
         o.extraSpellId = parseInt(l.shift()) // ?
         o.extraSpellName = l.shift().replace(/"/g, '') // ?
         o.extraSchool = parse.school(l.shift())
         o.auraType = l.shift().replace(/"/g, '') // ?
         break
      case 'EXTRA_ATTACKS':
         o.amount = parseInt(l.shift()) // number of extra attacks
         break
      case 'AURA_APPLIED':
      case 'AURA_REMOVED':
      case 'AURA_REFRESH':
         o.auraType = l.shift().replace(/"/g, '') // ?
         break
      case 'AURA_REMOVED_DOSE':
      case 'AURA_APPLIED_DOSE':
         o.auraType = l.shift().replace(/"/g, '') // ?
         o.stacks = parseInt(l.shift());
         break
      case 'AURA_BROKEN':
         o.auraType = l.shift().replace(/"/g, '');
         break;
      case 'CAST_FAILED':
         o.failedType = l.shift().replace(/"/g, '') // ?
         break
      case 'ABSORBED':
         o.amount = parseInt(l.shift()) // how much was absorbed
         o.baseAmount = parseInt(l.shift()) // intended damage, before reductions
         break
      case 'CAST_START':
      case 'CAST_SUCCESS':
      case 'SUMMON':
      case 'INSTAKILL':
      case 'RESURRECT':
      case 'CREATE':
         break;
      case 'SHIELD':
         // DAMAGE_SHIELD
         o.spellId = parseInt(l.shift());
         o.spellName = l.shift().replace(/"/g, '');
         o.school = parse.school(parseHex(l.shift()));
         o.amount = parseInt(l.mshift(elementsToSkip));
         // damage type? melee / spell
         break;
      case 'SHIELD_MISSED':
         // DAMAGE_SHIELD_MISSED
         o.spellId = parseInt(l.shift());
         o.spellName = l.shift().replace(/"/g, '');
         o.school = parse.school(parseHex(l.shift()));
         o.failedType = l.shift();
         break;
      case 'DURABILITY_DAMAGE':
         o.itemId = parseInt(l.shift());
         o.itemName = l.shift().replace(/"/g, '');
         break;
      case 'SPLIT':
         o.spellId = parseInt(l.shift());
         o.spellName = l.shift().replace(/"/g, '');
         o.school = parse.school(parseHex(l.shift()));
         o.moreData = true;
         // todo: need to parse the rest
         break;
      case 'DURABILITY_DAMAGE_ALL':
      default:
         throw new Error('unrecognized event suffix ' + o.eventSuffix)
   }

   return o;
}

function extractPlayer(l) {
   if (l.length < 4) 
      return null;
   let o = {
      "guid": l.shift(),
      "name": l.shift().replace(/"/g, ''),
      "flags": parseHex(l.shift()),
      "raidflags": parseHex(l.shift())
   }
   if (o.name == 'nil')
      o.name = null;
   if (o.guid == 'nil')
      o.guid = null;
   return o;
}

function extractSpell(l) {
   if (l.length < 3)
      return null;
   return {
      "id": parseInt(l.shift()),
      "name": l.shift().replace(/"/g, ''),
      "school": parse.school(parseHex(l.shift()))
   }
}

function extractPerspective(l, versionData) {
   const x = {
      "guid": l.shift(),
      "p1": l.shift(),
      "p2": parseInt(l.shift()),
      "p3": parseInt(l.shift()),
      "p4": parseInt(l.shift()),
      "p5": parseInt(l.shift()),
      "p6": parseInt(l.shift()),
      "p7": parseInt(l.shift()),
      "p8": parseInt(l.shift()),
      "p9": parseInt(l.shift()),
      "p10": parseInt(l.shift()),
      "p11": parseFloat(l.shift()),
      "p12": parseFloat(l.shift()),
      "p13": parseFloat(l.shift()),
      "p14": parseFloat(l.shift()),
      "p15": parseInt(l.shift()),
   }
   if (versionData.build >= 1.15) {
      x["p16"] = parseInt(l.shift());
      x["p17"] = parseInt(l.shift());
   }
   return x;
}

module.exports = parse
