import { describe, it, expect } from "vitest";
import { parseHost, stripPort, RESERVED_SUBDOMAINS } from "./host";

describe("stripPort", () => {
  it("removes ports correctly", () => {
    expect(stripPort("localhost:3000")).toBe("localhost");
    expect(stripPort("shop-a.localhost:3000")).toBe("shop-a.localhost");
    expect(stripPort("yourdomain.com")).toBe("yourdomain.com");
    expect(stripPort("YOURDOMAIN.COM:8080")).toBe("yourdomain.com");
  });

  it("handles empty or falsy strings", () => {
    expect(stripPort("")).toBe("");
  });
});

describe("parseHost", () => {
  const rootDomain = "yourdomain.com";

  describe("Root domain detection", () => {
    it("identifies exact root domain", () => {
      expect(parseHost("yourdomain.com", rootDomain)).toEqual({ kind: "root" });
      expect(parseHost("yourdomain.com:3000", rootDomain)).toEqual({ kind: "root" });
    });

    it("handles case insensitivity", () => {
      expect(parseHost("YOURDOMAIN.COM:3000", rootDomain)).toEqual({ kind: "root" });
    });

    it("treats www and app as root", () => {
      expect(parseHost("www.yourdomain.com", rootDomain)).toEqual({ kind: "root" });
      expect(parseHost("app.yourdomain.com", rootDomain)).toEqual({ kind: "root" });
      expect(parseHost("www.yourdomain.com:3000", rootDomain)).toEqual({ kind: "root" });
    });

    it("treats all reserved subdomains as root", () => {
      for (const reserved of RESERVED_SUBDOMAINS) {
        expect(parseHost(`${reserved}.yourdomain.com`, rootDomain)).toEqual({
          kind: "root",
        });
      }
    });

    it("treats all vercel.app deployment hosts as root", () => {
      expect(parseHost("sellora-bay.vercel.app", rootDomain)).toEqual({ kind: "root" });
      expect(parseHost("sellora-bay-git-master.vercel.app:443", rootDomain)).toEqual({
        kind: "root",
      });
    });

    it("falls back to root on empty host", () => {
      expect(parseHost("", rootDomain)).toEqual({ kind: "root" });
      expect(parseHost(null, rootDomain)).toEqual({ kind: "root" });
    });
  });

  describe("Subdomain detection", () => {
    it("identifies standard tenant subdomains", () => {
      expect(parseHost("shop-a.yourdomain.com", rootDomain)).toEqual({
        kind: "subdomain",
        slug: "shop-a",
      });
      expect(parseHost("tech-store.yourdomain.com:443", rootDomain)).toEqual({
        kind: "subdomain",
        slug: "tech-store",
      });
    });

    it("handles uppercase in subdomains", () => {
      expect(parseHost("SHOP-A.YOURDOMAIN.COM", rootDomain)).toEqual({
        kind: "subdomain",
        slug: "shop-a",
      });
    });
  });

  describe("Development *.localhost handling", () => {
    const devRoot = "localhost:3000";

    it("identifies localhost root", () => {
      expect(parseHost("localhost:3000", devRoot)).toEqual({ kind: "root" });
      expect(parseHost("localhost", devRoot)).toEqual({ kind: "root" });
    });

    it("identifies *.localhost subdomains", () => {
      expect(parseHost("shop-a.localhost:3000", devRoot)).toEqual({
        kind: "subdomain",
        slug: "shop-a",
      });
      expect(parseHost("my-store.localhost", devRoot)).toEqual({
        kind: "subdomain",
        slug: "my-store",
      });
    });

    it("treats reserved subdomains on localhost as root", () => {
      expect(parseHost("www.localhost:3000", devRoot)).toEqual({ kind: "root" });
      expect(parseHost("app.localhost:3000", devRoot)).toEqual({ kind: "root" });
      expect(parseHost("dashboard.localhost:3000", devRoot)).toEqual({ kind: "root" });
      expect(parseHost("admin.localhost:3000", devRoot)).toEqual({ kind: "root" });
    });

    it("supports lvh.me fallback for local testing", () => {
      expect(parseHost("shop-a.lvh.me:3000", devRoot)).toEqual({
        kind: "subdomain",
        slug: "shop-a",
      });
      expect(parseHost("www.lvh.me:3000", devRoot)).toEqual({ kind: "root" });
    });
  });

  describe("Custom domain detection", () => {
    it("identifies non-root domains as custom", () => {
      expect(parseHost("mystore.com", rootDomain)).toEqual({
        kind: "custom",
        domain: "mystore.com",
      });
      expect(parseHost("shop.acme.co.uk:8080", rootDomain)).toEqual({
        kind: "custom",
        domain: "shop.acme.co.uk",
      });
    });
  });
});
