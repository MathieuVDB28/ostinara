// Seul StatsTab est consomme hors de ce dossier. Reexporter les graphiques
// ici les ferait entrer dans le bundle initial et annulerait le dynamic()
// applique dans stats-tab.tsx.
export { StatsTab } from "./stats-tab";
