// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import {
  AOFImageFact,
  AOFImageFacts,
  AOFImageName,
} from "../components/aof-image-facts";

describe("AOFImageFacts", () => {
  it("sets each value under its own small label in a definition list, joined by nothing", () => {
    const html = renderToStaticMarkup(
      <AOFImageFacts>
        <AOFImageFact label="Name" mono={false}>
          <AOFImageName>sea.jpg</AOFImageName>
        </AOFImageFact>
        <AOFImageFact label="Size">1.5 MB</AOFImageFact>
      </AOFImageFacts>
    );
    expect(html).toContain("<dl");
    expect(html).toContain(">Name</dt>");
    expect(html).toContain(">Size</dt>");
    expect(html).not.toContain("·");
  });

  it("sets numbers in the mono face and a name as written", () => {
    const html = renderToStaticMarkup(
      <>
        <AOFImageFact label="Size">1</AOFImageFact>
        <AOFImageFact label="Name" mono={false}>
          sea
        </AOFImageFact>
      </>
    );
    const [number, name] = html.split("</div>");
    expect(number).toContain("font-mono");
    expect(name).not.toContain("font-mono");
  });

  it("cuts a name after two lines", () => {
    const html = renderToStaticMarkup(<AOFImageName>sea.jpg</AOFImageName>);
    expect(html).toContain("line-clamp-2");
  });
});
