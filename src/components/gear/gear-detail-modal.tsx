"use client";

import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";

import { useMyInstruments } from "@/components/providers/instruments-provider";
import { gearTypesFor } from "@/lib/instruments";
import { useState, useEffect, useCallback } from "react";
import type {
  GearItem,
  GearType,
  GearCondition,
  GearVisibility,
} from "@/types";
import {
  GEAR_CONDITION_COLORS,
  GEAR_BRANDS,
} from "@/types";
import { updateGearItem, deleteGearItem } from "@/lib/actions/gear";
import { GearTypeIcon } from "./gear-card";

interface GearDetailModalProps {
  gear: GearItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}


const CONDITION_OPTIONS: GearCondition[] = [
  "mint",
  "excellent",
  "good",
  "fair",
  "poor",
];

const VISIBILITY_OPTIONS: GearVisibility[] = ["private", "friends", "public"];

export function GearDetailModal({
  gear,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
}: GearDetailModalProps) {
  const t = useTranslations("gear.form");
  const td = useTranslations("gear.detail");
  const tg = useTranslations("gear.card");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const intlLocale = useIntlLocale();
  const myInstruments = useMyInstruments();
  const gearTypes = gearTypesFor(myInstruments.instruments.map((i) => i.instrument));
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Edit form state
  const [type, setType] = useState<GearType>(gear.type);
  const [brand, setBrand] = useState(gear.brand || "");
  const [model, setModel] = useState(gear.model || "");
  const [year, setYear] = useState(gear.year ? String(gear.year) : "");
  const [colorFinish, setColorFinish] = useState(gear.color || "");
  const [condition, setCondition] = useState<GearCondition>(gear.condition || "good");
  const [serialNumber, setSerialNumber] = useState(gear.serial_number || "");
  const [purchasePrice, setPurchasePrice] = useState(
    gear.purchase_price ? String(gear.purchase_price) : ""
  );
  const [purchaseDate, setPurchaseDate] = useState(gear.purchase_date || "");
  const [imageUrl, setImageUrl] = useState(gear.image_url || "");
  const [notes, setNotes] = useState(gear.notes || "");
  const [isActive, setIsActive] = useState(gear.is_active);
  const [visibility, setVisibility] = useState<GearVisibility>(gear.visibility);

  // Brand autocomplete
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);

  // Reset edit state when gear changes
  useEffect(() => {
    setType(gear.type);
    setBrand(gear.brand || "");
    setModel(gear.model || "");
    setYear(gear.year ? String(gear.year) : "");
    setColorFinish(gear.color || "");
    setCondition(gear.condition || "good");
    setSerialNumber(gear.serial_number || "");
    setPurchasePrice(gear.purchase_price ? String(gear.purchase_price) : "");
    setPurchaseDate(gear.purchase_date || "");
    setImageUrl(gear.image_url || "");
    setNotes(gear.notes || "");
    setIsActive(gear.is_active);
    setVisibility(gear.visibility);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setError("");
  }, [gear]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, isEditing, showDeleteConfirm, onClose]);

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

  const handleSave = async () => {
    setError("");
    if (!brand.trim() && !model.trim()) {
      setError(t("brandOrModel"));
      return;
    }

    setLoading(true);
    try {
      const result = await updateGearItem(gear.id, {
        type,
        brand: brand.trim(),
        model: model.trim(),
        year: year ? parseInt(year) : undefined,
        color: colorFinish.trim() || undefined,
        condition,
        // null : un champ vide est efface (undefined le laisserait tel quel)
        serial_number: serialNumber.trim() || null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        purchase_date: purchaseDate || null,
        image_url: imageUrl.trim() || undefined,
        notes: notes.trim() || null,
        is_active: isActive,
        visibility,
      });

      if (result.success) {
        setIsEditing(false);
        onUpdated();
      } else {
        setError(result.error || td("updateFailed"));
      }
    } catch {
      setError(t("unexpected"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const result = await deleteGearItem(gear.id);
      if (result.success) {
        onDeleted();
        onClose();
      } else {
        setError(result.error || td("deleteFailed"));
      }
    } catch {
      setError(t("unexpected"));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const title = [gear.brand, gear.model].filter(Boolean).join(" ");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="relative my-8 w-full max-w-lg rounded-2xl border border-border/50 bg-card shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <h2 className="truncate text-lg font-semibold">
            {isEditing ? td("edit") : title || td("detail")}
          </h2>
          <div className="flex items-center gap-1">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                  title={tc("edit")}
                  aria-label={tc("edit")}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title={tc("delete")}
                  aria-label={tc("delete")}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </>
            )}
            <button aria-label={tc("close")}
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="border-b border-border/50 bg-destructive/5 px-6 py-4">
            <p className="mb-3 text-sm">
              {td.rich("confirmDelete", { title, strong: (chunks) => <strong>{chunks}</strong> })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-border/50 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                {tc("cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? tc("deleting") : tc("delete")}
              </button>
            </div>
          </div>
        )}

        <div className="px-6 py-5">
          {isEditing ? (
            /* Edit mode */
            <div className="space-y-5">
              {/* Type selector */}
              <div>
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
                      className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-[11px] font-medium transition-all ${
                        type === gearType
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/50 hover:border-primary/40 hover:bg-primary/[0.02]"
                      }`}
                    >
                      <GearTypeIcon type={gearType} className="h-5 w-5" />
                      <span className="truncate">{te(`gearType.${gearType}`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand */}
              <div className="relative">
                <label className="mb-1.5 block text-sm font-medium">{t("brand")}</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  onFocus={() => {
                    if (brandSuggestions.length > 0) setShowBrandDropdown(true);
                  }}
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
                  className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary"
                />
              </div>

              {/* Year + Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t("year")}</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t("color")}</label>
                  <input
                    type="text"
                    value={colorFinish}
                    onChange={(e) => setColorFinish(e.target.value)}
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
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t("serial")} <span className="text-muted-foreground">{t("private")}</span>
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary"
                />
              </div>

              {/* Purchase price + date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    {t("price")} <span className="text-muted-foreground">{t("private")}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
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
                  <label className="mb-1.5 block text-sm font-medium">{t("date")}</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t("image")}</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t("notes")}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm transition-colors focus:border-primary"
                />
              </div>

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
                  onClick={() => setIsEditing(false)}
                  className="flex-1 rounded-lg border border-border/50 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {tc("cancel")}
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? tc("saving") : tc("save")}
                </button>
              </div>
            </div>
          ) : (
            /* View mode */
            <div className="space-y-5">
              {/* Image */}
              {gear.image_url ? (
                <div className="overflow-hidden rounded-xl">
                  <img
                    src={gear.image_url}
                    alt={title}
                    className="h-48 w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-xl bg-muted/50">
                  <GearTypeIcon type={gear.type} className="h-12 w-12 text-muted-foreground/40" />
                </div>
              )}

              {/* Title & badges */}
              <div>
                <h3 className="text-xl font-bold">{title || "Sans nom"}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium">
                    {te(`gearType.${gear.type}`)}
                  </span>
                  {gear.condition && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${GEAR_CONDITION_COLORS[gear.condition]}`}
                    >
                      {te(`gearCondition.${gear.condition}`)}
                    </span>
                  )}
                  {gear.is_active && (
                    <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-medium text-success dark:text-success">
                      {tg("active")}
                    </span>
                  )}
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                {gear.year && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t("year")}</p>
                    <p className="text-sm font-medium">{gear.year}</p>
                  </div>
                )}
                {gear.color && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t("color")}</p>
                    <p className="text-sm font-medium">{gear.color}</p>
                  </div>
                )}
                {gear.serial_number && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {td("serialShort")} <span className="text-[11px]">{t("private")}</span>
                    </p>
                    <p className="font-mono text-sm font-medium">{gear.serial_number}</p>
                  </div>
                )}
                {gear.purchase_price != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("price")} <span className="text-[11px]">{t("private")}</span>
                    </p>
                    <p className="text-sm font-medium">
                      {gear.purchase_price.toLocaleString(intlLocale, {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </p>
                  </div>
                )}
                {gear.purchase_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t("date")}</p>
                    <p className="text-sm font-medium">
                      {new Date(gear.purchase_date).toLocaleDateString(intlLocale)}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {gear.notes && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">{t("notes")}</p>
                  <p className="whitespace-pre-wrap text-sm">{gear.notes}</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive dark:text-destructive">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
