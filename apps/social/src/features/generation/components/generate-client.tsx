"use client";

import type { Topic } from "@allonfire/database";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@allonfire/ui/components/alert-dialog";
import { Button } from "@allonfire/ui/components/button";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAllSelectedTopicsAction } from "@/features/topics/actions/topics";
import { parseErrorMessage } from "@/lib/parse-error-message";
import { GenerateFilters, RATINGS } from "./generate-filters";
import { GenerateTopicList } from "./generate-topic-list";

export type TopicWithPrompts = Topic & {
  prompts: { id: string; rating: string | null; ratingNote: string | null }[];
};

type PaginatedResult = {
  nextCursor: string | null;
  topics: TopicWithPrompts[];
  totalCount: number | null;
};

type GenerateClientProps = {
  initialData: PaginatedResult;
};

async function fetchTopics(params: {
  cursor?: string;
  rating: string;
  search: string;
}): Promise<PaginatedResult> {
  const searchParams = new URLSearchParams();
  if (params.cursor) {
    searchParams.set("cursor", params.cursor);
  }
  if (params.rating === "HAS_NOTES") {
    searchParams.set("hasNotes", "true");
  } else if (params.rating) {
    searchParams.set("rating", params.rating);
  }
  if (params.search && params.search.length >= 2) {
    searchParams.set("search", params.search);
  }

  const res = await fetch(`/api/topics/generate?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch topics");
  }
  return res.json();
}

function DeleteAllSelectedButton({
  count,
  onDeleted,
  rating,
}: {
  count: number;
  onDeleted: () => void;
  rating: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const hasNotes = rating === "HAS_NOTES";

  let description = `This will permanently delete all ${count} selected topics.`;
  if (hasNotes) {
    description = `This will permanently delete all ${count} selected topics with noted prompts.`;
  } else if (rating) {
    const ratingLabel = RATINGS.find(
      (r) => r.value === rating
    )?.label?.toLowerCase();
    description = `This will permanently delete all ${count} selected topics with ${ratingLabel}-rated prompts.`;
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAllSelectedTopicsAction({
        rating: hasNotes
          ? undefined
          : (rating as "POSITIVE" | "NEGATIVE") || undefined,
        hasNotes: hasNotes || undefined,
      });
      setOpen(false);
      if (result.success) {
        onDeleted();
      } else {
        toast.error("Failed to delete topics", {
          description: parseErrorMessage(
            result.error ?? "An unexpected error occurred."
          ),
        });
      }
    });
  }

  if (count === 0) {
    return null;
  }

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger asChild>
        <Button
          className="relative h-7 items-center gap-1 pr-4 pl-2 text-xs"
          variant="destructive"
        >
          <Trash2 className="size-3" />
          Delete
          <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-secondary font-semibold text-[10px] text-secondary-foreground">
            {count}
          </span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete selected topics?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleDelete}>
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function GenerateClient({ initialData }: GenerateClientProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState("");
  const [search, setSearch] = useState("");

  const matchesInitialFetch = rating === "" && search === "";

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["generate-topics", { rating, search }],
      queryFn: ({ pageParam }) =>
        fetchTopics({ cursor: pageParam, rating, search }),
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      ...(matchesInitialFetch && {
        initialData: {
          pages: [initialData],
          pageParams: [undefined],
        },
      }),
    });

  const allTopics = useMemo(
    () => data?.pages.flatMap((page) => page.topics) ?? [],
    [data]
  );
  const totalCount = data?.pages[0]?.totalCount ?? initialData.totalCount ?? 0;

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["generate-topics"] });
  }, [queryClient]);

  return (
    <div className="space-y-4">
      <GenerateFilters
        deleteButton={
          <DeleteAllSelectedButton
            count={totalCount}
            onDeleted={invalidateQueries}
            rating={rating}
          />
        }
        onRatingChange={setRating}
        onSearchChange={setSearch}
        rating={rating}
        search={search}
      />

      <GenerateTopicList
        filterKey={`${rating}-${search}`}
        hasNextPage={hasNextPage}
        isFetching={isFetching}
        isFetchingNextPage={isFetchingNextPage}
        onAction={invalidateQueries}
        onFetchNextPage={fetchNextPage}
        topics={allTopics}
      />
    </div>
  );
}
