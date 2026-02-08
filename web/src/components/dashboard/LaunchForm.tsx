import { useState, useEffect, type FormEvent } from "react";
import TokenInput from "./TokenInput";
import { fetchConfigs, fetchEnvDefaults, launchPlan, stopExecution } from "../../api/client";
import type { LaunchPayload } from "../../types/api";

interface Props {
  isRunning: boolean;
  onLaunched: () => void;
  onError: (msg: string) => void;
}

export default function LaunchForm({ isRunning, onLaunched, onError }: Props) {
  const [configFiles, setConfigFiles] = useState<string[]>([]);
  const [configPath, setConfigPath] = useState("");
  const [planId, setPlanId] = useState("");
  const [serverUrl, setServerUrl] = useState("https://www.certification.openid.net");
  const [token, setToken] = useState("");
  const [pollInterval, setPollInterval] = useState(5);
  const [timeout, setTimeout_] = useState(240);
  const [headless, setHeadless] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    fetchConfigs()
      .then((d) => setConfigFiles(d.files))
      .catch(() => {});
    fetchEnvDefaults()
      .then((d) => {
        if (d.planId) setPlanId(d.planId);
        if (d.token) setToken(d.token);
        if (d.serverUrl) setServerUrl(d.serverUrl);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload: LaunchPayload = {
      configPath,
      planId,
      token,
      serverUrl,
      pollInterval,
      timeout,
      headless,
    };
    try {
      await launchPlan(payload);
      onLaunched();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await stopExecution();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setStopping(false);
    }
  };

  return (
    <section className="shrink-0 bg-bg-secondary border-b border-border px-6">
      <div
        className="py-2.5 text-sm font-semibold text-text-primary cursor-pointer select-none flex items-center gap-1.5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={`text-[0.55rem] inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>&#9654;</span>
        Plan Configuration
      </div>
      <div
        className={`overflow-hidden transition-[max-height] duration-300 ${isExpanded ? "max-h-[1000px]" : "max-h-0"}`}
      >
        <form onSubmit={handleSubmit} autoComplete="off" className="pb-3">
          <div className="flex gap-3 flex-wrap mb-2">
            <label className="flex-1 min-w-[180px] text-xs text-text-secondary">
              Config File
              <select
                value={configPath}
                onChange={(e) => setConfigPath(e.target.value)}
                required
                className="block w-full mt-0.5 px-2 py-1.5 bg-bg-input border border-border rounded text-text-primary text-sm focus:outline-none focus:border-accent appearance-auto"
              >
                <option value="">— select a .config.json file —</option>
                {configFiles.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1 min-w-[180px] text-xs text-text-secondary">
              Plan ID
              <input
                type="text"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                placeholder="plan-abc-123"
                required
                className="block w-full mt-0.5 px-2 py-1.5 bg-bg-input border border-border rounded text-text-primary text-sm focus:outline-none focus:border-accent"
              />
            </label>
            <label className="flex-1 min-w-[180px] text-xs text-text-secondary">
              Server URL
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="block w-full mt-0.5 px-2 py-1.5 bg-bg-input border border-border rounded text-text-primary text-sm focus:outline-none focus:border-accent"
              />
            </label>
            <TokenInput value={token} onChange={setToken} />
          </div>
          <div className="flex gap-3 flex-wrap items-end">
            <label className="w-[120px] text-xs text-text-secondary">
              Poll Interval (s)
              <input
                type="number"
                value={pollInterval}
                onChange={(e) => setPollInterval(parseInt(e.target.value, 10) || 5)}
                min={1}
                className="block w-full mt-0.5 px-2 py-1.5 bg-bg-input border border-border rounded text-text-primary text-sm focus:outline-none focus:border-accent"
              />
            </label>
            <label className="w-[120px] text-xs text-text-secondary">
              Timeout (s)
              <input
                type="number"
                value={timeout}
                onChange={(e) => setTimeout_(parseInt(e.target.value, 10) || 240)}
                min={1}
                className="block w-full mt-0.5 px-2 py-1.5 bg-bg-input border border-border rounded text-text-primary text-sm focus:outline-none focus:border-accent"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer self-end pb-1">
              <input
                type="checkbox"
                checked={headless}
                onChange={(e) => setHeadless(e.target.checked)}
                className="w-auto m-0"
              />
              Headless browser
            </label>
            <div className="flex gap-2 self-end ml-auto">
              <button
                type="submit"
                disabled={isRunning}
                className="px-5 py-1.5 bg-green-solid border-none rounded-md text-white font-semibold text-sm cursor-pointer whitespace-nowrap hover:bg-green-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Launch Plan
              </button>
              <button
                type="button"
                onClick={handleStop}
                disabled={!isRunning || stopping}
                className="px-4 py-1.5 bg-red-solid border-none rounded-md text-white font-semibold text-sm cursor-pointer whitespace-nowrap hover:bg-red disabled:opacity-35 disabled:cursor-not-allowed"
              >
                Stop
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
