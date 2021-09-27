require("dotenv").config();
const { Vec3 } = require("vec3");
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

let to_follow = false;
let to_harvest_wort = false;
let last_seen = undefined;

let mcData;
let defaultMove;
bot.once("spawn", () => {
  mcData = require("minecraft-data")(bot.version);
  defaultMove = new Movements(bot, mcData);

  bot.chat("🤖 I'm in!");

  const goto = (position) => {
    const { x, y, z } = position;
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);
    bot.pathfinder.setGoal(new GoalNear(x, y, z, 1));
    // bot.chat(
    //   `🤖 I'm going to ${[Math.floor(x), Math.floor(y), Math.floor(z)]}`
    // );
  };

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

  // from https://github.com/PrismarineJS/mineflayer/blob/master/examples/farmer.js
  const SEARCH_RADIUS = 20;
  function blockToSow() {
    return bot.findBlock({
      point: bot.entity.position,
      matching: mcData.blocksByName.soul_sand.id,
      maxDistance: SEARCH_RADIUS,
      useExtraInfo: (block) => {
        const blockAbove = bot.blockAt(block.position.offset(0, 1, 0));
        return !blockAbove || blockAbove.type === 0;
      },
    });
  }

  function blockToHarvest() {
    return bot.findBlock({
      point: bot.entity.position,
      maxDistance: SEARCH_RADIUS,
      matching: (block) => {
        return (
          block &&
          block.type === mcData.blocksByName.nether_wart.id &&
          block.metadata === 3
        );
      },
    });
  }

  async function harvest_wort() {
    try {
      console.log("find to harvest");
      const toHarvest = blockToHarvest();
      if (toHarvest) {
        // console.log("dig", toHarvest);
        const { x, y, z } = toHarvest.position;
        const goal = new GoalNear(x, y, z, 2);
        if (!goal.isEnd(bot.entity.position)) {
          console.log("go to ", [x, y, z], "from ", bot.entity.position);
          await bot.pathfinder.goto(goal);
          console.log("done");
        }
        console.log("harvest");
        await bot.dig(toHarvest);
      }
    } catch (e) {
      console.log(e);
      setTimeout(sow_wort, 3000);
      return;
    }
    setTimeout(sow_wort, 1000);
  }
  async function sow_wort() {
    try {
      console.log("find to sow");
      const toSow = blockToSow();
      if (toSow) {
        // console.log("sow", toSow);
        await bot.equip(mcData.itemsByName.nether_wart.id, "hand");
        const { x, y, z } = toSow.position;
        console.log("go to ", [x, y, z]);
        const goal = new GoalNear(x, y, z, 2);
        if (!goal.isEnd(bot.entity.position)) {
          await bot.pathfinder.goto(goal);
        }
        console.log("sow");
        await bot.placeBlock(toSow, new Vec3(0, 1, 0));
      }
    } catch (e) {
      console.log(e);
      setTimeout(harvest_wort, 3000);
      return;
    }
    setTimeout(harvest_wort, 1000);
  }

  harvest_wort();

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
      {
        text: "harvest wort",
        onCall: () => {
          to_harvest_wort = !to_harvest_wort;
          bot.chat(to_harvest_wort ? "enabled" : "disabled");
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

// Log errors and kick reasons:
bot.on("kicked", (reason) => {
  console.log("kicked", reason);
});
bot.on("error", (error) => {
  console.log("error", error);
});
