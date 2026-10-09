"use client";

import { useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type {
  BandWithMembers,
  TechRiderMusician,
  TechRiderChannel,
  TechRiderStageElement,
} from "@/types";

const colors = {
  primary: "#d97706",
  primaryLight: "#fef3c7",
  dark: "#111827",
  gray: "#6b7280",
  lightGray: "#9ca3af",
  border: "#e5e7eb",
  bg: "#f9fafb",
  white: "#ffffff",
  stageBg: "#18181b",
  stageLabel: "#71717a",
  musician: "#d97706",
  monitor: "#3b82f6",
  amp: "#71717a",
  drums: "#ef4444",
  keyboard: "#a855f7",
  di_box: "#22c55e",
  mic_stand: "#f97316",
  custom: "#a1a1aa",
};

const ELEMENT_PDF_LABELS: Record<string, string> = {
  monitor: "MON",
  amp: "AMP",
  drums: "DRM",
  keyboard: "KBD",
  di_box: "DI",
  mic_stand: "MIC",
  custom: "?",
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    backgroundColor: colors.white,
  },
  // Header
  header: {
    marginBottom: 24,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bandName: {
    fontSize: 26,
    fontWeight: "bold",
    color: colors.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  contactBox: {
    backgroundColor: colors.bg,
    borderRadius: 6,
    padding: 12,
    minWidth: 180,
  },
  contactLabel: {
    fontSize: 8,
    color: colors.lightGray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  contactName: {
    fontSize: 12,
    color: colors.dark,
    fontWeight: "bold",
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "bold",
  },
  // Summary
  summaryRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 4,
    padding: 10,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: 8,
    color: colors.gray,
    marginTop: 2,
    textTransform: "uppercase",
  },
  // Section headers
  sectionHeader: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.dark,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  // Musicians table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.dark,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowAlt: {
    backgroundColor: colors.bg,
  },
  tableCell: {
    fontSize: 10,
    color: colors.dark,
  },
  tableCellMuted: {
    fontSize: 9,
    color: colors.gray,
  },
  // Columns - Musicians
  colMusicianName: { width: "20%" },
  colMusicianInstrument: { width: "20%" },
  colMusicianNeeds: { width: "40%" },
  colMusicianMonitor: { width: "20%" },
  // Columns - Patch
  colPatchNum: { width: "8%" },
  colPatchSource: { width: "20%" },
  colPatchMusician: { width: "18%" },
  colPatchMic: { width: "18%" },
  colPatchStand: { width: "14%" },
  colPatchPhantom: { width: "8%" },
  colPatchNotes: { width: "14%" },
  // Stage plot
  stageContainer: {
    marginTop: 8,
    borderWidth: 2,
    borderColor: "#3f3f46",
    borderRadius: 6,
    backgroundColor: colors.stageBg,
    height: 200,
    position: "relative",
    overflow: "hidden",
  },
  stageLabel: {
    position: "absolute",
    fontSize: 7,
    color: colors.stageLabel,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  stageMusicianCircle: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.musician,
    alignItems: "center",
    justifyContent: "center",
  },
  stageMusicianInitial: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.white,
  },
  stageMusicianLabel: {
    position: "absolute",
    fontSize: 7,
    color: colors.white,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  stageElement: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  stageElementLabel: {
    position: "absolute",
    fontSize: 6,
    color: colors.white,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 1,
  },
  stageElementText: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.white,
  },
  // Notes
  notesBox: {
    marginTop: 8,
    backgroundColor: colors.bg,
    borderRadius: 4,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  notesText: {
    fontSize: 10,
    color: colors.dark,
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: colors.lightGray,
  },
  // Legend
  legendRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 7,
    color: colors.gray,
  },
});

interface PDFDocumentProps {
  band: BandWithMembers;
  engineerName: string;
  engineerPhone: string;
  musicians: TechRiderMusician[];
  channels: TechRiderChannel[];
  stageElements: TechRiderStageElement[];
  generalNotes: string;
}

function getElementColor(type: string): string {
  return (colors as Record<string, string>)[type] || colors.custom;
}

function TechRiderPDFDocument({
  band,
  engineerName,
  engineerPhone,
  musicians,
  channels,
  stageElements,
  generalNotes,
}: PDFDocumentProps) {
  const micCount = channels.filter(
    (c) => c.mic_type && c.mic_type.toUpperCase() !== "DI"
  ).length;
  const diCount = channels.filter(
    (c) => c.mic_type && c.mic_type.toUpperCase() === "DI"
  ).length;
  const monitorCount = musicians.filter((m) => m.monitor).length;

  const stageHeight = 200;
  const stageWidth = 515; // approximate A4 width minus padding

  const uniqueElementTypes = [...new Set(stageElements.map((e) => e.type))];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.subtitle}>Fiche Technique</Text>
              <Text style={styles.bandName}>{band.name}</Text>
              {band.members.length > 0 && (
                <Text style={{ fontSize: 10, color: colors.gray }}>
                  {musicians.map((m) => m.name).filter(Boolean).join(", ")}
                </Text>
              )}
            </View>
            {(engineerName || engineerPhone) && (
              <View style={styles.contactBox}>
                <Text style={styles.contactLabel}>Ingénieur son</Text>
                {engineerName && (
                  <Text style={styles.contactName}>{engineerName}</Text>
                )}
                {engineerPhone && (
                  <Text style={styles.contactPhone}>{engineerPhone}</Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{musicians.length}</Text>
            <Text style={styles.summaryLabel}>
              Musicien{musicians.length > 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{channels.length}</Text>
            <Text style={styles.summaryLabel}>Channels</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{micCount}</Text>
            <Text style={styles.summaryLabel}>
              Micro{micCount > 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{diCount}</Text>
            <Text style={styles.summaryLabel}>
              Ligne{diCount > 1 ? "s" : ""} DI
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{monitorCount}</Text>
            <Text style={styles.summaryLabel}>
              Retour{monitorCount > 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Musicians */}
        {musicians.length > 0 && (
          <View>
            <Text style={styles.sectionHeader}>Musiciens</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colMusicianName]}>
                Nom
              </Text>
              <Text
                style={[styles.tableHeaderText, styles.colMusicianInstrument]}
              >
                Instrument
              </Text>
              <Text style={[styles.tableHeaderText, styles.colMusicianNeeds]}>
                Besoins
              </Text>
              <Text
                style={[styles.tableHeaderText, styles.colMusicianMonitor]}
              >
                Retour
              </Text>
            </View>
            {musicians.map((m, i) => (
              <View
                key={m.id}
                style={[
                  styles.tableRow,
                  i % 2 === 1 ? styles.tableRowAlt : {},
                ]}
              >
                <Text style={[styles.tableCell, styles.colMusicianName]}>
                  {m.name || "-"}
                </Text>
                <Text
                  style={[styles.tableCell, styles.colMusicianInstrument]}
                >
                  {m.instrument || "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colMusicianNeeds]}>
                  {m.needs || "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colMusicianMonitor]}>
                  {m.monitor
                    ? m.monitor_notes
                      ? `Oui (${m.monitor_notes})`
                      : "Oui"
                    : "Non"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Patch / Input List */}
        {channels.length > 0 && (
          <View>
            <Text style={styles.sectionHeader}>Patch / Input List</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colPatchNum]}>
                #
              </Text>
              <Text style={[styles.tableHeaderText, styles.colPatchSource]}>
                Source
              </Text>
              <Text style={[styles.tableHeaderText, styles.colPatchMusician]}>
                Musicien
              </Text>
              <Text style={[styles.tableHeaderText, styles.colPatchMic]}>
                Micro
              </Text>
              <Text style={[styles.tableHeaderText, styles.colPatchStand]}>
                Pied
              </Text>
              <Text style={[styles.tableHeaderText, styles.colPatchPhantom]}>
                48V
              </Text>
              <Text style={[styles.tableHeaderText, styles.colPatchNotes]}>
                Notes
              </Text>
            </View>
            {channels.map((ch, i) => (
              <View
                key={ch.id}
                style={[
                  styles.tableRow,
                  i % 2 === 1 ? styles.tableRowAlt : {},
                ]}
              >
                <Text
                  style={[
                    styles.tableCell,
                    styles.colPatchNum,
                    { fontWeight: "bold" },
                  ]}
                >
                  {ch.number}
                </Text>
                <Text style={[styles.tableCell, styles.colPatchSource]}>
                  {ch.source || "-"}
                </Text>
                <Text style={[styles.tableCellMuted, styles.colPatchMusician]}>
                  {ch.musician || "-"}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colPatchMic,
                    { fontWeight: "bold" },
                  ]}
                >
                  {ch.mic_type || "-"}
                </Text>
                <Text style={[styles.tableCellMuted, styles.colPatchStand]}>
                  {ch.stand_type || "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colPatchPhantom]}>
                  {ch.phantom ? "Oui" : "Non"}
                </Text>
                <Text style={[styles.tableCellMuted, styles.colPatchNotes]}>
                  {ch.notes || ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer Page 1 */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Genere le{" "}
            {new Date().toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
          <Text style={styles.footerText}>
            {band.name} - Fiche Technique | Ostinara
          </Text>
        </View>
      </Page>

      {/* Page 2: Stage Plot */}
      {(musicians.length > 0 || stageElements.length > 0 || generalNotes) && (
        <Page size="A4" style={styles.page}>
          <Text style={[styles.subtitle, { marginBottom: 4 }]}>
            {band.name}
          </Text>

          {/* Stage Plot */}
          {(musicians.length > 0 || stageElements.length > 0) && (
            <View>
              <Text style={styles.sectionHeader}>Plan de scène</Text>
              <View style={styles.stageContainer}>
                {/* Stage labels */}
                <Text
                  style={[
                    styles.stageLabel,
                    {
                      top: 4,
                      left: stageWidth / 2 - 30,
                      width: 60,
                      textAlign: "center",
                    },
                  ]}
                >
                  Fond de scène
                </Text>
                <Text
                  style={[
                    styles.stageLabel,
                    {
                      bottom: 4,
                      left: stageWidth / 2 - 15,
                      width: 30,
                      textAlign: "center",
                    },
                  ]}
                >
                  Public
                </Text>
                <Text
                  style={[
                    styles.stageLabel,
                    { top: stageHeight / 2 - 8, left: 4 },
                  ]}
                >
                  SR
                </Text>
                <Text
                  style={[
                    styles.stageLabel,
                    { top: stageHeight / 2 - 8, right: 4 },
                  ]}
                >
                  SL
                </Text>

                {/* Musicians on stage */}
                {musicians.map((m) => {
                  const cx = (m.position_x / 100) * stageWidth - 14;
                  const cy = (m.position_y / 100) * stageHeight - 14;
                  return (
                    <View key={m.id}>
                      <View
                        style={[
                          styles.stageMusicianCircle,
                          { left: cx, top: cy },
                        ]}
                      >
                        <Text style={styles.stageMusicianInitial}>
                          {m.name?.[0]?.toUpperCase() || "?"}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.stageMusicianLabel,
                          {
                            left: cx - 8,
                            top: cy + 30,
                            width: 44,
                          },
                        ]}
                      >
                        {m.name || "?"}
                      </Text>
                    </View>
                  );
                })}

                {/* Stage elements */}
                {stageElements.map((el) => {
                  const ex = (el.x / 100) * stageWidth - 10;
                  const ey = (el.y / 100) * stageHeight - 10;
                  return (
                    <View key={el.id}>
                      <View
                        style={[
                          styles.stageElement,
                          {
                            left: ex,
                            top: ey,
                            backgroundColor: getElementColor(el.type),
                          },
                        ]}
                      >
                        <Text style={styles.stageElementText}>
                          {ELEMENT_PDF_LABELS[el.type] || "?"}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.stageElementLabel,
                          {
                            left: ex - 6,
                            top: ey + 22,
                            width: 32,
                          },
                        ]}
                      >
                        {el.label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Legend */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: colors.musician },
                    ]}
                  />
                  <Text style={styles.legendText}>Musicien</Text>
                </View>
                {uniqueElementTypes.map((type) => (
                  <View key={type} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        {
                          backgroundColor: getElementColor(type),
                          borderRadius: 2,
                        },
                      ]}
                    />
                    <Text style={styles.legendText}>
                      {
                        {
                          monitor: "Retour",
                          amp: "Ampli",
                          drums: "Batterie",
                          keyboard: "Clavier",
                          di_box: "DI Box",
                          mic_stand: "Micro",
                          custom: "Autre",
                        }[type]
                      }
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* General notes */}
          {generalNotes && (
            <View>
              <Text style={styles.sectionHeader}>Notes</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{generalNotes}</Text>
              </View>
            </View>
          )}

          {/* Footer Page 2 */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              Genere le{" "}
              {new Date().toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Text style={styles.footerText}>
              {band.name} - Fiche Technique | Ostinara
            </Text>
          </View>
        </Page>
      )}
    </Document>
  );
}

interface ExportProps {
  band: BandWithMembers;
  engineerName: string;
  engineerPhone: string;
  musicians: TechRiderMusician[];
  channels: TechRiderChannel[];
  stageElements: TechRiderStageElement[];
  generalNotes: string;
}

export function TechRiderPDFExport({
  band,
  engineerName,
  engineerPhone,
  musicians,
  channels,
  stageElements,
  generalNotes,
}: ExportProps) {
  const [generating, setGenerating] = useState(false);

  const handleExport = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(
        <TechRiderPDFDocument
          band={band}
          engineerName={engineerName}
          engineerPhone={engineerPhone}
          musicians={musicians}
          channels={channels}
          stageElements={stageElements}
          generalNotes={generalNotes}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${band.name.replace(/[^a-z0-9]/gi, "_")}_fiche_technique.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Erreur lors de la generation du PDF");
    } finally {
      setGenerating(false);
    }
  };

  const isEmpty =
    musicians.length === 0 &&
    channels.length === 0 &&
    !engineerName &&
    !engineerPhone;

  return (
    <button
      onClick={handleExport}
      disabled={generating || isEmpty}
      className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
      title={isEmpty ? "Ajoute du contenu avant de télécharger" : undefined}
    >
      {generating ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Génération…
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Télécharger le PDF
        </>
      )}
    </button>
  );
}
