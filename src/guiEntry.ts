#!/usr/bin/env node
import { config as loadEnv } from "dotenv";
import { openDashboard } from "./gui/server";

loadEnv();

const portArg = process.argv.find((a) => a.startsWith("--port="));
const port = portArg ? parseInt(portArg.split("=")[1], 10) : 3000;

if (isNaN(port) || port < 1 || port > 65535) {
  console.error("[ERROR]: --port must be a number between 1 and 65535");
  process.exit(1);
}

openDashboard(port);
