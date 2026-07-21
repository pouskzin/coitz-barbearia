/**
 * WhatsApp messaging utility — backend only (api/_utils/).
 * Must NOT reside in src/ to avoid Vite bundling it into the frontend.
 */
export const sendWhatsAppMessage = async (phone: string, message: string): Promise<boolean> => {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;

  // Formatting phone number (removing non-digits)
  const cleanPhone = phone.replace(/\D/g, '');

  if (!apiUrl || !apiToken) {
    console.log(`[WHATSAPP MOCK] To: ***${cleanPhone.slice(-4)}`);
    console.log(`[WHATSAPP MOCK] Message sent (content redacted for LGPD).`);
    console.log(`[WHATSAPP MOCK] Configure WHATSAPP_API_URL e WHATSAPP_API_TOKEN no .env para envios reais.`);
    return true;
  }

  try {
    const response = await fetch(`${apiUrl}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        phone: cleanPhone,
        message: message
      })
    });

    if (!response.ok) {
      console.error(`[WHATSAPP ERROR] Status: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[WHATSAPP ERROR] Exception during send`);
    return false;
  }
};
