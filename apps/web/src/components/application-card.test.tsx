import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { ApplicationCard } from "./application-card";

function renderCard() {
  return render(
    <DndContext>
      <SortableContext items={["a1"]}>
        <ApplicationCard id="a1" title="Engineer" company="Acme" updatedAt="2026-01-01T00:00:00Z" />
      </SortableContext>
    </DndContext>,
  );
}

describe("ApplicationCard", () => {
  it("does not nest the link inside an interactive role (axe nested-interactive)", () => {
    renderCard();
    const link = screen.getByRole("link", { name: "Engineer" });
    let el: HTMLElement | null = link.parentElement;
    while (el) {
      expect(el.getAttribute("role")).not.toBe("button");
      expect(el.getAttribute("tabindex")).toBeNull();
      el = el.parentElement;
    }
  });

  it("exposes a labelled drag handle button that is not an ancestor of the link", () => {
    renderCard();
    const handle = screen.getByRole("button", { name: "Move Engineer" });
    expect(handle.contains(screen.getByRole("link", { name: "Engineer" }))).toBe(false);
  });
});
