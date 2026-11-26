"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ITEMS } from "@/lib/pathway/questionnaire";
import { useI18n } from "../../../i18n-client";

type Turn = { role: "agent" | "patient"; text: string };
type Phase = "ringing" | "connecting" | "live" | "ended";

// Minimal typings for the (prefixed) Web Speech API.
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
function getRecognizer(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function CallScreen({ enrollmentId, photos, suggested, claudeReady }: { enrollmentId: string; photos: string[]; suggested: string; claudeReady: boolean }) {
  const { t, lang } = useI18n();
  const [phase, setPhase] = useState<Phase>("ringing");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [video, setVideo] = useState<boolean | null>(null);
  const [feed, setFeed] = useState<"synthetic" | "camera">("synthetic");
  const [feedPhoto, setFeedPhoto] = useState(suggested);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(true);
  const [autoListen, setAutoListen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<"completed" | "unreached" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const sttSupported = typeof window !== "undefined" && getRecognizer() !== null;
  const locale = lang === "fr" ? "fr-CA" : "en-CA";

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns]);

  useEffect(() => {
    if (video && feed === "camera" && !streamRef.current) {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
        .then((s) => {
          streamRef.current = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(() => {
          setError(t("call.cameraDenied"));
          setFeed("synthetic");
        });
    }
    if ((feed !== "camera" || !video) && streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
  }, [video, feed, t]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    recRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  function say(text: string, then?: () => void) {
    if (!speak || typeof window === "undefined" || !window.speechSynthesis) {
      then?.();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale;
    u.rate = 1;
    u.onend = () => then?.();
    window.speechSynthesis.speak(u);
  }

  function listen() {
    const R = getRecognizer();
    if (!R || listening) return;
    const r = new R();
    r.lang = locale;
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      if (text) void send({ action: "say", text });
    };
    r.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") setError(t("call.micError", { err: e.error }));
    };
    r.onend = () => setListening(false);
    recRef.current = r;
    setListening(true);
    r.start();
  }

  async function post(body: Record<string, unknown>) {
    const res = await fetch(`/api/call/${enrollmentId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
    return j;
  }

  async function answer() {
    setPhase("connecting");
    setError(null);
    try {
      const j = await post({ action: "start", lang });
      setTurns([{ role: "agent", text: j.say }]);
      setPhase("live");
      say(j.say, () => autoListen && listen());
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
      setPhase("ringing");
    }
  }

  async function decline() {
    await post({ action: "unreached" }).catch(() => undefined);
    setResult("unreached");
    setPhase("ended");
  }

  async function capture(): Promise<string | null> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    if (feed === "camera" && videoRef.current && videoRef.current.videoWidth) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
    } else if (imgRef.current && imgRef.current.naturalWidth) {
      canvas.width = imgRef.current.naturalWidth;
      canvas.height = imgRef.current.naturalHeight;
      ctx.drawImage(imgRef.current, 0, 0);
    } else return null;
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  async function send(body: { action: "say"; text: string } | { action: "photo"; image: string }) {
    if (busy) return;
    setBusy(true);
    setError(null);
    if (body.action === "say") setTurns((x) => [...x, { role: "patient", text: body.text }]);
    else setTurns((x) => [...x, { role: "patient", text: t("call.photoSent") }]);
    try {
      const j = await post(body);
      setTurns((x) => [...x, { role: "agent", text: j.say }]);
      setDraft(j.draft ?? {});
      if (typeof j.video === "boolean") setVideo(j.video);
      if (j.finished) {
        setResult(j.finished);
        say(j.say);
        setPhase("ended");
        return;
      }
      if (j.requestPhoto) {
        say(j.say, async () => {
          await new Promise((r) => setTimeout(r, 1200));
          const img = await capture();
          setBusy(false);
          if (img) void send({ action: "photo", image: img });
        });
        return;
      }
      say(j.say, () => autoListen && listen());
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  }

  function submitText(ev: React.FormEvent) {
    ev.preventDefault();
    const v = input.trim();
    if (!v) return;
    setInput("");
    void send({ action: "say", text: v });
  }

  if (!claudeReady) return <p className="notice warn">{t("as.noKey")}</p>;

  const answered = ITEMS.filter((i) => draft[i.id]).length;
  return (
    <div className="call">
      <div className="stack">
        <div className="video-tile" aria-label={t("call.videoArea")}>
          {video ? (
            feed === "camera" ? (
              <video ref={videoRef} autoPlay playsInline muted aria-label={t("call.cameraFeed")} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={imgRef} src={`/synthetic/${feedPhoto}`} alt={t("call.syntheticFeed")} />
            )
          ) : (
            <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#fff", textAlign: "center", padding: 20 }}>
              <div>
                <div style={{ fontSize: 48 }} aria-hidden="true">{phase === "ringing" ? "📞" : "🎙️"}</div>
                <p>{phase === "ringing" ? t("call.ringing") : phase === "ended" ? t("call.ended") : t("call.voiceOnly")}</p>
              </div>
            </div>
          )}
          {video && <span className="label">{t("call.videoOn")}</span>}
        </div>
        {video && (
          <fieldset>
            <legend>{t("call.feed")}</legend>
            <label className="choice"><input type="radio" name="feed" checked={feed === "synthetic"} onChange={() => setFeed("synthetic")} /> <span>{t("call.feedSynthetic")}</span></label>
            {feed === "synthetic" && (
              <select value={feedPhoto} onChange={(e) => setFeedPhoto(e.target.value)} aria-label={t("call.feedPick")} style={{ marginTop: 8 }}>
                {photos.map((p) => <option key={p} value={p}>{t(`photo.${p}`)}</option>)}
              </select>
            )}
            <label className="choice"><input type="radio" name="feed" checked={feed === "camera"} onChange={() => setFeed("camera")} /> <span>{t("call.feedCamera")}</span></label>
          </fieldset>
        )}
        <div className="row small">
          <label className="row"><input type="checkbox" checked={speak} onChange={(e) => setSpeak(e.target.checked)} /> {t("call.voiceOut")}</label>
          {sttSupported && <label className="row"><input type="checkbox" checked={autoListen} onChange={(e) => setAutoListen(e.target.checked)} /> {t("call.autoListen")}</label>}
        </div>
        <p className="small muted">{t("call.progress", { n: answered, total: ITEMS.length })}</p>
      </div>

      <div className="card stack">
        {phase === "ringing" && (
          <div className="stack">
            <p><strong>{t("call.incoming")}</strong></p>
            <div className="row">
              <button className="btn ok" onClick={answer}>{t("ph.answer")}</button>
              <button className="btn ghost" onClick={decline}>{t("call.decline")}</button>
            </div>
          </div>
        )}
        {phase === "connecting" && <p role="status">{t("call.connecting")}</p>}
        <div ref={logRef} className="transcript" role="log" aria-live="polite" aria-label={t("call.transcript")}>
          {turns.map((x, i) => (
            <div key={i} className={`bubble ${x.role}`}>
              <span className="who">{x.role === "agent" ? t("call.agent") : t("call.patient")}</span>
              {x.text}
            </div>
          ))}
          {busy && <div className="bubble agent"><span className="who">{t("call.agent")}</span>…</div>}
        </div>
        {phase === "live" && (
          <>
            <div className="row">
              {sttSupported && (
                <button className="btn" onClick={listen} disabled={busy || listening} aria-pressed={listening}>
                  {listening ? t("call.listening") : t("call.speak")}
                </button>
              )}
              <button className="btn secondary" onClick={() => send({ action: "say", text: lang === "fr" ? "Oui" : "Yes" })} disabled={busy}>{t("common.yes")}</button>
              <button className="btn secondary" onClick={() => send({ action: "say", text: lang === "fr" ? "Non" : "No" })} disabled={busy}>{t("common.no")}</button>
            </div>
            <form onSubmit={submitText} className="row">
              <label htmlFor="call-input" className="sr-only">{t("call.typeLabel")}</label>
              <input id="call-input" type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("call.typePlaceholder")} style={{ flex: 1 }} autoComplete="off" />
              <button className="btn ghost" type="submit" disabled={busy || !input.trim()}>{t("call.send")}</button>
            </form>
            {!sttSupported && <p className="small muted">{t("call.noStt")}</p>}
          </>
        )}
        {phase === "ended" && (
          <div className="stack">
            <p className={`notice ${result === "completed" ? "ok" : "warn"}`} role="status">{result === "completed" ? t("call.done") : t("call.unreached")}</p>
            <div className="row">
              <Link className="btn" href={`/patients/${enrollmentId}`}>{t("call.toReview")}</Link>
              <Link className="btn ghost" href="/patient">{t("ph.allPhones")}</Link>
            </div>
          </div>
        )}
        {error && <p className="notice danger" role="alert">{error}</p>}
      </div>
    </div>
  );
}
