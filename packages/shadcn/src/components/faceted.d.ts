import { useRender } from "@base-ui/react/use-render";
import { Command as CommandPrimitive } from "cmdk";
import * as React from "react";
import { Command, CommandEmpty, CommandGroup, CommandList, CommandSeparator } from "@allonfire/shadcn/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@allonfire/shadcn/components/popover";
type FacetedSelectedValue<Multiple extends boolean> = Multiple extends true ? string[] : string;
interface FacetedOption {
    label: string;
    value: string;
}
interface FacetedProps<Multiple extends boolean = false> extends Omit<React.ComponentProps<typeof Popover>, "onOpenChange"> {
    value?: FacetedSelectedValue<Multiple>;
    defaultValue?: FacetedSelectedValue<Multiple>;
    onValueChange?: (value: FacetedSelectedValue<Multiple> | undefined) => void;
    onOpenChange?: (open: boolean) => void;
    items?: FacetedOption[];
    multiple?: Multiple;
}
declare function Faceted<Multiple extends boolean = false>({ open: openProp, defaultOpen, onOpenChange, value, defaultValue, onValueChange, items, multiple, ...props }: FacetedProps<Multiple>): React.JSX.Element;
declare function FacetedTrigger({ className, ...props }: React.ComponentProps<typeof PopoverTrigger>): React.JSX.Element;
interface FacetedValueProps {
    placeholder?: React.ReactNode;
    children?: React.ReactNode | ((selected: FacetedOption[]) => React.ReactNode);
}
declare function FacetedValue({ placeholder, children, }: FacetedValueProps): string | number | bigint | boolean | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | React.JSX.Element | null | undefined;
declare function FacetedBadgeList({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element;
declare function FacetedBadge({ className, render, ...props }: useRender.ComponentProps<"span">): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
interface FacetedContentProps extends React.ComponentProps<typeof PopoverContent>, Pick<React.ComponentProps<typeof Command>, "shouldFilter" | "filter" | "loop"> {
}
declare function FacetedContent({ className, children, shouldFilter, filter, loop, ...props }: FacetedContentProps): React.JSX.Element;
interface FacetedInputProps extends React.ComponentProps<typeof CommandPrimitive.Input> {
    variant?: "default" | "line";
}
declare function FacetedInput({ variant, className, ref, ...props }: FacetedInputProps): React.JSX.Element;
declare function FacetedList({ ...props }: React.ComponentProps<typeof CommandList>): React.JSX.Element;
declare function FacetedEmpty({ ...props }: React.ComponentProps<typeof CommandEmpty>): React.JSX.Element;
declare function FacetedLoading({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Loading>): React.JSX.Element;
declare function FacetedGroup({ ...props }: React.ComponentProps<typeof CommandGroup>): React.JSX.Element;
interface FacetedItemProps extends React.ComponentProps<typeof CommandPrimitive.Item> {
    value: string;
}
declare function FacetedItem({ value, onSelect, ...props }: FacetedItemProps): React.JSX.Element;
declare function FacetedItemIndicator({ className, children, ...props }: React.ComponentProps<"span">): React.JSX.Element;
declare function FacetedClear({ className, children, onSelect, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>): React.JSX.Element | null;
declare function FacetedSeparator({ ...props }: React.ComponentProps<typeof CommandSeparator>): React.JSX.Element;
export { Faceted, FacetedBadge, FacetedBadgeList, FacetedClear, FacetedContent, FacetedEmpty, FacetedGroup, FacetedInput, FacetedItem, FacetedItemIndicator, FacetedList, FacetedLoading, FacetedSeparator, FacetedTrigger, FacetedValue, };
