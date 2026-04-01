import { Heart } from "lucide-react";

type LoadingSpinnerProps = {
  message: string;
};

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Heart className="size-4 animate-pulse fill-primary text-primary" />
      <span className="text-muted-foreground text-sm italic tracking-wide">
        {message}
      </span>
      <Heart className="size-4 animate-pulse fill-primary text-primary" />
    </div>
  );
}
