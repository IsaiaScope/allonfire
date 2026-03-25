"use client";

import type { Platform } from "@allonfire/database";
import { useReducer } from "react";
import type {
  PlatformContent,
  PublishResultItem,
  WizardStep,
} from "../types/publish-types";

type LoadingPhase = "idle" | "elaborating" | "adapting" | "publishing";

type WizardState = {
  step: WizardStep;
  originalContent: string;
  imageFiles: File[];
  imagePreviewUrls: string[];
  selectedPlatforms: Platform[];
  platformContents: PlatformContent[];
  results: PublishResultItem[];
  loadingPhase: LoadingPhase;
};

type WizardAction =
  | { type: "SET_STEP"; step: WizardStep }
  | { type: "SET_CONTENT"; content: string }
  | { type: "ADD_IMAGES"; files: File[]; previewUrls: string[] }
  | { type: "REMOVE_IMAGE"; index: number }
  | { type: "REORDER_IMAGES"; files: File[]; previewUrls: string[] }
  | { type: "TOGGLE_PLATFORM"; platform: Platform }
  | { type: "SET_PLATFORM_CONTENTS"; contents: PlatformContent[] }
  | { type: "SET_RESULTS"; results: PublishResultItem[] }
  | { type: "SET_LOADING_PHASE"; phase: LoadingPhase }
  | { type: "RESET" };

const initialState: WizardState = {
  step: "compose",
  originalContent: "",
  imageFiles: [],
  imagePreviewUrls: [],
  selectedPlatforms: [],
  platformContents: [],
  results: [],
  loadingPhase: "idle",
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_CONTENT":
      return { ...state, originalContent: action.content };
    case "ADD_IMAGES":
      return {
        ...state,
        imageFiles: [...state.imageFiles, ...action.files],
        imagePreviewUrls: [...state.imagePreviewUrls, ...action.previewUrls],
      };
    case "REMOVE_IMAGE": {
      const url = state.imagePreviewUrls[action.index];
      if (url) {
        URL.revokeObjectURL(url);
      }
      return {
        ...state,
        imageFiles: state.imageFiles.filter((_, i) => i !== action.index),
        imagePreviewUrls: state.imagePreviewUrls.filter(
          (_, i) => i !== action.index
        ),
      };
    }
    case "REORDER_IMAGES":
      return {
        ...state,
        imageFiles: action.files,
        imagePreviewUrls: action.previewUrls,
      };
    case "TOGGLE_PLATFORM": {
      const exists = state.selectedPlatforms.includes(action.platform);
      return {
        ...state,
        selectedPlatforms: exists
          ? state.selectedPlatforms.filter((p) => p !== action.platform)
          : [...state.selectedPlatforms, action.platform],
      };
    }
    case "SET_PLATFORM_CONTENTS":
      return { ...state, platformContents: action.contents };
    case "SET_RESULTS":
      return { ...state, results: action.results };
    case "SET_LOADING_PHASE":
      return { ...state, loadingPhase: action.phase };
    case "RESET":
      for (const url of state.imagePreviewUrls) {
        URL.revokeObjectURL(url);
      }
      return initialState;
    default:
      return state;
  }
}

export function usePublishWizard() {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const actions = {
    setStep: (step: WizardStep) => dispatch({ type: "SET_STEP", step }),
    setContent: (content: string) => dispatch({ type: "SET_CONTENT", content }),
    addImages: (files: File[], previewUrls: string[]) =>
      dispatch({ type: "ADD_IMAGES", files, previewUrls }),
    removeImage: (index: number) => dispatch({ type: "REMOVE_IMAGE", index }),
    reorderImages: (files: File[], previewUrls: string[]) =>
      dispatch({ type: "REORDER_IMAGES", files, previewUrls }),
    togglePlatform: (platform: Platform) =>
      dispatch({ type: "TOGGLE_PLATFORM", platform }),
    setPlatformContents: (contents: PlatformContent[]) =>
      dispatch({ type: "SET_PLATFORM_CONTENTS", contents }),
    setResults: (results: PublishResultItem[]) =>
      dispatch({ type: "SET_RESULTS", results }),
    setPublishing: (value: boolean) =>
      dispatch({
        type: "SET_LOADING_PHASE",
        phase: value ? "publishing" : "idle",
      }),
    setElaborating: (value: boolean) =>
      dispatch({
        type: "SET_LOADING_PHASE",
        phase: value ? "elaborating" : "idle",
      }),
    setAdapting: (value: boolean) =>
      dispatch({
        type: "SET_LOADING_PHASE",
        phase: value ? "adapting" : "idle",
      }),
    reset: () => dispatch({ type: "RESET" }),
  };

  return { state, actions };
}
