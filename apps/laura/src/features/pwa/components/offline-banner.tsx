"use client";

import { AOFOfflineBanner } from "@allonfire/ui/features/pwa/components/aof-offline-banner";
import { OfflineCard } from "./offline-card";

/** The shared offline banner, in Laura's card. */
export const OfflineBanner = () => <AOFOfflineBanner Card={OfflineCard} />;
