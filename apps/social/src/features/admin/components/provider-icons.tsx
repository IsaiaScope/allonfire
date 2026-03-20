import type { SVGProps } from "react";
import type { ProviderType } from "../actions/providers";

function AnthropicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
    </svg>
  );
}

function OpenRouterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M16.778 1.844v1.919q-.569-.026-1.138-.032-.708-.008-1.415.037c-1.93.126-4.023.728-6.149 2.237-2.911 2.066-2.731 1.95-4.14 2.75-.396.223-1.342.574-2.185.798-.841.225-1.753.333-1.751.333v4.229s.768.108 1.61.333c.842.224 1.789.575 2.185.799 1.41.798 1.228.683 4.14 2.75 2.126 1.509 4.22 2.11 6.148 2.236.88.058 1.716.041 2.555.005v1.918l7.222-4.168-7.222-4.17v2.176c-.86.038-1.611.065-2.278.021-1.364-.09-2.417-.357-3.979-1.465-2.244-1.593-2.866-2.027-3.68-2.508.889-.518 1.449-.906 3.822-2.59 1.56-1.109 2.614-1.377 3.978-1.466.667-.044 1.418-.017 2.278.02v2.176L24 6.014Z" />
    </svg>
  );
}

function GeminiIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" />
    </svg>
  );
}

function GroqIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 512 512"
      {...props}
    >
      <path d="M256.867 16.007c-92.47-.84-167.997 71.999-168.861 162.741-.84 90.767 73.319 164.926 165.789 165.766h58.08V282.93h-55.008c-57.767.672-105.118-44.784-105.79-101.519-.696-56.687 45.623-103.15 103.39-103.822h2.4c57.767 0 104.59 45.96 104.758 102.67v151.318c0 56.207-46.655 101.998-103.75 102.694a104.988 104.988 0 01-72.79-30.047l-44.424 43.63c30.983 30.432 72.599 47.712 116.038 48.144h2.208c91.27-1.344 164.59-73.99 165.093-163.581V176.42c-2.232-89.302-76.39-160.413-167.133-160.413z" />
    </svg>
  );
}

const PROVIDER_ICONS: Record<
  ProviderType,
  (props: SVGProps<SVGSVGElement>) => React.JSX.Element
> = {
  ANTHROPIC: AnthropicIcon,
  OPENROUTER: OpenRouterIcon,
  GOOGLE_GEMINI: GeminiIcon,
  GROQ: GroqIcon,
};

export function ProviderIcon({
  provider,
  ...props
}: SVGProps<SVGSVGElement> & { provider: ProviderType }) {
  const Icon = PROVIDER_ICONS[provider];
  return <Icon {...props} />;
}
