import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import LandingPage from "@/components/landing/LandingPage";

// Mock next/navigation (component uses useRouter)
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the theme provider hook (component uses useAppTheme)
vi.mock("@/provider/theme-provider", () => ({
  useAppTheme: () => ({ theme: "light", resolvedTheme: "light" }),
  ThemeProvider: ({ children }: any) => children,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(() => ({
    user: null,
    isLoaded: true,
    isSignedIn: false,
  })),
  UserButton: () => <div>User Button</div>,
  SignInButton: () => <div>Sign In</div>,
  SignUpButton: () => <div>Sign Up</div>,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Get mocked ClerkProvider
const { ClerkProvider } = await import("@clerk/nextjs");

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ClerkProvider>{children}</ClerkProvider>
);

describe("LandingPage", () => {
  it("renders the main heading", () => {
    render(<LandingPage />, { wrapper });
    expect(
      screen.getByText(/Create stunning presentations in seconds with AI/),
    ).toBeInTheDocument();
  });

  it("renders the hero description", () => {
    render(<LandingPage />, { wrapper });
    expect(
      screen.getByText(/Transform your ideas into professional presentations/),
    ).toBeInTheDocument();
  });

  it("renders feature cards", () => {
    render(<LandingPage />, { wrapper });
    expect(screen.getByText("40+ Built-in Themes")).toBeInTheDocument();
  });

  it("renders call-to-action buttons", () => {
    render(<LandingPage />, { wrapper });
    expect(screen.getAllByText("Get Started").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Start Creating Now").length).toBeGreaterThan(0);
  });

  it("renders tech stack badges", () => {
    render(<LandingPage />, { wrapper });
    expect(screen.getByText("Next.js 14")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
  });
});
