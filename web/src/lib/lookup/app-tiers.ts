import type { AppLookupSource } from "./types";
import { playStore, appStore } from "./sources/app";

export const appTier1: AppLookupSource[] = [playStore, appStore];

export const appTier2: AppLookupSource[] = [];

export const appSkipT2Only = new Set(["play-store", "app-store"]);
