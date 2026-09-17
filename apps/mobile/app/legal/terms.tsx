import React from "react";
import { LegalDocumentView } from "../../src/legal/LegalDocumentView";
import { termsDocument } from "../../src/legal/legalContent";

export default function TermsScreen() {
  return <LegalDocumentView content={termsDocument} kind="terms" />;
}
