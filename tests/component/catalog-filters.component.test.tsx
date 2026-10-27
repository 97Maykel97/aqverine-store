// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CatalogFilters as CatalogFilterState } from "@/features/catalog/model/catalog-discovery";
import { CatalogFilters } from "@/features/catalog/ui/CatalogFilters";

afterEach(cleanup);

const initialFilters: CatalogFilterState = {
  category: "All",
  color: null,
  size: null,
  maxPrice: 9900,
  query: "",
  sort: "featured",
};

describe("catalog filter controls", () => {
  it("reports color and size choices and marks the selected color", () => {
    const onChange = vi.fn();
    const onReset = vi.fn();
    const props = {
      filters: initialFilters,
      colors: ["Синий", "Чёрный"],
      sizes: ["S", "M"],
      maximumPrice: 9900,
      resultCount: 6,
      onChange,
      onReset,
    };
    const { rerender } = render(<CatalogFilters {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Синий" }));
    expect(onChange).toHaveBeenCalledWith({ ...initialFilters, color: "Синий" });

    rerender(<CatalogFilters {...props} filters={{ ...initialFilters, color: "Синий" }} />);
    expect(screen.getByRole("button", { name: "Синий" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "M" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...initialFilters, color: "Синий", size: "M" });

    fireEvent.click(screen.getByRole("button", { name: "Сбросить" }));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
