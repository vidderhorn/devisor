import parse, { bit, flag } from "ezop";
import death from "death";
import Supervisor from "@devisor/supervisor";

const { args, flags, bits, raw } = parse(process.argv.slice(2), {
  cwd: flag(),
  hack: bit(),
});

const $Supervisor = !bits.hack ? Supervisor :
  require("@devisor/supervisor/src/supervisor").default as typeof Supervisor;

if (bits.hack) {
  process.env.DEVISOR_HACK = "1";
}

const supervisor = new $Supervisor({
  cwd: flags.cwd || process.cwd(),
  paths: args,
  dev: true,
  devArgs: raw,
});

death(() => {
  supervisor.stop().then(() => process.exit());
});

