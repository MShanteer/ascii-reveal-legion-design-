import { createContext, useContext, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AsciiReveal, AsciiSkeleton, type SkeletonVariant } from "ascii-reveal";
import "./styles.css";
import "./scene.css";

const PROFILE = {
    name: "Ada Lindqvist",
    role: "Visual artist · Stockholm",
    cover: "images/card-cover.png",
    avatar: "images/card-avatar.png",
    stats: [
        ["12.4k", "Followers"],
        ["48", "Works"],
        ["3.1k", "Sold"],
    ] as [string, string][],
};
// warm the cover image so the reveal can sample it the moment data lands

/* ---- scene-only interactions ---- */
const Ctl = createContext({ following: false, follow: () => {}, playing: false, play: () => {}, t0: 0 });
function FollowBtn() {
    const c = useContext(Ctl);
    return <button type="button" className={"dc-btn sc-btn" + (c.following ? " on" : "")} onClick={c.follow}>{c.following ? "✓ Following" : "Follow"}</button>;
}
function PlayBtn() {
    const c = useContext(Ctl);
    return <button type="button" className="np-play sc-btn" onClick={c.play}>{c.playing ? "❚❚" : "▶"}</button>;
}
function ProgressFill() {
    const c = useContext(Ctl);
    const [, tick] = useState(0);
    useEffect(() => { if (!c.playing) return; const id = setInterval(() => tick((n) => n + 1), 100); return () => clearInterval(id); }, [c.playing]);
    const p = c.playing ? Math.min(1, 0.36 + (performance.now() - c.t0) / 1000 / 208) : 0.36;
    return <span style={{ width: `${(p * 100).toFixed(2)}%` }} />;
}
type SkProps = Parameters<typeof AsciiSkeleton>[0];

/** Big card: creator profile with cover art, avatar, stats and a button. */
function DemoProfile({
    data,
    variant,
    seed,
}: {
    data: typeof PROFILE | null;
    variant: SkeletonVariant;
    seed: number;
}) {
    if (data) {
        return (
            <div className="dcard">
                <div className="dc-cover">
                    <img src={data.cover} alt="" decoding="async" />
                </div>
                <div className="dc-body">
                    <div className="dc-head">
                        <img
                            className="dc-avatar"
                            src={data.avatar}
                            alt=""
                            decoding="async"
                        />
                        <FollowBtn />
                    </div>
                    <div className="dc-id">
                        <p className="dc-name">{data.name}</p>
                        <p className="dc-role">{data.role}</p>
                    </div>
                    <dl className="dc-stats">
                        {data.stats.map(([v, l]) => (
                            <div key={l}>
                                <dt>{l}</dt>
                                <dd>{v}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        );
    }
    const sk = (props: SkProps) => (
        <AsciiSkeleton variant={variant} {...props} />
    );
    return (
        <div className="dcard" aria-hidden="true">
            <div className="dc-cover">
                {sk({ rows: 26, className: "dc-fill", seed: seed + 70 })}
            </div>
            <div className="dc-body">
                <div className="dc-head">
                    <span className="dc-avatar dc-avatar-skel">
                        {sk({
                            rows: 5,
                            width: "100%",
                            height: "100%",
                            circle: true,
                            seed: seed + 40,
                        })}
                    </span>
                    {sk({
                        rows: 2,
                        width: 72,
                        height: 30,
                        className: "dc-btn-sk",
                        seed: seed + 3,
                    })}
                </div>
                <div className="dc-id">
                    {sk({
                        lines: 2,
                        widths: ["55%", "40%"],
                        seed,
                        className: "dc-skel-id",
                    })}
                </div>
                <div className="dc-stats">
                    {[0, 1, 2].map((i) => (
                        <div key={i}>
                            {sk({
                                lines: 2,
                                widths: ["60%", "45%"],
                                seed: seed + 11 * (i + 1),
                                className: "dc-skel-stat",
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/** Small card 1: a music player. Every visible part has a skeleton, including the progress bar and controls. */
function DemoPlayer({
    ready,
    variant,
}: {
    ready: boolean;
    variant: SkeletonVariant;
}) {
    const sk = (props: SkProps) => (
        <AsciiSkeleton variant={variant} {...props} />
    );
    return (
        <div className="dcard np">
            <div className="np-art">
                {ready ? (
                    <img src="images/album-art.png" alt="" decoding="async" />
                ) : (
                    sk({ rows: 9, className: "dc-fill", seed: 21 })
                )}
            </div>
            <div className="np-main">
                <p className="np-label">Now playing</p>
                {ready ? (
                    <div className="np-id">
                        <p className="np-title">Static Bloom</p>
                        <p className="np-artist">Glyph Theory</p>
                    </div>
                ) : (
                    <div className="np-id">
                        {sk({
                            lines: 2,
                            widths: ["70%", "45%"],
                            seed: 23,
                            className: "np-skel",
                        })}
                    </div>
                )}
                {ready ? (
                    <div className="np-bar">
                        <ProgressFill />
                    </div>
                ) : (
                    sk({
                        lines: 1,
                        widths: ["100%"],
                        seed: 24,
                        className: "np-bar-sk",
                    })
                )}
                <div className="np-times">
                    {ready ? (
                        <>
                            <span>1:12</span>
                            <span>3:28</span>
                        </>
                    ) : (
                        <>
                            {sk({ lines: 1, widths: ["28px"], seed: 25 })}
                            {sk({ lines: 1, widths: ["28px"], seed: 26 })}
                        </>
                    )}
                </div>
                <div className="np-ctrl" aria-hidden="true">
                    {ready ? (
                        <>
                            <span>⏮</span>
                            <PlayBtn />
                            <span>⏭</span>
                        </>
                    ) : (
                        <>
                            {sk({
                                rows: 1,
                                width: 14,
                                height: 12,
                                className: "np-ic-sk",
                                seed: 27,
                            })}
                            {sk({
                                rows: 3,
                                width: 32,
                                height: 32,
                                circle: true,
                                seed: 28,
                            })}
                            {sk({
                                rows: 1,
                                width: 14,
                                height: 12,
                                className: "np-ic-sk",
                                seed: 29,
                            })}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/** Small card 2: a customer story. While loading, even the gradient background and the logo are skeletons. */
function DemoStory({
    ready,
    variant,
}: {
    ready: boolean;
    variant: SkeletonVariant;
}) {
    const sk = (props: SkProps) => (
        <AsciiSkeleton variant={variant} {...props} />
    );
    return (
        <div className={`dcard story${ready ? "" : " is-loading"}`}>
            {ready ? (
                <img
                    className="st-bg"
                    src="images/story-bg.webp"
                    alt=""
                    decoding="async"
                />
            ) : (
                sk({ rows: 30, className: "st-bg st-bg-sk", seed: 30 })
            )}
            <div className="st-top">
                {ready ? (
                    <img
                        className="st-logo"
                        src="images/northwind-logo.svg"
                        alt=""
                        decoding="async"
                    />
                ) : (
                    sk({
                        rows: 3,
                        width: 32,
                        height: 32,
                        className: "st-logo-sk",
                        seed: 32,
                    })
                )}
                {ready ? (
                    <div>
                        <p className="st-co">Northwind Studio</p>
                        <p className="st-sub">
                            Ships 40 product launches a year.
                        </p>
                    </div>
                ) : (
                    <div className="st-skel-co">
                        {sk({ lines: 2, widths: ["46%", "78%"], seed: 31 })}
                    </div>
                )}
            </div>
            {ready ? (
                <p className="st-quote">
                    “Our loading states used to be gray boxes. Now people
                    screenshot them.”
                </p>
            ) : (
                <div className="st-skel-quote">
                    {sk({ lines: 2, widths: ["100%", "70%"], seed: 33 })}
                </div>
            )}
            <div className="st-foot">
                {ready ? (
                    <>
                        <img
                            className="st-av"
                            src="images/story-author.png"
                            alt=""
                            decoding="async"
                        />
                        <span className="st-by">
                            Maja Karlsson, Design lead
                        </span>
                        <a className="st-link" href="#story" onClick={(e) => e.preventDefault()}>Read the story →</a>
                    </>
                ) : (
                    <>
                        {sk({
                            rows: 3,
                            width: 28,
                            height: 28,
                            circle: true,
                            seed: 35,
                        })}
                        <div className="st-skel-by">
                            {sk({ lines: 1, widths: ["55%"], seed: 37 })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

type MascotName = "spider" | "ghost" | "pumpkin";
const MASCOTS: { m: MascotName; title: string; label: string; before: string; after: string; meta: string }[] = [
    { m: "spider", title: "Web crawler", label: "Pages indexed", before: "2,378", after: "4,617", meta: "52 new since midnight" },
    { m: "ghost", title: "Ghost sessions", label: "Idle users", before: "214", after: "363", meta: "last seen 4 min ago" },
    { m: "pumpkin", title: "Pumpkin spice index", label: "Price per latte", before: "€5.36", after: "€6.33", meta: "demand +37% this week" },
];

function useLoad(ms: number) {
    const [ready, setReady] = useState(false);
    const load = () => { setReady(false); setTimeout(() => setReady(true), ms); };
    return { ready, load };
}

function Labeled({ label, x, y, w, children }: { label: string; x: number; y: number; w: number; children: React.ReactNode }) {
    return (
        <div className="sc-item" style={{ left: x, top: y, width: w }}>
            <span className="sc-label">{label}</span>
            {children}
        </div>
    );
}

/* ---- scene 2: calendar event ---- */
function DemoEvent({ ready, joined, since, onJoin }: { ready: boolean; joined: boolean; since: number; onJoin: () => void }) {
    const sk = (props: SkProps) => <AsciiSkeleton variant="dither" {...props} />;
    const [, tick] = useState(0);
    useEffect(() => { if (!joined) return; const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id); }, [joined]);
    const secs = joined ? Math.floor((performance.now() - since) / 1000) : 0;
    if (!ready) {
        return (
            <div className="dcard ev" aria-hidden="true">
                <div className="ev-map">{sk({ rows: 14, className: "dc-fill", seed: 51 })}</div>
                <div className="ev-body">
                    <span className="ev-date ev-date-sk">{sk({ rows: 4, width: "100%", height: "100%", seed: 52 })}</span>
                    <div className="ev-title-sk">{sk({ lines: 1, widths: ["62%"], seed: 53 })}</div>
                    <div className="ev-rows">{sk({ lines: 2, widths: ["70%", "84%"], seed: 54 })}</div>
                    <div className="ev-att">
                        {[0, 1, 2].map((i) => <span key={i} className="ev-av-sk">{sk({ rows: 2, width: 28, height: 28, circle: true, seed: 55 + i })}</span>)}
                        <span className="ev-att-sk">{sk({ lines: 1, widths: ["60%"], seed: 58 })}</span>
                    </div>
                    <div className="ev-actions">
                        {sk({ rows: 2, width: "100%", height: 42, className: "ev-btn-sk", seed: 59 })}
                        {sk({ rows: 2, width: 96, height: 42, className: "ev-btn-sk", seed: 60 })}
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="dcard ev">
            <div className="ev-map"><img src="images/event-map.svg" alt="" decoding="async" /></div>
            <div className="ev-body">
                <span className="ev-date"><small>Thu</small>14</span>
                <h3 className="ev-title">Launch review</h3>
                <div className="ev-rows">
                    <p><span className="ev-ic">◷</span>2:00 – 3:00 PM · Video call</p>
                    <p><span className="ev-ic">⌖</span>Studio 4, Södermalm <span className="ev-link">Directions ›</span></p>
                </div>
                <div className="ev-att">
                    <img src="images/card-avatar.png" alt="" /><img src="images/story-author.png" alt="" /><img src="images/album-art.png" alt="" />
                    <span>5 going</span>
                </div>
                <div className="ev-actions">
                    <button type="button" className={"ev-join" + (joined ? " on" : "")} onClick={onJoin}>
                        {joined ? <>● In call · 0:{String(secs).padStart(2, "0")}</> : <>▶ Join call</>}
                    </button>
                    <button type="button" className="ev-decline">Decline</button>
                </div>
            </div>
        </div>
    );
}

/* ---- scene 3: mascot card ---- */
function SpookyCard({ s, go, index }: { s: (typeof MASCOTS)[number]; go: number; index: number }) {
    // starts in the loading state (mascot), then the data lands and decodes in
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!go) return;
        const id = setTimeout(() => setLoading(false), 2300 + index * 300);
        return () => clearTimeout(id);
    }, [go, index]);
    const val = s.after;
    return (
        <article className="card spooky-card sc-spooky" data-ascii="surface">
            <AsciiReveal className="stack" loading={loading} selector="[data-swap]" revealOnMount={false} mascot={s.m}>
                <p className="eyebrow">{s.title}</p>
                <div className="spooky-body">
                    <p className="small muted" data-swap>{s.label}</p>
                    <p className="big" data-swap>{val}</p>
                    <p className="small muted" data-swap>{s.meta}</p>
                </div>
                <p className="tiny mono muted spooky-code">mascot="{s.m}"</p>
            </AsciiReveal>
        </article>
    );
}

// ?portrait: the same scenes laid out for a 9:16 reel (600 × 1067 css px per scene)
const PORTRAIT = new URLSearchParams(location.search).has("portrait");
// ?tall: the desktop layout unchanged, on a 9:16 canvas (1200 × 2133 css px per scene), centred
const TALL = !PORTRAIT && new URLSearchParams(location.search).has("tall");
// ?readme: only the three cards, cropped tight, for the README animation (add &dark for the dark version)
const README = new URLSearchParams(location.search).has("readme");
const PH = PORTRAIT ? 1067 : TALL ? 2133 : 900;
const DX = TALL ? -200 : README ? -220 : 0;
const DY = TALL ? [607, 675, 722] : README ? [-180, 0, 0] : [0, 0, 0];
if (README) document.documentElement.classList.add("sc-readme");
if (README && new URLSearchParams(location.search).has("dark")) {
    document.documentElement.classList.add("sc-dark");
    document.documentElement.setAttribute("data-theme", "dark");
}
if (PORTRAIT) document.documentElement.classList.add("sc-portrait");
if (TALL) document.documentElement.classList.add("sc-tall");

function Scene() {
    const variant: SkeletonVariant = "dither";
    const profile = useLoad(README ? 900 : 1200), player = useLoad(README ? 1200 : 1800), story = useLoad(README ? 1500 : 2400), event = useLoad(1400);
    const [following, setFollowing] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [t0, setT0] = useState(0);
    const [joined, setJoined] = useState(false);
    const [since, setSince] = useState(0);
    const [spooky, setSpooky] = useState(0);
    useEffect(() => {
        const w = window as unknown as Record<string, () => void>;
        w.__start = () => { profile.load(); player.load(); story.load(); };
        w.__scene2 = () => event.load();
        w.__scene3 = () => setSpooky((n) => n + 1);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const ctl = { following, follow: () => setFollowing((f) => !f), playing, play: () => { setPlaying((p) => !p); setT0(performance.now()); }, t0 };
    return (
        <Ctl.Provider value={ctl}>
            <div className="sc-canvas">
                {/* scene 1 */}
                <Labeled label={PORTRAIT ? "Profile · 480 × 405" : "Profile · 520 × 455"} x={PORTRAIT ? 60 : 265 + DX} y={PORTRAIT ? 60 : 210 + DY[0]} w={PORTRAIT ? 480 : 520}>
                    <div className="slot slot-profile sc-fixed">
                        <AsciiReveal className="slot-fill" loading={!profile.ready} revealOnMount={false}>
                            <DemoProfile data={profile.ready ? PROFILE : null} variant={variant} seed={7} />
                        </AsciiReveal>
                    </div>
                </Labeled>
                <Labeled label="Now playing · 480 × 170" x={PORTRAIT ? 60 : 855 + DX} y={PORTRAIT ? 510 : 210 + DY[0]} w={480}>
                    <div className="slot slot-player">
                        <AsciiReveal className="slot-fill" loading={!player.ready} revealOnMount={false}>
                            <DemoPlayer ready={player.ready} variant={variant} />
                        </AsciiReveal>
                    </div>
                </Labeled>
                <Labeled label="Story · 480 × 260" x={PORTRAIT ? 60 : 855 + DX} y={PORTRAIT ? 725 : 430 + DY[0]} w={480}>
                    <div className="slot slot-story">
                        <AsciiReveal className="slot-fill" loading={!story.ready} revealOnMount={false}>
                            <DemoStory ready={story.ready} variant={variant} />
                        </AsciiReveal>
                    </div>
                </Labeled>

                {!README && (<>
                {/* scene 2 */}
                <Labeled label="Event · 440 × 445" x={PORTRAIT ? 80 : 580 + DX} y={PH + (PORTRAIT ? 300 : 160 + DY[1])} w={440}>
                    <AsciiReveal className="slot-fill" loading={!event.ready} revealOnMount={false}>
                        <DemoEvent ready={event.ready} joined={joined} since={since} onJoin={() => { setJoined(true); setSince(performance.now()); }} />
                    </AsciiReveal>
                </Labeled>

                {/* scene 3 */}
                <h2 className="sc-spooky-title" style={{ top: 2 * PH + (PORTRAIT ? 170 : 140 + DY[2]) }}>Halloween is ready.</h2>
                {MASCOTS.map((s, i) => (
                    <div key={s.m} className="sc-item" style={PORTRAIT
                        ? { left: [30, 310, 170][i], top: 2 * PH + 270 + (i === 2 ? 330 : 0), width: 260 }
                        : { left: 356 + DX + i * 304, top: 2 * PH + 250 + DY[2], width: 280 }}>
                        <SpookyCard s={s} go={spooky} index={i} />
                    </div>
                ))}
                </>)}
            </div>
        </Ctl.Provider>
    );
}

createRoot(document.getElementById("root")!).render(<Scene />);
