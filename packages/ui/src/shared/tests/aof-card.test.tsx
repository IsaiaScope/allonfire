// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import {
  AOFCard,
  AOFCardContent,
  AOFCardHeader,
  AOFCardTitle,
} from "../components/aof-card";

describe("AOFCard", () => {
  it("draws shadcn's card and keeps the caller's classes", () => {
    const html = renderToStaticMarkup(
      <AOFCard className="caller-class">
        <AOFCardHeader>
          <AOFCardTitle>Title</AOFCardTitle>
        </AOFCardHeader>
        <AOFCardContent>Body</AOFCardContent>
      </AOFCard>
    );
    expect(html).toContain('data-slot="card"');
    expect(html).toContain("caller-class");
    expect(html).toContain("Title");
    expect(html).toContain("Body");
  });
});
