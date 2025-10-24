#!/bin/bash
#wl $1 -P --spell Blind --filter SPELL_CAST_SUCCESS > 1
#wl $1 -P --target "Guardian of Icecrown" --spell "Reckless Charge" --filter SPELL_CAST_SUCCESS >> 1
#cat 1
grep -E "Blind|Reckless Charge|Polym|Gouge|Fear" $1 | wl - -P --filter SPELL_CAST_SUCCESS | awk 'BEGIN { FS = "           " } ; { print $2 }' | sort
