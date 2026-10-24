"use client";

import { createContext, useContext } from "react";

const ProfilePrivacyContext = createContext<boolean | null>(null);

/**
 * Mon profil est-il prive ? Charge par le layout principal : le choix de
 * visibilite d'une cover ou d'un matos en depend (un profil prive ramene
 * « Public » a « Amis »).
 */
export function ProfilePrivacyProvider({
  isPrivate,
  children,
}: {
  isPrivate: boolean;
  children: React.ReactNode;
}) {
  return <ProfilePrivacyContext.Provider value={isPrivate}>{children}</ProfilePrivacyContext.Provider>;
}

export function useMyProfileIsPrivate(): boolean {
  const context = useContext(ProfilePrivacyContext);
  if (context === null) throw new Error("useMyProfileIsPrivate doit être utilisé dans ProfilePrivacyProvider");
  return context;
}
