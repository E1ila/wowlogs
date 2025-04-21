const c = require("../colors");
const Table = require("cli-table");
const consts = require("../consts");
const CsvTable = require("../csvtable");
const path = require("path");
const
   COMBATANT_INFO = "COMBATANT_INFO",
   ItemCache = {},
   playerNames = {},
   uniqueFilter = (value, index, self) =>  self.indexOf(value) === index,
   ItemDBColumns = [
      "entry","patch","class","subclass","name","description","display_id","quality","flags",
      "buy_count","buy_price","sell_price","inventory_type","allowable_class","allowable_race",
      "item_level","required_level","required_skill","required_skill_rank","required_spell",
      "required_honor_rank","required_city_rank","required_reputation_faction","required_reputation_rank",
      "max_count","stackable","container_slots","stat_type1","stat_value1","stat_type2","stat_value2",
      "stat_type3","stat_value3","stat_type4","stat_value4","stat_type5","stat_value5","stat_type6",
      "stat_value6","stat_type7","stat_value7","stat_type8","stat_value8","stat_type9","stat_value9",
      "stat_type10","stat_value10","delay","range_mod","ammo_type","dmg_min1","dmg_max1","dmg_type1",
      "dmg_min2","dmg_max2","dmg_type2","dmg_min3","dmg_max3","dmg_type3","dmg_min4","dmg_max4",
      "dmg_type4","dmg_min5","dmg_max5","dmg_type5","block","armor","holy_res","fire_res","nature_res",
      "frost_res","shadow_res","arcane_res","spellid_1","spelltrigger_1","spellcharges_1","spellppmrate_1",
      "spellcooldown_1","spellcategory_1","spellcategorycooldown_1","spellid_2","spelltrigger_2",
      "spellcharges_2","spellppmrate_2","spellcooldown_2","spellcategory_2","spellcategorycooldown_2",
      "spellid_3","spelltrigger_3","spellcharges_3","spellppmrate_3","spellcooldown_3","spellcategory_3",
      "spellcategorycooldown_3","spellid_4","spelltrigger_4","spellcharges_4","spellppmrate_4",
      "spellcooldown_4","spellcategory_4","spellcategorycooldown_4","spellid_5","spelltrigger_5",
      "spellcharges_5","spellppmrate_5","spellcooldown_5","spellcategory_5","spellcategorycooldown_5",
      "bonding","page_text","page_language","page_material","start_quest","lock_id","material","sheath",
      "random_property","set_id","max_durability","area_bound","map_bound","duration","bag_family",
      "disenchant_id","food_type","min_money_loot","max_money_loot","extra_flags","other_team_entry"
   ],
   statTypes = {
      0: "MANA",
      1: "HP",
      3: "AGI",
      4: "STR",
      5: "INT",
      6: "SPI",
      7: "STA",
   },
   mageStatNormals = {
      HIT: 15.25857,
      CRIT: 9.76740,
      SP: 1.14821,
      PEN: 0.50000,
      INT: 0.21467,
      STA: 0.50000,
      MP5: 0.10000,
      SPI: 0.02000,
   },
   spellNameToStat = {
      "Increased Mana Regen": "MP5",
      "Increase Spell Dam": "SP",
      "Increased Critical Spell": "CRIT",
      "Increased Spell Hit": "HIT",
      "Increase Frost Dam": "SP",
      "Increase Fire Dam": "SP",
      "Increased Spell Penetration": "PEN",
   },
   customItems = {
      // green
      "Elegant Bracers": {stat: "SP", value: 21},
      "Abjurer's Hood": {stat: "SP", value: 31},
      "Councillor's Circlet": {stat: "SP", value: 36},
      "Councillor's Cloak": {stat: "SP", value: 19},
      "Councillor's Shoulders": {stat: "SP", value: 26},
      "Councillor's Tunic": {stat: "SP", value: 37},
      "Bonecaster's Spaulders": {stat: "SP", value: 26},
      "Celestial Silk Robes": {stat: "SP", value: 40},
      "Celestial Bindings": {stat: "SP", value: 21},
      "High Councillor's Boots": {stat: "SP", value: 30},
      "High Councillor's Bracers": {stat: "SP", value: 21},
      "High Councillor's Cloak": {stat: "SP", value: 21},
      "Dragon Finger": {stat: "SP", value: 11},
      "Elegant Boots": {stat: "SP", value: 29},
      "Elegant Circlet": {stat: "SP", value: 37},
      "Elegant Cloak": {stat: "SP", value: 20},
      "Magus Long Staff": {stat: "SP", value: 37},
      "Solstice Staff": {stat: "SP", value: 37},
      "Master's Cloak": {stat: "SP", value: 21},
      "Master's Mantle": {stat: "SP", value: 30},
      "Master's Bracers": {stat: "SP", value: 21},
      "Umbral Wand": {stat: "SP", value: 9},
      "Wizard's Hand": {stat: "SP", value: 10},
      "Abjurer's Boots": {stat: "SP", value: 23},
      "Celestial Crown": {stat: "SP", value: 40},
      "Ivory Wand": {stat: "SP", value: 10},
      "Glowstar Rod": {stat: "SP", value: 11},
      "Mystical Orb": {stat: "SP", value: 20},
      // blue
      "Archivist Cape": {stat: "SP", value: 21},
      "Green Lens": {stat: "SP", value: 36},
      // epic
      "Talisman of Ephemeral Power": {score: 30},
      "Mind Quickening Gem": {score: 140},
   },
   enchants = {
      "2544": {stat: "SP", value: 8},
      "2504": {stat: "SP", value: 30},
      "9STA": {stat: "STA", value: 9},
      "7STA": {stat: "STA", value: 7},
      "8INT": {stat: "INT", value: 8},
      "7INT": {stat: "INT", value: 7},
      "905": {stat: "INT", value: 5},
      "5NR": {score: 1},
      "1892": {stat: "STA", value: 10},
      "4STATS": [{stat: "STA", value: 4}, {stat: "SPI", value: 4}, {stat: "INT", value: 4}],
      "911": {score: 5},
      "1888": {score: 3},
      "THREAT": {score: 8},
   },
   setItems = {
      "Arcanist": {
         itemIds: [16795, 16796, 16797, 16798, 16799, 16800, 16801, 16802],
         bonuses: {
            3: {stat: "SP", value: 18},
         }
      },
      "Champion's Arcanum": {
         itemIds: [22870, 22860, 23263, 23264, 22886, 22883],
         bonuses: {
            2: {stat: "SP", value: 23},
         }
      }
   };


async function praseGear(readItem, gearItems) {
   const records = [];
   const stats = {};
   const seenSlots = {};
   for (let gearItem of gearItems) {
      if (!ItemCache[gearItem.itemId])
         ItemCache[gearItem.itemId] = await readItem(gearItem.itemId);
      const item = ItemCache[gearItem.itemId];
      const col_inventory_type = ItemDBColumns.indexOf("inventory_type");
      const col_name = ItemDBColumns.indexOf("name");
      const col_quality = ItemDBColumns.indexOf("quality");
      let slot = consts.ItemSlot[item[col_inventory_type]];

      if (!slot)
         console.error(`Unidentified slot for inv type ${item[col_inventory_type]}, item ${item.name}`);
      else {
         if (["Trinket", "Finger"].indexOf(slot) !== -1) {
            if (seenSlots[slot + " 2"])
               slot = null;
            else if (seenSlots[slot + " 1"])
               slot += " 2";
            else
               slot += " 1";
         }
         if (slot) {
            seenSlots[slot] = true;
            records.push([slot, item[col_name],item[col_quality] + 1]);
            for (let i = 0; i < 10; i++) {
               const col_stat_type = ItemDBColumns.indexOf("stat_type" + (i + 1));
               const col_stat_value = ItemDBColumns.indexOf("stat_value" + (i + 1));
               if (item[col_stat_type] && item[col_stat_value]) {
                  let stat = statTypes[item[col_stat_type]];
                  if (stat)
                     stats[stat] = (stats[stat] || 0) + (+item[col_stat_value]);
                  else
                     console.log(`Unknown stat type ${item[col_stat_type]} for item ${item[col_name]}`);
               }
            }
         } else {
            console.error(name, `Third ${consts.ItemSlot[item[col_inventory_type]]} ?!`);
         }
      }
   }
   return {items: records, stats};
}


module.exports = {

   /**
    * Finds what spells triggers an aura.
    * @param log sender obj
    * @param options sent in CLI
    * @param lineNumber of processed event
    * @param event object
    * @param lastEvent object
    * @param currentEncounter
    * @param rawLine
    */
   processEvent: async function (log, options, lineNumber, event, lastEvent, currentEncounter, rawLine) {
      if (!this.itemdb) {
         this.itemdb = new CsvTable();
         await this.itemdb.read(path.join(__dirname, '..', 'items.csv.gz'), ['entry']);
      }

      if (event.source && event.source.name && event.source.guid && event.source.guid.indexOf('Player-') === 0 && !playerNames[event.source.guid]) {
         playerNames[event.source.guid] = event.source.name.split('-')[0];
      }
      if (event.event === COMBATANT_INFO && currentEncounter.encounterName === options.params[0]) {
         if (!options.params.length || playerNames[event.playerGuid] && playerNames[event.playerGuid].toLowerCase().indexOf(options.params[1].toLowerCase()) === 0) {
            const gear = await praseGear(itemId => {
               try {
                  return this.itemdb.get("entry", itemId);
               } catch (e) {
                  console.log(`Item ${itemId} not found`);
               }
            }, event.playerEquippedGear);
            let table = new Table({
               head: ['Slot', 'Item', 'iLevel'],
            });
            gear.items.forEach(g => table.push(g));
            console.log(table.toString());
            table = new Table({
               head: ['Stat', 'Value'],
            });
            for (let stat in gear.stats) {
               table.push([stat, gear.stats[stat]]);
            }
            console.log(table.toString());
         }
      }
   },

   finishFile: function (log, options) {
      // nothing to do when file finished
   },

   finishReport: function (report, options) {
   },
}
