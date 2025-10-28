# wowlog

Node.js library to parse and analyze World of Warcraft combat log files.

## Status

This library is still in **early development** and may drastically change.

## Installation

* Make sure you have Node.js installed
* Clone or download
* run `npm i` to install dependencies

## Usage

From CLI write `node wowlog.js --help` for a list of commands and options.

### Example use cases

* List which debuffs pushed out another debuff
```
node wowlog.js ~/wow-logs/ --func debuffPriority --filter SPELL_AURA_REMOVED,SPELL_AURA_APPLIED,UNIT_DIED --ignore-ver-err --ext txt 
```

## Resources

Combat log format: [WoWpedia COMBAT_LOG_EVENT](http://wow.gamepedia.com/COMBAT_LOG_EVENT).

## Credits

Parse library based (but mostly modified) on https://github.com/JanKoppe/wow-log-parser
