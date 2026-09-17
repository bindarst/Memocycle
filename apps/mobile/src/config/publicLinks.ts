const publicBase =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://memocycle.135-125-100-75.sslip.io";

export const privacyUrl = `${publicBase}/v1/public/privacy`;
export const accountDeletionUrl = `${publicBase}/v1/public/delete-account`;
