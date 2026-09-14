"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GearType, GearCondition, GearVisibility, UserPlan } from "@/types";
import {
  GEAR_TYPE_LABELS,
  GEAR_CONDITION_LABELS,
  GEAR_BRANDS,
} from "@/types";
import { createGearItem } from "@/lib/actions/gear";
import { GearTypeIcon } from "./gear-card";

interface AddGearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  userPlan: UserPlan;
}

const GEAR_TYPES: GearType[] = [
  "guitar",
  "bass",
  "amp",
  "effect",
  "accessory",
  "recording",
  "other",
];

const CONDITION_OPTIONS: GearCondition[] = [
  "mint",
  "excellent",
  "good",
  "fair",
  "poor",
];

const VISIBILITY_OPTIONS: { value: GearVisibility; label: string }[] = [
  { value: "private", label: "Privé" },
  { value: "friends", label: "Amis" },
  { value: "public", label: "Public" },
];

export function AddGearModal({
  isOpen,
  onClose,
  onSaved,
  userPlan,
}: AddGearModalProps) {
  const [type, setType] = useState<GearType>("guitar");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [colorFinish, setColorFinish] = useState("");
  const [condition, setCondition] = useState<GearCondition>("good");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [visibility, setVisibility] = useState<GearVisibility>("private");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Close brand dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setShowBrandDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Filter brand suggestions
  const handleBrandChange = useCallback(
    (value: string) => {
      setBrand(value);
      if (value.trim().length > 0) {
        const brands = GEAR_BRANDS[type] || [];
        const filtered = brands.filter((b) =>
          b.toLowerCase().includes(value.toLowerCase())
        );
        setBrandSuggestions(filtered);
        setShowBrandDropdown(filtered.length > 0);
      } else {
        setBrandSuggestions([]);
        setShowBrandDropdown(false);
      }
    },
    [type]
  );

  // Reset form
  const resetForm = useCallback(() => {
    setType("guitar");
    setBrand("");
    setModel("");
    setYear("");
    setColorFinish("");
    setCondition("good");
    setSerialNumber("");
    setPurchasePrice("");
    setPurchaseDate("");
    setImageUrl("");
    setNotes("");
    setIsActive(true);
    setVisibility("private");
    setError("");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!brand.trim() && !model.trim()) {
      setError("Veuillez renseigner au moins la marque ou le modèle.");
      return;
    }

    setLoading(true);
    try {
      const result = await createGearItem({
        type,
        brand: brand.trim(),
        model: model.trim(),
        year: year ? parseInt(year) : undefined,
        color: colorFinish.trim() || undefined,
        condition,
        serial_number: serialNumber.trim() || undefined,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
        purchase_date: purchaseDate || undefined,
        image_url: imageUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        is_active: isActive,
        visibility,
      });

      if (result.success) {
        resetForm();
        onSaved();
        onClose();
      } else {
        setError(result.error || "Erreur lors de la création.");
      }
    } catch {
      setError("Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="relative my-8 w-full max-w-2xl rounded-2xl border border-border/50 bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <h2 className="text-lg font-semibold">Ajouter du matériel</h2>
          <button aria-label="Fermer"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          {/* Type selector - full width */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium">Type</label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {GEAR_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setBrand("");
                    setBrandSuggestions([]);
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                    type === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/50 hover:border-primary/40 hover:bg-primary/[0.02]"
                  }`}
                >
                  <GearTypeIcon type={t} className="h-5 w-5" />
                  <span>{GEAR_TYPE_LABELS[t]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form fields - 2 cols on desktop */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

          {/* Brand with autocomplete */}
          <div ref={brandRef} className="relative">
            <label className="mb-1.5 block text-sm font-medium">Marque</label>
            <input
              type="text"
              value={brand}
              onChange={(e) => handleBrandChange(e.target.value)}
              onFocus={() => {
                if (brandSuggestions.length > 0) setShowBrandDropdown(true);
              }}
              placeholder="Ex: Fender, Gibson..."
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            />
            {showBrandDropdown && brandSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-border/50 bg-card shadow-lg">
                {brandSuggestions.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setBrand(b);
                      setShowBrandDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Model */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Modèle</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Ex: Stratocaster, Les Paul..."
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            />
          </div>

          {/* Year + Color row - span both cols */}
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Année <span className="text-muted-foreground">(optionnel)</span>
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2024"
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Couleur / Finition <span className="text-muted-foreground">(optionnel)</span>
              </label>
              <input
                type="text"
                value={colorFinish}
                onChange={(e) => setColorFinish(e.target.value)}
                placeholder="Sunburst"
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">État</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as GearCondition)}
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            >
              {CONDITION_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {GEAR_CONDITION_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          {/* Serial Number */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">
              Numéro de série{" "}
              <span className="text-muted-foreground">(optionnel · privé)</span>
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="N° de série"
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            />
          </div>

          {/* Purchase price + date row - span both cols */}
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Prix d&apos;achat{" "}
                <span className="text-muted-foreground">(privé)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 pr-8 text-sm transition-colors focus:border-primary focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  €
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Date d&apos;achat{" "}
                <span className="text-muted-foreground">(optionnel)</span>
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Image URL */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">
              Image URL <span className="text-muted-foreground">(optionnel)</span>
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">
              Notes <span className="text-muted-foreground">(optionnel)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cordes, modifications, réglages..."
              rows={2}
              className="w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            />
          </div>

          </div>{/* Close 2-col grid */}

          {/* Active toggle + Visibility + Actions */}
          <div className="mt-5 space-y-5">

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Utilisation active</p>
              <p className="text-xs text-muted-foreground">
                Ce matériel fait partie de votre setup actuel
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                isActive ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Visibility */}
          <div>
            <label className="mb-2 block text-sm font-medium">Visibilité</label>
            <div className="flex gap-2">
              {VISIBILITY_OPTIONS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVisibility(v.value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    visibility === v.value
                      ? "bg-primary text-primary-foreground"
                      : "border border-border/50 hover:border-primary/40 hover:bg-primary/[0.02]"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 border-t border-border/50 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border/50 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Enregistrement..." : "Ajouter"}
            </button>
          </div>

          </div>{/* Close bottom section wrapper */}
        </form>
      </div>
    </div>
  );
}
