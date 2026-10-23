"use client";

import { useMyInstruments } from "@/components/providers/instruments-provider";
import { gearTypesFor } from "@/lib/instruments";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { GearType, GearCondition, GearVisibility } from "@/types";
import { GEAR_BRANDS } from "@/types";
import { createGearItem } from "@/lib/actions/gear";
import { GearTypeIcon } from "./gear-card";

interface AddGearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}


const CONDITION_OPTIONS: GearCondition[] = [
  "mint",
  "excellent",
  "good",
  "fair",
  "poor",
];

const VISIBILITY_OPTIONS: GearVisibility[] = ["private", "friends", "public"];

export function AddGearModal({
  isOpen,
  onClose,
  onSaved,
}: AddGearModalProps) {
  const t = useTranslations("gear.form");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  // Le matos de mes instruments d'abord, et le premier preselectionne.
  const myInstruments = useMyInstruments();
  const gearTypes = useMemo(
    () => gearTypesFor(myInstruments.instruments.map((i) => i.instrument)),
    [myInstruments.instruments]
  );
  const [type, setType] = useState<GearType>(gearTypes[0]);
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
  const [visibility, setVisibility] = useState<GearVisibility>("friends");
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
    setType(gearTypes[0]);
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
    setVisibility("friends");
    setError("");
  }, [gearTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!brand.trim() && !model.trim()) {
      setError(t("brandOrModel"));
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
        setError(result.error || t("createFailed"));
      }
    } catch {
      setError(t("unexpected"));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="relative my-8 w-full max-w-2xl rounded-2xl border border-border/50 bg-card shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <h2 className="font-display text-3xl font-extrabold uppercase leading-none">{t("title")}</h2>
          <button aria-label={tc("close")}
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
            <label className="mb-2 block text-sm font-medium">{t("type")}</label>
            <div className="grid grid-cols-5 gap-2">
              {gearTypes.map((gearType) => (
                <button
                  key={gearType}
                  type="button"
                  onClick={() => {
                    setType(gearType);
                    setBrand("");
                    setBrandSuggestions([]);
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                    type === gearType
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/50 hover:border-primary/40 hover:bg-primary/[0.02]"
                  }`}
                >
                  <GearTypeIcon type={gearType} className="h-5 w-5" />
                  <span>{te(`gearType.${gearType}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form fields - 2 cols on desktop */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

          {/* Brand with autocomplete */}
          <div ref={brandRef} className="relative">
            <label className="mb-1.5 block text-sm font-medium">{t("brand")}</label>
            <input
              type="text"
              value={brand}
              onChange={(e) => handleBrandChange(e.target.value)}
              onFocus={() => {
                if (brandSuggestions.length > 0) setShowBrandDropdown(true);
              }}
              placeholder={t("brandPlaceholder")}
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary"
            />
            {showBrandDropdown && brandSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-border/50 bg-card shadow-md">
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
            <label className="mb-1.5 block text-sm font-medium">{t("model")}</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={t("modelPlaceholder")}
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary"
            />
          </div>

          {/* Year + Color row - span both cols */}
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t("year")} <span className="text-muted-foreground">{t("optional")}</span>
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2024"
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t("color")} <span className="text-muted-foreground">{t("optional")}</span>
              </label>
              <input
                type="text"
                value={colorFinish}
                onChange={(e) => setColorFinish(e.target.value)}
                placeholder="Sunburst"
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary"
              />
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("condition")}</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as GearCondition)}
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary"
            >
              {CONDITION_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {te(`gearCondition.${c}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Serial Number */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">
              {t("serial")}{" "}
              <span className="text-muted-foreground">{t("optionalPrivate")}</span>
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder={t("serialPlaceholder")}
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary"
            />
          </div>

          {/* Purchase price + date row - span both cols */}
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t("price")}{" "}
                <span className="text-muted-foreground">{t("private")}</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 pr-8 text-sm transition-colors focus:border-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  €
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t("date")}{" "}
                <span className="text-muted-foreground">{t("optional")}</span>
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary"
              />
            </div>
          </div>

          {/* Image URL */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">
              {t("image")} <span className="text-muted-foreground">{t("optional")}</span>
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary"
            />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">
              {t("notes")} <span className="text-muted-foreground">{t("optional")}</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              rows={2}
              className="w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary"
            />
          </div>

          </div>{/* Close 2-col grid */}

          {/* Active toggle + Visibility + Actions */}
          <div className="mt-5 space-y-5">

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("active")}</p>
              <p className="text-xs text-muted-foreground">
                {t("activeHint")}
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
            <label className="mb-2 block text-sm font-medium">{t("visibility")}</label>
            <div className="flex gap-2">
              {VISIBILITY_OPTIONS.map((value) => ({ value, label: te(`visibility.${value}`) })).map((v) => (
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
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive dark:text-destructive">
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
              {tc("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? t("saving") : t("add")}
            </button>
          </div>

          </div>{/* Close bottom section wrapper */}
        </form>
      </div>
    </div>
  );
}
