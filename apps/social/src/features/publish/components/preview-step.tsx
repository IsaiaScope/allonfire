"use client";

import { Badge } from "@allonfire/ui/components/badge";
import { Button } from "@allonfire/ui/components/button";
import { Card } from "@allonfire/ui/components/card";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@allonfire/ui/components/carousel";
import { Skeleton } from "@allonfire/ui/components/skeleton";
import { cn } from "@allonfire/ui/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { PLATFORM_CONFIG } from "../constants/platforms";
import type { usePublishWizard } from "../hooks/use-publish-wizard";

type PublishWizardState = ReturnType<typeof usePublishWizard>["state"];
type PublishWizardActions = ReturnType<typeof usePublishWizard>["actions"];

function renderBoldText(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={part}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function ImageCarousel({ urls }: { urls: string[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const onSelect = useCallback(() => {
    if (!api) {
      return;
    }
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) {
      return;
    }
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <div className="mt-5">
      <Carousel opts={{ loop: true }} setApi={setApi}>
        <CarouselContent>
          {urls.map((url, i) => (
            <CarouselItem key={url}>
              {/* biome-ignore lint/performance/noImgElement: blob URL preview */}
              <img
                alt={`Slide ${i + 1}`}
                className="aspect-square w-full rounded-lg border object-contain"
                height={400}
                src={url}
                width={400}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="mt-2 flex items-center justify-center gap-3">
        <Button
          className="size-7 rounded-full"
          disabled={!api?.canScrollPrev()}
          onClick={() => api?.scrollPrev()}
          size="icon"
          variant="default"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: count }).map((_, i) => {
            const dotKey = `dot-${i}`;
            return (
              <button
                className={cn(
                  "size-2 rounded-full transition-colors",
                  i === current ? "bg-primary" : "bg-muted-foreground/30"
                )}
                key={dotKey}
                onClick={() => api?.scrollTo(i)}
                type="button"
              />
            );
          })}
        </div>
        <Button
          className="size-7 rounded-full"
          disabled={!api?.canScrollNext()}
          onClick={() => api?.scrollNext()}
          size="icon"
          variant="default"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

type PreviewStepProps = {
  state: PublishWizardState;
  actions: PublishWizardActions;
  onAdapt: () => void;
  isAdapting: boolean;
  onNext: () => void;
  onBack: () => void;
};

export function PreviewStep({
  state,
  actions,
  onAdapt,
  isAdapting,
  onNext,
  onBack,
}: PreviewStepProps) {
  const hasAdapted = useRef(false);

  useEffect(() => {
    if (!hasAdapted.current && state.platformContents.length === 0) {
      hasAdapted.current = true;
      onAdapt();
    }
  }, [onAdapt, state.platformContents.length]);

  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);

  function handleContentEdit(platform: string, newContent: string) {
    const updated = state.platformContents.map((pc) => {
      if (pc.platform === platform) {
        const config = PLATFORM_CONFIG[platform];
        const charLimit = config?.charLimit ?? 1000;
        return {
          ...pc,
          adaptedContent: newContent,
          charCount: newContent.length,
          isOverLimit: newContent.length > charLimit,
        };
      }
      return pc;
    });
    actions.setPlatformContents(updated);
  }

  if (isAdapting) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground text-sm">
          Adapting content for each platform...
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {state.selectedPlatforms.map((platform) => (
            <Card className="p-3" key={platform}>
              <Skeleton className="mb-4 h-6 w-32" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="mb-4 h-4 w-1/2" />
              {state.imagePreviewUrls.length > 0 && (
                <Skeleton className="aspect-square w-full rounded-lg" />
              )}
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {state.platformContents.map((pc) => {
          const config = PLATFORM_CONFIG[pc.platform] ?? {
            label: pc.platform,
            icon: pc.platform[0],
            charLimit: 1000,
          };
          const isEditing = editingPlatform === pc.platform;

          return (
            <Card className="gap-0 overflow-hidden py-0" key={pc.platform}>
              <div className="flex items-center gap-2 border-b px-3 py-2.5">
                <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 font-bold text-primary text-xs">
                  {config.icon}
                </span>
                <span className="font-medium">{config.label}</span>
                <div className="ml-auto flex items-center gap-2">
                  <Badge variant={pc.isOverLimit ? "destructive" : "secondary"}>
                    {pc.charCount}/{config.charLimit}
                  </Badge>
                  <Button
                    className="size-7"
                    onClick={() =>
                      setEditingPlatform(isEditing ? null : pc.platform)
                    }
                    size="icon"
                    variant="ghost"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="px-3 pt-3 pb-4">
                {isEditing ? (
                  <textarea
                    className={cn(
                      "min-h-[150px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:border-ring focus-visible:outline-none",
                      pc.isOverLimit && "border-destructive"
                    )}
                    onChange={(e) =>
                      handleContentEdit(pc.platform, e.target.value)
                    }
                    value={pc.adaptedContent}
                  />
                ) : (
                  <div
                    className={cn(
                      "min-h-[80px] whitespace-pre-wrap text-sm leading-relaxed",
                      pc.isOverLimit && "text-destructive"
                    )}
                  >
                    {renderBoldText(pc.adaptedContent)}
                  </div>
                )}
                {state.imagePreviewUrls.length === 1 &&
                  state.imagePreviewUrls[0] && (
                    // biome-ignore lint/performance/noImgElement: blob URL preview, not optimizable by next/image
                    <img
                      alt="Post attachment"
                      className="mt-5 aspect-square w-full rounded-lg border object-contain"
                      height={400}
                      src={state.imagePreviewUrls[0]}
                      width={400}
                    />
                  )}
                {state.imagePreviewUrls.length > 1 && (
                  <ImageCarousel urls={state.imagePreviewUrls} />
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button className="w-full sm:w-auto" onClick={onBack} variant="ghost">
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
        <Button className="w-full sm:w-auto" onClick={onNext}>
          Next
          <ArrowRight className="ml-1.5 size-4" />
        </Button>
      </div>
    </div>
  );
}
