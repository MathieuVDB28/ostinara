"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/**
 * Une ligne de liste qui decouvre ses actions par glissement.
 *
 * Changer le statut d'un morceau passait par EditSongModal — 692 lignes,
 * toute la chaine d'upload video en dependance — pour cocher « Maitrise ».
 * Supprimer une session passait par EditSessionModal. Ce sont deux gestes
 * quotidiens payes au prix d'une modale.
 *
 * Un glissement n'est atteignable qu'au doigt, donc :
 *
 *  - au doigt : on glisse la carte vers la gauche ;
 *  - au clavier : les boutons du tiroir sont dans l'ordre de tabulation et
 *    `focus-within` ouvre la ligne des que le focus y entre — carte
 *    comprise, pour qu'on voie les actions avant de tabuler dessus ;
 *  - a la souris : rien de neuf, la fiche complete reste le chemin. Le
 *    survol a ete essaye puis retire : il faisait glisser chaque ligne au
 *    passage du curseur, et parcourir une liste de vingt morceaux
 *    devenait illisible.
 *
 * Les boutons sont donc toujours dans le DOM et jamais `aria-hidden` :
 * masquer du focusable est precisement ce qu'il ne faut pas faire.
 */

export type SwipeActionTone = "neutral" | "primary" | "success" | "destructive";

export interface SwipeAction {
  key: string;
  label: string;
  /** Nom d'icone Material Symbols. Relancer `npm run icons` apres ajout. */
  icon: string;
  tone?: SwipeActionTone;
  /** Action irreversible : le premier appui demande confirmation. */
  confirm?: boolean;
  onAction: () => void | Promise<void>;
}

interface SwipeRowProps {
  actions: SwipeAction[];
  /** Ce que decrit la ligne, pour l'etiquette du tiroir. */
  label: string;
  children: ReactNode;
  className?: string;
}

/** Largeur d'une action : 44 px de cible tactile + son libelle. */
const ACTION_WIDTH = 88;

/** En deca, le geste est un appui, pas un glissement. */
const AXIS_THRESHOLD = 8;

const TONE_CLASSES: Record<SwipeActionTone, string> = {
  neutral: "bg-muted text-foreground",
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  destructive: "bg-destructive text-destructive-foreground",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  /** "?" tant que le geste n'a pas choisi son axe. */
  axis: "?" | "x" | "y";
  from: number;
}

export function SwipeRow({
  actions,
  label,
  children,
  className = "",
}: SwipeRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const drag = useRef<DragState | null>(null);

  const trayWidth = actions.length * ACTION_WIDTH;

  const close = useCallback(() => {
    setIsOpen(false);
    setConfirming(null);
  }, []);

  // Une confirmation en attente n'a pas vocation a survivre a la fermeture
  // du tiroir : rouvrir doit repartir de « Supprimer », pas de « Confirmer ».
  useEffect(() => {
    if (!isOpen) setConfirming(null);
  }, [isOpen]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // La souris a le survol, le stylet et le doigt ont le glissement.
      if (event.pointerType === "mouse" || busy) return;
      drag.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        axis: "?",
        from: isOpen ? -trayWidth : 0,
      };
    },
    [busy, isOpen, trayWidth]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = drag.current;
      if (!state || state.pointerId !== event.pointerId) return;

      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;

      if (state.axis === "?") {
        if (Math.abs(dx) < AXIS_THRESHOLD && Math.abs(dy) < AXIS_THRESHOLD) return;
        // Le premier axe franchi gagne : sans ca, un defilement vertical
        // legerement oblique ouvrirait le tiroir de toutes les cartes.
        state.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (state.axis === "x") {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }

      if (state.axis !== "x") return;
      setDragOffset(clamp(state.from + dx, -trayWidth, 0));
    },
    [trayWidth]
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = drag.current;
      drag.current = null;
      setDragOffset(null);

      if (!state || state.axis !== "x") return;

      const travelled = event.clientX - state.startX;
      const final = clamp(state.from + travelled, -trayWidth, 0);
      setIsOpen(final < -trayWidth / 2);
    },
    [trayWidth]
  );

  const runAction = useCallback(
    async (action: SwipeAction) => {
      if (busy) return;

      if (action.confirm && confirming !== action.key) {
        setConfirming(action.key);
        return;
      }

      setBusy(true);
      try {
        await action.onAction();
      } finally {
        setBusy(false);
        close();
      }
    },
    [busy, close, confirming]
  );

  const resting = dragOffset === null && !isOpen;
  const offset = dragOffset ?? (isOpen ? -trayWidth : 0);

  return (
    <div
      className={`group/swipe relative overflow-hidden rounded-2xl p-1 ${className}`}
      style={{ "--tray": `${trayWidth}px` } as React.CSSProperties}
    >
      {/*
        Le tiroir, sous la carte. Il ne bouge pas : c'est la carte qui
        glisse.

        `inset-1` et pas `inset-y-0 right-0` : un element absolu se cale
        sur la boite de padding, donc le tiroir depassait de 4 px tout
        autour de la carte — un lisere rouge « Supprimer » visible en
        permanence sur chaque ligne de la liste.
      */}
      <div
        role="group"
        aria-label={`Actions — ${label}`}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
        className="absolute inset-y-1 right-1 flex overflow-hidden rounded-xl"
        style={{ width: trayWidth }}
      >
        {actions.map((action) => {
          const isConfirming = confirming === action.key;
          return (
            <button
              key={action.key}
              type="button"
              disabled={busy}
              onClick={() => void runAction(action)}
              aria-label={
                isConfirming ? `Confirmer : ${action.label} — ${label}` : `${action.label} — ${label}`
              }
              className={`flex flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold leading-tight transition-opacity disabled:opacity-60 ${
                isConfirming
                  ? TONE_CLASSES.destructive
                  : TONE_CLASSES[action.tone ?? "neutral"]
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                {isConfirming ? "check" : action.icon}
              </span>
              <span aria-hidden="true">
                {isConfirming ? "Confirmer" : action.label}
              </span>
            </button>
          );
        })}
      </div>

      {/*
        `touch-action: pan-y` laisse le defilement vertical au navigateur et
        nous garde l'horizontal : sans ca, la page et la carte se disputent
        le meme geste.

        Quand la ligne est au repos, aucun transform inline n'est pose :
        c'est la classe `focus-within` qui mene, donc le clavier ouvre le
        tiroir. Des qu'on glisse, l'inline reprend la main.
      */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          touchAction: "pan-y",
          ...(resting
            ? {}
            : { transform: `translateX(${offset}px)` }),
        }}
        className={`relative rounded-xl bg-background group-focus-within/swipe:[transform:translateX(calc(var(--tray)*-1))] ${
          dragOffset === null
            ? "transition-transform duration-200 ease-out motion-reduce:transition-none"
            : ""
        }`}
      >
        {children}

        {/*
          Tiroir ouvert : le premier appui sur la carte le referme au lieu
          d'ouvrir la fiche. Sinon le geste de sortie est une navigation.
        */}
        {isOpen && (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={close}
            className="absolute inset-0 z-10 cursor-default"
          />
        )}
      </div>
    </div>
  );
}
