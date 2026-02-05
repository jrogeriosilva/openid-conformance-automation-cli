#!/usr/bin/env node
import { config as loadEnv } from "dotenv";
import { openDashboard } from "./gui/server";

loadEnv();

const portArg = process.argv.find((a) => a.startsWith("--port="));
const port = portArg ? parseInt(portArg.split("=")[1], 10) : 3000;

openDashboard(port);
