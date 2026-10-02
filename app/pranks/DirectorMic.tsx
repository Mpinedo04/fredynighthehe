"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioContext } from "../audio/engine";
import { detectClap, matchDirectorCommand } from "../prank-system.mjs";

type RecognitionResultList = ArrayLike<ArrayLike<{ transcript: string }>>;

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: RecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  abort: () => void;
};

type RecognitionConstructor = new () => Recognition;

type Stage = "ask" | "requesting" | "listening";

type DirectorMicProps = {
  open: boolean;
  heeMuted: boolean;
  onCut: (source: "voz" | "palmada") => void;
  onAction: () => void;
  onCoward: (reason: string) => void;
};

function speechRecognition(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const candidate = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

/**
 * The mute button was a lie: a director does not press buttons, a director
 * shouts "¡CORTEN!" (or claps, which is literally a clapperboard).
 */
export default function DirectorMic({
  open,
  heeMuted,
  onCut,
  onAction,
  onCoward,
}: DirectorMicProps) {
  const [stage, setStage] = useState<Stage>("ask");
  const [heard, setHeard] = useState("");
  const [level, setLevel] = useState(0);
  const [voiceReady, setVoiceReady] = useState(false);
  const heeMutedRef = useRef(heeMuted);
  const callbacksRef = useRef({ onCut, onAction });
  const streamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const listeningRef = useRef(false);

  useEffect(() => {
    heeMutedRef.current = heeMuted;
  }, [heeMuted]);

  useEffect(() => {
    callbacksRef.current = { onCut, onAction };
  }, [onAction, onCut]);

  const command = useCallback((kind: "cut" | "action", source: "voz" | "palmada") => {
    if (kind === "cut" && !heeMutedRef.current) {
      heeMutedRef.current = true;
      callbacksRef.current.onCut(source);
    } else if (kind === "action" && heeMutedRef.current) {
      heeMutedRef.current = false;
      callbacksRef.current.onAction();
    }
  }, []);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    micSourceRef.current?.disconnect();
    micSourceRef.current = null;
  }, []);

  useEffect(() => stopListening, [stopListening]);

  const startVoice = useCallback(() => {
    const Constructor = speechRecognition();
    if (!Constructor) return;
    const recognition = new Constructor();
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript ?? "";
        const match = matchDirectorCommand(transcript);
        if (transcript.trim()) setHeard(transcript.trim().slice(-42));
        if (match) command(match, "voz");
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        listeningRef.current = false;
        setVoiceReady(false);
      }
    };
    recognition.onend = () => {
      if (!listeningRef.current) return;
      window.setTimeout(() => {
        if (listeningRef.current) {
          try {
            recognition.start();
          } catch {
            // Already started.
          }
        }
      }, 250);
    };
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setVoiceReady(true);
    } catch {
      setVoiceReady(false);
    }
  }, [command]);

  const requestMic = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onCoward("Este navegador no tiene micro. Cobarde. Pero vale.");
      return;
    }
    setStage("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const context = audioContext();
      if (!context) throw new Error("Sin audio");
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      const micSource = context.createMediaStreamSource(stream);
      micSource.connect(analyser);
      micSourceRef.current = micSource;
      const samples = new Float32Array(analyser.fftSize);
      let floor = 0.02;
      let lastClap = 0;
      let lastLevelPaint = 0;
      listeningRef.current = true;

      const listen = (now: number) => {
        if (!listeningRef.current) return;
        analyser.getFloatTimeDomainData(samples);
        let peak = 0;
        let sum = 0;
        for (const value of samples) {
          const magnitude = Math.abs(value);
          if (magnitude > peak) peak = magnitude;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / samples.length);
        if (detectClap({ peak, rms, floor, sinceLastMs: now - lastClap })) {
          lastClap = now;
          setHeard("👏 PALMADA");
          command(heeMutedRef.current ? "action" : "cut", "palmada");
        } else {
          floor = floor * 0.97 + rms * 0.03;
        }
        if (now - lastLevelPaint > 90) {
          lastLevelPaint = now;
          setLevel(Math.min(1, rms * 6));
        }
        rafRef.current = window.requestAnimationFrame(listen);
      };
      rafRef.current = window.requestAnimationFrame(listen);
      startVoice();
      setStage("listening");
    } catch {
      setStage("ask");
      onCoward("Sin micro no hay rodaje. Cobarde. Pero vale.");
    }
  };

  if (!open) return null;

  if (stage !== "listening") {
    return (
      <div className="director-mic-card" role="dialog" aria-label="Silenciar como un director" data-hee-control>
        <div className="director-mic-clapper" aria-hidden="true">
          <i /><i /><i /><i /><i />
        </div>
        <small>EL BOTÓN SE HA PARTIDO EN DOS</small>
        <h3>Un director no pulsa botones, Raúl.</h3>
        <p>
          Un director grita <strong>«¡CORTEN!»</strong>. O da una palmada, que
          viene a ser cerrar una claqueta.
        </p>
        <div className="director-mic-sign">
          <span>● SONIDO</span>
          <b>¿GRABANDO?</b>
        </div>
        <div className="director-mic-actions">
          <button type="button" onClick={() => void requestMic()} disabled={stage === "requesting"}>
            {stage === "requesting" ? "ESPERANDO AL MICRO…" : "🎙 DAR MICRO Y GRITAR"}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => onCoward("Cobarde. Pero vale.")}
          >
            Prefiero el botón
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`director-mic-chip ${heeMuted ? "cut" : "rolling"}`} role="status" data-hee-control>
      <span className="director-mic-led" aria-hidden="true" />
      <div>
        <small>{heeMuted ? "SILENCIO EN PLATÓ" : "SE RUEDA · EL DIRECTOR ESCUCHA"}</small>
        <strong>
          {heeMuted
            ? voiceReady ? "DI «¡ACCIÓN!» O PALMADA PARA VOLVER" : "PALMADA PARA VOLVER A RODAR"
            : voiceReady ? "GRITA «¡CORTEN!» O DA UNA PALMADA" : "DA UNA PALMADA FUERTE"}
        </strong>
        {heard && <em>OÍDO: “{heard}”</em>}
      </div>
      <i className="director-mic-meter" aria-hidden="true">
        <b style={{ transform: `scaleX(${level})` }} />
      </i>
    </div>
  );
}
