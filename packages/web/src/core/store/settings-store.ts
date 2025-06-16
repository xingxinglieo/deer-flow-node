// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { create } from 'zustand';

import type { MCPServerMetadata, SimpleMCPServerMetadata } from '../mcp';

const SETTINGS_KEY = 'deerflow.settings';

const DEFAULT_SETTINGS: SettingsState = {
  general: {
    auto_accepted_plan: false,
    enable_background_investigation: false,
    max_plan_iterations: 1,
    max_step_num: 3,
    max_search_results: 3
  },
  mcp: {
    servers: []
  }
};

export type SettingsState = {
  general: {
    auto_accepted_plan: boolean;
    enable_background_investigation: boolean;
    max_plan_iterations: number;
    max_step_num: number;
    max_search_results: number;
  };
  mcp: {
    servers: MCPServerMetadata[];
  };
};

export const useSettingsStore = create<SettingsState>(() => ({
  ...DEFAULT_SETTINGS
}));

export const useSettings = (key: keyof SettingsState) => {
  return useSettingsStore((state) => state[key]);
};

export const changeSettings = (settings: SettingsState) => {
  useSettingsStore.setState(settings);
};

export const loadSettings = () => {
  if (typeof window === 'undefined') {
    return;
  }
  const json = localStorage.getItem(SETTINGS_KEY);
  if (json) {
    const settings = JSON.parse(json);
    
    // 确保general设置有默认值
    for (const key in DEFAULT_SETTINGS.general) {
      if (!(key in settings.general)) {
        settings.general[key as keyof SettingsState['general']] =
          DEFAULT_SETTINGS.general[key as keyof SettingsState['general']];
      }
    }

    // 确保MCP工具有enabled字段（兼容旧数据）
    if (settings.mcp && settings.mcp.servers) {
      settings.mcp.servers = settings.mcp.servers.map((server: MCPServerMetadata) => ({
        ...server,
        tools: server.tools.map(tool => ({
          ...tool,
          enabled: tool.enabled ?? true // 如果没有enabled字段，默认为true
        }))
      }));
    }

    try {
      useSettingsStore.setState(settings);
    } catch (error) {
      console.error(error);
    }
  }
};

export const saveSettings = () => {
  const latestSettings = useSettingsStore.getState();
  const json = JSON.stringify(latestSettings);
  localStorage.setItem(SETTINGS_KEY, json);
};

export const getChatStreamSettings = () => {
  let mcp_settings:
    | {
        servers: Record<
          string,
          MCPServerMetadata & {
            enabled_tools: string[];
            add_to_agents: string[];
          }
        >;
      }
    | undefined = undefined;
  const { mcp, general } = useSettingsStore.getState();
  const mcpServers = mcp.servers.filter((server) => server.enabled);
  if (mcpServers.length > 0) {
    mcp_settings = {
      servers: mcpServers.reduce((acc, cur) => {
        const { transport, url, name } = cur;
        let server: SimpleMCPServerMetadata;
        // if (transport === "stdio") {
        //   server = {
        //     name: cur.name,
        //     transport,
        //     env,
        //     command: cur.command,
        //     args: cur.args,
        //   };
        // } else {
        server = {
          name,
          transport,
          // env,
          url
        };
        // }
        
        // 只包含启用的工具
        const enabledTools = cur.tools.filter(tool => tool.enabled);
        
        return {
          ...acc,
          [name]: {
            ...server,
            enabled_tools: enabledTools.map((tool) => tool.name),
            add_to_agents: ['researcher']
          }
        };
      }, {})
    };
  }
  return {
    ...general,
    mcp_settings
  };
};

export function setEnableBackgroundInvestigation(value: boolean) {
  useSettingsStore.setState((state) => ({
    general: {
      ...state.general,
      enable_background_investigation: value
    }
  }));
  saveSettings();
}
loadSettings();
