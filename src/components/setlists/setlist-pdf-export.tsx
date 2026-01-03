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
import type { SetlistWithDetails, SetlistItemWithSongOwner } from "@/types";

// Styles pour le PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },
  bandName: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  description: {
    fontSize: 11,
    color: "#4b5563",
    marginBottom: 16,
    lineHeight: 1.4,
  },
  metaRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaLabel: {
    fontSize: 10,
    color: "#9ca3af",
  },
  metaValue: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "bold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 16,
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 4,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  statLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 2,
  },
  itemsHeader: {
    flexDirection: "row",
    backgroundColor: "#111827",
    padding: 10,
    marginBottom: 0,
  },
  itemsHeaderText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
  },
  itemRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  itemRowAlt: {
    backgroundColor: "#f9fafb",
  },
  sectionRow: {
    flexDirection: "row",
    backgroundColor: "#fef3c7",
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  itemNumber: {
    width: 30,
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "bold",
  },
  itemTitle: {
    flex: 1,
    fontSize: 12,
    color: "#111827",
    fontWeight: "bold",
  },
  itemArtist: {
    flex: 1,
    fontSize: 11,
    color: "#6b7280",
  },
  itemDuration: {
    width: 50,
    fontSize: 11,
    color: "#374151",
    textAlign: "right",
  },
  itemNotes: {
    fontSize: 9,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    color: "#92400e",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  transitionRow: {
    paddingVertical: 4,
    paddingHorizontal: 40,
    backgroundColor: "#f3f4f6",
  },
  transitionText: {
    fontSize: 9,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 9,
    color: "#9ca3af",
  },
  colNumber: {
    width: 30,
  },
  colTitle: {
    flex: 1,
  },
  colArtist: {
    flex: 1,
  },
  colDuration: {
    width: 50,
    textAlign: "right",
  },
});

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatTotalDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}min`;
  }
  return `${minutes} min`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface SetlistPDFProps {
  setlist: SetlistWithDetails;
}

function SetlistPDFDocument({ setlist }: SetlistPDFProps) {
  const items = setlist.items;
  const songCount = items.filter((i) => i.item_type === "song").length;
  const totalDuration = items.reduce(
    (acc, item) =>
      acc + (item.duration_seconds || 0) + (item.transition_seconds || 0),
    0
  );

  let songNumber = 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{setlist.name}</Text>
          {setlist.band && (
            <Text style={styles.bandName}>{setlist.band.name}</Text>
          )}
          {setlist.description && (
            <Text style={styles.description}>{setlist.description}</Text>
          )}

          <View style={styles.metaRow}>
            {setlist.concert_date && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Date: </Text>
                <Text style={styles.metaValue}>
                  {formatDate(setlist.concert_date)}
                </Text>
              </View>
            )}
            {setlist.venue && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Lieu: </Text>
                <Text style={styles.metaValue}>{setlist.venue}</Text>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{songCount}</Text>
              <Text style={styles.statLabel}>
                morceau{songCount > 1 ? "x" : ""}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatTotalDuration(totalDuration)}
              </Text>
              <Text style={styles.statLabel}>durée totale</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{items.length}</Text>
              <Text style={styles.statLabel}>éléments</Text>
            </View>
          </View>
        </View>

        {/* Items table header */}
        <View style={styles.itemsHeader}>
          <Text style={[styles.itemsHeaderText, styles.colNumber]}>#</Text>
          <Text style={[styles.itemsHeaderText, styles.colTitle]}>Titre</Text>
          <Text style={[styles.itemsHeaderText, styles.colArtist]}>Artiste</Text>
          <Text style={[styles.itemsHeaderText, styles.colDuration]}>Durée</Text>
        </View>

        {/* Items list */}
        {items.map((item, index) => {
          if (item.item_type === "section") {
            return (
              <View key={item.id}>
                <View style={styles.sectionRow}>
                  <Text style={styles.itemNumber}>-</Text>
                  <Text style={styles.sectionLabel}>
                    {item.section_name || "Section"}
                  </Text>
                </View>
                {item.transition_seconds && item.transition_seconds > 0 && (
                  <View style={styles.transitionRow}>
                    <Text style={styles.transitionText}>
                      ↓ Transition: {formatDuration(item.transition_seconds)}
                    </Text>
                  </View>
                )}
              </View>
            );
          }

          songNumber++;
          return (
            <View key={item.id}>
              <View
                style={[
                  styles.itemRow,
                  songNumber % 2 === 0 ? styles.itemRowAlt : {},
                ]}
              >
                <Text style={styles.itemNumber}>{songNumber}</Text>
                <View style={styles.colTitle}>
                  <Text style={styles.itemTitle}>{item.song_title}</Text>
                  {item.notes && (
                    <Text style={styles.itemNotes}>{item.notes}</Text>
                  )}
                </View>
                <Text style={styles.itemArtist}>{item.song_artist || "-"}</Text>
                <Text style={styles.itemDuration}>
                  {item.duration_seconds
                    ? formatDuration(item.duration_seconds)
                    : "-"}
                </Text>
              </View>
              {item.transition_seconds && item.transition_seconds > 0 && (
                <View style={styles.transitionRow}>
                  <Text style={styles.transitionText}>
                    ↓ Transition: {formatDuration(item.transition_seconds)}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Généré le{" "}
            {new Date().toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
          <Text style={styles.footerText}>Tunora - Setlist Builder</Text>
        </View>
      </Page>
    </Document>
  );
}

interface SetlistPDFExportProps {
  setlist: SetlistWithDetails;
}

export function SetlistPDFExport({ setlist }: SetlistPDFExportProps) {
  const [generating, setGenerating] = useState(false);

  const handleExport = async () => {
    setGenerating(true);

    try {
      const blob = await pdf(<SetlistPDFDocument setlist={setlist} />).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${setlist.name.replace(/[^a-z0-9]/gi, "_")}_setlist.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Erreur lors de la génération du PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={generating}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
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
          Génération...
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
          Export PDF
        </>
      )}
    </button>
  );
}
