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
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { parseErrorMessage } from "@/lib/parse-error-message";
import { deleteAllTopicsAction } from "../actions/topics";
import { CATEGORIES, DiscoverFilters } from "./discover-filters";
import { TopicList } from "./topic-list";

type PaginatedResult = {
  nextCursor: string | null;
  topics: Topic[];
  totalCount: number;
};

type DiscoverClientProps = {
  initialCategory: string;
  initialData: PaginatedResult;
};

async function fetchTopics(params: {
  category: string;
  cursor?: string;
  search: string;
  sort: string;
}): Promise<PaginatedResult> {
  const searchParams = new URLSearchParams();
  if (params.cursor) {
    searchParams.set("cursor", params.cursor);
  }
  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.search && params.search.length >= 2) {
    searchParams.set("search", params.search);
  }
  if (params.sort) {
    searchParams.set("sort", params.sort);
  }

  const res = await fetch(`/api/topics/discover?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch topics");
  }
  return res.json();
}

function DeleteAllTopicsButton({
  category,
  count,
  onDeleted,
}: {
  category: string;
  count: number;
  onDeleted: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const categoryLabel = category
    ? CATEGORIES.find((c) => c.value === category)?.label
    : undefined;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAllTopicsAction(category || undefined);
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
          <AlertDialogTitle>
            Delete {categoryLabel ? `${categoryLabel} topics` : "all topics"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {categoryLabel
              ? `This will permanently delete all ${count} discovered ${categoryLabel} topics.`
              : `This will permanently delete all ${count} discovered topics.`}{" "}
            Topics selected for generation will not be affected.
          </AlertDialogDescription>
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

export function DiscoverClient({
  initialCategory,
  initialData,
}: DiscoverClientProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  const matchesInitialFetch =
    category === initialCategory && search === "" && sort === "newest";

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["discover-topics", { category, search, sort }],
      queryFn: ({ pageParam }) =>
        fetchTopics({ cursor: pageParam, category, search, sort }),
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
  const totalCount = data?.pages[0]?.totalCount ?? initialData.totalCount;

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["discover-topics"] });
  }, [queryClient]);

  const handleCategoryChange = useCallback(
    (cat: string) => {
      setCategory(cat);
      router.replace(`/discover${cat ? `?category=${cat}` : ""}`, {
        scroll: false,
      });
    },
    [router]
  );

  return (
    <div className="space-y-4">
      <DiscoverFilters
        category={category}
        deleteButton={
          <DeleteAllTopicsButton
            category={category}
            count={totalCount}
            onDeleted={invalidateQueries}
          />
        }
        onCategoryChange={handleCategoryChange}
        onSearchChange={setSearch}
        onSortChange={setSort}
        search={search}
        sort={sort}
      />

      <TopicList
        filterKey={`${category}-${search}-${sort}`}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onAction={invalidateQueries}
        onFetchNextPage={fetchNextPage}
        topics={allTopics}
      />
    </div>
  );
}
