import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { AsciiReveal, AsciiSkeleton, type MascotName } from "ascii-reveal-legion";
import { drawArt } from "./art";
import "./styles.css";
import "./readme-cards.css";

// ?mode=skonly | skreveal | mascot   &theme=light | dark
const q = new URLSearchParams(location.search);
const MODE = (q.get("mode") || "skreveal") as "skonly" | "skreveal" | "mascot";
document.documentElement.setAttribute("data-theme", q.get("theme") === "dark" ? "dark" : "light");

function Chart() {
    const ref = useRef<HTMLCanvasElement>(null);
    useLayoutEffect(() => {
        const cv = ref.current!;
        const dpr = 2, W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
        cv.width = W; cv.height = H;
        const cs = getComputedStyle(document.documentElement);
        drawArt("chart", cv.getContext("2d", { willReadFrequently: true })!, W, H, dpr, {
            accent: cs.getPropertyValue("--accent").trim(), line: cs.getPropertyValue("--line").trim(), surface: cs.getPropertyValue("--bg").trim(),
        });
    }, []);
    return <canvas ref={ref} className="media chart" aria-hidden="true" />;
}

const Profile = () => (
    <div className="rc-fill">
        <div className="row">
            <img src="images/avatar.png" alt="" className="media avatar" />
            <div className="grow">
                <p className="title">Quan Hoang</p>
                <p className="small muted">Designer &amp; UX/UI Engineer</p>
            </div>
        </div>
        <p className="body">Designs and builds interfaces where motion explains state. Currently making ascii-reveal, an open-source loading effect for React.</p>
        <div className="row hair" style={{ paddingTop: 12 }}>
            <span className="tiny mono muted grow">2026</span>
            <span className="chip" data-ascii="fade">Building in public</span>
        </div>
        <div className="row" style={{ marginTop: "auto" }}>
            <button className="btn primary grow" type="button" data-ascii="fade">Say hello</button>
            <button className="btn grow" type="button" data-ascii="fade">View work</button>
        </div>
    </div>
);
const Product = () => (
    <div className="rc-fill">
        <img src="images/print.png" alt="" className="media photo" />
        <div className="row between" style={{ alignItems: "baseline" }}>
            <p className="title">Aura No. 3</p>
            <p className="title mono">€120.00</p>
        </div>
        <p className="small muted" style={{ marginTop: -8 }}>Giclée print · 50 × 70 cm · edition of 40</p>
        <button className="btn primary full" type="button" data-ascii="fade">Add to cart</button>
    </div>
);
const Stats = () => (
    <div className="rc-fill">
        <div className="row between">
            <p className="eyebrow">Weekly active users</p>
            <span className="chip" data-ascii="fade">+8.2%</span>
        </div>
        <p className="big">12,480</p>
        <p className="small muted" style={{ marginTop: -8 }}>vs 11,530 the week before</p>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            <Chart />
            <div className="axis"><span>Oct 7</span><span>Oct 20</span></div>
        </div>
    </div>
);

const sk = (p: Parameters<typeof AsciiSkeleton>[0]) => <AsciiSkeleton variant="dither" {...p} />;
const ProfileSk = () => (
    <div className="rc-fill" aria-hidden="true">
        <div className="row">
            <span className="avatar" style={{ display: "block" }}>{sk({ rows: 5, width: 56, height: 56, circle: true, seed: 3 })}</span>
            <div className="grow">{sk({ lines: 2, widths: ["45%", "70%"], seed: 5 })}</div>
        </div>
        {sk({ lines: 4, widths: ["100%", "96%", "100%", "38%"], seed: 7 })}
        <div className="row hair" style={{ paddingTop: 12 }}>
            <div className="grow">{sk({ lines: 1, widths: ["36px"], seed: 9 })}</div>
            {sk({ rows: 2, width: 140, height: 24, className: "btn-sk", seed: 10 })}
        </div>
        <div className="rows-2" style={{ marginTop: "auto" }}>
            {sk({ rows: 3, width: "100%", height: 35, className: "btn-sk", seed: 11 })}
            {sk({ rows: 3, width: "100%", height: 35, className: "btn-sk", seed: 12 })}
        </div>
    </div>
);
const ProductSk = () => (
    <div className="rc-fill" aria-hidden="true">
        <div className="photo-sk">{sk({ rows: 22, seed: 21 })}</div>
        <div className="row between">
            <div style={{ width: "40%" }}>{sk({ lines: 1, widths: ["100%"], seed: 22 })}</div>
            <div style={{ width: "28%" }}>{sk({ lines: 1, widths: ["100%"], seed: 23 })}</div>
        </div>
        {sk({ lines: 1, widths: ["85%"], seed: 24 })}
        {sk({ rows: 3, width: "100%", height: 35, className: "btn-sk", seed: 25 })}
    </div>
);
const StatsSk = () => (
    <div className="rc-fill" aria-hidden="true">
        <div className="row between">
            <div style={{ width: "55%" }}>{sk({ lines: 1, widths: ["100%"], seed: 31 })}</div>
            {sk({ rows: 2, width: 56, height: 22, className: "btn-sk", seed: 32 })}
        </div>
        {sk({ rows: 3, width: 180, height: 44, seed: 33 })}
        {sk({ lines: 1, widths: ["62%"], seed: 34 })}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="chart-sk">{sk({ rows: 14, seed: 35 })}</div>
            <div className="row between">
                <div style={{ width: 48 }}>{sk({ lines: 1, widths: ["100%"], seed: 36 })}</div>
                <div style={{ width: 48 }}>{sk({ lines: 1, widths: ["100%"], seed: 37 })}</div>
            </div>
        </div>
    </div>
);

const CARDS: { real: () => ReactNode; skel: () => ReactNode; mascot: MascotName }[] = [
    { real: Profile, skel: ProfileSk, mascot: "spider" },
    { real: Product, skel: ProductSk, mascot: "ghost" },
    { real: Stats, skel: StatsSk, mascot: "pumpkin" },
];

function Card({ i, go }: { i: number; go: number }) {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        if (!go) return;
        const at = (MODE === "mascot" ? 1500 : 900) + i * 300;
        const id = setTimeout(() => setReady(true), at);
        return () => clearTimeout(id);
    }, [go, i]);
    const c = CARDS[i];
    let inner: ReactNode;
    if (MODE === "skonly") inner = ready ? c.real() : c.skel();
    else if (MODE === "skreveal") inner = <AsciiReveal className="rc-fill" loading={!ready} revealOnMount={false}>{ready ? c.real() : c.skel()}</AsciiReveal>;
    else inner = <AsciiReveal className="rc-fill" loading={!ready} revealOnMount={false} mascot={c.mascot}>{c.real()}</AsciiReveal>;
    return <article className="card" data-ascii="surface">{inner}</article>;
}

function Page() {
    const [go, setGo] = useState(0);
    useEffect(() => { (window as unknown as Record<string, () => void>).__start = () => setGo((n) => n + 1); }, []);
    return <div className="rc"><main className="grid">{[0, 1, 2].map((i) => <Card key={i} i={i} go={go} />)}</main></div>;
}
createRoot(document.getElementById("root")!).render(<Page />);
