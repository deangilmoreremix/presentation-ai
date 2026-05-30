import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "@/components/landing/LandingPage";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

describe("LandingPage", () => {
  it("renders the main heading", () => {
    render(<LandingPage />);
    expect(screen.getByText(/Create Beautiful Presentations/)).toBeInTheDocument();
  });

  it("renders the hero description", () => {
    render(<LandingPage />);
    expect(screen.getByText(/open-source alternative to Gamma.app/)).toBeInTheDocument();
  });

  it("renders feature cards", () => {
    render(<LandingPage />);
    expect(screen.getByText("AI-Powered Content Generation")).toBeInTheDocument();
    expect(screen.getByText("40+ Built-in Themes")).toBeInTheDocument();
  });

  it("renders call-to-action buttons", () => {
    render(<LandingPage />);
    expect(screen.getByText("Start Creating Free")).toBeInTheDocument();
    expect(screen.getByText("View Live Demo")).toBeInTheDocument();
  });

  it("renders tech stack badges", () => {
    render(<LandingPage />);
    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
  });
});