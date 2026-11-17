// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFDateRangeFilter } from "../components/aof-date-range-filter";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
/** `2026-11-26` as `Nov 26, 2026`, the way a page's own formatter would. */
const format = (day: string) => {
  const [year = "", month = "1", date = ""] = day.split("-");
  return `${MONTHS[Number(month) - 1]} ${Number(date)}, ${year}`;
};
const nothing = () => undefined;

const html = (value: { from: string; to: string } | null) =>
  renderToStaticMarkup(
    <AOFDateRangeFilter
      format={format}
      label="Created"
      labels={{ clear: "Clear" }}
      onValueChange={nothing}
      value={value}
    />
  ).replaceAll("<!-- -->", "");

describe("AOFDateRangeFilter", () => {
  it("shows only its label and a calendar while no day is chosen", () => {
    const markup = html(null);
    expect(markup).toContain("Created");
    expect(markup).not.toContain("Nov");
    expect(markup).toContain("tabler-icon-calendar");
    expect(markup).not.toContain("tabler-icon-circle-x");
  });

  it("writes both days with the page's formatter, and puts a cross in place of the calendar", () => {
    const markup = html({ from: "2026-11-26", to: "2026-11-28" });
    expect(markup).toContain("Created");
    expect(markup).toContain("Nov 26, 2026 – Nov 28, 2026");
    expect(markup).toContain("tabler-icon-circle-x");
    expect(markup).not.toContain("tabler-icon-calendar");
  });

  it("writes a one-day range once", () => {
    const markup = html({ from: "2026-11-26", to: "2026-11-26" });
    expect(markup).toContain("Nov 26, 2026");
    expect(markup.match(/Nov 26, 2026/g)).toHaveLength(1);
  });
});
