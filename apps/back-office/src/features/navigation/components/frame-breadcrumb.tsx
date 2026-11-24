"use client";

import { AOFFrameBreadcrumb } from "@allonfire/ui/features/navigation/components/aof-frame-breadcrumb";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { StationNumber } from "./station-number";

/** A crumb's number, drawn as a station sign's. */
const stationMark = (number: string) => <StationNumber number={number} />;

/**
 * The frame's breadcrumb with the Back Office's station numbers: a client
 * binding, since the Design's mark is a function a Server Component cannot
 * hand a client one.
 */
export const FrameBreadcrumb = () => (
  <AOFFrameBreadcrumb app={BACK_OFFICE} crumbMark={stationMark} />
);
