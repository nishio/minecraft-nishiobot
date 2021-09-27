require("dotenv").config();

const mineflayer = require("mineflayer");
const pathfinder = require("mineflayer-pathfinder").pathfinder;
const Movements = require("mineflayer-pathfinder").Movements;
const { GoalNear } = require("mineflayer-pathfinder").goals;

const bot = mineflayer.createBot({
  host: process.env.HOST,
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  auth: "microsoft",
});
bot.loadPlugin(pathfinder);

const IN_GAME_NAME = "nishio_hirokazu";

bot.once("spawn", () => {
  bot.chat("🤖 I'm in!");
  const mcData = require("minecraft-data")(bot.version);
  const defaultMove = new Movements(bot, mcData);

  const goto = (position) => {
    const { x, y, z } = position;
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);
    bot.pathfinder.setGoal(new GoalNear(x, y, z, 1));
    // bot.chat(
    //   `🤖 I'm going to ${[Math.floor(x), Math.floor(y), Math.floor(z)]}`
    // );
  };

  let to_follow = false;
  let last_seen = undefined;
  setInterval(() => {
    const target = bot.players[IN_GAME_NAME]?.entity;
    if (target !== undefined) {
      last_seen = target;
    }

    if (to_follow) {
      if (!last_seen) {
        bot.chat("🤖 I don't see you !");
        return;
      }
      goto(last_seen.position);
    }
  }, 1000);

  bot.on("chat", (username, message) => {
    if (username === bot.username) return;
    if (username !== IN_GAME_NAME) return;

    const commands = [
      {
        text: "come here",
        onCall: () => {
          if (!last_seen) {
            bot.chat("🤖 I don't see you !");
            return;
          }
          goto(last_seen.position);
        },
      },
      {
        text: "follow me",
        onCall: () => {
          to_follow = !to_follow;
          bot.chat(to_follow ? "enabled" : "disabled");
        },
      },
    ];

    commands.forEach((c) => {
      if (message.match(c.text) !== null) {
        bot.chat(`🤖 command "${c.text}" recognized!`);
        c.onCall();
      }
    });
  });
});

// from https://github.com/PrismarineJS/mineflayer/blob/master/examples/farmer.js
let mcData;
bot.on("inject_allowed", () => {
  mcData = require("minecraft-data")(bot.version);
});

function blockToSow() {
  return bot.findBlock({
    point: bot.entity.position,
    matching: mcData.blocksByName.soul_sand.id,
    maxDistance: 6,
    useExtraInfo: (block) => {
      const blockAbove = bot.blockAt(block.position.offset(0, 1, 0));
      return !blockAbove || blockAbove.type === 0;
    },
  });
}

function blockToHarvest() {
  return bot.findBlock({
    point: bot.entity.position,
    maxDistance: 6,
    matching: (block) => {
      return (
        block &&
        block.type === mcData.blocksByName.nether_wart.id &&
        block.metadata === 3
      );
    },
  });
}

// Log errors and kick reasons:
bot.on("kicked", console.log);
bot.on("error", console.log);
