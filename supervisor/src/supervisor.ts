import treeKill from "tree-kill";
import { spawn, ChildProcess as Worker } from "child_process";
import { watch, FSWatcher as Watcher } from "chokidar";
import { resolve } from "path";
import { promisify } from "util";

const kill = promisify<number, string>(treeKill);

export interface Options {
  cwd: string;
  paths?: string[];
  dev?: boolean;
  devArgs?: string[];
  manager?: string;
}

const devDefaultPaths = ["**/*.worker.js", "**/*.worker.ts", "**/*.worker.ls", "**/*.worker.coffee"];
const prodDefaultPaths = ["**/*.worker.js"];

const supervisorDir = resolve(`${__dirname}/..`);
const managerDir = `${supervisorDir}/node_modules/@devisor/manager`;
const managerBin = `${managerDir}/lib/bin.js`;

export default class Supervisor {
  private readonly workers: { [path: string]: Worker } = {};
  private readonly cwd: string;
  private readonly paths: string[];
  private readonly dev: boolean;
  private readonly devArgs: string[];
  private readonly watcher?: Watcher;
  private stopped = false;

  constructor({ cwd, paths, dev, devArgs }: Options) {
    this.cwd = cwd;
    this.dev = !!dev;
    this.devArgs = devArgs || [];
    this.paths = paths || (dev ? devDefaultPaths : prodDefaultPaths);
    if (dev) {
      console.log(`starting supervisor in "${cwd}" watching "${this.paths}"`);
      this.watcher = watch(this.paths, { cwd, ignored: /node_modules/ });
      this.watcher.on("add", this.addWorker.bind(this));
      this.watcher.on("unlink", this.removeWorker.bind(this));
    }
    else {
      throw new Error("Production supervisor not implemented (lol).");
    }
  }

  async stop() {
    this.stopped = true;
    if (this.dev) console.log("stopping all managers");
    return Promise.all(Object.values(this.workers)
      .map(p => kill(p.pid, "SIGKILL")));
  }

  private addWorker(path: string) {
    if (this.dev) console.log(`adding worker "${path}"`);
    const command = `${managerBin} --respawn --no-notify ${this.devArgs.join(" ")} ${path}`;
    if (this.dev) console.log(`$ ${command}`);
    const worker = spawn("/bin/sh", ["-c", command], {
      stdio: "inherit",
      cwd: this.cwd,
      env: process.env,
      detached: true,
    });
    this.workers[path] = worker;
    worker.on("exit", () => {
      if (!this.stopped && this.dev) console.log(`manager died prematurely: "${path}"`);
      delete this.workers[path];
    });
  }

  private removeWorker(path: string) {
    const worker = this.workers[path]
    if (!worker) return;
    if (this.dev) console.log(`removing worker "${path}"`);
    kill(worker.pid, "SIGKILL");
  }
}
