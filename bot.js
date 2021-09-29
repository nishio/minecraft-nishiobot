require("dotenv").config();
const { Vec3 } = require("vec3");
const mineflayer = require("mineflayer");
const pathfinder = require("mineflayer-pathfinder").pathfinder;
const { GoalNear, GoalNearXZ } = require("mineflayer-pathfinder").goals;

// in-game name of owner, bot ignores commands from others
const OWNER_NAME = "nishio_hirokazu";

//--- bot states
let bot;
let mcData;
let to_follow = false;
let to_harvest_wort = false;
let last_seen = undefined;
//---

//--- utility functions
const login = () => {
  bot = mineflayer.createBot({
    host: process.env.MINECRAFT_HOST,
    username: process.env.MSACCOUNT_USERNAME,
    password: process.env.MSACCOUNT_PASSWORD,
    auth: "microsoft",
  });
  bot.loadPlugin(pathfinder);
};

const say = (message) => {
  setTimeout(() => {
    bot.chat(`🤖${message}`);
  }, 1000);
};

const log = (message) => {
  console.log(`🤖${message}`);
};

const SEARCH_RADIUS = 20;
function find_empty_soulsand() {
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

function find_grown_nether_wart() {
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
//--- end utility functions

//--- async commands
async function harvest_wort() {
  if (!to_harvest_wort) return;
  try {
    log("find_grown_nether_wart");
    const toHarvest = find_grown_nether_wart();
    if (toHarvest) {
      // console.log("dig", toHarvest);
      const { x, y, z } = toHarvest.position;
      // const goal = new GoalNear(x, y, z, 2);
      const goal = new GoalNearXZ(x, z, 1);

      if (!goal.isEnd(bot.entity.position)) {
        log(`move to harvest: ${[x, y, z]}`);
        await bot.pathfinder.goto(goal);
      }
      log("harvest");
      await bot.dig(toHarvest);
      log("done");
    } else {
      log("not found");
    }
  } catch (e) {
    console.error(e);
    setTimeout(sow_wort, 3000);
    return;
  }
  setTimeout(sow_wort, 1000);
}

async function sow_wort() {
  try {
    log("find_empty_soulsand");
    const toSow = find_empty_soulsand();
    if (toSow) {
      await bot.equip(mcData.itemsByName.nether_wart.id, "hand");
      const { x, y, z } = toSow.position;
      const goal = new GoalNearXZ(x, z, 1);

      if (!goal.isEnd(bot.entity.position)) {
        log(`move to sow: ${[x, y, z]}`);
        await bot.pathfinder.goto(goal);
      }
      log("sow");
      await bot.placeBlock(toSow, new Vec3(0, 1, 0));
      log("done");
    } else {
      log("not found");
    }
  } catch (e) {
    console.error(e);
    setTimeout(harvest_wort, 3000);
    return;
  }
  setTimeout(harvest_wort, 1000);
}

async function follow() {
  if (!to_follow) return;
  if (!last_seen) {
    say("I don't see you !");
    return;
  }
  const { x, y, z } = last_seen.position.floored();
  bot.pathfinder.goto(new GoalNear(x, y, z, 2));
  setTimeout(follow, 1000);
}
//--- end async commands

login(); // do login and create bot instance

//--- event listeners
bot.once("spawn", () => {
  mcData = require("minecraft-data")(bot.version);

  log("I'm in!");

  setInterval(() => {
    // record lastseen owner position
    const target = bot.players[OWNER_NAME]?.entity;
    if (target !== undefined) {
      last_seen = target;
    }
  }, 1000);

  onLogin();
});

bot.on("chat", (username, message) => {
  if (username !== OWNER_NAME) return;
  commands.forEach((c) => {
    if (message.match(c.text) !== null) {
      c.onCall();
    }
  });
});

bot.on("kicked", (reason) => {
  console.log("kicked", reason);
  // usually server is rebooting, login after 3 minutes
  setTimeout(() => {
    login();
  }, 3 * 60 * 1000);
});

bot.on("error", (error) => {
  console.error("error", error);
});
//--- end event listeners

//--- chat commands
const commands = [
  {
    text: "come here",
    onCall: () => {
      if (!last_seen) {
        say("I don't see you!");
        return;
      }
      const { x, y, z } = last_seen.position.floored();
      say(`I'm going to ${[x, y, z]}`);
      bot.pathfinder.goto(new GoalNear(x, y, z, 2)).then(() => {
        say("finished");
      });
    },
  },
  {
    text: "follow me",
    onCall: () => {
      to_follow = !to_follow;
      say(to_follow ? "OK" : "follow-mode disabled");
      follow();
    },
  },
  {
    text: "harvest wort",
    onCall: () => {
      to_harvest_wort = !to_harvest_wort;
      say(to_harvest_wort ? "OK" : "harvest-mode disabled");
      harvest_wort();
    },
  },
];
//--- end chat commands

//--- what do first
const onLogin = () => {
  // to_harvest_wort = true;
  // harvest_wort();
};
