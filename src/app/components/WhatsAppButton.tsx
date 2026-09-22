"use client";

// Update NEXT_PUBLIC_WHATSAPP_NUMBER in .env with the admin's WhatsApp number
// in international format, no +, no spaces (e.g. 233241234567 for Ghana).
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "233000000000";
const DEFAULT_MESSAGE = "Hi Rancel DataHub, I need help with an order.";

export default function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss md:bottom-8 md:right-8"
    >
      <svg viewBox="0 0 32 32" width="28" height="28" fill="white" aria-hidden="true">
        <path d="M16.004 3C9.376 3 4 8.373 4 15c0 2.34.665 4.523 1.816 6.375L4 29l7.822-1.775A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.75a9.7 9.7 0 0 1-4.94-1.351l-.354-.21-4.64 1.053 1.08-4.522-.232-.37A9.7 9.7 0 0 1 5.25 15c0-5.93 4.824-10.75 10.754-10.75S26.75 9.07 26.75 15 21.934 24.75 16.004 24.75Zm5.62-7.99c-.307-.154-1.815-.897-2.096-1-.28-.103-.485-.154-.688.154-.204.308-.79 1-.968 1.205-.178.205-.357.23-.663.077-.307-.154-1.296-.478-2.469-1.523-.913-.814-1.53-1.82-1.709-2.127-.178-.308-.019-.474.135-.627.138-.138.307-.36.46-.54.154-.18.204-.308.307-.513.103-.205.051-.385-.026-.539-.077-.154-.688-1.66-.943-2.274-.248-.596-.5-.515-.688-.524l-.586-.01c-.204 0-.538.077-.82.385-.28.308-1.073 1.05-1.073 2.56 0 1.51 1.098 2.968 1.251 3.173.154.205 2.16 3.3 5.234 4.628.732.316 1.302.505 1.747.646.734.234 1.402.201 1.93.122.589-.088 1.815-.742 2.071-1.459.256-.717.256-1.331.18-1.459-.078-.128-.283-.205-.59-.36Z" />
      </svg>
    </a>
  );
}
