import { vi } from "vitest";

// Mock Obsidian API
export class Notice {
  constructor(message: string, duration?: number) {
    // Mock implementation - do nothing in tests
  }
}

export class Modal {
  constructor(app: any) {}
  open() {}
  close() {}
  onOpen() {}
}

export class Plugin {}

export interface FrontMatterCache {
  [key: string]: any;
}

export interface TFile {
  path: string;
  extension: string;
  stat: {
    size: number;
  };
}

export interface App {}

export interface PluginManifest {}
