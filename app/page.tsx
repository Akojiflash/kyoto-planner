"use client";

// Kyoto Trip Planner chat prototype. Drop in as app/page.tsx (Next.js App Router + Tailwind).
// Flow: ask for a trip -> three cards in three Kyoto areas -> Add to trip -> Review trip -> Secure my spots.

import { useEffect, useRef, useState } from "react";

// Error switch from the spec, section 4. Set to true, refresh, and send any message.
const FORCE_CHAT_ERROR = false;

const STAY_DATES = "11 to 13 Apr"; // fixed on every response

// Airbnb-style theme: Rausch coral for every primary action, neutral grays for everything else.
// The per-card accents (teal, amber, plum) stay on each card's biggest text, as the spec requires.
const RAUSCH = "#FF385C";
const brand = { backgroundColor: RAUSCH };

type Item =
  | { type: "stay"; image: string; property_name: string; location: string; price: string; dates: string; cost: number; booking_action: string }
  | { type: "experience"; image: string; title: string; location: string; short_description: string; duration: string; when: string; cost: number; details: string; details_action: string }
  | { type: "food"; image: string; restaurant_name: string; cuisine: string; location: string; when: string; cost: number; details: string; details_action: string };

// Mock response, in spec order: stay, experience, food. Each pick is in a different part of Kyoto.
// Costs are in yen for the whole booking (stay = 2 nights). Blank any text you want empty.
const MOCK_RESPONSE: { items: Item[] } = {
  items: [
    { type: "stay", image: "", property_name: "Machiya Rokkaku Guesthouse", location: "Nakagyo Ward, central Kyoto", price: "¥18,500 / night", dates: STAY_DATES, cost: 37000, booking_action: "" },
    { type: "experience", image: "", title: "Fushimi Inari dawn walk", location: "Fushimi Ward, south Kyoto", short_description: "Climb the torii gate trail before the crowds arrive.", duration: "2.5 hours", when: "12 Apr, 6:30 am", cost: 4500, details: "Meet at the main gate at 6:30 am. Wear walking shoes and bring water; the full loop to the summit is about 4 km.", details_action: "" },
    { type: "food", image: "", restaurant_name: "Tofu Kitchen Mizuki", cuisine: "Kaiseki-style tofu", location: "Arashiyama, west Kyoto", when: "12 Apr, 12:30 pm", cost: 6000, details: "Set courses start at lunch. Mention any allergies when you reserve.", details_action: "" },
  ],
};

const yen = (n: number) => `¥${n.toLocaleString("en-US")}`;
const nameOf = (i: Item) => (i.type === "stay" ? i.property_name : i.type === "experience" ? i.title : i.restaurant_name);
const whenOf = (i: Item) => (i.type === "stay" ? i.dates : i.when);
const KIND: Record<Item["type"], string> = { stay: "Stay", experience: "Experience", food: "Table" };

type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; status: "thinking" | "done" | "error"; request: string; items?: Item[] };

function Placeholder({ className }: { className: string }) {
  return <div aria-hidden className={`bg-gradient-to-br from-neutral-200 to-neutral-300 ${className}`} />;
}

function Img({ src, className }: { src: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" className={`object-cover ${className}`} /> : <Placeholder className={className} />;
}

type CardProps<T> = { item: T; added: boolean; secured: boolean; onToggle: () => void };

function AddButton({ added, secured, onToggle }: { added: boolean; secured: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      disabled={secured}
      aria-pressed={added}
      style={added ? { borderColor: RAUSCH, color: RAUSCH } : brand}
      className={`rounded-lg border px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-default ${
        added ? "bg-rose-50" : "border-transparent text-white hover:brightness-90"
      }`}
    >
      {secured ? "Secured" : added ? "Added. Tap to remove" : "Add to trip"}
    </button>
  );
}

function StayCard({ item, added, secured, onToggle }: CardProps<Extract<Item, { type: "stay" }>>) {
  return (
    <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <Img src={item.image} className="h-32 w-full" />
      <div className="space-y-1 p-4">
        <h3 className="text-base font-medium text-neutral-800">{item.property_name}</h3>
        <p className="text-sm text-neutral-500">{item.location}</p>
        <p className="pt-1 text-3xl font-bold text-teal-700">{item.price}</p>
        <p className="text-sm text-neutral-600">Dates: {STAY_DATES}</p>
        <div className="pt-3">
          <AddButton added={added} secured={secured} onToggle={onToggle} />
        </div>
      </div>
    </article>
  );
}

function ExperienceCard({ item, added, secured, onToggle }: CardProps<Extract<Item, { type: "experience" }>>) {
  const [open, setOpen] = useState(false);
  return (
    <article className="flex overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <Img src={item.image} className="w-28 shrink-0 self-stretch" />
      <div className="space-y-1 p-4">
        <h3 className="text-xl font-bold leading-snug text-amber-700">{item.title}</h3>
        <p className="text-sm text-neutral-500">{item.location}</p>
        <p className="text-sm text-neutral-600">{item.short_description}</p>
        <p className="text-sm text-neutral-500">{item.duration}, {item.when}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <AddButton added={added} secured={secured} onToggle={onToggle} />
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="rounded-lg border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500">
            {open ? "Hide details" : "Details"}
          </button>
        </div>
        {open && <p className="pt-2 text-sm text-neutral-700">{item.details}</p>}
      </div>
    </article>
  );
}

function FoodCard({ item, added, secured, onToggle }: CardProps<Extract<Item, { type: "food" }>>) {
  const [open, setOpen] = useState(false);
  return (
    <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="space-y-1 p-4">
        <h3 className="font-serif text-xl font-bold text-fuchsia-900">{item.restaurant_name}</h3>
        <p className="text-sm text-neutral-600">{item.cuisine}</p>
        <p className="text-sm text-neutral-500">{item.location}, {item.when}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <AddButton added={added} secured={secured} onToggle={onToggle} />
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="rounded-lg border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500">
            {open ? "Hide details" : "Details"}
          </button>
        </div>
        {open && <p className="pt-2 text-sm text-neutral-700">{item.details}</p>}
      </div>
      <Img src={item.image} className="h-14 w-full" />
    </article>
  );
}

function Card({ item, added, secured, onToggle }: CardProps<Item>) {
  if (item.type === "stay") return <StayCard item={item} added={added} secured={secured} onToggle={onToggle} />;
  if (item.type === "experience") return <ExperienceCard item={item} added={added} secured={secured} onToggle={onToggle} />;
  return <FoodCard item={item} added={added} secured={secured} onToggle={onToggle} />;
}

function Thinking() {
  return (
    <div role="status" aria-label="Thinking" className="flex w-fit items-center gap-1.5 rounded-2xl bg-neutral-100 px-4 py-3">
      {[0, 150, 300].map((d) => (
        <span key={d} style={{ animationDelay: `${d}ms` }} className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 motion-reduce:animate-pulse" />
      ))}
    </div>
  );
}

function ErrorBubble({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="max-w-sm rounded-2xl border border-neutral-300 bg-white p-4">
      <p className="text-sm font-semibold text-neutral-800">Kyoto Trip Planner</p>
      <p className="mt-1 text-sm text-neutral-600">Sorry, I couldn&apos;t put your Kyoto trip together. Please try again.</p>
      <button onClick={onRetry} style={brand} className="mt-3 rounded-lg px-4 py-2 text-sm font-medium text-white hover:brightness-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500">
        Try again
      </button>
    </div>
  );
}

// Review and secure sheet. Nothing is charged in this prototype.
function TripSheet({ picks, ref_, onRemove, onSecure, onClose }: { picks: Item[]; ref_: string | null; onRemove: (t: Item["type"]) => void; onSecure: () => void; onClose: () => void }) {
  const total = picks.reduce((s, i) => s + i.cost, 0);
  const areas = picks.map((i) => i.location.split(",")[0]).join(" → ");
  return (
    <div className="fixed inset-0 z-10 flex items-end bg-black/40" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Your Kyoto trip" onClick={(e) => e.stopPropagation()} className="mx-auto max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-800">{ref_ ? "Your Kyoto trip is secured" : "Review your Kyoto trip"}</h2>
        <p className="text-sm text-neutral-500">{STAY_DATES} · {areas}</p>
        {ref_ && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-neutral-800">Confirmation code {ref_}. Your spots are held for you.</p>}
        <ul className="mt-4 divide-y divide-neutral-200">
          {picks.map((i) => (
            <li key={i.type} className="flex items-start justify-between gap-3 py-3">
              <div>
                <p className="text-xs text-neutral-500">{KIND[i.type]}</p>
                <p className="text-sm font-medium text-neutral-800">{nameOf(i)}</p>
                <p className="text-sm text-neutral-500">{i.location} · {whenOf(i)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-neutral-800">{yen(i.cost)}</p>
                {!ref_ && <button onClick={() => onRemove(i.type)} className="text-sm text-neutral-500 underline hover:text-neutral-800">Remove</button>}
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
          <span className="text-sm text-neutral-600">Total</span>
          <span className="text-lg font-semibold text-neutral-800">{yen(total)}</span>
        </div>
        <p className="pt-1 text-xs text-neutral-500">Prototype only. No payment is taken.</p>
        <div className="mt-4 flex gap-2">
          {ref_ ? (
            <button onClick={onClose} style={brand} className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white hover:brightness-90">Done</button>
          ) : (
            <>
              <button onClick={onClose} className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Keep browsing</button>
              <button onClick={onSecure} disabled={picks.length === 0} style={{ backgroundColor: picks.length === 0 ? "#DDDDDD" : RAUSCH }} className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white hover:brightness-90">Secure my spots</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [trip, setTrip] = useState<Item[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  function toggle(item: Item) {
    setTrip((t) => (t.some((x) => x.type === item.type) ? t.filter((x) => x.type !== item.type) : [...t, item]));
  }

  function secure() {
    setCode("KYO-" + Math.random().toString(36).slice(2, 7).toUpperCase());
  }

  // Fake request: thinking animation, then either the error or the mock response.
  function respond(id: number) {
    setMsgs((m) => m.map((x) => (x.id === id && x.role === "assistant" ? { ...x, status: "thinking" } : x)));
    setTimeout(() => {
      setMsgs((m) =>
        m.map((x) => {
          if (x.id !== id || x.role !== "assistant") return x;
          return FORCE_CHAT_ERROR ? { ...x, status: "error" } : { ...x, status: "done", items: MOCK_RESPONSE.items };
        })
      );
    }, 1600);
  }

  function send(text: string) {
    const t = text.trim();
    if (!t) return;
    const aid = nextId.current + 1;
    nextId.current += 2;
    setMsgs((m) => [...m, { id: aid - 1, role: "user", text: t }, { id: aid, role: "assistant", status: "thinking", request: t }]);
    setDraft("");
    respond(aid);
  }

  return (
    <main style={{ fontFamily: '"Airbnb Cereal VF", Circular, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }} className="mx-auto flex h-screen max-w-xl flex-col bg-white">
      <header className="border-b border-neutral-200 px-4 py-3">
        <h1 style={{ color: RAUSCH }} className="text-center text-lg font-bold">Kyoto Trip Planner</h1>
      </header>

      <section className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {msgs.length === 0 && <p className="pt-10 text-center text-sm text-neutral-500">Try: Plan a weekend trip to Kyoto</p>}
        {msgs.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ml-auto w-fit max-w-xs rounded-2xl bg-neutral-800 px-4 py-2 text-sm text-white">
              {m.text}
            </div>
          ) : m.status === "thinking" ? (
            <Thinking key={m.id} />
          ) : m.status === "error" ? (
            <ErrorBubble key={m.id} onRetry={() => respond(m.id)} />
          ) : (
            <div key={m.id} className="space-y-3">
              {m.items?.map((it) => (
                <Card key={it.type} item={it} added={trip.some((x) => x.type === it.type)} secured={code !== null} onToggle={() => toggle(it)} />
              ))}
            </div>
          )
        )}
        <div ref={endRef} />
      </section>

      {trip.length > 0 && (
        <div className="flex items-center justify-between border-t border-neutral-200 bg-white px-4 py-2">
          <p className="text-sm font-medium text-neutral-800">{code ? `Trip secured, code ${code}` : `${trip.length} of 3 spots added`}</p>
          <button onClick={() => setReviewing(true)} style={brand} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white hover:brightness-90">
            {code ? "View trip" : "Review trip"}
          </button>
        </div>
      )}

      <div className="border-t border-neutral-200 p-3">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(draft)}
            placeholder="Plan a weekend trip to Kyoto"
            aria-label="Message"
            className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-black placeholder:text-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"
          />
          <button onClick={() => send(draft)} style={brand} className="rounded-xl px-4 py-2 text-sm font-medium text-white hover:brightness-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500">
            Send
          </button>
        </div>
      </div>

      {reviewing && (
        <TripSheet
          picks={trip}
          ref_={code}
          onRemove={(t) => setTrip((x) => x.filter((i) => i.type !== t))}
          onSecure={secure}
          onClose={() => setReviewing(false)}
        />
      )}
    </main>
  );
}
