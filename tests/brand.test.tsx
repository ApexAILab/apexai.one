import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandMark } from "@/components/brand/BrandMark";

describe("BrandMark", () => {
  it("can expose an accessible title when used independently", () => {
    render(<BrandMark title="APEXAI" />);
    expect(screen.getByRole("img", { name: "APEXAI" })).toBeInTheDocument();
  });
});
