import React from "react";
import { LegalDocumentView } from "../../src/legal/LegalDocumentView";
import { privacyDocument } from "../../src/legal/legalContent";

export default function PrivacyScreen() {
  return <LegalDocumentView content={privacyDocument} kind="privacy" />;
}
