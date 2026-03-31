import { Button } from "@allonfire/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { BrainCircuit, Gamepad2, PlusCircle, Trophy } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function GameHub() {
  const t = useTranslations("Games");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gamepad2 className="size-5 text-primary" />
              <CardTitle>{t("memoryTitle")}</CardTitle>
            </div>
            <CardDescription>{t("memoryDescription")}</CardDescription>
          </CardHeader>
          <CardFooter className="gap-2">
            <Button asChild className="sm:h-9 sm:px-4" size="sm">
              <Link href="/games/memory">{t("play")}</Link>
            </Button>
            <Button
              asChild
              className="sm:h-9 sm:px-4"
              size="sm"
              variant="outline"
            >
              <Link href="/games/memory/leaderboard">
                <Trophy className="mr-1 size-4" />
                {t("leaderboardTitle")}
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BrainCircuit className="size-5 text-primary" />
              <CardTitle>{t("quizTitle")}</CardTitle>
            </div>
            <CardDescription>{t("quizDescription")}</CardDescription>
          </CardHeader>
          <CardFooter className="flex-wrap gap-2">
            <Button asChild className="sm:h-9 sm:px-4" size="sm">
              <Link href="/games/quiz">{t("play")}</Link>
            </Button>
            <Button
              asChild
              className="sm:h-9 sm:px-4"
              size="sm"
              variant="outline"
            >
              <Link href="/games/quiz/leaderboard">
                <Trophy className="mr-1 size-4" />
                {t("leaderboardTitle")}
              </Link>
            </Button>
            <Button
              asChild
              className="sm:h-9 sm:px-4"
              size="sm"
              variant="outline"
            >
              <Link href="/games/quiz/upload">
                <PlusCircle className="mr-1 size-4" />
                {t("quizUploadButton")}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
