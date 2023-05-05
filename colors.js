const colors = require('ansi-256-colors');

module.exports = {
   redDarker: colors.fg.getRgb(1, 0, 0),
   redDark: colors.fg.getRgb(3, 0, 0),
   red: colors.fg.getRgb(5, 0, 0),
   orangeDark: colors.fg.getRgb(2, 1, 0),
   orange: colors.fg.getRgb(4, 3, 1),
   orangeBright: colors.fg.getRgb(5, 4, 0),
   purpleDark: colors.fg.getRgb(1, 0, 1),
   purple: colors.fg.getRgb(2, 0, 2),
   purpleBright: colors.fg.getRgb(4, 0, 4),
   purpleBg: colors.bg.getRgb(4, 0, 4) + colors.fg.standard[0],
   grayDark: colors.fg.getRgb(1, 1, 1),
   gray: colors.fg.getRgb(3, 3, 3),
   white: colors.fg.getRgb(4, 4, 4),
   whiteBright: colors.fg.getRgb(5, 5, 5),
   important: colors.bg.getRgb(5, 3, 0) + colors.fg.standard[0],
   title: colors.bg.getRgb(0, 2, 5) + colors.fg.standard[0],
   blueDark: colors.fg.getRgb(0, 0, 3),
   blue: colors.fg.getRgb(0, 1, 5),
   blueRed: colors.fg.getRgb(1, 1, 5),
   blueBright: colors.fg.getRgb(2, 3, 5),
   greenDark: colors.fg.getRgb(0, 3, 0),
   greenDarker: colors.fg.getRgb(0, 1, 0),
   green: colors.fg.getRgb(0, 4, 0),
   greenBright: colors.fg.getRgb(2, 5, 2),
   cyanDark: colors.fg.getRgb(0, 3, 3),
   cyan: colors.fg.getRgb(0, 4, 4),
   cyanBright: colors.fg.getRgb(1, 5, 5),
   off: colors.reset,

   qualityColor: {
      0: colors.fg.getRgb(3, 3, 3), // poor
      1: colors.fg.getRgb(5, 5, 5), // common
      2: colors.fg.getRgb(1, 5, 0), // uncommon
      3: colors.fg.getRgb(0, 2, 4), // rare
      4: colors.fg.getRgb(3, 0, 4), // epic
      5: colors.fg.getRgb(0, 4, 2), // legendary
   },

   classColor: {
      "Druid": colors.fg.getRgb(Math.round(5), Math.round(0.49 * 5), Math.round(0.04 * 5)),
      "Hunter": colors.fg.getRgb(Math.round(0.67 * 5), Math.round(0.83 * 5), Math.round(0.45 * 5)),
      "Mage": colors.fg.getRgb(Math.round(0.25 * 5), Math.round(0.78 * 5), Math.round(0.92 * 5)),
      "Paladin": colors.fg.getRgb(Math.round(0.96 * 5), Math.round(0.55 * 5), Math.round(0.73 * 5)),
      "Priest": colors.fg.getRgb(5, 5, 5),
      "Rogue": colors.fg.getRgb(5, Math.round(0.96 * 5), Math.round(0.41 * 5)),
      "Shaman": colors.fg.getRgb(0, Math.round(0.44 * 5), Math.round(0.87 * 5)),
      "Warlock": colors.fg.getRgb(Math.round(0.53 * 5), Math.round(0.53 * 5), Math.round(0.93 * 5)),
      "Warrior": colors.fg.getRgb(Math.round(0.78 * 5), Math.round(0.61 * 5), Math.round(0.43 * 5)),
   },
};